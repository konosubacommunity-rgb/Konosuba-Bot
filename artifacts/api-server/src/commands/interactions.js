const { getRandom } = require('../utils/helpers');

const ACTIONS = {
  hug:      { emoji: '🤗', gifs: ['hugging warmly', 'giving a big hug', 'squeezing tightly'] },
  kiss:     { emoji: '😘', gifs: ['blowing a kiss', 'giving a sweet kiss', 'planting a peck'] },
  pat:      { emoji: '🥰', gifs: ['patting gently', 'head patting', 'giving a soft pat'] },
  slap:     { emoji: '👋', gifs: ['slapping dramatically', 'giving a hard slap', 'smacking'] },
  punch:    { emoji: '👊', gifs: ['throwing a punch', 'punching with full force', 'delivering an uppercut'] },
  bite:     { emoji: '😬', gifs: ['biting playfully', 'nibbling', 'taking a chomp'] },
  cuddle:   { emoji: '🥰', gifs: ['cuddling close', 'snuggling up', 'wrapping in a warm cuddle'] },
  poke:     { emoji: '👉', gifs: ['poking gently', 'jabbing playfully', 'prodding'] },
  tickle:   { emoji: '🤣', gifs: ['tickling mercilessly', 'going for the sides', 'tickle attacking'] },
  wave:     { emoji: '👋', gifs: ['waving hello', 'giving a friendly wave', 'enthusiastically waving'] },
  highfive: { emoji: '✋', gifs: ['going for a high five', 'slapping palms', 'epic high five'] },
  handhold: { emoji: '🤝', gifs: ['holding hands', 'grabbing your hand', 'interlocking fingers'] },
  stare:    { emoji: '👀', gifs: ['staring intensely', 'watching without blinking', 'eyeing you'] },
};

const SELF_ACTIONS = {
  blush:  { emoji: '😊', msg: 'is blushing! 😊' },
  smile:  { emoji: '😄', msg: 'flashes a warm smile! 😄' },
  cry:    { emoji: '😭', msg: 'starts crying! 😭' },
  laugh:  { emoji: '😂', msg: 'bursts out laughing! 😂' },
  dance:  { emoji: '💃', msg: 'starts dancing! 💃🕺' },
  angry:  { emoji: '😠', msg: 'is fuming mad! 😠' },
  sleep:  { emoji: '😴', msg: 'has fallen asleep! 😴 zzz...' },
};

async function handleInteractions(sock, message, command, args, sender, isGroup, groupJid) {
  const dest         = isGroup ? groupJid : sender;
  const userName     = message.pushName || sender.split('@')[0];
  const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
  const targetJid    = quotedSender || mentions[0];
  const targetName   = targetJid ? `@${targetJid.split('@')[0]}` : 'the air';

  if (ACTIONS[command]) {
    const action     = ACTIONS[command];
    const actionText = getRandom(action.gifs);
    await sock.sendMessage(dest, {
      text: `${action.emoji} *${userName}* is ${actionText} ${targetName}! ${action.emoji}`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (SELF_ACTIONS[command]) {
    const action = SELF_ACTIONS[command];
    await sock.sendMessage(dest, {
      text: `${action.emoji} *${userName}* ${action.msg}`,
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleInteractions };
