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

function isOwner(jid) {
  if (!jid) return false;
  const phoneFromJid = jid.split('@')[0];
  return config.OWNER_NUMBERS.includes(phoneFromJid);
}

function isOwnerJid(jid) {
  return isOwner(jid);
}

async function isBotMod(jid) {
  if (!jid) return false;
  if (isOwner(jid)) return true;
  try {
    const User = require('../models/User');
    const user = await User.findOne({ jid });
    return !!user?.isMod;
  } catch { return false; }
}

async function isBotAdmin(jid) {
  if (!jid) return false;
  if (isOwner(jid)) return true;
  try {
    const User = require('../models/User');
    const user = await User.findOne({ jid });
    return !!user?.isAdmin;
  } catch { return false; }
}

async function getBotRole(jid) {
  if (!jid) return 'user';
  if (isOwner(jid)) return 'owner';
  try {
    const User = require('../models/User');
    const user = await User.findOne({ jid });
    if (user?.isMod)   return 'mod';
    if (user?.isAdmin) return 'admin';
  } catch {}
  return 'user';
}

function getMentions(message) {
  return message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
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
  formatMs, formatMoney, getRandom, randomInt, getXpForLevel,
  isOwner, isOwnerJid, isBotMod, isBotAdmin, getBotRole,
  getMentions, getQuotedSender, getUserName,
  parseAmount, randomTitle,
};
