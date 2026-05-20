const sharp = require('sharp');
const axios = require('axios');
const { formatMoney } = require('./helpers');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getCircularAvatarBase64(avatarUrl, size) {
  if (!avatarUrl) return null;
  try {
    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
    const buf = await sharp(Buffer.from(res.data))
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (_) {
    return null;
  }
}

async function getCircularAvatarBuffer(avatarUrl, size) {
  if (!avatarUrl) return null;
  try {
    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
    const half = Math.floor(size / 2);
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="white"/></svg>`
    );
    const buf = await sharp(Buffer.from(res.data))
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    return buf;
  } catch (_) {
    return null;
  }
}

async function generateProfileCard(user, avatarUrl) {
  try {
    const W = 800, H = 800;
    const avatarBase64 = await getCircularAvatarBase64(avatarUrl, 220);
    const bankFormatted = formatMoney(user.bank || 0);
    const walletFormatted = formatMoney(user.wallet || 0);
    const xpCurrent = user.xp || 0;
    const xpMax = (user.level || 1) * 100;
    const xpBarFull = 300;
    const xpBarFill = Math.max(8, Math.floor(xpBarFull * Math.min(xpCurrent / xpMax, 1)));
    const rank = user.rank || '?';
    const level = user.level || 1;
    const name = escapeXml((user.name || 'Unknown').toUpperCase());
    const community = escapeXml(user.community || 'KONOSUBA');
    const avatarImg = avatarBase64
      ? `<image href="${avatarBase64}" x="290" y="200" width="220" height="220" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="400" cy="310" r="110" fill="#2a1a4e"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0535;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#0d0220;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#060115;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7040c0"/>
      <stop offset="100%" style="stop-color:#c080ff"/>
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#8040d0;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#8040d0;stop-opacity:0"/>
    </radialGradient>
    <clipPath id="avatarClip">
      <circle cx="400" cy="310" r="110"/>
    </clipPath>
    <filter id="textGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Subtle grid lines -->
  <line x1="0" y1="133" x2="${W}" y2="133" stroke="#ffffff06" stroke-width="1"/>
  <line x1="0" y1="266" x2="${W}" y2="266" stroke="#ffffff06" stroke-width="1"/>
  <line x1="0" y1="400" x2="${W}" y2="400" stroke="#ffffff06" stroke-width="1"/>
  <line x1="0" y1="533" x2="${W}" y2="533" stroke="#ffffff06" stroke-width="1"/>
  <line x1="0" y1="666" x2="${W}" y2="666" stroke="#ffffff06" stroke-width="1"/>
  <line x1="133" y1="0" x2="133" y2="${H}" stroke="#ffffff06" stroke-width="1"/>
  <line x1="266" y1="0" x2="266" y2="${H}" stroke="#ffffff06" stroke-width="1"/>
  <line x1="400" y1="0" x2="400" y2="${H}" stroke="#ffffff06" stroke-width="1"/>
  <line x1="533" y1="0" x2="533" y2="${H}" stroke="#ffffff06" stroke-width="1"/>
  <line x1="666" y1="0" x2="666" y2="${H}" stroke="#ffffff06" stroke-width="1"/>

  <!-- Center glow behind avatar -->
  <circle cx="400" cy="310" r="200" fill="url(#glowGrad)"/>

  <!-- Top-left stats -->
  <text x="30" y="45" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">Bank: ${bankFormatted}</text>
  <text x="30" y="78" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">Wallet: ${walletFormatted}</text>

  <!-- Bunny ears (left) -->
  <ellipse cx="320" cy="155" rx="42" ry="88" fill="#9060c8" transform="rotate(-12 320 155)"/>
  <ellipse cx="320" cy="155" rx="26" ry="62" fill="#e0c8ff" transform="rotate(-12 320 155)"/>
  <rect x="290" y="195" width="30" height="20" rx="5" fill="#9060c8"/>

  <!-- Bunny ears (right) -->
  <ellipse cx="480" cy="155" rx="42" ry="88" fill="#9060c8" transform="rotate(12 480 155)"/>
  <ellipse cx="480" cy="155" rx="26" ry="62" fill="#e0c8ff" transform="rotate(12 480 155)"/>
  <rect x="480" y="195" width="30" height="20" rx="5" fill="#9060c8"/>

  <!-- Hood outer ring (purple) -->
  <ellipse cx="400" cy="300" rx="175" ry="155" fill="#7840b8"/>

  <!-- Hood middle ring (lighter) -->
  <ellipse cx="400" cy="300" rx="158" ry="140" fill="#9060d0"/>

  <!-- Hood inner (white fluffy trim) -->
  <ellipse cx="400" cy="300" rx="136" ry="122" fill="#d8c0f8"/>

  <!-- Avatar image -->
  ${avatarImg}

  <!-- Avatar border ring -->
  <circle cx="400" cy="310" r="113" fill="none" stroke="#6030a8" stroke-width="4" opacity="0.8"/>

  <!-- Bell at bottom of hood -->
  <circle cx="400" cy="435" r="20" fill="#f0c030" filter="url(#softGlow)"/>
  <circle cx="400" cy="435" r="20" fill="none" stroke="#c09010" stroke-width="2"/>
  <ellipse cx="400" cy="428" rx="5" ry="4" fill="#a07010"/>
  <line x1="397" y1="432" x2="403" y2="432" stroke="#a07010" stroke-width="1.5"/>

  <!-- Name text -->
  <text x="400" y="502" font-family="Arial Black,Impact,sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="white" filter="url(#textGlow)" letter-spacing="3">${name}</text>

  <!-- Status/bio line (uses rpg class as placeholder) -->
  <text x="400" y="538" font-family="Arial,sans-serif" font-size="19" text-anchor="middle" fill="#cc99ff" font-style="italic">(${escapeXml(user.rpg?.class || 'Adventurer')})</text>

  <!-- Rank and level -->
  <text x="400" y="576" font-family="Arial,sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#e0ccff">Rank #${rank} Level ${level}</text>

  <!-- XP Bar track -->
  <rect x="250" y="592" width="${xpBarFull}" height="28" rx="14" fill="#ffffff18"/>

  <!-- XP Bar fill -->
  <rect x="250" y="592" width="${xpBarFill}" height="28" rx="14" fill="url(#xpGrad)"/>

  <!-- XP bar shimmer -->
  <rect x="255" y="596" width="${Math.max(0, xpBarFill - 10)}" height="8" rx="4" fill="#ffffff30"/>

  <!-- XP text -->
  <text x="400" y="612" font-family="Arial,sans-serif" font-size="15" text-anchor="middle" fill="white">${xpCurrent} / ${xpMax} XP</text>

  <!-- Separator -->
  <line x1="120" y1="650" x2="${W - 120}" y2="650" stroke="#ffffff28" stroke-width="1"/>

  <!-- Footer community name -->
  <text x="400" y="690" font-family="Arial,sans-serif" font-size="22" text-anchor="middle" fill="#ffffff60" letter-spacing="2">${community} - Family</text>
</svg>`;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return buffer;
  } catch (err) {
    console.error('Profile card error:', err.message);
    return null;
  }
}

async function generateBalanceCard(user, avatarUrl) {
  try {
    const W = 520, H = 300;
    const avatarBase64 = await getCircularAvatarBase64(avatarUrl, 90);
    const bankFormatted = formatMoney(user.bank || 0);
    const walletFormatted = formatMoney(user.wallet || 0);
    const maxCap = formatMoney(user.bankLimit || 0);
    const total = formatMoney((user.wallet || 0) + (user.bank || 0));
    const name = escapeXml(user.name || 'Unknown');
    const accNo = escapeXml(user.accNo || '');

    const avatarImg = avatarBase64
      ? `<image href="${avatarBase64}" x="20" y="20" width="90" height="90" clip-path="url(#avaClip)"/>`
      : `<circle cx="65" cy="65" r="45" fill="#1a0a30"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0720"/>
      <stop offset="100%" style="stop-color:#060110"/>
    </linearGradient>
    <clipPath id="avaClip">
      <circle cx="65" cy="65" r="45"/>
    </clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="12"/>
  <line x1="20" y1="${H - 1}" x2="${W - 20}" y2="${H - 1}" stroke="#7040c0" stroke-width="3" stroke-linecap="round"/>

  ${avatarImg}
  <circle cx="65" cy="65" r="46" fill="none" stroke="#7040c0" stroke-width="2"/>

  <text x="125" y="45" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="white">${name}</text>
  <text x="125" y="68" font-family="Arial,sans-serif" font-size="13" fill="#9070c0">Balance</text>
  <text x="125" y="90" font-family="Arial,sans-serif" font-size="13" fill="#9070c0">Acc #${accNo}</text>

  <line x1="20" y1="128" x2="${W - 20}" y2="128" stroke="#ffffff18" stroke-width="1"/>

  <text x="30" y="115" font-family="Arial,sans-serif" font-size="18" font-weight="bold" fill="white">ACCOUNT BALANCE</text>

  <text x="30" y="155" font-family="Arial,sans-serif" font-size="16" fill="#ccaaff">💸 Wallet:</text>
  <text x="200" y="155" font-family="Arial,sans-serif" font-size="16" fill="white">[ ${walletFormatted} ]</text>

  <text x="30" y="183" font-family="Arial,sans-serif" font-size="16" fill="#ccaaff">🏦 Bank:</text>
  <text x="200" y="183" font-family="Arial,sans-serif" font-size="16" fill="white">[ ${bankFormatted} ]</text>

  <text x="30" y="211" font-family="Arial,sans-serif" font-size="16" fill="#ccaaff">🌌 Max Capacity:</text>
  <text x="200" y="211" font-family="Arial,sans-serif" font-size="16" fill="white">[ ${maxCap} ]</text>

  <line x1="20" y1="225" x2="${W - 20}" y2="225" stroke="#ffffff18" stroke-width="1"/>

  <text x="30" y="254" font-family="Arial,sans-serif" font-size="17" fill="#ccaaff">💎 Total:</text>
  <text x="200" y="254" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="#a060ff">[ ${total} ]</text>
</svg>`;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch (err) {
    console.error('Balance card error:', err.message);
    return null;
  }
}

module.exports = { generateProfileCard, generateBalanceCard, getCircularAvatarBuffer };
