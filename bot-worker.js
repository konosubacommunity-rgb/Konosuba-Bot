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

const pino   = require('pino');
const path   = require('path');
const fs     = require('fs');

const { connectDB }          = require('./src/database');
const config                 = require('./src/config');
const User                   = require('./src/models/User');
const Group                  = require('./src/models/Group');

const { handleGeneral }      = require('./src/commands/general');
const { handleAdmin }        = require('./src/commands/admin');
const { handleEconomy }      = require('./src/commands/economy');
const { handleGambling }     = require('./src/commands/gambling');
const { handleFun }          = require('./src/commands/fun');
const { handleInteractions } = require('./src/commands/interactions');
const { handleGames, handleGameAnswer } = require('./src/commands/games');
const { handlePokemon }      = require('./src/commands/pokemon');
const { handleDownloader }   = require('./src/commands/downloader');
const { handleRpg }          = require('./src/commands/rpg');
const { handleGuild }        = require('./src/commands/guild');
const { isOwner }            = require('./src/utils/helpers');

const SESSION_DIR = path.join(__dirname, 'session');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const logger = pino({ level: 'warn' });

let reconnectAttempts = 0;
const BOT_PHONE = process.env.BOT_NUMBER || '';

function clearSession() {
  try {
    for (const file of fs.readdirSync(SESSION_DIR)) {
      fs.rmSync(path.join(SESSION_DIR, file), { recursive: true, force: true });
    }
    console.log('Session cleared.');
  } catch (e) {
    console.log('Could not clear session:', e.message);
  }
}

// ── Normalise a raw WhatsApp ID to a proper JID ──────────────────────────────
//
// WhatsApp v6+ uses LIDs (xxx@lid) in group participant fields.
// We always want to work with standard JIDs (phone@s.whatsapp.net).
// If the ID ends with @lid we return it as-is — the model's findByWhatsAppId
// static handles both forms.  We never silently drop an identifier.
//
function resolveJid(id) {
  if (!id) return id;
  // Already a standard user JID
  if (id.endsWith('@s.whatsapp.net')) return id;
  // Group JID — returned unchanged
  if (id.endsWith('@g.us')) return id;
  // LID — return as-is; User.findByWhatsAppId handles it
  return id;
}

// ── Find or create a user, supporting both JID and LID ───────────────────────
async function findOrCreateUser(sender, pushName) {
  // Try JID first, then LID
  let user = await User.findByWhatsAppId(sender);

  if (!user) {
    const isLid = sender.includes('@lid');
    const doc = isLid
      ? { lid: sender, name: pushName || sender.split('@')[0] }
      : { jid: sender, name: pushName || sender.split('@')[0] };

    // Use findOneAndUpdate with upsert to avoid race conditions
    user = await User.findOneAndUpdate(
      isLid ? { lid: sender } : { jid: sender },
      { $setOnInsert: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else if (pushName && user.name !== pushName) {
    user.name = pushName;
    await user.save();
  }

  return user;
}

async function startBot() {
  await connectDB();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const hadCredentials = !!state.creds.registered;

  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WA v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser:                        Browsers.ubuntu('Chrome'),
    printQRInTerminal:              false,
    generateHighQualityLinkPreview: true,
    getMessage:                     async () => ({ conversation: '' }),
    defaultQueryTimeoutMs:          60000,
    connectTimeoutMs:               60000,
    keepAliveIntervalMs:            10000,
    retryRequestDelayMs:            250,
  });

  // ── Request pairing code immediately after socket creation ────────────────
  //
  // requestPairingCode MUST be called before the connection opens.
  // Calling it inside connection === 'open' is too late and will fail.
  //
  let pairingCodeSent = false;

  if (!hadCredentials && BOT_PHONE) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(BOT_PHONE.replace(/\D/g, ''));
        const formatted = code.match(/.{1,4}/g).join('-');
        pairingCodeSent = true;
        console.log(`\n╔══════════════════════════════╗`);
        console.log(`║  PAIRING CODE: ${formatted}  ║`);
        console.log(`╚══════════════════════════════╝`);
        console.log('Open WhatsApp → Settings → Linked Devices → Link a Device\n');
      } catch (err) {
        console.error('Could not get pairing code:', err.message);
      }
    }, 3500);
  }

  let credsSavedThisSession = false;
  sock.ev.on('creds.update', () => { credsSavedThisSession = true; saveCreds(); });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut  = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('Logged out — clearing session and restarting…');
        clearSession();
        reconnectAttempts = 0;
        setTimeout(startBot, 2000);
      } else if (!hadCredentials && !credsSavedThisSession && !pairingCodeSent) {
        // Connection closed before pairing code was sent — don't loop
        return;
      } else {
        // Reconnect: covers normal drops AND the mid-pairing handshake close
        // that WhatsApp sends after the user enters the code (before creds.update).
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 15000);
        console.log(`Reconnecting in ${delay / 1000}s…`);
        setTimeout(startBot, delay);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('Bot connected!');
      console.log(`Bot Name: ${config.BOT_NAME}`);
      console.log(`Logged in as: ${sock.user?.id}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        if (!message.message)                          continue;
        if (message.key.fromMe)                        continue;
        if (isJidBroadcast(message.key.remoteJid))     continue;

        // Resolve sender — normalise LID to JID where possible
        const rawSender = message.key.participant || message.key.remoteJid;
        const sender    = resolveJid(rawSender);

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

        if (isGroup) {
          try {
            const now     = new Date();
            // Use sender JID (or LID) consistently
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

        const args    = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        // ── Lookup user by JID or LID — never assume it's always a JID ──────
        let user = await User.findByWhatsAppId(sender);
        if (!user) {
          user = await findOrCreateUser(sender, message.pushName);
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
        console.error('Error handling message:', err.message);
      }
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const group = await Group.findOne({ jid: id });
      if (!group) return;

      for (const participant of participants) {
        if (action === 'add' && group.welcome) {
          await sock.sendMessage(id, {
            text: `👋 Welcome to the group, @${participant.split('@')[0]}!\n\nType *.menu* to see what I can do!\nType *.reg* to link your WhatsApp account to our website! 🌐`,
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
}

process.on('uncaughtException',  (err)    => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

startBot().catch(console.error);
