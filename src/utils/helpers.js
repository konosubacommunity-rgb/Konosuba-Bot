const config = require('../config');

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatMoney(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getXpForLevel(level) {
  return level * 100;
}

/**
 * Check if a JID belongs to one of the owner numbers
 * @param {string} jid - The JID to check (e.g., "12232838631673@s.whatsapp.net")
 * @returns {boolean}
 */
function isOwner(jid) {
  if (!jid) return false;
  
  // Extract just the phone number from JID
  const phoneFromJid = jid.split('@')[0];
  
  // Check against all configured owner numbers
  return config.OWNER_NUMBERS.includes(phoneFromJid);
}

/**
 * Alias for isOwner
 */
function isOwnerJid(jid) {
  return isOwner(jid);
}

function getMentions(message) {
  const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentions;
}

function getQuotedSender(message) {
  return message.message?.extendedTextMessage?.contextInfo?.participant || null;
}

function getUserName(message) {
  return (
    message.pushName ||
    message.verifiedBizName ||
    message.key.remoteJid.split('@')[0]
  );
}

function parseAmount(str) {
  const n = parseInt(str, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

const ADJECTIVES = ['adventurous', 'bold', 'crafty', 'daring', 'epic', 'fierce', 'glorious', 'heroic', 'infamous', 'legendary'];
const NOUNS = ['dragon', 'phoenix', 'titan', 'warrior', 'knight', 'mage', 'rogue', 'hunter', 'paladin', 'wizard'];

function randomTitle() {
  return `${getRandom(ADJECTIVES)} ${getRandom(NOUNS)}`;
}

module.exports = {
  formatMs,
  formatMoney,
  getRandom,
  randomInt,
  getXpForLevel,
  isOwner,
  isOwnerJid,
  getMentions,
  getQuotedSender,
  getUserName,
  parseAmount,
  randomTitle,
};
