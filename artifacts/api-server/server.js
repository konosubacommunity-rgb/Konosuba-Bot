process.on('uncaughtException',  err => console.error('uncaughtException:', err.message));
process.on('unhandledRejection', reason => console.error('unhandledRejection:', reason));

const express = require('express');
const cors    = require('cors');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  isJidGroup,
  Browsers
} = require('@whiskeysockets/baileys');

const { connectDB }          = require('./src/database');
const config                 = require('./src/config');
const User                   = require('./src/models/User');
const Group                  = require('./src/models/Group');
const BotConfig              = require('./src/models/BotConfig');
const BotSession             = require('./src/models/BotSession');
const { useMongoDBAuthState } = require('./src/utils/mongoAuthState');
const pino                   = require('pino');

const { handleGeneral }              = require('./src/commands/general');
const { handleAdmin }                = require('./src/commands/admin');
const { handleEconomy }              = require('./src/commands/economy');
const { handleGambling }             = require('./src/commands/gambling');
const { handleFun }                  = require('./src/commands/fun');
const { handleInteractions }         = require('./src/commands/interactions');
const { handleGames, handleGameAnswer } = require('./src/commands/games');
const { handlePokemon }              = require('./src/commands/pokemon');
const { handleDownloader }           = require('./src/commands/downloader');
const { handleRpg }                  = require('./src/commands/rpg');
const { handleGuild }                = require('./src/commands/guild');
const { isOwner }                    = require('./src/utils/helpers');

const websiteSyncRoutes = require('./src/routes/website-sync');
const { normalizePhone, phoneToJid } = require('./src/routes/website-sync');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'konosuba_admin';

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret', 'x-admin-password'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use('/api', websiteSyncRoutes);
app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Admin middleware for bot endpoints ─────────────────────────────────────────
function verifyAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }
  next();
}

// ── State ─────────────────────────────────────────────────────────────────────
const botInstances = new Map();
const pairingStore = new Map();

const LOG_MAX     = 100;
const commandLogs = new Map();

function pushLog(botId, entry) {
  if (!commandLogs.has(botId)) commandLogs.set(botId, []);
  const log = commandLogs.get(botId);
  log.push(entry);
  if (log.length > LOG_MAX) log.shift();
}

// ── Normalize a WhatsApp sender JID to a canonical phone number ────────────────
// Handles both @s.whatsapp.net and @lid.whatsapp.net formats
function senderToPhone(jid) {
  if (!jid) return null;
  // Strip the domain part
  const raw = jid.split('@')[0];
  // Strip any non-digit chars
  return raw.replace(/\D/g, '') || null;
}

// Given a sender JID (may be LID), find the matching User document
// Strategy: try @s.whatsapp.net first, then fall back to LID lookup
async function findUserBySender(senderJid) {
  if (!senderJid) return null;

  // If it's already in s.whatsapp.net format, look up directly
  if (senderJid.endsWith('@s.whatsapp.net')) {
    return User.findOne({ jid: senderJid });
  }

  // It's a LID (@lid.whatsapp.net) — try matching against stored lids
  if (senderJid.endsWith('@lid.whatsapp.net') || senderJid.includes('@lid')) {
    const user = await User.findOne({ lid: senderJid });
    if (user) return user;
  }

  // Fall back: strip digits and search by phone number portion
  const phone = senderToPhone(senderJid);
  if (phone) {
    const jid = phoneToJid(phone);
    const user = await User.findOne({ jid });
    if (user) return user;
  }

  return null;
}

// ── Core: start a bot ─────────────────────────────────────────────────────────
async function startBot(botId) {
  const botCfg = await BotConfig.findOne({ botId }).lean();
  if (!botCfg) throw new Error('Bot config not found');

  const { state, saveCreds } = await useMongoDBAuthState(botId);

  let version = [2, 3000, 1015901307];
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
  } catch (e) {
    console.warn(`[${botCfg.name}] Could not fetch latest WA version, using fallback`);
  }

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser:                        Browsers.ubuntu('Chrome'),
    printQRInTerminal:              false,
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs:          60000,
    connectTimeoutMs:               60000,
    keepAliveIntervalMs:            25000,
    retryRequestDelayMs:            500,
    getMessage:                     async () => ({ conversation: '' })
  });

  botInstances.set(botId, {
    sock,
    status:     'connecting',
    messages:   0,
    startTime:  Date.now(),
    registered: state.creds.registered,
    needsCode:  false
  });

  let credsSaved = false;
  sock.ev.on('creds.update', () => { credsSaved = true; saveCreds(); });

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    const inst = botInstances.get(botId);
    if (!inst) return;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;
      const hadCreds   = inst.registered;

      if (loggedOut) {
        console.log(`[${botCfg.name}] Logged out — clearing session`);
        inst.status = 'disconnected';
        pairingStore.delete(botId);
        await BotSession.deleteMany({ botId }).catch(() => {});
      } else if (!hadCreds && !credsSaved) {
        const pending = pairingStore.get(botId);
        if (pending && pending.expiresAt > Date.now()) {
          console.log(`[${botCfg.name}] Socket closed while pairing code pending — reconnecting…`);
          inst.status = 'connecting';
          setTimeout(() => startBot(botId).catch(e => console.error(e.message)), 5000);
        } else {
          console.log(`[${botCfg.name}] Pairing connection closed (no creds saved)`);
          inst.status = 'disconnected';
        }
      } else {
        inst.status = 'reconnecting';
        console.log(`[${botCfg.name}] Reconnecting in 5s…`);
        setTimeout(() => startBot(botId).catch(e => console.error(e.message)), 5000);
      }
    } else if (connection === 'open') {
      inst.status     = 'connected';
      inst.startTime  = Date.now();
      inst.registered = true;
      pairingStore.delete(botId);
      console.log(`[${botCfg.name}] ✓ Connected as ${sock.user?.id}`);

      const fresh = await BotConfig.findOne({ botId }).lean();
      if (fresh?.name) sock.updateProfileName(fresh.name).catch(() => {});
    }
  });

  // ── Message handling ──────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return;
    const inst = botInstances.get(botId);

    for (const message of msgs) {
      try {
        if (!message.message) continue;
        if (message.key.fromMe) continue;
        if (isJidBroadcast(message.key.remoteJid)) continue;

        if (inst) inst.messages += 1;

        // Raw sender JID — may be @s.whatsapp.net or @lid.whatsapp.net
        const rawSender = message.key.participant || message.key.remoteJid;
        const groupJid  = isJidGroup(message.key.remoteJid) ? message.key.remoteJid : null;
        const isGroup   = !!groupJid;
        const dest      = isGroup ? groupJid : rawSender;

        const body =
          message.message?.conversation ||
          message.message?.extendedTextMessage?.text ||
          message.message?.imageMessage?.caption ||
          message.message?.videoMessage?.caption ||
          message.message?.buttonsResponseMessage?.selectedButtonId ||
          message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
          '';

        const prefix    = config.PREFIX;
        const isCommand = body.startsWith(prefix);

        if (isGroup) {
          try {
            const now     = new Date();
            const updated = await Group.findOneAndUpdate(
              { jid: groupJid, 'memberActivity.jid': rawSender },
              { $set: { 'memberActivity.$.lastSeen': now }, $inc: { 'memberActivity.$.messageCount': 1 } }
            );
            if (!updated) {
              await Group.findOneAndUpdate(
                { jid: groupJid },
                { $push: { memberActivity: { jid: rawSender, lastSeen: now, messageCount: 1 } } },
                { upsert: true }
              );
            }
          } catch (_) {}
        }

        if (!isCommand) {
          await handleGameAnswer(sock, message, body, rawSender, isGroup, groupJid);

          if (isGroup) {
            const group = await Group.findOne({ jid: groupJid });
            if (group?.antilink && body.match(/https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/)) {
              try {
                await sock.groupParticipantsUpdate(groupJid, [rawSender], 'remove');
                await sock.sendMessage(groupJid, { text: `⚠️ @${rawSender.split('@')[0]} was removed for sharing invite links!`, mentions: [rawSender] });
              } catch (_) {
                await sock.sendMessage(groupJid, { text: `⚠️ @${rawSender.split('@')[0]} please don't share links!`, mentions: [rawSender] }, { quoted: message });
              }
            }
          }
          continue;
        }

        const args    = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        // ── Normalize identity: resolve any JID format to a phone number ──────
        // This is the canonical sender identifier used across ALL command handlers
        const senderPhone = senderToPhone(rawSender);
        // Canonical JID format for DB lookups (always @s.whatsapp.net)
        const canonicalJid = senderPhone ? phoneToJid(senderPhone) : rawSender;

        pushLog(botId, {
          time:    Date.now(),
          sender:  senderPhone || rawSender.split('@')[0],
          command,
          args:    args.join(' '),
          isGroup,
          group:   groupJid ? groupJid.split('@')[0] : null
        });

        // ── Website-first: only registered users can use commands ─────────────
        let user = await findUserBySender(rawSender);

        // If found via LID but stored without canonical JID, update the JID
        if (user && canonicalJid && user.jid !== canonicalJid && rawSender.includes('@lid')) {
          user.jid = canonicalJid;
          user.lid = rawSender;
          await user.save().catch(() => {});
        }

        if (!user || !user.registered) {
          const phone = senderPhone || rawSender.split('@')[0];
          const websiteUrl = process.env.WEBSITE_URL || 'https://your-konosuba-site.onrender.com';
          await sock.sendMessage(dest, {
            text: `👋 Hey *${message.pushName || phone}*!\n\nYou need to *register on the Konosuba website first* before you can use bot commands.\n\n🌐 *Sign up at:*\n${websiteUrl}\n\n📱 Use your WhatsApp number when signing up:\n*${phone}*\n\n> Once registered, all your wallet 💰, bank 🏦, level ⭐ and XP ⚡ will sync live between WhatsApp and the website!`,
          }, { quoted: message });
          continue;
        }

        if (user.name !== message.pushName && message.pushName) {
          user.name = message.pushName;
          await user.save();
        }

        // Use canonicalJid as the sender for command handlers so all DB lookups
        // are consistent regardless of what raw JID WhatsApp sent
        const sender = canonicalJid;

        if (user.banned && !isOwner(sender)) {
          await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
          continue;
        }

        if (isGroup) {
          const group = await Group.findOne({ jid: groupJid });
          if (group && !group.active && !isOwner(sender)) continue;
          if (group?.mutedMembers?.includes(sender)) continue;
        }

        let handled = false;
        handled = await handleGeneral(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleAdmin(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleEconomy(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleGambling(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleFun(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleInteractions(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleGames(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handlePokemon(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleDownloader(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleRpg(sock, message, command, args, sender, isGroup, groupJid);
        if (!handled) handled = await handleGuild(sock, message, command, args, sender, isGroup, groupJid);

      } catch (err) {
        console.error(`[${botCfg.name}] ⚠️ Error handling message:`, err.message);
      }
    }
  });

  // ── Welcome / goodbye messages ─────────────────────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const group = await Group.findOne({ jid: id });
      if (!group) return;
      for (const participant of participants) {
        if (action === 'add' && group.welcome) {
          await sock.sendMessage(id, { text: `👋 Welcome to the group, @${participant.split('@')[0]}!\n\n🎉 We're happy to have you here!\nType *.menu* to see what I can do!`, mentions: [participant] });
        }
        if (action === 'remove' && group.goodbye) {
          await sock.sendMessage(id, { text: `👋 Goodbye @${participant.split('@')[0]}! We'll miss you!`, mentions: [participant] });
        }
      }
    } catch (err) {
      console.error(`[${botCfg.name}] Group update error:`, err.message);
    }
  });

  // ── Request pairing code ───────────────────────────────────────────────────
  if (!state.creds.registered) {
    const existing     = pairingStore.get(botId);
    const hasValidCode = existing && existing.expiresAt > Date.now();

    if (hasValidCode) {
      console.log(`[${botCfg.name}] Reconnected — waiting for pairing code to be entered (${existing.code})`);
    } else {
      (async () => {
        await new Promise(r => setTimeout(r, 4000));
        const phone = botCfg.phone.replace(/\D/g, '');
        console.log(`[${botCfg.name}] Requesting pairing code for +${phone}…`);

        const tryPair = async (attemptsLeft) => {
          try {
            const raw  = await sock.requestPairingCode(phone);
            const code = raw.match(/.{1,4}/g).join('-');
            pairingStore.set(botId, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
            const inst = botInstances.get(botId);
            if (inst) inst.needsCode = false;
            console.log(`[${botCfg.name}] ✓ Pairing code: ${code}`);
          } catch (err) {
            console.error(`[${botCfg.name}] Pairing attempt failed: ${err.message}`);
            if (attemptsLeft > 0) {
              console.log(`[${botCfg.name}] Retrying in 5s… (${attemptsLeft} left)`);
              await new Promise(r => setTimeout(r, 5000));
              return tryPair(attemptsLeft - 1);
            }
            const inst = botInstances.get(botId);
            if (inst) inst.needsCode = true;
            console.error(`[${botCfg.name}] Could not get pairing code after all attempts`);
          }
        };

        await tryPair(3);
      })().catch(e => console.error(`[${botCfg.name}] Pairing background error:`, e.message));
    }
  }
}

// ── Kill a bot socket cleanly ──────────────────────────────────────────────────
function killBot(botId) {
  const inst = botInstances.get(botId);
  if (inst?.sock) { try { inst.sock.end(new Error('killed')); } catch {} }
  botInstances.delete(botId);
  pairingStore.delete(botId);
}

// ── Bot Manager REST API ───────────────────────────────────────────────────────

// List all bots — admin protected
app.get('/api/bots', verifyAdmin, async (_req, res) => {
  try {
    const bots = await BotConfig.find().lean();
    res.json(bots.map(bot => {
      const inst    = botInstances.get(bot.botId);
      const pairing = pairingStore.get(bot.botId);
      return {
        id:          bot.botId,
        botId:       bot.botId,
        name:        bot.name,
        botName:     bot.name,
        phone:       bot.phone,
        phoneNumber: bot.phone,
        avatarData:  bot.avatarData || null,
        createdAt:   bot.createdAt,
        status:      inst?.status || 'offline',
        isConnected: inst?.status === 'connected',
        messages:    inst?.messages || 0,
        uptime:      inst?.startTime ? Date.now() - inst.startTime : 0,
        pairingCode: pairing && pairing.expiresAt > Date.now() ? pairing.code : null,
        needsCode:   !!(inst?.needsCode)
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bots/:id/logs', verifyAdmin, (req, res) => {
  const log = commandLogs.get(req.params.id) || [];
  res.json([...log].reverse());
});

app.delete('/api/bots/:id/logs', verifyAdmin, (req, res) => {
  commandLogs.set(req.params.id, []);
  res.json({ success: true });
});

// Add a bot — admin protected
app.post('/api/bots', verifyAdmin, async (req, res) => {
  try {
    const { phone, name, botName, phoneNumber, avatar, avatarData } = req.body;
    const resolvedName  = name  || botName;
    const resolvedPhone = phone || phoneNumber;
    if (!resolvedPhone || !resolvedName) return res.status(400).json({ error: 'phone/phoneNumber and name/botName are required' });
    const rawPhone = resolvedPhone.replace(/\D/g, '');
    if (rawPhone.length < 10) return res.status(400).json({ error: 'Phone number too short — include country code' });

    const botId      = 'bot_' + Date.now();
    const resolvedAvatar = avatar || avatarData;
    const avatarVal  = resolvedAvatar?.startsWith('data:image') ? resolvedAvatar : null;

    await BotConfig.create({ botId, name: resolvedName.trim(), phone: rawPhone, avatarData: avatarVal, createdAt: new Date().toISOString() });
    await startBot(botId);

    // Wait up to 8s for pairing code to appear
    let waitMs = 0;
    while (!pairingStore.has(botId) && waitMs < 8000) {
      await new Promise(r => setTimeout(r, 500));
      waitMs += 500;
    }
    const pairingFinal = pairingStore.get(botId);
    const inst         = botInstances.get(botId);

    res.json({
      id:          botId,
      botId,
      name:        resolvedName.trim(),
      botName:     resolvedName.trim(),
      phone:       rawPhone,
      phoneNumber: rawPhone,
      avatarData:  avatarVal,
      createdAt:   new Date().toISOString(),
      status:      inst?.status || 'connecting',
      isConnected: inst?.status === 'connected',
      pairingCode: pairingFinal?.code || null,
      needsCode:   !!(inst?.needsCode),
      messages: 0, uptime: 0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Also handle /api/bots/add as alias for compatibility
app.post('/api/bots/add', verifyAdmin, async (req, res) => {
  // Forward to the same handler logic
  req.url = '/api/bots';
  const { phone, name, botName, phoneNumber, avatar, avatarData } = req.body;
  const resolvedName  = name  || botName;
  const resolvedPhone = phone || phoneNumber;
  if (!resolvedPhone || !resolvedName) return res.status(400).json({ error: 'phone/phoneNumber and name/botName are required' });
  const rawPhone = resolvedPhone.replace(/\D/g, '');
  if (rawPhone.length < 10) return res.status(400).json({ error: 'Phone number too short — include country code' });

  const botId      = 'bot_' + Date.now();
  const resolvedAvatar = avatar || avatarData;
  const avatarVal  = resolvedAvatar?.startsWith('data:image') ? resolvedAvatar : null;

  try {
    await BotConfig.create({ botId, name: resolvedName.trim(), phone: rawPhone, avatarData: avatarVal, createdAt: new Date().toISOString() });
    await startBot(botId);
    let waitMs = 0;
    while (!pairingStore.has(botId) && waitMs < 8000) {
      await new Promise(r => setTimeout(r, 500));
      waitMs += 500;
    }
    const pairingFinal = pairingStore.get(botId);
    const inst = botInstances.get(botId);
    res.json({
      id: botId, botId, name: resolvedName.trim(), botName: resolvedName.trim(),
      phone: rawPhone, phoneNumber: rawPhone, avatarData: avatarVal,
      createdAt: new Date().toISOString(),
      status: inst?.status || 'connecting', isConnected: inst?.status === 'connected',
      pairingCode: pairingFinal?.code || null, needsCode: !!(inst?.needsCode),
      messages: 0, uptime: 0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Request pairing code — handles both URL formats
app.post('/api/bots/:id/request-code', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const bot = await BotConfig.findOne({ botId: id }).lean();
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  killBot(id);
  await BotSession.deleteMany({ botId: id }).catch(() => {});

  try {
    await startBot(id);
    let waitMs = 0;
    while (!pairingStore.has(id) && waitMs < 10000) {
      await new Promise(r => setTimeout(r, 500));
      waitMs += 500;
    }
    const pairing = pairingStore.get(id);
    if (!pairing) {
      return res.status(500).json({ error: 'Could not generate pairing code — check that the phone number includes the country code (no +).' });
    }
    res.json({ code: pairing.code, pairingCode: pairing.code });
  } catch (err) {
    console.error('Request code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Alias for pairing code endpoint used by bot manager
app.post('/api/bots/:id/pairing-code', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const bot = await BotConfig.findOne({ botId: id }).lean();
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  // Return cached pairing code if still valid, otherwise request a new one
  const existing = pairingStore.get(id);
  if (existing && existing.expiresAt > Date.now()) {
    return res.json({ code: existing.code, pairingCode: existing.code });
  }

  killBot(id);
  await BotSession.deleteMany({ botId: id }).catch(() => {});

  try {
    await startBot(id);
    let waitMs = 0;
    while (!pairingStore.has(id) && waitMs < 10000) {
      await new Promise(r => setTimeout(r, 500));
      waitMs += 500;
    }
    const pairing = pairingStore.get(id);
    if (!pairing) {
      return res.status(500).json({ error: 'Could not generate pairing code — check that the phone number includes the country code (no +).' });
    }
    res.json({ code: pairing.code, pairingCode: pairing.code });
  } catch (err) {
    console.error('Pairing code error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bots/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  killBot(id);
  commandLogs.delete(id);
  await BotConfig.deleteOne({ botId: id });
  await BotSession.deleteMany({ botId: id }).catch(() => {});
  res.json({ success: true });
});

app.post('/api/bots/:id/restart', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const bot = await BotConfig.findOne({ botId: id }).lean();
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
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

// ── Boot ───────────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();

  app.listen(PORT, () => console.log(`\n🌊  Konosuba Bot Server → http://localhost:${PORT}\n`));

  const bots = await BotConfig.find().lean();
  if (!bots.length) { console.log('No bots configured yet. Add one via the Bot Manager.'); return; }
  console.log(`Auto-starting ${bots.length} bot(s)…`);
  for (const bot of bots) {
    try { await startBot(bot.botId); } catch (e) { console.error(`  ✗ ${bot.botId}:`, e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
})();
