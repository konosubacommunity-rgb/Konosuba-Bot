require('dotenv').config();
const express = require('express');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');
const { Boom } = require('@hapi/boom');
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

// ── Core: create a fresh socket and get pairing code ──────────────────────────
async function startBot(botId) {
  const bots      = loadBots();
  const botConfig = bots[botId];
  if (!botConfig) throw new Error('Bot config not found');

  const sessionDir = path.join(SESSIONS_DIR, botId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth:              state,
    printQRInTerminal: false,
    logger:            pino({ level: 'silent' }),
    browser:           Browsers.ubuntu('Desktop'),
    mobile:            false,
    syncFullHistory:   false,
    markOnlineOnConnect: false
  });

  botInstances.set(botId, {
    sock,
    status:     'connecting',
    messages:   0,
    startTime:  Date.now(),
    registered: state.creds.registered
  });

  // ─── CRITICAL: call requestPairingCode RIGHT HERE, no delay ───────────────
  // Baileys internally queues this until the WS handshake completes.
  // Calling it AFTER a delay or inside connection.update is too late.
  if (!state.creds.registered) {
    const phone = botConfig.phone.replace(/\D/g, ''); // digits only, no +
    console.log(`[${botConfig.name}] Requesting pairing code for ${phone}…`);
    try {
      const code = await sock.requestPairingCode(phone);
      pairingStore.set(botId, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.log(`[${botConfig.name}] ✓ Pairing code: ${code}`);
      const inst = botInstances.get(botId);
      if (inst) inst.needsCode = false;
    } catch (err) {
      console.error(`[${botConfig.name}] ✗ Pairing code error: ${err.message}`);
      const inst = botInstances.get(botId);
      if (inst) inst.needsCode = true;
    }
  }

  // ─── Event handlers AFTER pairing code request ───────────────────────────
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    const inst = botInstances.get(botId);
    if (!inst) return;

    if (connection === 'close') {
      const statusCode      = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      inst.status = shouldReconnect ? 'reconnecting' : 'disconnected';

      if (shouldReconnect) {
        console.log(`[${botConfig.name}] Reconnecting in 5 s…`);
        setTimeout(() => startBot(botId).catch(e => console.error(e.message)), 5000);
      } else {
        console.log(`[${botConfig.name}] Logged out.`);
      }
    } else if (connection === 'open') {
      inst.status     = 'connected';
      inst.startTime  = Date.now();
      inst.registered = true;
      inst.needsCode  = false;
      pairingStore.delete(botId);
      console.log(`[${botConfig.name}] ✓ Connected!`);

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

  return sock;
}

// ─── Helper: cleanly kill a bot's socket ─────────────────────────────────────
function killBot(botId) {
  const inst = botInstances.get(botId);
  if (inst?.sock) { try { inst.sock.end(new Error('killed')); } catch {} }
  botInstances.delete(botId);
  pairingStore.delete(botId);
}

// ── REST API ──────────────────────────────────────────────────────────────────

// GET /api/bots
app.get('/api/bots', (_req, res) => {
  const bots = loadBots();
  const list = Object.entries(bots).map(([id, bot]) => {
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
  });
  res.json(list);
});

// POST /api/bots — add new bot
app.post('/api/bots', async (req, res) => {
  try {
    const { phone, name, avatar } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) return res.status(400).json({ error: 'Phone number too short' });

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

    // startBot awaits requestPairingCode internally — code is ready when it returns
    await startBot(id);

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

// POST /api/bots/:id/request-code — fresh socket + immediate code request
app.post('/api/bots/:id/request-code', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });

  // Kill existing socket
  killBot(id);

  // Clear any stale session files so Baileys treats it as a fresh registration
  const sessionDir = path.join(SESSIONS_DIR, id);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true });

  try {
    await startBot(id);
    const pairing = pairingStore.get(id);
    if (!pairing) {
      const inst = botInstances.get(id);
      const hint = inst?.needsCode
        ? 'Baileys could not generate a code. Check that the phone number is correct and includes the country code (no +).'
        : 'Pairing code not received yet — please try again.';
      return res.status(500).json({ error: hint });
    }
    res.json({ code: pairing.code });
  } catch (err) {
    console.error('Request code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bots/:id
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
  if (fs.existsSync(sd)) fs.rmSync(sd, { recursive: true });
  res.json({ success: true });
});

// POST /api/bots/:id/restart
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

// SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────────────
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
