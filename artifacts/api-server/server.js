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

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret', 'x-admin-password'],
}));

app.use(express.json({ limit: '15mb' }));

app.use('/api', websiteSyncRoutes);

app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── State ─────────────────────────────────────────────────────────────────────
const botInstances = new Map();
const pairingStore = new Map();

const LOG_MAX    = 100;
const commandLogs = new Map();

function pushLog(botId, entry) {
  if (!commandLogs.has(botId)) commandLogs.set(botId, []);
  const log = commandLogs.get(botId);
  log.push(entry);
  if (log.length > LOG_MAX) log.shift();
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

  // ── Full command handling ──────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return;
    const inst = botInstances.get(botId);

    for (const message of msgs) {
      try {
        if (!message.message) continue;
        if (message.key.fromMe) continue;
        if (isJidBroadcast(message.key.remoteJid)) continue;

        if (inst) inst.messages += 1;

        const sender   = message.key.participant || message.key.remoteJid;
        const groupJid = isJidGroup(message.key.remoteJid) ? message.key.remoteJid : null;
        const isGroup  = !!groupJid;
        const dest     = isGroup ? groupJid : sender;

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
              { jid: groupJid, 'memberActivity.jid': sender },
              { $set: { 'memberActivity.$.lastSeen': now }, $inc: { 'memberActivity.$.messageCount': 1 } }
            );
            if (!updated) {
              await Group.findOneAndUpdate(
                { jid: groupJid },
                { $push: { memberActivity: { jid: sender, lastSeen: now, messageCount: 1 } } },
                { upsert: true }
              );
            }
          } catch (_) {}
        }

        if (!isCommand) {
          await handleGameAnswer(sock, message, body, sender, isGroup, groupJid);

          if (isGroup) {
            const group = await Group.findOne({ jid: groupJid });
            if (group?.antilink && body.match(/https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/)) {
              try {
                await sock.groupParticipantsUpdate(groupJid, [sender], 'remove');
                await sock.sendMessage(groupJid, { text: `⚠️ @${sender.split('@')[0]} was removed for sharing invite links!`, mentions: [sender] });
              } catch (_) {
                await sock.sendMessage(groupJid, { text: `⚠️ @${sender.split('@')[0]} please don't share links!`, mentions: [sender] }, { quoted: message });
              }
            }
          }
          continue;
        }

        const args    = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        pushLog(botId, {
          time:    Date.now(),
          sender:  sender.split('@')[0],
          command,
          args:    args.join(' '),
          isGroup,
          group:   groupJid ? groupJid.split('@')[0] : null
        });

        // ── Website-first: only registered users can use commands ─────────────
        let user = await User.findOne({ jid: sender });

        if (!user || !user.registered) {
          const phone = sender.split('@')[0];
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
    const existing    = pairingStore.get(botId);
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

app.get('/api/bots', async (_req, res) => {
  try {
    const bots = await BotConfig.find().lean();
    res.json(bots.map(bot => {
      const inst    = botInstances.get(bot.botId);
      const pairing = pairingStore.get(bot.botId);
      return {
        _id:         bot.botId,
        botId:       bot.botId,
        botName:     bot.name,
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

app.get('/api/bots/:id/logs', (req, res) => {
  const log = commandLogs.get(req.params.id) || [];
  res.json([...log].reverse());
});

app.delete('/api/bots/:id/logs', (req, res) => {
  commandLogs.set(req.params.id, []);
  res.json({ success: true });
});

async function handleAddBot(req, res) {
  try {
    const body = req.body;
    const name  = body.botName  || body.name;
    const phone = body.phoneNumber || body.phone;
    const avatar = body.avatarData || body.avatar;

    if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) return res.status(400).json({ error: 'Phone number too short — include country code' });

    const botId = 'bot_' + Date.now();
    const avatarData = avatar?.startsWith('data:image') ? avatar : null;

    await BotConfig.create({ botId, name: name.trim(), phone: rawPhone, avatarData, createdAt: new Date().toISOString() });
    await startBot(botId);

    // Wait up to 12s for pairing code to appear
    let waitMs = 0;
    while (!pairingStore.has(botId) && waitMs < 12000) {
      await new Promise(r => setTimeout(r, 500));
      waitMs += 500;
    }
    const pairingFinal = pairingStore.get(botId);
    const inst = botInstances.get(botId);

    res.json({
      _id:         botId,
      botId:       botId,
      botName:     name.trim(),
      phoneNumber: rawPhone,
      avatarData,
      createdAt:   new Date().toISOString(),
      status:      inst?.status || 'connecting',
      isConnected: false,
      pairingCode: pairingFinal?.code || null,
      needsCode:   !!(inst?.needsCode),
      messages: 0, uptime: 0
    });
  } catch (err) {
    console.error('Add bot error:', err);
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/bots/add', handleAddBot);
app.post('/api/bots',     handleAddBot);

async function handlePairingCode(req, res) {
  const { id } = req.params;
  const bot = await BotConfig.findOne({ botId: id }).lean();
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  killBot(id);
  await BotSession.deleteMany({ botId: id }).catch(() => {});

  try {
    await startBot(id);

    // Wait up to 10s for pairing code
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
}

app.post('/api/bots/:id/pairing-code',  handlePairingCode);
app.post('/api/bots/:id/request-code',  handlePairingCode);

app.delete('/api/bots/:id', async (req, res) => {
  const { id } = req.params;
  killBot(id);
  commandLogs.delete(id);
  await BotConfig.deleteOne({ botId: id });
  await BotSession.deleteMany({ botId: id }).catch(() => {});
  res.json({ success: true });
});

app.post('/api/bots/:id/restart', async (req, res) => {
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
  console.log(`Auto-starting registered bot(s)…`);
  for (const bot of bots) {
    try {
      const { state } = await useMongoDBAuthState(bot.botId);
      if (!state.creds.registered) {
        console.log(`  ⏭ ${bot.name} — not paired yet, skipping auto-start`);
        continue;
      }
      await startBot(bot.botId);
    } catch (e) { console.error(`  ✗ ${bot.botId}:`, e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
})();
