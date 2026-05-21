const express = require('express');
const BotConfig = require('../models/BotConfig');

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || '';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (key !== ADMIN_PASSWORD && key !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// In-memory pairing sessions { botId -> { sock, status, pairingCode, phone, name } }
const activeSessions = {};

// ─── GET /api/website/admin/bots ─────────────────────────────────────────────
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

// ─── POST /api/website/admin/bots/start-pairing ──────────────────────────────
router.post('/admin/bots/start-pairing', adminAuth, async (req, res) => {
  let bail;
  try {
    bail = require('@whiskeysockets/baileys');
  } catch {
    return res.status(500).json({ error: 'Baileys not installed. Run: npm install @whiskeysockets/baileys pino in api-server.' });
  }

  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const cleanPhone = String(phone).replace(/[^\d]/g, '');
    if (cleanPhone.length < 7) return res.status(400).json({ error: 'Invalid phone number' });

    const botId = `bot_${cleanPhone}`;

    // Tear down existing session for this phone if any
    if (activeSessions[botId]) {
      try { activeSessions[botId].sock.end(); } catch {}
      delete activeSessions[botId];
    }

    const { useMongoDBAuthState } = require('../utils/mongoAuthState');
    const pino = require('pino');

    const { state, saveCreds } = await useMongoDBAuthState(botId);

    // If already registered/connected
    if (state.creds && state.creds.registered) {
      await BotConfig.findOneAndUpdate(
        { botId },
        { $set: { botId, name: name || `Bot ${cleanPhone}`, phone: cleanPhone, createdAt: new Date().toISOString() } },
        { upsert: true }
      );
      activeSessions[botId] = { status: 'connected', phone: cleanPhone, name };
      return res.json({ success: true, botId, status: 'already_connected', message: 'Bot is already linked to WhatsApp.' });
    }

    const makeWASocket = bail.default || bail;
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Konosuba Bot', 'Chrome', '120.0.0'],
    });

    activeSessions[botId] = { sock, status: 'pending', phone: cleanPhone, name, pairingCode: null };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection }) => {
      if (!activeSessions[botId]) return;
      if (connection === 'open') {
        activeSessions[botId].status = 'connected';
        await BotConfig.findOneAndUpdate(
          { botId },
          { $set: { botId, name: name || `Bot ${cleanPhone}`, phone: cleanPhone, createdAt: new Date().toISOString() } },
          { upsert: true }
        );
      } else if (connection === 'close') {
        activeSessions[botId].status = 'disconnected';
      }
    });

    // Request pairing code
    const code = await sock.requestPairingCode(cleanPhone);
    const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
    activeSessions[botId].pairingCode = formatted;

    return res.json({ success: true, botId, pairingCode: formatted, status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to start pairing session' });
  }
});

// ─── GET /api/website/admin/bots/pairing-status/:botId ───────────────────────
router.get('/admin/bots/pairing-status/:botId', adminAuth, (req, res) => {
  const session = activeSessions[req.params.botId];
  if (!session) return res.json({ status: 'not_found' });
  res.json({
    status:      session.status,
    pairingCode: session.pairingCode || null,
    phone:       session.phone,
  });
});

// ─── DELETE /api/website/admin/bots/:botId ───────────────────────────────────
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

module.exports = router;
