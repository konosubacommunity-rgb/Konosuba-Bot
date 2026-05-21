const User  = require('../models/User');
const Guild = require('../models/Guild');
const { formatMoney } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/website-sync');

async function handleGuild(sock, message, command, args, sender, isGroup, groupJid) {
  const dest      = isGroup ? groupJid : sender;
  const guildCmds = ['createguild', 'guild', 'guildinfo', 'joinguild', 'leaveguild', 'invite', 'kickmember', 'guildtop'];
  if (!guildCmds.includes(command)) return false;

  // ── Always look up by JID or LID ─────────────────────────────────────────
  let user = await User.findByWhatsAppId(sender);
  if (!user) {
    const isLid = sender.includes('@lid');
    user = new User(isLid ? { lid: sender, name: message.pushName } : { jid: sender, name: message.pushName });
    await user.save();
  }

  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  // ── .createguild ──────────────────────────────────────────────────────────
  if (command === 'createguild') {
    const name = args.join(' ').trim();
    if (!name) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.createguild <name>`' }, { quoted: message });
      return true;
    }
    if (user.guild) {
      await sock.sendMessage(dest, { text: `❌ You're already in a guild: *${user.guild}*! Leave it first with \`.leaveguild\`` }, { quoted: message });
      return true;
    }
    const existing = await Guild.findOne({ name });
    if (existing) {
      await sock.sendMessage(dest, { text: `❌ A guild named *${name}* already exists!` }, { quoted: message });
      return true;
    }
    if (user.wallet < 1000) {
      await sock.sendMessage(dest, { text: '❌ You need $1,000 to create a guild!' }, { quoted: message });
      return true;
    }
    user.wallet -= 1000;
    user.guild   = name;
    const guild  = new Guild({ name, owner: sender, members: [{ jid: sender, rank: 'Owner' }] });
    await guild.save();
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, guild: user.guild });
    await logActivity(sender, '🏰', 'Guild Created', `Created guild: ${name}!`, 'general');
    await sock.sendMessage(dest, { text: `🏰 *Guild Created!*\n\nGuild: *${name}*\nYou are the Owner!\n\nInvite members with \`.invite @user\`!` }, { quoted: message });
    return true;
  }

  // ── .guild ────────────────────────────────────────────────────────────────
  if (command === 'guild') {
    if (!user.guild) {
      await sock.sendMessage(dest, { text: '❌ You\'re not in a guild! Create one with `.createguild <name>` or join with `.joinguild <name>`' }, { quoted: message });
      return true;
    }
    const guild = await Guild.findOne({ name: user.guild });
    if (!guild) {
      user.guild = null;
      await user.save();
      await syncUserToWebsite(sender, { guild: null });
      await sock.sendMessage(dest, { text: '❌ Guild not found. It may have been disbanded.' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `🏰 *${guild.name}*\n\n👑 Owner: @${guild.owner.split('@')[0]}\n👥 Members: ${guild.members.length}\n📊 Level: ${guild.level}\n💰 Treasury: ${formatMoney(guild.treasury)}\n📝 Description: ${guild.description}`,
      mentions: [guild.owner],
    }, { quoted: message });
    return true;
  }

  // ── .guildinfo ────────────────────────────────────────────────────────────
  if (command === 'guildinfo') {
    const guildName = args.join(' ');
    if (!guildName) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.guildinfo <name>`' }, { quoted: message });
      return true;
    }
    const guild = await Guild.findOne({ name: { $regex: new RegExp(guildName, 'i') } });
    if (!guild) {
      await sock.sendMessage(dest, { text: `❌ Guild *${guildName}* not found.` }, { quoted: message });
      return true;
    }
    const memberList = guild.members.slice(0, 10).map(m => `• @${m.jid.split('@')[0]} (${m.rank})`).join('\n');
    await sock.sendMessage(dest, {
      text: `🏰 *${guild.name}*\n\n👑 Owner: @${guild.owner.split('@')[0]}\n👥 Members (${guild.members.length}):\n${memberList}${guild.members.length > 10 ? `\n...and ${guild.members.length - 10} more` : ''}\n\n📊 Level: ${guild.level}\n💰 Treasury: ${formatMoney(guild.treasury)}`,
      mentions: guild.members.slice(0, 10).map(m => m.jid),
    }, { quoted: message });
    return true;
  }

  // ── .joinguild ────────────────────────────────────────────────────────────
  if (command === 'joinguild') {
    if (user.guild) {
      await sock.sendMessage(dest, { text: `❌ You're already in guild *${user.guild}*! Leave first with \`.leaveguild\`` }, { quoted: message });
      return true;
    }
    const name = args.join(' ');
    if (!name) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.joinguild <name>`' }, { quoted: message });
      return true;
    }
    const guild = await Guild.findOne({ name: { $regex: new RegExp(name, 'i') } });
    if (!guild) {
      await sock.sendMessage(dest, { text: `❌ Guild *${name}* not found!` }, { quoted: message });
      return true;
    }
    guild.members.push({ jid: sender, rank: 'Member' });
    user.guild = guild.name;
    await guild.save();
    await user.save();
    await syncUserToWebsite(sender, { guild: user.guild });
    await logActivity(sender, '🏰', 'Joined Guild', `Joined guild: ${guild.name}!`, 'general');
    await sock.sendMessage(dest, { text: `✅ Joined guild *${guild.name}*! Welcome!` }, { quoted: message });
    return true;
  }

  // ── .leaveguild ───────────────────────────────────────────────────────────
  if (command === 'leaveguild') {
    if (!user.guild) {
      await sock.sendMessage(dest, { text: '❌ You\'re not in a guild!' }, { quoted: message });
      return true;
    }
    const guild = await Guild.findOne({ name: user.guild });
    if (guild) {
      if (guild.owner === sender && guild.members.length > 1) {
        await sock.sendMessage(dest, { text: '❌ You\'re the owner! Transfer ownership or disband the guild first.' }, { quoted: message });
        return true;
      }
      guild.members = guild.members.filter(m => m.jid !== sender);
      if (guild.members.length === 0) {
        await guild.deleteOne();
      } else {
        await guild.save();
      }
    }
    const guildName = user.guild;
    user.guild = null;
    await user.save();
    await syncUserToWebsite(sender, { guild: null });
    await logActivity(sender, '👋', 'Left Guild', `Left guild: ${guildName}`, 'general');
    await sock.sendMessage(dest, { text: `👋 You left guild *${guildName}*.` }, { quoted: message });
    return true;
  }

  // ── .invite ───────────────────────────────────────────────────────────────
  if (command === 'invite') {
    if (!user.guild) {
      await sock.sendMessage(dest, { text: '❌ You\'re not in a guild!' }, { quoted: message });
      return true;
    }
    const guild    = await Guild.findOne({ name: user.guild });
    const isLeader = guild && (guild.owner === sender || guild.members.find(m => m.jid === sender && ['Owner', 'Officer'].includes(m.rank)));
    if (!isLeader) {
      await sock.sendMessage(dest, { text: '*🚫 Access Denied* — Only guild leaders can invite.' }, { quoted: message });
      return true;
    }
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target   = mentions[0];
    if (!target) {
      await sock.sendMessage(dest, { text: '❌ Mention a user to invite!' }, { quoted: message });
      return true;
    }
    // Check target by JID or LID
    const targetUser = await User.findByWhatsAppId(target);
    if (targetUser?.guild) {
      await sock.sendMessage(dest, { text: `❌ @${target.split('@')[0]} is already in a guild!`, mentions: [target] }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `📩 @${target.split('@')[0]} has been invited to *${guild.name}*!\n\nThey can join with: \`.joinguild ${guild.name}\``,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  // ── .kickmember ───────────────────────────────────────────────────────────
  if (command === 'kickmember') {
    if (!user.guild) {
      await sock.sendMessage(dest, { text: '❌ You\'re not in a guild!' }, { quoted: message });
      return true;
    }
    const guild = await Guild.findOne({ name: user.guild });
    if (!guild || guild.owner !== sender) {
      await sock.sendMessage(dest, { text: '*🚫 Access Denied* — Only the guild owner can kick members.' }, { quoted: message });
      return true;
    }
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target   = mentions[0];
    if (!target) {
      await sock.sendMessage(dest, { text: '❌ Mention a user to kick!' }, { quoted: message });
      return true;
    }
    if (target === sender) {
      await sock.sendMessage(dest, { text: '❌ You cannot kick yourself!' }, { quoted: message });
      return true;
    }
    guild.members = guild.members.filter(m => m.jid !== target);
    await guild.save();

    // Update the kicked user's guild field (look up by JID or LID)
    const targetUser = await User.findByWhatsAppId(target);
    if (targetUser) {
      targetUser.guild = null;
      await targetUser.save();
      await syncUserToWebsite(target, { guild: null });
    }

    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been kicked from *${guild.name}*!`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  // ── .guildtop ─────────────────────────────────────────────────────────────
  if (command === 'guildtop') {
    const guilds = await Guild.find().sort({ level: -1, xp: -1 }).limit(10);
    if (guilds.length === 0) {
      await sock.sendMessage(dest, { text: '📊 No guilds yet! Create one with `.createguild <name>`' }, { quoted: message });
      return true;
    }
    const list = guilds.map((g, i) => `*${i + 1}.* ${g.name} — Lv.${g.level} | Members: ${g.members.length}`).join('\n');
    await sock.sendMessage(dest, { text: `🏰 *Guild Leaderboard*\n\n${list}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGuild };
