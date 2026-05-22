const Group = require('../models/Group');
const User  = require('../models/User');
const { isOwner, getMentions, getQuotedSender, formatMs } = require('../utils/helpers');

function extractNumber(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function isBotAdmin(sock, groupJid) {
  try {
    const meta   = await sock.groupMetadata(groupJid);
    const botId  = sock.user?.id || '';
    const botLid = sock.user?.lid || '';
    const botNum = extractNumber(botId);
    const botLidNum = extractNumber(botLid);
    return meta.participants.some(p => {
      if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
      const pNum = extractNumber(p.id);
      return (
        p.id === botId ||
        p.id === botLid ||
        (botNum    && pNum === botNum) ||
        (botLidNum && pNum === botLidNum) ||
        p.id.split('@')[0] === botId.split('@')[0]
      );
    });
  } catch { return false; }
}

async function isUserAdmin(sock, groupJid, jid) {
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
  if (!isGroup) return false;

  const dest = groupJid;
  const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
  const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const target       = quotedSender || mentions[0];

  const senderIsAdmin = await isUserAdmin(sock, groupJid, sender);
  const senderIsOwner = isOwner(sender);
  const botAdmin      = await isBotAdmin(sock, groupJid);

  const hasPerms = senderIsAdmin || senderIsOwner;

  const deny      = async () => sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
  const needTarget = async () => sock.sendMessage(dest, { text: '❌ Mention or reply to a user.' }, { quoted: message });

  if (command === 'kick') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    await sock.groupParticipantsUpdate(groupJid, [target], 'remove');
    await sock.sendMessage(dest, { text: `✅ @${target.split('@')[0]} has been kicked!`, mentions: [target] }, { quoted: message });
    return true;
  }

  if (command === 'promote' || command === 'setadmin') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    await sock.groupParticipantsUpdate(groupJid, [target], 'promote');
    await sock.sendMessage(dest, { text: `✅ @${target.split('@')[0]} has been promoted to admin!`, mentions: [target] }, { quoted: message });
    return true;
  }

  if (command === 'demote' || command === 'removeadmin') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    await sock.groupParticipantsUpdate(groupJid, [target], 'demote');
    await sock.sendMessage(dest, { text: `✅ @${target.split('@')[0]} has been demoted from admin.`, mentions: [target] }, { quoted: message });
    return true;
  }

  if (command === 'mute') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    const group = await Group.findOrCreate(groupJid);
    if (!group.mutedMembers.includes(target)) group.mutedMembers.push(target);
    await group.save();
    await sock.sendMessage(dest, { text: `🔇 @${target.split('@')[0]} has been muted.`, mentions: [target] }, { quoted: message });
    return true;
  }

  if (command === 'unmute') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    const group = await Group.findOrCreate(groupJid);
    group.mutedMembers = group.mutedMembers.filter(m => m !== target);
    await group.save();
    await sock.sendMessage(dest, { text: `🔊 @${target.split('@')[0]} has been unmuted.`, mentions: [target] }, { quoted: message });
    return true;
  }

  // FIX: use findByWhatsAppId — handles both JID and LID correctly
  if (command === 'warn') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    let user = await User.findByWhatsAppId(target);
    if (!user) user = await User.findOrCreateByJid(target, target.split('@')[0]);
    user.warnings = (user.warnings || 0) + 1;
    await user.save();
    let action = '';
    if (user.warnings >= 3 && botAdmin) {
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
    const user = await User.findByWhatsAppId(target);
    await sock.sendMessage(dest, {
      text: `📋 @${target.split('@')[0]} has *${user?.warnings || 0}* warning(s).`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'clearwarns') {
    if (!hasPerms) return deny();
    if (!target)   return needTarget();
    const user = await User.findByWhatsAppId(target);
    if (user) { user.warnings = 0; await user.save(); }
    await sock.sendMessage(dest, {
      text: `✅ Warnings cleared for @${target.split('@')[0]}.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'ban') {
    if (!senderIsOwner) return deny();
    if (!target)        return needTarget();
    // FIX: findByWhatsAppId then fall back to findOrCreateByJid
    let user = await User.findByWhatsAppId(target) || await User.findOrCreateByJid(target, target.split('@')[0]);
    user.banned = true;
    await user.save();
    await sock.sendMessage(dest, {
      text: `🔨 @${target.split('@')[0]} has been banned from using the bot.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'unban') {
    if (!senderIsOwner) return deny();
    if (!target)        return needTarget();
    const user = await User.findByWhatsAppId(target);
    if (user) { user.banned = false; await user.save(); }
    await sock.sendMessage(dest, {
      text: `✅ @${target.split('@')[0]} has been unbanned.`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'lockgroup') {
    if (!hasPerms) return deny();
    await sock.groupSettingUpdate(groupJid, 'announcement');
    await sock.sendMessage(dest, { text: '🔒 Group locked. Only admins can send messages.' }, { quoted: message });
    return true;
  }

  if (command === 'unlockgroup') {
    if (!hasPerms) return deny();
    await sock.groupSettingUpdate(groupJid, 'not_announcement');
    await sock.sendMessage(dest, { text: '🔓 Group unlocked. All members can send messages.' }, { quoted: message });
    return true;
  }

  if (command === 'setname') {
    if (!hasPerms) return deny();
    const newName = args.join(' ');
    if (!newName) { await sock.sendMessage(dest, { text: '❌ Usage: `.setname <name>`' }, { quoted: message }); return true; }
    await sock.groupUpdateSubject(groupJid, newName);
    await sock.sendMessage(dest, { text: `✅ Group name updated to: *${newName}*` }, { quoted: message });
    return true;
  }

  if (command === 'setdesc') {
    if (!hasPerms) return deny();
    const desc = args.join(' ');
    if (!desc) { await sock.sendMessage(dest, { text: '❌ Usage: `.setdesc <description>`' }, { quoted: message }); return true; }
    await sock.groupUpdateDescription(groupJid, desc);
    await sock.sendMessage(dest, { text: '✅ Group description updated!' }, { quoted: message });
    return true;
  }

  if (command === 'setpp') {
    if (!hasPerms) return deny();
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgBuffer = quotedMsg?.imageMessage
      ? await sock.downloadMediaMessage({ message: { imageMessage: quotedMsg.imageMessage } })
      : null;
    if (!imgBuffer) { await sock.sendMessage(dest, { text: '❌ Reply to an image to set as group picture.' }, { quoted: message }); return true; }
    await sock.updateProfilePicture(groupJid, imgBuffer);
    await sock.sendMessage(dest, { text: '✅ Group picture updated!' }, { quoted: message });
    return true;
  }

  if (command === 'tagall') {
    if (!hasPerms) return deny();
    const meta    = await sock.groupMetadata(groupJid);
    const members = meta.participants.map(p => p.id);
    const customMsg = args.join(' ') || '📣 Attention everyone!';
    const text = `*🔖 Message:* ${customMsg}\n*🎃 Group:* ${meta.subject}\n*👥 Members:* ${members.length}\n\n${members.map(m => `💠 @${m.split('@')[0]}`).join('\n')}`;
    await sock.sendMessage(dest, { text, mentions: members }, { quoted: message });
    return true;
  }

  if (command === 'hidetag') {
    if (!hasPerms) return deny();
    const meta    = await sock.groupMetadata(groupJid);
    const members = meta.participants.map(p => p.id);
    await sock.sendMessage(dest, { text: args.join(' ') || '📣', mentions: members }, { quoted: message });
    return true;
  }

  if (command === 'delete' || command === 'del') {
    if (!hasPerms) return deny();
    const quoted = message.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId) { await sock.sendMessage(dest, { text: '❌ Reply to a message to delete it.' }, { quoted: message }); return true; }
    await sock.sendMessage(dest, { delete: { remoteJid: groupJid, fromMe: false, id: quoted.stanzaId, participant: quoted.participant } });
    return true;
  }

  if (command === 'antilink') {
    if (!hasPerms) return deny();
    const val = args[0];
    if (!val || !['on', 'off'].includes(val.toLowerCase())) { await sock.sendMessage(dest, { text: '❌ Use: `.antilink on` or `.antilink off`' }, { quoted: message }); return true; }
    const group = await Group.findOrCreate(groupJid);
    group.antilink = val.toLowerCase() === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Antilink is now *${group.antilink ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'antispam') {
    if (!hasPerms) return deny();
    const val = args[0];
    if (!val || !['on', 'off'].includes(val.toLowerCase())) { await sock.sendMessage(dest, { text: '❌ Use: `.antispam on` or `.antispam off`' }, { quoted: message }); return true; }
    const group = await Group.findOrCreate(groupJid);
    group.antispam = val.toLowerCase() === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Antispam is now *${group.antispam ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'welcome') {
    if (!hasPerms) return deny();
    const group = await Group.findOrCreate(groupJid);
    group.welcome = args[0]?.toLowerCase() !== 'off';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Welcome messages: *${group.welcome ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'goodbye') {
    if (!hasPerms) return deny();
    const group = await Group.findOrCreate(groupJid);
    group.goodbye = args[0]?.toLowerCase() !== 'off';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Goodbye messages: *${group.goodbye ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'autoreply') {
    if (!hasPerms) return deny();
    const group = await Group.findOrCreate(groupJid);
    group.autoreply = args[0]?.toLowerCase() === 'on';
    await group.save();
    await sock.sendMessage(dest, { text: `✅ Autoreply: *${group.autoreply ? 'ON' : 'OFF'}*` }, { quoted: message });
    return true;
  }

  if (command === 'boton') {
    if (!hasPerms) return deny();
    const group = await Group.findOrCreate(groupJid);
    group.active = true; await group.save();
    await sock.sendMessage(dest, { text: '✅ Bot is now *active* in this group.' }, { quoted: message });
    return true;
  }

  if (command === 'botoff') {
    if (!hasPerms) return deny();
    const group = await Group.findOrCreate(groupJid);
    group.active = false; await group.save();
    await sock.sendMessage(dest, { text: '💤 Bot is now *inactive* in this group. Use `.boton` to re-enable.' }, { quoted: message });
    return true;
  }

  if (command === 'active') {
    if (!hasPerms) return deny();
    try {
      const meta  = await sock.groupMetadata(groupJid);
      const group = await Group.findOne({ jid: groupJid });
      if (!group) { await sock.sendMessage(dest, { text: '❌ No activity data yet. Members need to chat first!' }, { quoted: message }); return true; }
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeList = (group.memberActivity || [])
        .filter(d => d.lastSeen && new Date(d.lastSeen) >= sevenDaysAgo)
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
      if (!activeList.length) { await sock.sendMessage(dest, { text: `❌ No active users found in the last 7 days in *${meta.subject}*.` }, { quoted: message }); return true; }
      const mentionJids = activeList.map(a => a.jid);
      const userLines   = activeList.map(a => `👤 @${a.jid.split('@')[0]} (${a.messageCount})`).join('\n');
      await sock.sendMessage(dest, {
        text: `*⏳ Active Users:* ${activeList.length}\n*🎃 Group:* ${meta.subject}\n\n${userLines}`,
        mentions: mentionJids,
      }, { quoted: message });
    } catch { await sock.sendMessage(dest, { text: '❌ Failed to fetch active users.' }, { quoted: message }); }
    return true;
  }

  if (command === 'invitelink' || command === 'resetlink' || command === 'revoke') {
    if (!hasPerms) return deny();
    if (command === 'revoke' || command === 'resetlink') await sock.groupRevokeInvite(groupJid);
    const link = await sock.groupInviteCode(groupJid);
    await sock.sendMessage(dest, { text: `🔗 Invite Link:\nhttps://chat.whatsapp.com/${link}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleAdmin };
