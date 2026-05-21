const User = require('../models/User');
const config = require('../config');

function decodeJid(jid) {
  if (!jid) return jid;
  if (jid.includes(':')) {
    const [user, rest] = jid.split(':');
    const [, server] = rest.split('@');
    return `${user}@${server}`;
  }
  return jid;
}

function extractPhone(jid) {
  if (!jid) return null;
  const decoded = decodeJid(jid);
  const user = decoded.split('@')[0];
  return user.replace(/\D/g, '');
}

function jidToPhone(jid) {
  return extractPhone(jid);
}

async function resolveUser(jid) {
  if (!jid) return null;
  const decoded = decodeJid(jid);
  return User.findByWhatsAppId(decoded);
}

async function isBotOwner(jid) {
  if (!jid) return false;
  const phone = extractPhone(jid);
  return config.OWNER_NUMBERS.includes(phone);
}

// FIX: was using User.findOne({jid}) which misses LID users
async function isBotAdmin(jid) {
  if (!jid) return false;
  if (await isBotOwner(jid)) return true;
  const user = await User.findByWhatsAppId(decodeJid(jid));
  return user ? (user.isAdmin === true) : false;
}

// FIX: was using User.findOne({jid}) which misses LID users
async function isBotMod(jid) {
  if (!jid) return false;
  if (await isBotAdmin(jid)) return true;
  const user = await User.findByWhatsAppId(decodeJid(jid));
  return user ? (user.isMod === true || user.isAdmin === true) : false;
}

// FIX: was using User.findOne({jid}) which misses LID users
async function getBotRole(jid) {
  if (!jid) return 'member';
  if (await isBotOwner(jid)) return 'owner';
  const user = await User.findByWhatsAppId(decodeJid(jid));
  if (!user) return 'member';
  if (user.isAdmin) return 'admin';
  if (user.isMod) return 'mod';
  return 'member';
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

module.exports = {
  decodeJid,
  extractPhone,
  jidToPhone,
  resolveUser,
  isBotOwner,
  isBotAdmin,
  isBotMod,
  getBotRole,
  formatMs,
  formatNumber,
};
