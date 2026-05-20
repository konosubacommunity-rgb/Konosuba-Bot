require('dotenv').config();

// ── Keep the process alive even if a bot crashes ──────────────────────────────
process.on('uncaughtException',       err => console.error('uncaughtException:', err.message));
process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));

const express = require('express');
const cors    = require('cors');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  isJidGroup,
  Browsers
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs   = require('fs');
const pino = require('pino');

// ── Bot logic imports ─────────────────────────────────────────────────────────
const { connectDB }        = require('./src/database');
const config               = require('./src/config');
const User                 = require('./src/models/User');
const Group                = require('./src/models/Group');

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

// ── Website sync API routes ───────────────────────────────────────────────────
const websiteSyncRoutes = require('./src/routes/website-sync');

const app  = express();
const PORT = process.env.WEB_PORT || process.env.PORT || 3000;

// ── CORS — allow the Vercel website to talk to this server ────────────────────
app.use(cors({
  origin: process.env.WEBSITE_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Mount website sync routes at /api ─────────────────────────────────────────
//  Provides: /api/auth/signup, /api/auth/login, /api/user/:phone,
//            /api/user/:phone/activity, /api/leaderboard, /api/sync
app.use('/api', websiteSyncRoutes);

// ── Health check (for UptimeRobot to ping so Render doesn't sleep) ────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

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
// id → { sock, status, messages, startTime, registered, needsCode }
const botInstances = new Map();
const pairingStore = new Map(); // id → { code, expiresAt }

// Per-bot circular command log (max 100 entries each)
const LOG_MAX = 100;
const commandLogs = new Map(); // id → Array<LogEntry>

function pushLog(botId, entry) {
  if (!commandLogs.has(botId)) commandLogs.set(botId, []);
  const log = commandLogs.get(botId);
  log.push(entry);
  if (log.length > LOG_MAX) log.shift();
}

// ── Core: start a bot ─────────────────────────────────────────────────────────
async function startBot(botId) {
  const bots      = loadBots();
  const botConfig = bots[botId];
  if (!botConfig) throw new Error('Bot config not found');

  const sessionDir = path.join(SESSIONS_DIR, botId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Fetch latest WA version — fall back to a known-good version if the
  // network request fails (common on Render cold starts).
  let version = [2, 3000, 1015901307];
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
  } catch (e) {
    console.warn(`[${botConfig.name}] Could not fetch latest WA version, using fallback`);
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
    generateHighQualityLinkPreview: false,  // saves memory on free tier
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
        console.log(`[${botConfig.name}] Logged out — clearing session`);
        inst.status = 'disconnected';
        pairingStore.delete(botId);
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } else if (!hadCreds && !credsSaved) {
        // No creds at all — but if we have a valid pairing code the user
        // might still enter it, so keep the socket alive by reconnecting.
        const pending = pairingStore.get(botId);
        if (pending && pending.expiresAt > Date.now()) {
          console.log(`[${botConfig.name}] Socket closed while pairing code pending — reconnecting to keep listening…`);
          inst.status = 'connecting';
          setTimeout(() => startBot(botId).catch(e => console.error(e.message)), 5000);
        } else {
          console.log(`[${botConfig.name}] Pairing connection closed (no creds saved)`);
          inst.status = 'disconnected';
        }
      } else {
        // Normal reconnect after established session disconnect
        inst.status = 'reconnecting';
        console.log(`[${botConfig.name}] Reconnecting in 5s…`);
        setTimeout(() => startBot(botId).catch(e => console.error(e.message)), 5000);
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

  // ── Full command handling ─────────────────────────────────────────────────
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

        // Track group member activity
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
                await sock.sendMessage(groupJid, {
                  text: `⚠️ @${sender.split('@')[0]} was removed for sharing invite links!`,
                  mentions: [sender]
                });
              } catch (_) {
                await sock.sendMessage(groupJid, {
                  text: `⚠️ @${sender.split('@')[0]} please don't share links!`,
                  mentions: [sender]
                }, { quoted: message });
              }
            }
          }
          continue;
        }

        const args    = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        // ── Log the command ───────────────────────────────────────────────
        pushLog(botId, {
          time:    Date.now(),
          sender:  sender.split('@')[0],
          command,
          args:    args.join(' '),
          isGroup,
          group:   groupJid ? groupJid.split('@')[0] : null
        });

        let user = await User.findOne({ jid: sender });
        if (!user) {
          user = new User({ jid: sender, name: message.pushName || sender.split('@')[0] });
          await user.save();
        } else if (user.name !== message.pushName && message.pushName) {
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
        console.error(`[${botConfig.name}] ⚠️ Error handling message:`, err.message);
      }
    }
  });

  // ── Welcome / goodbye messages ────────────────────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const group = await Group.findOne({ jid: id });
      if (!group) return;

      for (const participant of participants) {
        if (action === 'add' && group.welcome) {
          await sock.sendMessage(id, {
            text: `👋 Welcome to the group, @${participant.split('@')[0]}!\n\n🎉 We're happy to have you here!\nType *.menu* to see what I can do!`,
            mentions: [participant]
          });
        }
        if (action === 'remove' && group.goodbye) {
          await sock.sendMessage(id, {
            text: `👋 Goodbye @${participant.split('@')[0]}! We'll miss you!`,
            mentions: [participant]
          });
        }
      }
    } catch (err) {
      console.error(`[${botConfig.name}] Group update error:`, err.message);
    }
  });

  // ── Request pairing code ──────────────────────────────────────────────────
  if (!state.creds.registered) {
    // If we already issued a valid code (from a previous socket that closed
    // while waiting for the user to scan), do NOT request another one.
    // Just reconnect silently and wait for the user to enter the code.
    const existing = pairingStore.get(botId);
    const hasValidCode = existing && existing.expiresAt > Date.now();

    if (hasValidCode) {
      console.log(`[${botConfig.name}] Reconnected — waiting for pairing code to be entered (${existing.code})`);
    } else {
      // Run pairing in background so the HTTP response isn't held up
      (async () => {
        // Give the socket time to stabilise before requesting the code
        await new Promise(r => setTimeout(r, 4000));

        const phone = botConfig.phone.replace(/\D/g, '');
        console.log(`[${botConfig.name}] Requesting pairing code for +${phone}…`);

        const tryPair = async (attemptsLeft) => {
          try {
            const raw  = await sock.requestPairingCode(phone);
            const code = raw.match(/.{1,4}/g).join('-');
            pairingStore.set(botId, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
            const inst = botInstances.get(botId);
            if (inst) inst.needsCode = false;
            console.log(`[${botConfig.name}] ✓ Pairing code: ${code}`);
          } catch (err) {
            console.error(`[${botConfig.name}] Pairing attempt failed: ${err.message}`);
            if (attemptsLeft > 0) {
              console.log(`[${botConfig.name}] Retrying in 5s… (${attemptsLeft} left)`);
              await new Promise(r => setTimeout(r, 5000));
              return tryPair(attemptsLeft - 1);
            }
            const inst = botInstances.get(botId);
            if (inst) inst.needsCode = true;
            console.error(`[${botConfig.name}] Could not get pairing code after all attempts`);
          }
        };

        await tryPair(3);
      })().catch(e => console.error(`[${botConfig.name}] Pairing background error:`, e.message));
    }
  }
}

// ── Kill a bot socket cleanly ─────────────────────────────────────────────────
function killBot(botId) {
  const inst = botInstances.get(botId);
  if (inst?.sock) { try { inst.sock.end(new Error('killed')); } catch {} }
  botInstances.delete(botId);
  pairingStore.delete(botId);
}

// ── Bot Manager REST API ──────────────────────────────────────────────────────

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

app.get('/api/bots/:id/logs', (req, res) => {
  const { id }  = req.params;
  const bots    = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });
  const log = commandLogs.get(id) || [];
  res.json([...log].reverse());
});

app.delete('/api/bots/:id/logs', (req, res) => {
  commandLogs.set(req.params.id, []);
  res.json({ success: true });
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

app.post('/api/bots/:id/request-code', async (req, res) => {
  const { id } = req.params;
  const bots   = loadBots();
  if (!bots[id]) return res.status(404).json({ error: 'Bot not found' });

  killBot(id);

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
  commandLogs.delete(id);
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

// ── Catch-all: serve Bot Manager UI ──────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();

  app.listen(PORT, () => console.log(`\n🌊  Aqua Bot Manager → http://localhost:${PORT}\n`));

  const bots = loadBots();
  const ids  = Object.keys(bots);
  if (!ids.length) return;
  console.log(`Auto-starting ${ids.length} bot(s)…`);
  for (const id of ids) {
    try { await startBot(id); } catch (e) { console.error(`  ✗ ${id}:`, e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
})();
