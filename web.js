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
const botInstances = new Map(); // id → { sock, status, messages, startTime }
const pairingStore = new Map(); // id → { code, expiresAt }

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
    status:    'connecting',
    messages:  0,
    startTime: Date.now()
  });

  // Request pairing code only when not yet registered
  if (!state.creds.registered) {
    try {
      const phone = botConfig.phone.replace(/\D/g, '');
      const code  = await sock.requestPairingCode(phone);
      pairingStore.set(botId, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.log(`[${botConfig.name}] Pairing code: ${code}`);
    } catch (err) {
      console.error(`[${botConfig.name}] Could not get pairing code:`, err.message);
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    const inst = botInstances.get(botId);
    if (!inst) return;

    if (connection === 'close') {
      const statusCode     = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      inst.status = shouldReconnect ? 'reconnecting' : 'disconnected';

      if (shouldReconnect) {
        console.log(`[${botConfig.name}] Reconnecting in 5 s…`);
        setTimeout(() => startBot(botId).catch(console.error), 5000);
      }
    } else if (connection === 'open') {
      inst.status    = 'connected';
      inst.startTime = Date.now();
      pairingStore.delete(botId);
      console.log(`[${botConfig.name}] ✓ Connected`);

      const fresh = loadBots()[botId];

      if (fresh?.avatarPath) {
        const imgPath = path.join(__dirname, 'public', fresh.avatarPath);
        if (fs.existsSync(imgPath)) {
          const buf = fs.readFileSync(imgPath);
          sock.updateProfilePicture(sock.user.id, buf).catch(() => {});
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

// GET  /api/bots  – list all bots
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
      pairingCode: pairing && pairing.expiresAt > Date.now() ? pairing.code : null
    };
  });
  res.json(list);
});

// POST /api/bots  – add a new bot
app.post('/api/bots', async (req, res) => {
  try {
    const { phone, name, avatar } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

    const id   = 'bot_' + Date.now();
    const bots = loadBots();

    // Save avatar (base64 → file)
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
      name:       name.trim(),
      phone:      phone.replace(/[^0-9+]/g, ''),
      avatarPath,
      createdAt:  new Date().toISOString()
    };
    saveBots(bots);

    await startBot(id);
    await new Promise(r => setTimeout(r, 3500)); // wait for pairing code

    const inst    = botInstances.get(id);
    const pairing = pairingStore.get(id);

    res.json({
      id,
      ...bots[id],
      status:      inst?.status || 'connecting',
      pairingCode: pairing?.code || null,
      messages:    0,
      uptime:      0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bots/:id  – remove a bot
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

  try {
    await startBot(id);
    await new Promise(r => setTimeout(r, 2000));
    const newInst = botInstances.get(id);
    const pairing = pairingStore.get(id);
    res.json({ success: true, status: newInst?.status || 'connecting', pairingCode: pairing?.code || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bots/:id/pairing-code  – poll for fresh code
app.get('/api/bots/:id/pairing-code', (req, res) => {
  const p = pairingStore.get(req.params.id);
  res.json({ code: p && p.expiresAt > Date.now() ? p.code : null });
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
