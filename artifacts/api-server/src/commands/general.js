const path = require('path');
const fs = require('fs');
const config = require('../config');
const User = require('../models/User');
const Group = require('../models/Group');
const { formatMs, formatMoney, isOwner, getUserName } = require('../utils/helpers');
const { generateProfileCard, generateBalanceCard } = require('../utils/imageGen');

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://konosubaweb.vercel.app';

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
┃ ⤷ .ban @user
┃ ⤷ .unban @user
┃ ⤷ .addmod @user
┃ ⤷ .removemod @user
┃ ⤷ .lockgroup
┃ ⤷ .unlockgroup
┃ ⤷ .setname <name>
┃ ⤷ .setdesc <description>
┃ ⤷ .setpp (reply image)
┃ ⤷ .tagall
┃ ⤷ .hidetag <message>
┃ ⤷ .delete (reply msg)
┃ ⤷ .antilink on/off
┃ ⤷ .antispam on/off
┃ ⤷ .welcome on/off
┃ ⤷ .goodbye on/off
┃ ⤷ .autoreply on/off
┃ ⤷ .active
┃ ⤷ .resetlink
┃ ⤷ .revoke
┃ ⤷ .invitelink
┃ ⤷ .stafflist
┃ ⤷ .myrole
┃
╰━━━━━━━━━━━━━━━━

*💰 ECONOMY 💰*
┃
┃ ⤷ .balance / .bal
┃ ⤷ .wallet
┃ ⤷ .bank
┃ ⤷ .deposit <amount>
┃ ⤷ .withdraw <amount>
┃ ⤷ .pay @user <amount>
┃ ⤷ .daily
┃ ⤷ .fish
┃ ⤷ .dig
┃ ⤷ .weekly
┃ ⤷ .monthly
┃ ⤷ .work
┃ ⤷ .beg
┃ ⤷ .crime
┃ ⤷ .rob @user
┃ ⤷ .heist
┃ ⤷ .market
┃ ⤷ .buy <item>
┃ ⤷ .sell <item>
┃ ⤷ .inventory / .inv
┃ ⤷ .use <item>
┃ ⤷ .gift @user <item>
┃ ⤷ .topmoney
┃ ⤷ .topbank
┃ ⤷ .cooldowns / .cds
┃ ⤷ .profile / .p
┃ ⤷ .rank
┃ ⤷ .xp
┃ ⤷ .achievements
┃ ⤷ .quests
┃ ⤷ .claim
┃ ⤷ .bonus
┃ ⤷ .upgrade
┃ ⤷ .prestige
┃ ⤷ .bankupgrade
┃ ⤷ .withdrawall
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
┃ ⤷ .joke
┃ ⤷ .meme
┃ ⤷ .quote
┃ ⤷ .fact
┃ ⤷ .8ball <question>
┃ ⤷ .truth
┃ ⤷ .dare
┃ ⤷ .ship @user @user
┃ ⤷ .rate @user
┃ ⤷ .roast @user
┃ ⤷ .compliment @user
┃ ⤷ .pick <option1/option2>
┃ ⤷ .reverse <text>
┃ ⤷ .fliptext <text>
┃ ⤷ .emojify <text>
┃ ⤷ .rps <rock/paper/scissors>
┃ ⤷ .wouldyourather
┃
╰━━━━━━━━━━━━━━━━

*💞 INTERACTIONS 💞*
┃
┃ ⤷ .hug @user
┃ ⤷ .kiss @user
┃ ⤷ .pat @user
┃ ⤷ .slap @user
┃ ⤷ .punch @user
┃ ⤷ .bite @user
┃ ⤷ .cuddle @user
┃ ⤷ .poke @user
┃ ⤷ .tickle @user
┃ ⤷ .wave @user
┃ ⤷ .highfive @user
┃ ⤷ .stare @user
┃ ⤷ .blush
┃ ⤷ .smile
┃ ⤷ .cry
┃ ⤷ .laugh
┃ ⤷ .dance
┃ ⤷ .angry
┃ ⤷ .sleep
┃
╰━━━━━━━━━━━━━━━━

*🎮 GAMES 🎮*
┃
┃ ⤷ .tictactoe @user
┃ ⤷ .hangman
┃ ⤷ .quiz
┃ ⤷ .trivia
┃ ⤷ .mathquiz
┃ ⤷ .wordgame
┃ ⤷ .riddle
┃ ⤷ .guessnumber
┃ ⤷ .fasttype
┃ ⤷ .minesweeper
┃ ⤷ .snake
┃ ⤷ .2048
┃ ⤷ .duel @user
┃ ⤷ .arcade
┃ ⤷ .leaderboard
┃
╰━━━━━━━━━━━━━━━━

*🐾 POKÉMONS 🐾*
┃
┃ ⤷ .pokemon
┃ ⤷ .party
┃ ⤷ .pc
┃ ⤷ .starter
┃ ⤷ .catch
┃ ⤷ .hunt
┃ ⤷ .battle @user
┃ ⤷ .heal
┃ ⤷ .evolve <pokemon>
┃ ⤷ .release <pokemon>
┃ ⤷ .rename <pokemon> <name>
┃ ⤷ .buddy <pokemon>
┃ ⤷ .feed <pokemon>
┃ ⤷ .train <pokemon>
┃ ⤷ .moves <pokemon>
┃ ⤷ .pokeshop
┃
╰━━━━━━━━━━━━━━━━

*⬇️ DOWNLOADER ⬇️*
┃
┃ ⤷ .play <song>
┃ ⤷ .ytmp3 <link>
┃ ⤷ .ytmp4 <link>
┃ ⤷ .tiktok <link>
┃ ⤷ .instagram <link>
┃ ⤷ .facebook <link>
┃
╰━━━━━━━━━━━━━━━━

*⚔️ RPG*
┃
┃ ⤷ .rpg
┃ ⤷ .stats
┃ ⤷ .hunt
┃ ⤷ .boss
┃ ⤷ .raid
┃ ⤷ .dungeon
┃ ⤷ .quest
┃ ⤷ .equip <item>
┃ ⤷ .unequip <item>
┃ ⤷ .skills
┃ ⤷ .craft <item>
┃ ⤷ .forge
┃ ⤷ .shop
┃ ⤷ .prestige
┃ ⤷ .rparty
┃
╰━━━━━━━━━━━━━━━━

*🏰 GUILD 🏰*
┃
┃ ⤷ .createguild <name>
┃ ⤷ .guild
┃ ⤷ .guildinfo
┃ ⤷ .joinguild <name>
┃ ⤷ .leaveguild
┃ ⤷ .invite @user
┃ ⤷ .kickmember @user
┃ ⤷ .guildtop
┃
╰━━━━━━━━━━━━━━━━`;

async function handleGeneral(sock, message, command, args, sender, isGroup, groupJid) {
  const userName = message.pushName || sender.split('@')[0];
  const dest = isGroup ? groupJid : sender;

  if (command === 'menu') {
    const menuText = MENU_TEXT.replace('{user}', userName);
    const menuImagePath = path.join(__dirname, '../../assets/menu.jpg');
    try {
      const imageBuffer = fs.readFileSync(menuImagePath);
      await sock.sendMessage(dest, { image: imageBuffer, caption: menuText }, { quoted: message });
    } catch (_) {
      await sock.sendMessage(dest, { text: menuText }, { quoted: message });
    }
    return true;
  }

  if (command === 'mods') {
    const modUsers = await User.find({ isMod: true });
    const mods = modUsers.map(u => u.jid);
    const modList = mods.length === 0
      ? '> No moderators set yet.'
      : mods.map(m => `🩵 @${m.split('@')[0]}`).join('\n');
    await sock.sendMessage(dest, {
      text: `Hᴇʟʟᴏ ${userName}, ᴛʜɪꜱ ᴀʀᴇ ᴍʏ ᴍᴏᴅᴇʀᴀᴛᴏʀꜱ ɪɴ 𝐊𝚯𝐍𝚯𝐒𝐔𝐁𝚫, ᴏᴋᴀʏ?! 🩵 

> Aɴᴅ ʜᴇʏ! ʏᴏᴜ'ʀᴇ ᴏɴʟʏ ꜱᴜᴘᴘᴏꜱᴇᴅ ᴛᴏ ᴅᴍ ᴛʜᴇᴍ ꜰᴏʀ *Iᴍᴘᴏʀᴛᴀɴᴛ Rᴇᴀꜱᴏɴꜱ!!*

*👑 Moderators 👑*

${modList}

> Do *not* spam their DMs to *avoid* getting *blocked* 🚫`,
      mentions: mods,
    }, { quoted: message });
    return true;
  }

  if (command === 'ping') {
    const start = Date.now();
    await sock.sendMessage(dest, { text: '🏓 Pong! Calculating...' }, { quoted: message });
    const elapsed = Date.now() - start;
    await sock.sendMessage(dest, { text: `🏓 *Pong!* Response: *${elapsed}ms*` });
    return true;
  }

  if (command === 'p' || command === 'profile') {
    let targetJid = sender;
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (quotedSender) targetJid = quotedSender;
    else if (mentions.length > 0) targetJid = mentions[0];

    let user = await User.findOne({ jid: targetJid });
    if (!user || !user.registered) {
      await sock.sendMessage(dest, {
        text: `❌ @${targetJid.split('@')[0]} hasn't registered on the Konosuba website yet.\n\n🌐 They can sign up at:\n${WEBSITE_URL}`,
        mentions: [targetJid],
      }, { quoted: message });
      return true;
    }

    let avatarUrl = null;
    try { avatarUrl = await sock.profilePictureUrl(targetJid, 'image'); } catch (_) {}

    let imageBuffer = null;
    try { imageBuffer = await generateProfileCard(user, avatarUrl); } catch (_) {}

    const text = `👤 𝗡𝗮𝗺𝗲: ${user.name}
🆔 𝗜𝗗: ${user.jid.split('@')[0]}
📛 𝗧𝗮𝗴: @${user.jid.split('@')[0]}
📅 𝗝𝗼𝗶𝗻𝗲𝗱: ${user.joinedAt ? new Date(user.joinedAt).toDateString() : 'N/A'}
🚫 𝗕𝗮𝗻𝗻𝗲𝗱: ${user.banned ? 'Yes' : 'No'}
🌐 𝗪𝗲𝗯𝘀𝗶𝘁𝗲: ${user.registered ? '✅ Linked to website' : '❌ Not registered'}

💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: ${formatMoney(user.wallet)}
🏦 𝗕𝗮𝗻𝗸: ${formatMoney(user.bank)}
💎 𝗡𝗲𝘁 𝗪𝗼𝗿𝘁𝗵: ${formatMoney(user.wallet + user.bank)}

📊 𝗟𝗲𝘃𝗲𝗹: ${user.level}
⚡ 𝗫𝗣: ${user.xp}/${user.level * 100}
🏆 𝗥𝗮𝗻𝗸: ${user.rank || '?'}
🎯 𝗠𝗶𝘀𝘀𝗶𝗼𝗻𝘀: ${user.missions}
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

  if (command === 'reg' || command === 'register') {
    const phoneNumber = sender.split('@')[0];
    const user = await User.findOne({ jid: sender });

    if (user && user.registered) {
      await sock.sendMessage(dest, {
        text: `✅ *Already Registered!*

📱 Your WhatsApp number is linked to Konosuba.

🌐 *View your live dashboard:*
${WEBSITE_URL}/dashboard

> Log in with your WhatsApp number and your password.`,
      }, { quoted: message });
      return true;
    }

    await sock.sendMessage(dest, {
      text: `🧿 *Join Konosuba!*
━━━━━━━━━━━━━━━━━━━━━

To create your account, visit the website *first*:
🌐 *${WEBSITE_URL}*

📱 *Your WhatsApp number to use:*
*${phoneNumber}*

━━━━━━━━━━━━━━━━━━━━━
> Sign up on the website using the exact number above.
> Once registered, you can use all bot commands and your wallet 💰, bank 🏦, level ⭐ and XP ⚡ will sync live!
> You'll also receive a *$43,000 welcome bonus* 🎉`,
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGeneral };
