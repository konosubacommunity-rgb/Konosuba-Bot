const User  = require('../models/User');
const Guild = require('../models/Guild');
const { formatMoney } = require('../utils/helpers');

async function handleGuild(sock, message, command, args, sender, isGroup, groupJid) {
  const dest      = isGroup ? groupJid : sender;
  const guildCmds = ['createguild', 'guild', 'guildinfo', 'joinguild', 'leaveguild', 'invite', 'kickmember', 'guildtop'];
  if (!guildCmds.includes(command)) return false;

  // FIX: use findOrCreateByJid instead of findOne({jid}) + new User
  const user = await User.findOrCreateByJid(sender, message.pushName);
  if (user.banned) { await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message }); return true; }

  if (command === 'createguild') {
    const name = args.join(' ').trim();
    if (!name) { await sock.sendMessage(dest, { text: '❌ Usage: `.createguild <name>`' }, { quoted: message }); return true; }
    if (user.guild) { await sock.sendMessage(dest, { text: `❌ You're already in a guild: *${user.guild}*!` }, { quoted: message }); return true; }
    if (await Guild.findOne({ name })) { await sock.sendMessage(dest, { text: `❌ A guild named *${name}* already exists!` }, { quoted: message }); return true; }
    if (user.wallet < 1000) { await sock.sendMessage(dest, { text: '❌ You need $1,000 to create a guild!' }, { quoted: message }); return true; }
    user.wallet -= 1000; user.guild = name;
    const guild = new Guild({ name, owner: sender, members: [{ jid: sender, rank: 'Owner' }] });
    await guild.save(); await user.save();
    await sock.sendMessage(dest, { text: `🏰 *Guild Created!*\n\nGuild: *${name}*\nYou are the Owner!\n\nInvite members with \`.invite @user\`!` }, { quoted: message });
    return true;
  }

  if (command === 'guild') {
    if (!user.guild) { await sock.sendMessage(dest, { text: '❌ You\'re not in a guild! Create one with `.createguild <name>` or join with `.joinguild <name>`' }, { quoted: message }); return true; }
    const guild = await Guild.findOne({ name: user.guild });
    if (!guild) { user.guild = null; await user.save(); await sock.sendMessage(dest, { text: '❌ Guild not found. It may have been disbanded.' }, { quoted: message }); return true; }
    await sock.sendMessage(dest, {
      text: `🏰 *${guild.name}*\n\n👑 Owner: @${guild.owner.split('@')[0]}\n👥 Members: ${guild.members.length}\n📊 Level: ${guild.level}\n💰 Treasury: ${formatMoney(guild.treasury)}\n📝 Description: ${guild.description}`,
      mentions: [guild.owner],
    }, { quoted: message });
    return true;
  }

  if (command === 'guildinfo') {
    const guildName = args.join(' ');
    if (!guildName) { await sock.sendMessage(dest, { text: '❌ Usage: `.guildinfo <name>`' }, { quoted: message }); return true; }
    const guild = await Guild.findOne({ name: { $regex: new RegExp(guildName, 'i') } });
    if (!guild) { await sock.sendMessage(dest, { text: `❌ Guild *${guildName}* not found.` }, { quoted: message }); return true; }
    const memberList = guild.members.slice(0, 10).map(m => `• @${m.jid.split('@')[0]} (${m.rank})`).join('\n');
    await sock.sendMessage(dest, {
      text: `🏰 *${guild.name}*\n\n👑 Owner: @${guild.owner.split('@')[0]}\n👥 Members (${guild.members.length}):\n${memberList}${guild.members.length > 10 ? `\n...and ${guild.members.length - 10} more` : ''}\n\n📊 Level: ${guild.level}\n💰 Treasury: ${formatMoney(guild.treasury)}`,
      mentions: guild.members.slice(0, 10).map(m => m.jid),
    }, { quoted: message });
    return true;
  }

  if (command === 'joinguild') {
    if (user.guild) { await sock.sendMessage(dest, { text: `❌ You're already in *${user.guild}*! Leave first with \`.leaveguild\`` }, { quoted: message }); return true; }
    const name  = args.join(' ').trim();
    if (!name) { await sock.sendMessage(dest, { text: '❌ Usage: `.joinguild <name>`' }, { quoted: message }); return true; }
    const guild = await Guild.findOne({ name: { $regex: new RegExp(name, 'i') } });
    if (!guild) { await sock.sendMessage(dest, { text: `❌ Guild *${name}* not found.` }, { quoted: message }); return true; }
    if (guild.members.length >= guild.maxMembers) { await sock.sendMessage(dest, { text: '❌ Guild is full!' }, { quoted: message }); return true; }
    guild.members.push({ jid: sender, rank: 'Member' });
    user.guild = guild.name;
    await guild.save(); await user.save();
    await sock.sendMessage(dest, { text: `✅ You joined *${guild.name}*!\n👥 Members: ${guild.members.length}/${guild.maxMembers}` }, { quoted: message });
    return true;
  }

  if (command === 'leaveguild') {
    if (!user.guild) { await sock.sendMessage(dest, { text: '❌ You\'re not in a guild!' }, { quoted: message }); return true; }
    const guild = await Guild.findOne({ name: user.guild });
    if (guild) {
      if (guild.owner === sender) { await sock.sendMessage(dest, { text: '❌ You\'re the owner! Transfer or disband the guild first.' }, { quoted: message }); return true; }
      guild.members = guild.members.filter(m => m.jid !== sender);
      await guild.save();
    }
    user.guild = null; await user.save();
    await sock.sendMessage(dest, { text: '✅ You left the guild.' }, { quoted: message });
    return true;
  }

  if (command === 'invite') {
    if (!user.guild) { await sock.sendMessage(dest, { text: '❌ You\'re not in a guild!' }, { quoted: message }); return true; }
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target       = quotedSender || mentions[0];
    if (!target) { await sock.sendMessage(dest, { text: '❌ Mention a user to invite.' }, { quoted: message }); return true; }
    const guild  = await Guild.findOne({ name: user.guild });
    if (!guild)  { await sock.sendMessage(dest, { text: '❌ Guild not found.' }, { quoted: message }); return true; }
    const isOwnerOrOfficer = guild.owner === sender || guild.members.find(m => m.jid === sender)?.rank === 'Officer';
    if (!isOwnerOrOfficer) { await sock.sendMessage(dest, { text: '❌ Only the owner or officers can invite members.' }, { quoted: message }); return true; }
    if (guild.members.find(m => m.jid === target)) { await sock.sendMessage(dest, { text: '❌ That user is already in the guild.' }, { quoted: message }); return true; }
    guild.members.push({ jid: target, rank: 'Member' });
    // FIX: findOrCreateByJid for the invitee
    const invitee = await User.findOrCreateByJid(target, target.split('@')[0]);
    invitee.guild = guild.name;
    await guild.save(); await invitee.save();
    await sock.sendMessage(dest, { text: `✅ @${target.split('@')[0]} has been invited to *${guild.name}*!`, mentions: [target] }, { quoted: message });
    return true;
  }

  if (command === 'guildtop') {
    const guilds = await Guild.find().sort({ treasury: -1 }).limit(10).lean();
    const list   = guilds.map((g, i) => `${i + 1}. *${g.name}* — ${g.members.length} members — ${formatMoney(g.treasury)}`).join('\n');
    await sock.sendMessage(dest, { text: `🏆 *Top Guilds*\n\n${list || 'No guilds yet!'}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGuild };
