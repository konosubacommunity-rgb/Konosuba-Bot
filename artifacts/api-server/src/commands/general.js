const path = require('path');
const fs   = require('fs');
const config = require('../config');
const User   = require('../models/User');
const { formatMs, formatMoney, isOwner } = require('../utils/helpers');
const { generateProfileCard } = require('../utils/imageGen');

// FIX: use the env var — no hardcoded Vercel URL
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://konosuba-api.onrender.com';

const MENU_TEXT = `Hᴇʏʏʏʏʏ {user}... ɪ'ᴍ Aǫᴜᴀ ꜰʀᴏᴍ ᴛʜᴇ  𝐊𝚯𝐍𝚯𝐒𝐔𝐁𝚫 ᴄᴏᴍᴜɴɪᴛʏ ɴɪᴄᴇ ᴛᴏ ᴍᴇᴇᴛ ʏᴏᴜ!

Cʜᴇᴄᴋ ʙᴇʟᴏᴡ ғᴏʀ ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴏᴍᴍᴀɴᴅs ✦

*⚙️ ADMIN ⚙️*
┃
┃ ⤷ .kick @user
┃ ⤷ .mute @user
┃ ⤷ .unmute @user
┃ ⤷ .warn @user
┃ ⤷ .warnings @user
┃ ⤷ .clearwarns @user
┃ ⤷ .promote @user
┃ ⤷ .demote @user
┃ ⤷ .lockgroup / .unlockgroup
┃ ⤷ .setname <name>
┃ ⤷ .setdesc <description>
┃ ⤷ .tagall
┃ ⤷ .antilink on/off
┃ ⤷ .antispam on/off
┃ ⤷ .welcome on/off
┃ ⤷ .goodbye on/off
┃ ⤷ .invitelink
┃ ⤷ .addmod @user
┃
╰━━━━━━━━━━━━━━━━

*💰 ECONOMY 💰*
┃
┃ ⤷ .balance / .bal
┃ ⤷ .deposit <amount>
┃ ⤷ .withdraw <amount>
┃ ⤷ .pay @user <amount>
┃ ⤷ .daily / .weekly / .monthly
┃ ⤷ .work / .beg / .crime / .fish / .dig
┃ ⤷ .rob @user
┃ ⤷ .market / .buy / .sell / .inventory
┃ ⤷ .topmoney / .topbank
┃ ⤷ .profile / .p
┃
╰━━━━━━━━━━━━━━━━

*🎲 GAMBLING 🎲*
┃
┃ ⤷ .coinflip <amount>
┃ ⤷ .slots <amount>
┃ ⤷ .blackjack <amount>
┃ ⤷ .roulette <amount>
┃ ⤷ .dice <amount>
┃ ⤷ .lottery
┃ ⤷ .bet <amount>
┃ ⤷ .highlow <amount>
┃ ⤷ .crash <amount>
┃
╰━━━━━━━━━━━━━━━━

*🎉 FUN 🎉*
┃
┃ ⤷ .joke / .quote / .fact
┃ ⤷ .8ball <question>
┃ ⤷ .truth / .dare
┃ ⤷ .ship @user @user
┃ ⤷ .rps <rock/paper/scissors>
┃ ⤷ .wouldyourather
┃
╰━━━━━━━━━━━━━━━━

*💞 INTERACTIONS 💞*
┃
┃ ⤷ .hug / .kiss / .pat / .slap / .punch
┃ ⤷ .cuddle / .poke / .tickle / .wave
┃ ⤷ .blush / .smile / .cry / .dance
┃
╰━━━━━━━━━━━━━━━━

*🎮 GAMES 🎮*
┃
┃ ⤷ .hangman / .quiz / .trivia
┃ ⤷ .riddle / .guessnumber / .fasttype
┃ ⤷ .tictactoe @user / .duel @user
┃
╰━━━━━━━━━━━━━━━━

*🐾 POKÉMON 🐾*
┃
┃ ⤷ .pokemon / .party / .starter
┃ ⤷ .catch / .hunt / .battle @user
┃ ⤷ .heal / .evolve / .pokeshop
┃
╰━━━━━━━━━━━━━━━━

*⚔️ RPG ⚔️*
┃
┃ ⤷ .rpg / .stats / .hunt / .boss
┃ ⤷ .dungeon / .shop / .equip / .forge
┃
╰━━━━━━━━━━━━━━━━

*🏰 GUILD 🏰*
┃
┃ ⤷ .createguild <name>
┃ ⤷ .guild / .joinguild / .leaveguild
┃ ⤷ .invite @user / .guildtop
┃
╰━━━━━━━━━━━━━━━━

*⬇️ DOWNLOADER ⬇️*
┃
┃ ⤷ .play <song>
┃ ⤷ .ytmp3 / .ytmp4 <link>
┃ ⤷ .tiktok / .instagram / .facebook <link>
┃
╰━━━━━━━━━━━━━━━━`;

async function handleGeneral(sock, message, command, args, sender, isGroup, groupJid) {
  const dest     = isGroup ? groupJid : sender;
  const userName = message.pushName || sender.split('@')[0];

  if (command === 'menu') {
    const menuText = MENU_TEXT.replace('{user}', userName);
    const menuImagePath = path.join(__dirname, '../../assets/menu.jpg');
    try {
      const imageBuffer = fs.readFileSync(menuImagePath);
      await sock.sendMessage(dest, { image: imageBuffer, caption: menuText }, { quoted: message });
    } catch {
      // If image not found, send as text
      await sock.sendMessage(dest, { text: menuText }, { quoted: message });
    }
    return true;
  }

  if (command === 'mods') {
    const modUsers = await User.find({ isMod: true });
    // Use canonical phone field or derive from JID
    const mods = modUsers.map(u => u.jid || `${u.phone}@s.whatsapp.net`).filter(Boolean);
    const modList = mods.length === 0
      ? '> No moderators set yet.'
      : mods.map(m => `🩵 @${m.split('@')[0]}`).join('\n');

    await sock.sendMessage(dest, {
      text: `Hᴇʟʟᴏ ${userName}, ᴛʜɪꜱ ᴀʀᴇ ᴍʏ ᴍᴏᴅᴇʀᴀᴛᴏʀꜱ ɪɴ 𝐊𝚯𝐍𝚯𝐒𝐔𝐁𝚫, ᴏᴋᴀʏ?! 🩵\n\n*👑 Moderators 👑*\n\n${modList}\n\n> Do *not* spam their DMs 🚫`,
      mentions: mods,
    }, { quoted: message });
    return true;
  }

  if (command === 'ping') {
    const start = Date.now();
    await sock.sendMessage(dest, { text: '🏓 Pong! Calculating...' }, { quoted: message });
    await sock.sendMessage(dest, { text: `🏓 *Pong!* Response: *${Date.now() - start}ms*` });
    return true;
  }

  // ── .profile / .p ──────────────────────────────────────────────────────────
  if (command === 'p' || command === 'profile') {
    let targetJid = sender;
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (quotedSender)        targetJid = quotedSender;
    else if (mentions.length) targetJid = mentions[0];

    // FIX: use findByWhatsAppId — handles LID users correctly
    let user = await User.findByWhatsAppId(targetJid);
    if (!user) {
      // Try by phone derived from JID as last resort
      const phone = targetJid.includes('@') ? targetJid.split('@')[0].replace(/\D/g, '') : null;
      if (phone) user = await User.findByPhone(phone);
    }

    if (!user || !user.registered) {
      await sock.sendMessage(dest, {
        text: `❌ @${targetJid.split('@')[0]} hasn't registered on the Konosuba website yet.\n\n🌐 Sign up at:\n${WEBSITE_URL}`,
        mentions: [targetJid],
      }, { quoted: message });
      return true;
    }

    let avatarUrl = null;
    try { avatarUrl = await sock.profilePictureUrl(targetJid, 'image'); } catch {}

    let imageBuffer = null;
    try { imageBuffer = await generateProfileCard(user, avatarUrl); } catch {}

    // Use stored phone or derive from JID/LID
    const displayPhone = user.phone ||
      (user.jid ? user.jid.split('@')[0] : '') ||
      (user.lid ? user.lid.split('@')[0] : '');

    const text = `👤 𝗡𝗮𝗺𝗲: ${user.name}
🆔 𝗜𝗗: ${displayPhone}
📅 𝗝𝗼𝗶𝗻𝗲𝗱: ${user.joinedAt ? new Date(user.joinedAt).toDateString() : 'N/A'}
🚫 𝗕𝗮𝗻𝗻𝗲𝗱: ${user.banned ? 'Yes' : 'No'}
🌐 𝗪𝗲𝗯𝘀𝗶𝘁𝗲: ✅ Linked

💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: ${formatMoney(user.wallet)}
🏦 𝗕𝗮𝗻𝗸: ${formatMoney(user.bank)}
💎 𝗡𝗲𝘁 𝗪𝗼𝗿𝘁𝗵: ${formatMoney(user.wallet + user.bank)}

📊 𝗟𝗲𝘃𝗲𝗹: ${user.level}
⚡ 𝗫𝗣: ${user.xp}/${user.level * 100}
🏆 𝗥𝗮𝗻𝗸: ${user.rank || '?'}
🔥 𝗦𝘁𝗿𝗲𝗮𝗸: ${user.streak}

🎒 𝗜𝘁𝗲𝗺𝘀: ${user.inventory.length}
🔓 𝗔𝗰𝗵𝗶𝗲𝘃𝗲𝗺𝗲𝗻𝘁𝘀: ${user.achievements.length}`;

    if (imageBuffer) {
      await sock.sendMessage(dest, { image: imageBuffer, caption: text, mentions: [targetJid] }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text, mentions: [targetJid] }, { quoted: message });
    }
    return true;
  }

  // ── .reg / .register ───────────────────────────────────────────────────────
  if (command === 'reg' || command === 'register') {
    // FIX: use findByWhatsAppId instead of findOne({jid: sender})
    const user = await User.findByWhatsAppId(sender);
    const phone = user?.phone || sender.split('@')[0];

    if (user && user.registered) {
      await sock.sendMessage(dest, {
        text: `✅ *Already Registered!*\n\n📱 Your number is linked to Konosuba.\n\n🌐 *View your dashboard:*\n${WEBSITE_URL}/dashboard\n\n> Log in with your WhatsApp number and password.`,
      }, { quoted: message });
      return true;
    }

    await sock.sendMessage(dest, {
      text: `🧿 *Join Konosuba!*\n━━━━━━━━━━━━━━━━━━━━━\n\nTo create your account, visit the website *first*:\n🌐 *${WEBSITE_URL}*\n\n📱 *Your WhatsApp number:*\n*${phone}*\n\n━━━━━━━━━━━━━━━━━━━━━\n> Sign up on the website using the number above.\n> Your wallet 💰, bank 🏦, level ⭐ and XP ⚡ will sync live!\n> You'll also receive a *$43,000 welcome bonus* 🎉`,
    }, { quoted: message });
    return true;
  }

  // ── .addmod ────────────────────────────────────────────────────────────────
  if (command === 'addmod') {
    if (!isOwner(sender)) { await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message }); return true; }
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target       = quotedSender || mentions[0];
    if (!target) { await sock.sendMessage(dest, { text: '❌ Mention or reply to a user to add as mod.' }, { quoted: message }); return true; }

    // FIX: use findOrCreateByJid so LID users get an account correctly
    const targetUser = await User.findOrCreateByJid(target, target.split('@')[0]);
    targetUser.isMod = true;
    await targetUser.save();
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been added as a global moderator!`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  // ── .removemod ─────────────────────────────────────────────────────────────
  if (command === 'removemod') {
    if (!isOwner(sender)) { await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message }); return true; }
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target       = quotedSender || mentions[0];
    if (!target) { await sock.sendMessage(dest, { text: '❌ Mention or reply to a user to remove as mod.' }, { quoted: message }); return true; }
    const targetUser = await User.findByWhatsAppId(target);
    if (targetUser) { targetUser.isMod = false; await targetUser.save(); }
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been removed as a global moderator.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGeneral };
