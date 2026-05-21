require('dotenv').config();

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
const BotSession            = require('./src/models/BotSession');
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

app.options('*', cors());
app.use(express.json());

// Mount all website-sync API routes at /api
app.use('/api', websiteSyncRoutes);

// Health check with session info
app.get('/health', (_req, res) => {
  const isConnected = global.botSocket?.user?.id ? true : false;
  res.json({ 
    status: 'ok', 
    bot: 'Aqua Bot',
    connected: isConnected,
    botJid: global.botSocket?.user?.id || null,
    timestamp: new Date().toISOString(),
  });
});

const API_PORT = process.env.PORT || 3000;
app.listen(API_PORT, () => {
  console.log(`✅ API server running on port ${API_PORT}`);
  console.log(`🌐 CORS enabled for: ${WEBSITE_URL}`);
});

// ── Bot state ─────────────────────────────────────────────────────────────────
let sock              = null;
let reconnectAttempts = 0;
let savedPhoneNumber  = process.env.BOT_NUMBER || '';
let botSession        = null;

// Store socket globally for API access
global.botSocket = null;

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

// ── Improved user lookup by JID or LID ────────────────────────────────────────
async function findOrCreateUser(identifier, pushName) {
  /**
   * identifier can be either:
   *  - JID format: "234xxxxxxxx@s.whatsapp.net"
   *  - LID format: "xxx@lid"
   *  - Group JID: "xxxxx@g.us"
   * 
   * Returns the user document and ensures JID is canonical
   */
  
  if (!identifier) return null;
  
  try {
    // Handle groups - create minimal Group doc
    if (isJidGroup(identifier)) {
      let group = await Group.findOne({ jid: identifier });
      if (!group) {
        group = new Group({ jid: identifier, name: pushName || identifier });
        await group.save();
      }
      return group;
    }

    // For user messages: try to find by either JID or LID
    const isLid = identifier.includes('@lid');
    
    let user;
    if (isLid) {
      // If it's a LID, try to find by LID first
      user = await User.findOne({ lid: identifier });
      
      // If not found by LID but we have the JID, create a new doc
      if (!user) {
        console.warn(`⚠️  Got LID ${identifier} but no JID mapping yet`);
        // This shouldn't happen with v6+, but handle gracefully
        return null;
      }
    } else {
      // JID format - this is what we store primarily
      user = await User.findOne({ jid: identifier });
      
      if (!user) {
        // Auto-create user on first message
        const phoneNumber = identifier.split('@')[0];
        user = new User({
          jid: identifier,
          name: pushName || phoneNumber,
        });
        await user.save();
        console.log(`✅ Auto-created user: ${identifier}`);
      }
    }

    // Update name if we got a new pushName
    if (user && pushName && user.name !== pushName) {
      user.name = pushName;
      await user.save();
    }

    return user;

  } catch (err) {
    console.error(`❌ Error finding/creating user ${identifier}:`, err.message);
    return null;
  }
}

// ── startBot ──────────────────────────────────────────────────────────────────
async function startBot() {
  await connectDB();

  // Load or create bot session from MongoDB
  try {
    botSession = await BotSession.getOrCreate('default');
    console.log(`📋 Bot session loaded: ${botSession.sessionId}`);
  } catch (err) {
    console.error('Failed to load bot session:', err.message);
    botSession = null;
  }

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

  // Store in global and BotSession
  global.botSocket = sock;

  let credsSavedThisSession = false;
  let pairingCodeSent = false;

  sock.ev.on('creds.update', () => {
    credsSavedThisSession = true;
    saveCreds();
    
    // Also save credentials to MongoDB for persistence
    if (botSession) {
      botSession.authState = {
        creds: state.creds,
        keys: state.keys,
      };
      botSession.save().catch(err => console.error('Failed to save bot session:', err.message));
    }
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
        if (botSession) {
          botSession.setStatus('disconnected').catch(console.error);
        }
        setTimeout(startBot, 2000);
      } else if (!hadCredentials && !credsSavedThisSession && !pairingCodeSent) {
        // Connection closed before we even sent the pairing code — don't loop
        return;
      } else {
        // Reconnect: covers both normal drops AND mid-pairing handshake drops.
        // WhatsApp briefly closes the socket after the user enters the code
        // (before creds.update fires). Without this reconnect the device shows
        // "Couldn't link Device".
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 15000);
        console.log(`🔄 Reconnecting in ${delay / 1000}s…`);
        if (botSession) {
          botSession.recordError(lastDisconnect?.error, statusCode).catch(console.error);
        }
        setTimeout(startBot, delay);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      const botJid = sock.user?.id;
      
      console.log('\n✅ Bot connected!');
      console.log(`🤖 Bot Name: ${config.BOT_NAME}`);
      console.log(`📱 Logged in as: ${botJid}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ Aqua Bot is ready! Send .menu to get started.');
      
      // Update bot session
      if (botSession) {
        botSession.botNumber = botJid?.split('@')[0];
        botSession.botJid = botJid;
        botSession.setStatus('connected').catch(console.error);
      }
    }
  });

  // Pairing code flow
  if (!hadCredentials && savedPhoneNumber) {
    // Wait 3500ms so the WebSocket handshake with WhatsApp's servers is fully
    // complete before we call requestPairingCode. Too short a delay causes the
    // pairing request to arrive before the socket is ready, which results in
    // WhatsApp showing "Couldn't link Device" when the code is entered.
    await new Promise(res => setTimeout(res, 3500));
    console.log(`\n🔑 Requesting pairing code for: +${savedPhoneNumber}`);

    const tryPair = async (attemptsLeft) => {
      try {
        const code      = await sock.requestPairingCode(savedPhoneNumber);
        const formatted = code.match(/.{1,4}/g).join('-');
        pairingCodeSent = true;
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
        
        // Save pairing code to session
        if (botSession) {
          botSession.pairingCode = formatted;
          botSession.pairingCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
          botSession.setStatus('pairing').catch(console.error);
        }
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

        // Find or create user - use improved method that handles JID/LID
        let user = await findOrCreateUser(sender, message.pushName);
        if (!user) {
          console.warn(`⚠️  Could not find/create user for ${sender}`);
          continue;
        }

        // If user was just found/created and it's a group context, ensure lid is tracked
        if (message.key.id) {
          // Store message ID for tracking in case of LID updates later
          // This helps us maintain continuity across JID/LID changes
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

        // Increment stats
        if (botSession) {
          botSession.commandsExecuted += 1;
          botSession.markActive().catch(console.error);
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
