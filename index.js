const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  isJidGroup,
  Browsers,
} = require('@whiskeysockets/baileys');

const pino      = require('pino');
const readline  = require('readline');
const path      = require('path');
const fs        = require('fs');
const express   = require('express');
const cors      = require('cors');

const { connectDB }         = require('./src/database');
const config                = require('./src/config');
const User                  = require('./src/models/User');
const Group                 = require('./src/models/Group');
const websiteSyncRoutes     = require('./src/routes/website-sync');

const { handleGeneral }     = require('./src/commands/general');
const { handleAdmin }       = require('./src/commands/admin');
const { handleEconomy }     = require('./src/commands/economy');
const { handleGambling }    = require('./src/commands/gambling');
const { handleFun }         = require('./src/commands/fun');
const { handleInteractions }= require('./src/commands/interactions');
const { handleGames, handleGameAnswer } = require('./src/commands/games');
const { handlePokemon }     = require('./src/commands/pokemon');
const { handleDownloader }  = require('./src/commands/downloader');
const { handleRpg }         = require('./src/commands/rpg');
const { handleGuild }       = require('./src/commands/guild');
const { isOwner }           = require('./src/utils/helpers');

// ── Session directory ─────────────────────────────────────────────────────────
const SESSION_DIR = path.join(__dirname, 'session');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const logger = pino({ level: 'warn' });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, res));

// ── Express API ───────────────────────────────────────────────────────────────
const app = express();

// CORS — allow the Vercel website and local dev
// Set WEBSITE_URL env var on Render to your Vercel domain
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://konosubaweb.vercel.app';

app.use(cors({
  origin: [
    WEBSITE_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
  ],
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret'],
}));

// Handle pre-flight OPTIONS requests
app.options('*', cors());

app.use(express.json());

// Mount all website-sync API routes at /api
app.use('/api', websiteSyncRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', bot: 'Aqua Bot' }));

const API_PORT = process.env.PORT || 3000;
app.listen(API_PORT, () => {
  console.log(`✅ API server running on port ${API_PORT}`);
  console.log(`🌐 CORS enabled for: ${WEBSITE_URL}`);
});

// ── Bot state ─────────────────────────────────────────────────────────────────
let sock              = null;
let reconnectAttempts = 0;
let savedPhoneNumber  = process.env.BOT_NUMBER || '';

function clearSession() {
  try {
    for (const file of fs.readdirSync(SESSION_DIR)) {
      fs.rmSync(path.join(SESSION_DIR, file), { recursive: true, force: true });
    }
    console.log('🗑️  Session cleared.');
  } catch (e) {
    console.log('⚠️  Could not clear session files:', e.message);
  }
}

// ── startBot ──────────────────────────────────────────────────────────────────
async function startBot() {
  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const hadCredentials = !!state.creds.registered;

  if (!hadCredentials && !savedPhoneNumber) {
    const raw = await question('\n📱 Enter your WhatsApp number (with country code, no + or spaces): ');
    savedPhoneNumber = raw.trim().replace(/[^0-9]/g, '');
  }

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`\n✨ Using WA v${version.join('.')} (isLatest: ${isLatest})`);

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser:                    Browsers.ubuntu('Chrome'),
    printQRInTerminal:          false,
    generateHighQualityLinkPreview: true,
    getMessage:                 async () => ({ conversation: '' }),
    defaultQueryTimeoutMs:      60000,
    connectTimeoutMs:           60000,
    keepAliveIntervalMs:        10000,
    retryRequestDelayMs:        250,
  });

  let credsSavedThisSession = false;
  sock.ev.on('creds.update', () => {
    credsSavedThisSession = true;
    saveCreds();
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('\n🔑 Logged out — clearing session and restarting…');
        clearSession();
        reconnectAttempts = 0;
        setTimeout(startBot, 2000);
      } else if (!hadCredentials && !credsSavedThisSession) {
        return;
      } else {
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 15000);
        console.log(`🔄 Reconnecting in ${delay / 1000}s…`);
        setTimeout(startBot, delay);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('\n✅ Bot connected!');
      console.log(`🤖 Bot Name: ${config.BOT_NAME}`);
      console.log(`📱 Logged in as: ${sock.user?.id}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ Aqua Bot is ready! Send .menu to get started.');
    }
  });

  // Pairing code flow
  if (!hadCredentials && savedPhoneNumber) {
    await new Promise(res => setTimeout(res, 1500));
    console.log(`\n🔑 Requesting pairing code for: +${savedPhoneNumber}`);

    const tryPair = async (attemptsLeft) => {
      try {
        const code      = await sock.requestPairingCode(savedPhoneNumber);
        const formatted = code.match(/.{1,4}/g).join('-');
        console.log('\n╔════════════════════════════╗');
        console.log(`║   PAIRING CODE: ${formatted.padEnd(12)}║`);
        console.log('╚════════════════════════════╝');
        console.log('\n📲 How to pair:');
        console.log('   1. Open WhatsApp on your phone');
        console.log('   2. Go to Settings → Linked Devices');
        console.log('   3. Tap "Link a Device"');
        console.log('   4. Choose "Link with phone number instead"');
        console.log(`   5. Enter the code: ${formatted}`);
        console.log('\n⏳ Waiting for you to enter the code…\n');
      } catch (err) {
        if (attemptsLeft > 0) {
          console.log(`⚠️  Pairing failed (${err.message}), retrying in 3s…`);
          setTimeout(() => tryPair(attemptsLeft - 1), 3000);
        } else {
          console.log('❌ Could not get pairing code. Restarting…');
          setTimeout(startBot, 5000);
        }
      }
    };

    tryPair(4);
  }

  // ── Message handler ─────────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        if (!message.message)                          continue;
        if (message.key.fromMe)                        continue;
        if (isJidBroadcast(message.key.remoteJid))     continue;

        const sender   = message.key.participant || message.key.remoteJid;
        const groupJid = isJidGroup(message.key.remoteJid) ? message.key.remoteJid : null;
        const isGroup  = !!groupJid;
        const dest     = isGroup ? groupJid : sender;

        const body =
          message.message?.conversation                                              ||
          message.message?.extendedTextMessage?.text                                ||
          message.message?.imageMessage?.caption                                    ||
          message.message?.videoMessage?.caption                                    ||
          message.message?.buttonsResponseMessage?.selectedButtonId                 ||
          message.message?.listResponseMessage?.singleSelectReply?.selectedRowId   ||
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

        // Non-command messages
        if (!isCommand) {
          await handleGameAnswer(sock, message, body, sender, isGroup, groupJid);

          if (isGroup) {
            const group = await Group.findOne({ jid: groupJid });
            if (group?.antilink && body.match(/https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/)) {
              try {
                await sock.groupParticipantsUpdate(groupJid, [sender], 'remove');
                await sock.sendMessage(groupJid, {
                  text: `⚠️ @${sender.split('@')[0]} was removed for sharing invite links!`,
                  mentions: [sender],
                });
              } catch (_) {
                await sock.sendMessage(groupJid, {
                  text: `⚠️ @${sender.split('@')[0]} please don't share links!`,
                  mentions: [sender],
                }, { quoted: message });
              }
            }
          }
          continue;
        }

        // Parse command
        const args    = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        // Auto-create / update user document
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
          if (group?.mutedMembers?.includes(sender))       continue;
        }

        // Route to command handlers
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
        console.error('⚠️ Error handling message:', err.message);
      }
    }
  });

  // ── Group participant events ─────────────────────────────────────────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const group = await Group.findOne({ jid: id });
      if (!group) return;

      for (const participant of participants) {
        if (action === 'add' && group.welcome) {
          await sock.sendMessage(id, {
            text: `👋 Welcome to the group, @${participant.split('@')[0]}!\n\n🎉 We're happy to have you here!\nType *.menu* to see what I can do!\nType *.reg* to link your WhatsApp account to our website! 🌐`,
            mentions: [participant],
          });
        }
        if (action === 'remove' && group.goodbye) {
          await sock.sendMessage(id, {
            text: `👋 Goodbye @${participant.split('@')[0]}! We'll miss you!`,
            mentions: [participant],
          });
        }
      }
    } catch (err) {
      console.error('Group update error:', err.message);
    }
  });

  return sock;
}

// ── Process error guards ──────────────────────────────────────────────────────
process.on('uncaughtException',  (err)    => console.error('⚠️ Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('⚠️ Unhandled Rejection:', reason));

startBot().catch(console.error);
