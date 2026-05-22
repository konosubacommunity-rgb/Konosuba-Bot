/**
 * bot/handler.js — central Baileys message router.
 *
 * Called by bot-connect.js for every incoming message.
 * Dispatches to the appropriate command module.
 */

const config = require('../config');

const { handleEconomy }      = require('../commands/economy');
const { handleGambling }     = require('../commands/gambling');
const { handleAdmin }        = require('../commands/admin');
const { handleGeneral }      = require('../commands/general');
const { handleRpg }          = require('../commands/rpg');
const { handleGuild }        = require('../commands/guild');
const { handlePokemon }      = require('../commands/pokemon');
const { handleFun }          = require('../commands/fun');
const { handleGames }        = require('../commands/games');
const { handleInteractions } = require('../commands/interactions');
const { handleDownloader }   = require('../commands/downloader');

// Handler pipeline — order matters (admin before economy, etc.)
const HANDLERS = [
  handleGeneral,
  handleAdmin,
  handleEconomy,
  handleGambling,
  handleRpg,
  handleGuild,
  handlePokemon,
  handleFun,
  handleGames,
  handleInteractions,
  handleDownloader,
];

/**
 * Extract the sender JID from a message, preferring the real phone JID
 * over the LID that newer WhatsApp versions send.
 */
function getSender(msg) {
  const key = msg.key;
  if (key.fromMe) return null;

  // Group messages: sender is in key.participant
  // DMs: sender is key.remoteJid
  const raw = key.participant || key.remoteJid || '';

  // Prefer @s.whatsapp.net over @lid.whatsapp.net when both exist
  if (raw.includes('@lid')) {
    const pushJid = msg.pushName && raw; // keep as-is, model handles LID
  }
  return raw;
}

/**
 * Main entry point called by bot-connect.js
 * @param {object} sock     Baileys socket
 * @param {object} msg      Raw Baileys message object
 * @param {object} botInfo  { botId, phone, name }
 */
async function handleMessage(sock, msg, botInfo) {
  try {
    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      '';

    if (!body) return;

    const prefix = config.PREFIX || '.';
    if (!body.startsWith(prefix)) return;

    const sender = getSender(msg);
    if (!sender) return;

    const isGroup  = msg.key.remoteJid?.endsWith('@g.us');
    const groupJid = isGroup ? msg.key.remoteJid : null;

    const commandRaw = body.slice(prefix.length).trim().split(/\s+/);
    const command    = commandRaw[0].toLowerCase();
    const args       = commandRaw.slice(1);

    // Run through each handler; stop at the first that returns truthy
    for (const handler of HANDLERS) {
      const handled = await handler(sock, msg, command, args, sender, isGroup, groupJid);
      if (handled) break;
    }
  } catch (err) {
    console.error('[handler] Error processing message:', err.message);
  }
}

module.exports = { handleMessage };
