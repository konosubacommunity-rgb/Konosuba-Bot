require('dotenv').config();
const express = require('express');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const app  = express();
const PORT = process.env.WEB_PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Storage dirs ──────────────────────────────────────────────────────────────
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
function saveBots(bots) {
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
}

// ── In-memory state ───────────────────────────────────────────────────────────
const botInstances = new Map(); // id → { sock, status, messages, startTime, registered }
const pairingStore = new Map(); // id → { code, expiresAt }

// ── Helper: request pairing code on an existing socket ───────────────────────
async function requestCode(botId) {
  const bots   = loadBots();
  const config = bots[botId];
  const inst   = botInstances.get(botId);
  if (!config || !inst?.sock) throw new Error('Bot socket not ready');

  const phone = config.phone.replace(/\D/g, '');
  console.log(`[${config.name}] Requesting pairing code for ${phone}…`);
  const code = await inst.sock.requestPairingCode(phone);
  pairingStore.set(botId, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  console.log(`[${config.name}] Pairing code: ${code}`);
  return code;
}

// ── Start / connect a bot ─────────────────────────────────────────────────────
async function startBot(botId) {
  const bots      = loadBots();
  const botConfig = bots[botId];
  if (!botConfig) throw new Error('Bot not found in config');

  const sessionDir = path.join(SESSIONS_DIR, botId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: [botConfig.name || 'AquaBot', 'Chrome', '3.0'],
    mobile: false
  });

  botInstances.set(botId, {
    sock,
    status:     'connecting',
    messages:   0,
    startTime:  Date.now(),
    registered: state.creds.registered
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, isNewLogin } = update;
    const inst = botInstances.get(botId);
    if (!inst) return;

    // ── QR/pairing phase: Baileys signals "connecting" then goes quiet
    // Request pairing code once the socket has reached the WA servers
    // (indicated by receivedPendingNotifications or simply after a short delay)
    if (connection === 'connecting' && !inst.registered && !pairingStore.has(botId)) {
      // Give Baileys 2 s to complete the initial WS handshake before asking for code
      setTimeout(async () => {
        const current = botInstances.get(botId);
        if (!current || current.registered || pairingStore.has(botId)) return;
        try {
          await requestCode(botId);
        } catch (err) {
          console.error(`[${botConfig.name}] Auto pairing code failed:`, err.message);
          // Mark as needsCode so the frontend shows the Get Code button
          current.needsCode = true;
        }
      }, 2000);
    }

    if (connection === 'close') {
      const statusCode      = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      inst.status = shouldReconnect ? 'reconnecting' : 'disconnected';

      if (shouldReconnect) {
        console.log(`[${botConfig.name}] Reconnecting in 5 s…`);
        setTimeout(() => startBot(botId).catch(console.error), 5000);
      }
    } else if (connection === 'open') {
      inst.status     = 'connected';
      inst.startTime  = Date.now();
      inst.registered = true;
      inst.needsCode  = false;
      pairingStore.delete(botId);
      console.log(`[${botConfig.name}] ✓ Connected`);

      const fresh = loadBots()[botId];
      if (fresh?.avatarPath) {
        const imgPath = path.join(__dirname, 'public', fresh.avatarPath);
        if (fs.existsSync(imgPath)) {
          sock.updateProfilePicture(sock.user.id, fs.readFileSync(imgPath)).catch(() => {});
        }
      }
      if (fresh?.name) {
        sock.updateProfileName(fresh.name).catch(() => {});
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages: msgs }) => {
    const inst = botInstances.get(botId);
    if (inst) inst.messages += msgs.filter(m => !m.key.fromMe).length;
  });
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
      needsCode:   inst?.needsCode || false
    };
  });
  res.json(list);
});

// POST /api/bots  – add new bot
app.post('/api/bots', async (req, res) => {
  try {
    const { phone, name, avatar } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

    const id   = 'bot_' + Date.now();
    const bots = loadBots();

    let avatarPath = null;
    if (avatar && avatar.startsWith('data:image')) {
      const m = avatar.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (m) {
        const ext      = m[1] === 'jpeg' ? 'jpg' : m[1];
        const filename = `${id}.${ext}`;
        fs.writeFileSync(path.join(AVATARS_DIR, filename), Buffer.from(m[2], 'base64'));
        avatarPath = `/bot-avatars/${filename}`;
      }
    }

    bots[id] = {
      name:      name.trim(),
      phone:     phone.replace(/[^0-9+]/g, ''),
      avatarPath,
      createdAt: new Date().toISOString()
    };
    saveBots(bots);

    // Start the socket — pairing code comes async via connection.update
    await startBot(id);

    // Wait up to 8 s for the pairing code to arrive
    let waited = 0;
    while (waited < 8000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
      if (pairingStore.has(id)) break;
    }

    const inst    = botInstances.get(id);
    const pairing = pairingStore.get(id);

    res.json({
      id,
      ...bots[id],
      status:      inst?.status || 'connecting',
      pairingCode: pairing?.code || null,
      needsCode:   inst?.needsCode || false,
      messages:    0,
      uptime:      0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bots/:id/request-code  – manually get/refresh pairing code
app.post('/api/bots/:id/request-code', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });

  const inst = botInstances.get(id);
  if (!inst?.sock) return res.status(400).json({ error: 'Bot socket not running. Try restarting first.' });
  if (inst.registered) return res.status(400).json({ error: 'Bot is already paired.' });

  try {
    const code = await requestCode(id);
    inst.needsCode = false;
    res.json({ code });
  } catch (err) {
    console.error('Request code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bots/:id
app.delete('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  const inst   = botInstances.get(id);
  if (inst?.sock) { try { inst.sock.end(); } catch {} }
  botInstances.delete(id);
  pairingStore.delete(id);

  const bots = loadBots();
  if (bots[id]?.avatarPath) {
    const p = path.join(__dirname, 'public', bots[id].avatarPath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  delete bots[id];
  saveBots(bots);

  const sessionDir = path.join(SESSIONS_DIR, id);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true });

  res.json({ success: true });
});

// POST /api/bots/:id/restart
app.post('/api/bots/:id/restart', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });

  const inst = botInstances.get(id);
  if (inst?.sock) { try { inst.sock.end(); } catch {} }
  botInstances.delete(id);
  pairingStore.delete(id);

  try {
    await startBot(id);
    // Wait up to 8 s for code
    let waited = 0;
    while (waited < 8000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
      if (pairingStore.has(id)) break;
    }
    const newInst = botInstances.get(id);
    const pairing = pairingStore.get(id);
    res.json({
      success:     true,
      status:      newInst?.status || 'connecting',
      pairingCode: pairing?.code || null,
      needsCode:   newInst?.needsCode || false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all → SPA
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌊  Aqua Bot Manager  →  http://localhost:${PORT}\n`);
});

(async () => {
  const bots = loadBots();
  const ids  = Object.keys(bots);
  if (!ids.length) return;
  console.log(`Auto-starting ${ids.length} bot(s)…`);
  for (const id of ids) {
    try { await startBot(id); } catch (e) { console.error(`  ✗ ${id}:`, e.message); }
    await new Promise(r => setTimeout(r, 800));
  }
})();
