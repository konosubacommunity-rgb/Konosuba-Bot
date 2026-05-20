require('dotenv').config();
const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');
const pino = require('pino');

const app  = express();
const PORT = process.env.WEB_PORT || process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Storage ───────────────────────────────────────────────────────────────────
const BOTS_FILE    = path.join(__dirname, 'bots.json');
const SESSIONS_DIR = path.join(__dirname, 'bot-sessions');
const AVATARS_DIR  = path.join(__dirname, 'public', 'bot-avatars');

[SESSIONS_DIR, AVATARS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function loadBots() {
  if (!fs.existsSync(BOTS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(BOTS_FILE, 'utf8')); } catch { return {}; }
}
function saveBots(bots) { fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2)); }

// ── State ─────────────────────────────────────────────────────────────────────
const botInstances = new Map(); // id → { sock, status, messages, startTime, registered }
const pairingStore = new Map(); // id → { code, expiresAt }

// ── Core: start a bot (mirrors original index.js exactly) ────────────────────
async function startBot(botId) {
  const bots      = loadBots();
  const botConfig = bots[botId];
  if (!botConfig) throw new Error('Bot config not found');

  const sessionDir = path.join(SESSIONS_DIR, botId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version }          = await fetchLatestBaileysVersion();
  const logger               = pino({ level: 'silent' });

  // ── Exact same config as the original index.js ────────────────────────────
  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger)  // ← was missing, causes pairing failure
    },
    browser:                  Browsers.ubuntu('Chrome'),
    printQRInTerminal:        false,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs:    60000,
    connectTimeoutMs:         60000,
    keepAliveIntervalMs:      10000,
    retryRequestDelayMs:      250,
    getMessage:               async () => ({ conversation: '' })
  });

  botInstances.set(botId, {
    sock,
    status:     'connecting',
    messages:   0,
    startTime:  Date.now(),
    registered: state.creds.registered
  });

  let credsSaved = false;
  sock.ev.on('creds.update', () => { credsSaved = true; saveCreds(); });

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    const inst = botInstances.get(botId);
    if (!inst) return;

    if (connection === 'close') {
      const statusCode      = lastDisconnect?.error?.output?.statusCode;
      const loggedOut       = statusCode === DisconnectReason.loggedOut;
      const hadCreds        = inst.registered;

      if (loggedOut) {
        console.log(`[${botConfig.name}] Logged out — clearing session`);
        inst.status = 'disconnected';
        // Clear session so next start asks for pairing again
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } else if (!hadCreds && !credsSaved) {
        // Pairing attempt failed — don't reconnect spam
        console.log(`[${botConfig.name}] Pairing connection closed (no creds saved)`);
        inst.status = 'disconnected';
      } else {
        inst.status = 'reconnecting';
        const delay = 5000;
        console.log(`[${botConfig.name}] Reconnecting in ${delay / 1000}s…`);
        setTimeout(() => startBot(botId).catch(e => console.error(e.message)), delay);
      }
    } else if (connection === 'open') {
      inst.status     = 'connected';
      inst.startTime  = Date.now();
      inst.registered = true;
      pairingStore.delete(botId);
      console.log(`[${botConfig.name}] ✓ Connected as ${sock.user?.id}`);

      const fresh = loadBots()[botId];
      if (fresh?.avatarPath) {
        const imgPath = path.join(__dirname, 'public', fresh.avatarPath);
        if (fs.existsSync(imgPath)) {
          sock.updateProfilePicture(sock.user.id, fs.readFileSync(imgPath)).catch(() => {});
        }
      }
      if (fresh?.name) sock.updateProfileName(fresh.name).catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', ({ messages: msgs }) => {
    const inst = botInstances.get(botId);
    if (inst) inst.messages += msgs.filter(m => !m.key.fromMe).length;
  });

  // ── Request pairing code (mirrors original tryPair with retries) ──────────
  if (!state.creds.registered) {
    await new Promise(r => setTimeout(r, 1500)); // let WS handshake settle — exact same delay as original

    const phone = botConfig.phone.replace(/\D/g, '');
    console.log(`[${botConfig.name}] Requesting pairing code for +${phone}…`);

    const tryPair = async (attemptsLeft) => {
      try {
        const raw  = await sock.requestPairingCode(phone);
        const code = raw.match(/.{1,4}/g).join('-'); // format as XXXX-XXXX
        pairingStore.set(botId, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
        const inst = botInstances.get(botId);
        if (inst) inst.needsCode = false;
        console.log(`[${botConfig.name}] ✓ Pairing code: ${code}`);
      } catch (err) {
        console.error(`[${botConfig.name}] Pairing attempt failed: ${err.message}`);
        if (attemptsLeft > 0) {
          console.log(`[${botConfig.name}] Retrying in 3s… (${attemptsLeft} left)`);
          await new Promise(r => setTimeout(r, 3000));
          return tryPair(attemptsLeft - 1);
        }
        const inst = botInstances.get(botId);
        if (inst) inst.needsCode = true;
        console.error(`[${botConfig.name}] Could not get pairing code after all attempts`);
      }
    };

    await tryPair(4); // 4 retries — same as original
  }
}

// ── Kill a bot socket cleanly ─────────────────────────────────────────────────
function killBot(botId) {
  const inst = botInstances.get(botId);
  if (inst?.sock) { try { inst.sock.end(new Error('killed')); } catch {} }
  botInstances.delete(botId);
  pairingStore.delete(botId);
}

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/bots', (_req, res) => {
  const bots = loadBots();
  res.json(Object.entries(bots).map(([id, bot]) => {
    const inst    = botInstances.get(id);
    const pairing = pairingStore.get(id);
    return {
      id,
      name:        bot.name,
      phone:       bot.phone,
      avatarPath:  bot.avatarPath || null,
      createdAt:   bot.createdAt,
      status:      inst?.status || 'offline',
      messages:    inst?.messages || 0,
      uptime:      inst?.startTime ? Date.now() - inst.startTime : 0,
      pairingCode: pairing && pairing.expiresAt > Date.now() ? pairing.code : null,
      needsCode:   !!(inst?.needsCode)
    };
  }));
});

app.post('/api/bots', async (req, res) => {
  try {
    const { phone, name, avatar } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) return res.status(400).json({ error: 'Phone number too short — include country code' });

    const id   = 'bot_' + Date.now();
    const bots = loadBots();

    let avatarPath = null;
    if (avatar?.startsWith('data:image')) {
      const m = avatar.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (m) {
        const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
        const fn  = `${id}.${ext}`;
        fs.writeFileSync(path.join(AVATARS_DIR, fn), Buffer.from(m[2], 'base64'));
        avatarPath = `/bot-avatars/${fn}`;
      }
    }

    bots[id] = { name: name.trim(), phone: rawPhone, avatarPath, createdAt: new Date().toISOString() };
    saveBots(bots);

    await startBot(id); // waits for pairing code (up to 4 retries internally)

    const inst    = botInstances.get(id);
    const pairing = pairingStore.get(id);

    res.json({
      id, ...bots[id],
      status:      inst?.status || 'connecting',
      pairingCode: pairing?.code || null,
      needsCode:   !!(inst?.needsCode),
      messages: 0, uptime: 0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fresh socket + new pairing code request
app.post('/api/bots/:id/request-code', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });

  killBot(id);

  // Clear session so Baileys treats it as a completely fresh registration
  const sessionDir = path.join(SESSIONS_DIR, id);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });

  try {
    await startBot(id);
    const pairing = pairingStore.get(id);
    if (!pairing) {
      return res.status(500).json({ error: 'Could not generate pairing code — check that the phone number is correct and includes the country code (no +).' });
    }
    res.json({ code: pairing.code });
  } catch (err) {
    console.error('Request code error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  killBot(id);
  const bots = loadBots();
  if (bots[id]?.avatarPath) {
    const p = path.join(__dirname, 'public', bots[id].avatarPath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  delete bots[id];
  saveBots(bots);
  const sd = path.join(SESSIONS_DIR, id);
  if (fs.existsSync(sd)) fs.rmSync(sd, { recursive: true, force: true });
  res.json({ success: true });
});

app.post('/api/bots/:id/restart', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });
  killBot(id);
  try {
    await startBot(id);
    const inst    = botInstances.get(id);
    const pairing = pairingStore.get(id);
    res.json({ success: true, status: inst?.status || 'connecting', pairingCode: pairing?.code || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`\n🌊  Aqua Bot Manager → http://localhost:${PORT}\n`));

(async () => {
  const bots = loadBots();
  const ids  = Object.keys(bots);
  if (!ids.length) return;
  console.log(`Auto-starting ${ids.length} bot(s)…`);
  for (const id of ids) {
    try { await startBot(id); } catch (e) { console.error(`  ✗ ${id}:`, e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
})();
