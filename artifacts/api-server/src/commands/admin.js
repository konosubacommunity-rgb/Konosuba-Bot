const Group = require('../models/Group');
const User = require('../models/User');
const { isOwner, isBotMod, isBotAdmin, getBotRole, getMentions, getQuotedSender, formatMs } = require('../utils/helpers');

// ── Permission tiers ───────────────────────────────────────────────────────────
// hasBanPerms   → Owner + Mod only (Admins cannot ban/unban)
// hasStaffPerms → Owner + Mod + Admin (all bot staff commands)
// hasGroupPerms → Owner + Mod + Admin + WA Group Admin (group management)

function extractNumber(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function isBotGroupAdmin(sock, groupJid) {
  try {
    const meta   = await sock.groupMetadata(groupJid);
    const botId  = sock.user?.id  || '';
    const botLid = sock.user?.lid || '';
    const botNum    = extractNumber(botId);
    const botLidNum = extractNumber(botLid);
    return meta.participants.some(p => {
      if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
      const pNum = extractNumber(p.id);
      return (
        p.id === botId || p.id === botLid ||
        (botNum && pNum === botNum) ||
        (botLidNum && pNum === botLidNum) ||
        p.id.split('@')[0] === botId.split('@')[0]
      );
    });
  } catch { return false; }
}

async function isUserGroupAdmin(sock, groupJid, jid) {
  try {
    const meta   = await sock.groupMetadata(groupJid);
    const jidNum = extractNumber(jid);
    return meta.participants.some(p => {
      const pNum = extractNumber(p.id);
      return (p.id === jid || (jidNum && pNum === jidNum)) &&
             (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch { return false; }
}

async function handleAdmin(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;

  const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
  const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const target       = quotedSender || mentions[0];

  const senderIsOwner      = isOwner(sender);
  const senderIsBotMod     = await isBotMod(sender);
  const senderIsBotAdmin   = await isBotAdmin(sender);
  const senderIsGroupAdmin = isGroup ? await isUserGroupAdmin(sock, groupJid, sender) : false;
  const botIsGroupAdmin    = isGroup ? await isBotGroupAdmin(sock, groupJid) : false;

  const hasBanPerms   = senderIsOwner || senderIsBotMod;
  const hasStaffPerms = senderIsOwner || senderIsBotMod || senderIsBotAdmin;
  const hasGroupPerms = hasStaffPerms || senderIsGroupAdmin;

  const deny = async (reason) =>
    sock.sendMessage(dest, { text: reason || '*🚫 Access Denied*' }, { quoted: message });

  const needTarget = async () =>
    sock.sendMessage(dest, { text: '❌ Mention or reply to a user.' }, { quoted: message });

  const isProtected = (jid) => isOwner(jid);

  // ── ROLE MANAGEMENT — Owner only, works in DMs and groups ─────────────────

  if (command === 'addmod') {
    if (!senderIsOwner) return deny();
    if (!target) return needTarget();
    if (isProtected(target)) {
      await sock.sendMessage(dest, { text: '👑 That person is the Owner — they already outrank everyone.' }, { quoted: message });
      return true;
    }
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.isMod   = true;
    user.isAdmin = false;
    await user.save();
    await sock.sendMessage(dest, {
      text: `🛡️ @${target.split('@')[0]} is now a *Moderator*!\n\nThey can use all bot commands including ban/unban.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'removemod' || command === 'delmod') {
    if (!senderIsOwner) return deny();
    if (!target) return needTarget();
    const user = await User.findOne({ jid: target });
    if (!user?.isMod) {
      await sock.sendMessage(dest, { text: `❌ @${target.split('@')[0]} is not a Moderator.`, mentions: [target] }, { quoted: message });
      return true;
    }
    user.isMod = false;
    await user.save();
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been removed as Moderator.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'promote') {
    if (!senderIsOwner) return deny();
    if (!target) return needTarget();
    if (isProtected(target)) {
      await sock.sendMessage(dest, { text: '👑 That person is the Owner — they already outrank everyone.' }, { quoted: message });
      return true;
    }
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.isAdmin = true;
    user.isMod   = false;
    await user.save();
    await sock.sendMessage(dest, {
      text: `⚔️ @${target.split('@')[0]} has been promoted to *Bot Admin*!\n\nThey can use all bot commands except ban/unban.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'demote') {
    if (!senderIsOwner) return deny();
    if (!target) return needTarget();
    const user = await User.findOne({ jid: target });
    if (!user?.isAdmin) {
      await sock.sendMessage(dest, { text: `❌ @${target.split('@')[0]} is not a Bot Admin.`, mentions: [target] }, { quoted: message });
      return true;
    }
    user.isAdmin = false;
    await user.save();
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been demoted from Bot Admin.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'stafflist' || command === 'staff') {
    const admins = await User.find({ isAdmin: true }).select('jid name');
    const mods   = await User.find({ isMod:   true }).select('jid name');
    const ownerLines = (process.env.OWNER_NUMBERS || '').split(',').filter(Boolean)
      .map(n => `  👑 +${n.trim()}`).join('\n') || '  None set';
    const adminLines = admins.length
      ? admins.map(u => `  ⚔️ @${(u.jid || '').split('@')[0]}`).join('\n') : '  None';
    const modLines   = mods.length
      ? mods.map(u =>   `  🛡️ @${(u.jid || '').split('@')[0]}`).join('\n') : '  None';
    await sock.sendMessage(dest, {
      text: `*🏛️ Konosuba Staff List*\n\n👑 *Owner(s):*\n${ownerLines}\n\n⚔️ *Bot Admins:*\n${adminLines}\n\n🛡️ *Moderators:*\n${modLines}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'myrole' || command === 'role') {
    const role   = await getBotRole(sender);
    const badges = {
      owner: '👑 Owner — supreme master',
      mod:   '🛡️ Moderator — full bot access + ban/unban',
      admin: '⚔️ Bot Admin — full bot access (no ban/unban)',
      user:  '👤 Regular User',
    };
    await sock.sendMessage(dest, {
      text: `*Your Bot Role:* ${badges[role] || '👤 Regular User'}`,
    }, { quoted: message });
    return true;
  }

  // ── GROUP-ONLY COMMANDS ─────────────────────────────────────────────────────
  if (!isGroup) return false;

  // ban / unban — Owner + Mod only (Admins cannot)
  if (command === 'ban') {
    if (!hasBanPerms) return deny('🚫 Only Moderators and the Owner can ban users.');
    if (!target) return needTarget();
    if (isProtected(target)) return deny('🚫 You cannot ban the Owner.');
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.banned = true;
    await user.save();
    await sock.sendMessage(dest, {
      text: `🔨 @${target.split('@')[0]} has been *banned* from using the bot.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'unban') {
    if (!hasBanPerms) return deny('🚫 Only Moderators and the Owner can unban users.');
    if (!target) return needTarget();
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.banned = false;
    await user.save();
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been *unbanned*.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  // All commands below — Owner + Mod + Admin + WA Group Admin
  if (command === 'kick') {
    if (!hasGroupPerms) return deny();
    if (!target) return needTarget();
    if (isProtected(target)) return deny('🚫 You cannot kick the Owner.');
    if (!botIsGroupAdmin) {
      await sock.sendMessage(dest, { text: '❌ I need to be a group admin to kick members!' }, { quoted: message });
      return true;
    }
    await sock.groupParticipantsUpdate(groupJid, [target], 'remove');
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been kicked!`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'mute') {
    if (!hasGroupPerms) return deny();
    if (!target) return needTarget();
    if (isProtected(target)) return deny('🚫 You cannot mute the Owner.');
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    if (!group.mutedMembers.includes(target)) group.mutedMembers.push(target);
    await group.save();
    await sock.sendMessage(dest, {
      text: `🔇 @${target.split('@')[0]} has been muted.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'unmute') {
    if (!hasGroupPerms) return deny();
    if (!target) return needTarget();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.mutedMembers = group.mutedMembers.filter(m => m !== target);
    await group.save();
    await sock.sendMessage(dest, {
      text: `🔊 @${target.split('@')[0]} has been unmuted.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'warn') {
    if (!hasGroupPerms) return deny();
    if (!target) return needTarget();
    if (isProtected(target)) return deny('🚫 You cannot warn the Owner.');
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.warnings = (user.warnings || 0) + 1;
    await user.save();
    let action = '';
    if (user.warnings >= 3 && botIsGroupAdmin) {
      await sock.groupParticipantsUpdate(groupJid, [target], 'remove');
      action = '\n⚠️ *3 warnings reached — user has been kicked!*';
      user.warnings = 0;
      await user.save();
    }
    await sock.sendMessage(dest, {
      text: `⚠️ @${target.split('@')[0]} has been warned! (${user.warnings}/3)${action}`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'warnings') {
    if (!target) return needTarget();
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    await sock.sendMessage(dest, {
      text: `📋 @${target.split('@')[0]} has *${user.warnings || 0}* warning(s).`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'clearwarns') {
    if (!hasGroupPerms) return deny();
    if (!target) return needTarget();
    let user = await User.findOne({ jid: target }) || new User({ jid: target });
    user.warnings = 0;
    await user.save();
    await sock.sendMessage(dest, {
      text: `✅ Warnings cleared for @${target.split('@')[0]}.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'lockgroup') {
    if (!hasGroupPerms) return deny();
    await sock.groupSettingUpdate(groupJid, 'announcement');
    await sock.sendMessage(dest, { text: '🔒 Group locked — only admins can send messages.' }, { quoted: message });
    return true;
  }

  if (command === 'unlockgroup') {
    if (!hasGroupPerms) return deny();
    await sock.groupSettingUpdate(groupJid, 'not_announcement');
    await sock.sendMessage(dest, { text: '🔓 Group unlocked — all members can send messages.' }, { quoted: message });
    return true;
  }

  if (command === 'setname') {
    if (!hasStaffPerms) return deny();
    const newName = args.join(' ');
    if (!newName) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.setname <name>`' }, { quoted: message });
      return true;
    }
    await sock.groupUpdateSubject(groupJid, newName);
    await sock.sendMessage(dest, { text: `✅ Group name updated to: *${newName}*` }, { quoted: message });
    return true;
  }

  if (command === 'setdesc') {
    if (!hasStaffPerms) return deny();
    const desc = args.join(' ');
    if (!desc) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.setdesc <description>`' }, { quoted: message });
      return true;
    }
    await sock.groupUpdateDescription(groupJid, desc);
    await sock.sendMessage(dest, { text: `✅ Group description updated!` }, { quoted: message });
    return true;
  }

  if (command === 'setpp') {
    if (!hasStaffPerms) return deny();
    const quotedMsg  = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgBuffer  = quotedMsg?.imageMessage
      ? await sock.downloadMediaMessage({ message: { imageMessage: quotedMsg.imageMessage } })
      : null;
    if (!imgBuffer) {
      await sock.sendMessage(dest, { text: '❌ Reply to an image to set as group picture.' }, { quoted: message });
      return true;
    }
    await sock.updateProfilePicture(groupJid, imgBuffer);
    await sock.sendMessage(dest, { text: '✅ Group picture updated!' }, { quoted: message });
    return true;
  }

  if (command === 'tagall') {
    if (!hasGroupPerms) return deny();
    const meta      = await sock.groupMetadata(groupJid);
    const members   = meta.participants.map(p => p.id);
    const customMsg = args.join(' ') || '📣 Attention everyone!';
    const memberTags = members.map(m => `💠 @${m.split('@')[0]}`).join('\n');
    await sock.sendMessage(dest, {
      text: `*🔖 Message:* ${customMsg}\n*🎃 Group:* ${meta.subject}\n*👥 Members:* ${members.length}\n\n${memberTags}`,
      mentions: members,
    }, { quoted: message });
    return true;
  }

  if (command === 'hidetag') {
    if (!hasGroupPerms) return deny();
    const meta    = await sock.groupMetadata(groupJid);
    const members = meta.participants.map(p => p.id);
    const msg     = args.join(' ') || '📣';
    await sock.sendMessage(dest, { text: msg, mentions: members }, { quoted: message });
    return true;
  }

  if (command === 'delete' || command === 'del') {
    if (!hasGroupPerms) return deny();
    const quoted = message.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId) {
      await sock.sendMessage(dest, { text: '❌ Reply to a message to delete it.' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      delete: { remoteJid: groupJid, fromMe: false, id: quoted.stanzaId, participant: quoted.participant },
    });
    return true;
  }

  if (command === 'antilink') {
    if (!hasGroupPerms) return deny();
    const val = args[0]?.toLowerCase();
    if (!val || !['on', 'off'].includes(val)) {
      await sock.sendMessage(dest, { text: '❌ Use: `.antilink on` or `.antilink off`' }, { quoted: message });
      return true;
    }
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.antilink = val === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Antilink: *${group.antilink ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'antispam') {
    if (!hasGroupPerms) return deny();
    const val = args[0]?.toLowerCase();
    if (!val || !['on', 'off'].includes(val)) {
      await sock.sendMessage(dest, { text: '❌ Use: `.antispam on` or `.antispam off`' }, { quoted: message });
      return true;
    }
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.antispam = val === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Antispam: *${group.antispam ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'welcome') {
    if (!hasGroupPerms) return deny();
    const val = args[0]?.toLowerCase();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.welcome = val !== 'off';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Welcome messages: *${group.welcome ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'goodbye') {
    if (!hasGroupPerms) return deny();
    const val = args[0]?.toLowerCase();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.goodbye = val !== 'off';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Goodbye messages: *${group.goodbye ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'autoreply') {
    if (!hasGroupPerms) return deny();
    const val = args[0]?.toLowerCase();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.autoreply = val === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Autoreply: *${group.autoreply ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'boton') {
    if (!hasStaffPerms) return deny();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.active = true;
    await group.save();
    await sock.sendMessage(dest, { text: '✅ Bot is now *active* in this group.' }, { quoted: message });
    return true;
  }

  if (command === 'botoff') {
    if (!hasStaffPerms) return deny();
    let group = await Group.findOne({ jid: groupJid }) || new Group({ jid: groupJid });
    group.active = false;
    await group.save();
    await sock.sendMessage(dest, { text: '💤 Bot is now *inactive* in this group. Use `.boton` to re-enable.' }, { quoted: message });
    return true;
  }

  if (command === 'active') {
    if (!hasGroupPerms) return deny();
    try {
      const meta         = await sock.groupMetadata(groupJid);
      const group        = await Group.findOne({ jid: groupJid });
      if (!group) {
        await sock.sendMessage(dest, { text: '❌ No activity data yet. Members need to chat first!' }, { quoted: message });
        return true;
      }
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeList   = (group.memberActivity || [])
        .filter(d => d.lastSeen && new Date(d.lastSeen) >= sevenDaysAgo)
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));

      if (!activeList.length) {
        await sock.sendMessage(dest, { text: `❌ No active users in the last 7 days in *${meta.subject}*.` }, { quoted: message });
        return true;
      }
      const mentionJids = activeList.map(a => a.jid);
      const userLines   = activeList.map(a => `👤 @${a.jid.split('@')[0]} (${a.messageCount})`).join('\n');
      await sock.sendMessage(dest, {
        text: `*⏳ Active Users:* ${activeList.length}\n*🎃 Group:* ${meta.subject}\n\n${userLines}`,
        mentions: mentionJids,
      }, { quoted: message });
    } catch {
      await sock.sendMessage(dest, { text: '❌ Failed to fetch active users.' }, { quoted: message });
    }
    return true;
  }

  if (command === 'invitelink' || command === 'resetlink' || command === 'revoke') {
    if (!hasGroupPerms) return deny();
    if (command === 'revoke' || command === 'resetlink') await sock.groupRevokeInvite(groupJid);
    const link = await sock.groupInviteCode(groupJid);
    await sock.sendMessage(dest, { text: `🔗 Invite Link:\nhttps://chat.whatsapp.com/${link}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleAdmin };
