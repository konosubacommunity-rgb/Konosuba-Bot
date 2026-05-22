const config = require('../config');

function isOwner(jid) {
  const num = jid.split('@')[0].replace(/\D/g, '');
  const owners = (process.env.OWNER_NUMBERS || config.OWNER_NUMBERS || '')
    .split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean);
  return owners.includes(num);
}

function formatMs(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ${h % 24}h`;
  if (h > 0)  return `${h}h ${m % 60}m`;
  if (m > 0)  return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatMoney(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000)     return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function parseAmount(str, wallet) {
  if (!str) return null;
  if (str === 'all' || str === 'max') return wallet || null;
  if (str.endsWith('%') && wallet) return Math.floor(wallet * (parseFloat(str) / 100));
  if (str.endsWith('k') || str.endsWith('K')) return Math.floor(parseFloat(str) * 1000);
  if (str.endsWith('m') || str.endsWith('M')) return Math.floor(parseFloat(str) * 1_000_000);
  const n = parseFloat(str.replace(/,/g, ''));
  return isNaN(n) ? null : Math.floor(n);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getQuotedSender(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.participant || null;
}

function capitalize(str) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { isOwner, formatMs, formatMoney, parseAmount, randomInt, getRandom, getMentions, getQuotedSender, capitalize };
