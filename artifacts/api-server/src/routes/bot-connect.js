const express = require('express');
const BotConfig = require('../models/BotConfig');

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || '';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!key || (key !== ADMIN_PASSWORD && (!WEBHOOK_SECRET || key !== WEBHOOK_SECRET))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// In-memory sessions: botId -> { sock, status, pairingCode, phone, name, logs[] }
const activeSessions = {};

const MAX_LOG_LINES = 200;

function addLog(botId, line) {
  const s = activeSessions[botId];
  if (!s) return;
  s.logs.push({ ts: new Date().toISOString(), msg: line });
  if (s.logs.length > MAX_LOG_LINES) s.logs.shift();
}

// ─── LIST BOTS ───────────────────────────────────────────────────────────────

router.get('/admin/bots', adminAuth, async (req, res) => {
  try {
    const bots = await BotConfig.find().lean();
    const result = bots.map(b => ({
      ...b,
      status: activeSessions[b.botId]?.status || 'offline',
    }));
    res.json({ bots: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START PAIRING ───────────────────────────────────────────────────────────

router.post('/admin/bots/start-pairing', adminAuth, async (req, res) => {
  let bail;
  try {
    bail = require('@whiskeysockets/baileys');
  } catch {
    return res.status(500).json({ error: 'Baileys not installed. Run: npm install @whiskeysockets/baileys pino' });
  }

  try {
    const { phone, name, avatarData } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Bot name is required' });

    const cleanPhone = String(phone).replace(/[^\d]/g, '');
    if (cleanPhone.length < 7) return res.status(400).json({ error: 'Invalid phone number' });

    const botId = `bot_${cleanPhone}`;

    // Tear down existing session for this phone if any
    if (activeSessions[botId]) {
      try { activeSessions[botId].sock?.end(); } catch {}
      delete activeSessions[botId];
    }

    const { useMongoDBAuthState } = require('../utils/mongoAuthState');
    const pino = require('pino');

    const { state, saveCreds } = await useMongoDBAuthState(botId);

    // Already registered/connected
    if (state.creds && state.creds.registered) {
      await BotConfig.findOneAndUpdate(
        { botId },
        { $set: { botId, name: name.trim(), phone: cleanPhone, createdAt: new Date().toISOString(), ...(avatarData ? { avatarData } : {}) } },
        { upsert: true }
      );
      activeSessions[botId] = { status: 'connected', phone: cleanPhone, name: name.trim(), logs: [] };
      await attachMessageHandler(botId, null, cleanPhone, name.trim());
      return res.json({ success: true, botId, status: 'already_connected', message: 'Bot is already linked to WhatsApp.' });
    }

    const makeWASocket = bail.default || bail;
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Konosuba Bot', 'Chrome', '120.0.0'],
    });

    activeSessions[botId] = { sock, status: 'pending', phone: cleanPhone, name: name.trim(), pairingCode: null, logs: [] };
    addLog(botId, `Pairing session started for ${cleanPhone}`);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (!activeSessions[botId]) return;
      if (connection === 'open') {
        activeSessions[botId].status = 'connected';
        addLog(botId, 'Bot connected to WhatsApp');
        await BotConfig.findOneAndUpdate(
          { botId },
          { $set: { botId, name: name.trim(), phone: cleanPhone, createdAt: new Date().toISOString(), ...(avatarData ? { avatarData } : {}) } },
          { upsert: true }
        );
        // Wire up message handler now that we are connected
        attachMessageHandler(botId, sock, cleanPhone, name.trim());
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        activeSessions[botId].status = 'disconnected';
        addLog(botId, `Bot disconnected (code ${code})`);
        // Auto-reconnect unless logged out (401)
        if (code !== 401) {
          addLog(botId, 'Attempting reconnect in 5s...');
          setTimeout(() => reconnectBot(botId, bail, cleanPhone, name.trim()), 5000);
        }
      }
    });

    const code = await sock.requestPairingCode(cleanPhone);
    const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
    activeSessions[botId].pairingCode = formatted;
    addLog(botId, `Pairing code issued: ${formatted}`);

    return res.json({ success: true, botId, pairingCode: formatted, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to start pairing session' });
  }
});

// ─── PAIRING STATUS ──────────────────────────────────────────────────────────

router.get('/admin/bots/pairing-status/:botId', adminAuth, (req, res) => {
  const session = activeSessions[req.params.botId];
  if (!session) return res.json({ status: 'not_found' });
  res.json({
    status:      session.status,
    pairingCode: session.pairingCode || null,
    phone:       session.phone,
  });
});

// ─── RESTART BOT ─────────────────────────────────────────────────────────────

router.post('/admin/bots/:botId/restart', adminAuth, async (req, res) => {
  const { botId } = req.params;
  try {
    const config = await BotConfig.findOne({ botId }).lean();
    if (!config) return res.status(404).json({ error: 'Bot not found' });

    // Gracefully close existing socket
    if (activeSessions[botId]?.sock) {
      try { activeSessions[botId].sock.end(); } catch {}
    }

    const logs = activeSessions[botId]?.logs || [];
    activeSessions[botId] = { status: 'reconnecting', phone: config.phone, name: config.name, logs };
    addLog(botId, 'Restart requested by admin');

    let bail;
    try { bail = require('@whiskeysockets/baileys'); } catch {
      return res.status(500).json({ error: 'Baileys not installed' });
    }

    setTimeout(() => reconnectBot(botId, bail, config.phone, config.name), 1000);
    res.json({ success: true, message: 'Bot restart initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STOP BOT ────────────────────────────────────────────────────────────────

router.post('/admin/bots/:botId/stop', adminAuth, (req, res) => {
  const { botId } = req.params;
  const session = activeSessions[botId];
  if (!session) return res.status(404).json({ error: 'Bot session not found' });

  try { session.sock?.end(); } catch {}
  session.status = 'stopped';
  session.sock = null;
  addLog(botId, 'Bot stopped by admin');
  res.json({ success: true, message: 'Bot stopped' });
});

// ─── GET BOT LOGS ─────────────────────────────────────────────────────────────

router.get('/admin/bots/:botId/logs', adminAuth, (req, res) => {
  const session = activeSessions[req.params.botId];
  if (!session) return res.json({ logs: [] });
  res.json({ logs: session.logs || [] });
});

// ─── DELETE BOT ───────────────────────────────────────────────────────────────

router.delete('/admin/bots/:botId', adminAuth, async (req, res) => {
  try {
    const { botId } = req.params;
    if (activeSessions[botId]) {
      try { activeSessions[botId].sock?.end(); } catch {}
      delete activeSessions[botId];
    }
    await BotConfig.findOneAndDelete({ botId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INTERNAL: reconnect helper ───────────────────────────────────────────────

async function reconnectBot(botId, bail, phone, name) {
  try {
    const { useMongoDBAuthState } = require('../utils/mongoAuthState');
    const pino = require('pino');
    const { state, saveCreds } = await useMongoDBAuthState(botId);

    const makeWASocket = bail.default || bail;
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Konosuba Bot', 'Chrome', '120.0.0'],
    });

    if (!activeSessions[botId]) activeSessions[botId] = { logs: [] };
    activeSessions[botId].sock = sock;
    activeSessions[botId].status = 'reconnecting';
    addLog(botId, 'Reconnecting...');

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (!activeSessions[botId]) return;
      if (connection === 'open') {
        activeSessions[botId].status = 'connected';
        addLog(botId, 'Reconnected successfully');
        attachMessageHandler(botId, sock, phone, name);
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        activeSessions[botId].status = 'disconnected';
        addLog(botId, `Disconnected during reconnect (code ${code})`);
        if (code !== 401) {
          setTimeout(() => reconnectBot(botId, bail, phone, name), 8000);
        }
      }
    });
  } catch (err) {
    addLog(botId, `Reconnect error: ${err.message}`);
    if (activeSessions[botId]) activeSessions[botId].status = 'error';
  }
}

// ─── INTERNAL: attach message handler ────────────────────────────────────────

function attachMessageHandler(botId, sock, phone, name) {
  if (!sock) return;
  try {
    const handler = require('../bot/handler');
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        try {
          await handler.handleMessage(sock, msg, { botId, phone, name });
        } catch (err) {
          addLog(botId, `Handler error: ${err.message}`);
        }
      }
    });
    addLog(botId, 'Message handler attached');
  } catch (err) {
    addLog(botId, `Failed to attach handler: ${err.message}`);
  }
}

module.exports = router;
