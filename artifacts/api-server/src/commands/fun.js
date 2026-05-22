const { randomInt, getRandom } = require('../utils/helpers');

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "What do you call fake spaghetti? An impasta!",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
  "Why can't you give Elsa a balloon? Because she'll let it go.",
  "I would tell you a construction joke, but I'm still working on it.",
  "What do you call cheese that isn't yours? Nacho cheese!",
  "Why did the bicycle fall over? Because it was two-tired!",
];

const QUOTES = [
  '"The only way to do great work is to love what you do." – Steve Jobs',
  '"In the middle of every difficulty lies opportunity." – Albert Einstein',
  '"It does not matter how slowly you go as long as you do not stop." – Confucius',
  '"Life is what happens when you\'re busy making other plans." – John Lennon',
  '"The future belongs to those who believe in the beauty of their dreams." – Eleanor Roosevelt',
  '"Spread love everywhere you go." – Mother Teresa',
  '"Always remember that you are absolutely unique. Just like everyone else." – Margaret Mead',
];

const FACTS = [
  "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that's still good.",
  "A group of flamingos is called a flamboyance.",
  "Octopuses have three hearts and blue blood.",
  "Bananas are berries, but strawberries aren't.",
  "The shortest war in history was between Zanzibar and England. Zanzibar surrendered after 38 minutes.",
  "A day on Venus is longer than a year on Venus.",
  "Crows are capable of recognizing human faces.",
  "Wombat poop is cube-shaped.",
];

const TRUTHS = [
  "What's the most embarrassing thing that happened to you in school?",
  "Have you ever lied to get out of trouble? What was it?",
  "What's your biggest fear?",
  "What's something you've never told anyone?",
  "Have you ever cheated on a test?",
  "What's the most recent lie you've told?",
  "What's your most embarrassing moment?",
];

const DARES = [
  "Send the last photo in your gallery to the group!",
  "Do 10 push-ups right now and send proof!",
  "Change your profile picture to something silly for 24 hours!",
  "Sing a song and send the voice note!",
  "Write a poem about the person above you!",
  "Send a voice note of your best animal impression!",
  "Send a selfie with the silliest face you can make!",
];

const WOULD_YOU_RATHER = [
  "Would you rather have the ability to fly or be invisible?",
  "Would you rather live without music or without movies?",
  "Would you rather be always cold or always hot?",
  "Would you rather have super strength or super speed?",
  "Would you rather speak every language or play every instrument?",
  "Would you rather never use social media again or never watch a movie again?",
  "Would you rather be the funniest person or the smartest person in the room?",
];

const ROASTS = [
  "You're like a cloud ☁️ — when you disappear, it's a beautiful day.",
  "I'd agree with you, but then we'd both be wrong.",
  "You have your entire life to be an idiot. Why not take today off?",
  "You're not stupid; you just have bad luck thinking.",
  "I'm jealous of people who don't know you.",
  "If you were any less intelligent, we'd have to water you.",
  "You're proof that evolution CAN go in reverse.",
];

const COMPLIMENTS = [
  "You have an amazing smile! 😊",
  "You make the world a better place just by being in it! 🌟",
  "Your kindness is truly inspiring! ❤️",
  "You're incredibly talented and don't even know it! 🎯",
  "The way you handle challenges is admirable! 💪",
  "You have a heart of gold! ✨",
  "You light up every room you walk into! ☀️",
];

const MAGIC_8_BALL = [
  "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely!",
  "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
  "Yes!", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
  "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.",
  "Outlook not so good.", "Very doubtful.",
];

async function handleFun(sock, message, command, args, sender, isGroup, groupJid) {
  const dest     = isGroup ? groupJid : sender;
  const userName = message.pushName || sender.split('@')[0];

  const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
  const targetJid    = quotedSender || mentions[0];
  const targetName   = targetJid ? `@${targetJid.split('@')[0]}` : 'the void';

  if (command === 'joke') {
    await sock.sendMessage(dest, { text: `😂 ${getRandom(JOKES)}` }, { quoted: message });
    return true;
  }

  if (command === 'quote') {
    await sock.sendMessage(dest, { text: `💬 ${getRandom(QUOTES)}` }, { quoted: message });
    return true;
  }

  if (command === 'fact') {
    await sock.sendMessage(dest, { text: `🧠 *Random Fact:*\n${getRandom(FACTS)}` }, { quoted: message });
    return true;
  }

  if (command === 'truth') {
    await sock.sendMessage(dest, { text: `🎲 *Truth:*\n\n${getRandom(TRUTHS)}` }, { quoted: message });
    return true;
  }

  if (command === 'dare') {
    await sock.sendMessage(dest, { text: `🎯 *Dare:*\n\n${getRandom(DARES)}` }, { quoted: message });
    return true;
  }

  if (command === 'wouldyourather' || command === 'wyr') {
    await sock.sendMessage(dest, { text: `🤔 *Would You Rather?*\n\n${getRandom(WOULD_YOU_RATHER)}` }, { quoted: message });
    return true;
  }

  if (command === '8ball') {
    const question = args.join(' ');
    if (!question) { await sock.sendMessage(dest, { text: '❌ Usage: `.8ball <question>`' }, { quoted: message }); return true; }
    await sock.sendMessage(dest, { text: `🎱 *${question}*\n\n"${getRandom(MAGIC_8_BALL)}"` }, { quoted: message });
    return true;
  }

  if (command === 'ship') {
    const [a, b] = mentions;
    const nameA  = a ? `@${a.split('@')[0]}` : userName;
    const nameB  = b ? `@${b.split('@')[0]}` : targetName;
    const pct    = randomInt(1, 100);
    const hearts = '❤️'.repeat(Math.floor(pct / 20));
    await sock.sendMessage(dest, {
      text: `💞 *Love Calculator!*\n\n${nameA} + ${nameB}\n\n${hearts}\n\n💕 Compatibility: *${pct}%*\n${pct > 80 ? '🔥 Made for each other!' : pct > 60 ? '💕 Good match!' : pct > 40 ? '🙂 Could work!' : '😬 Maybe not...'}`,
      mentions: [a, b].filter(Boolean),
    }, { quoted: message });
    return true;
  }

  if (command === 'rate') {
    const name = targetJid ? targetName : userName;
    const pct  = randomInt(0, 100);
    await sock.sendMessage(dest, {
      text: `⭐ *Rating ${name}*\n\n${'⭐'.repeat(Math.ceil(pct / 20))}${'☆'.repeat(5 - Math.ceil(pct / 20))}\n\nScore: *${pct}/100*`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'roast') {
    const name = targetJid ? targetName : 'you';
    await sock.sendMessage(dest, {
      text: `🔥 *Roasting ${name}:*\n\n${getRandom(ROASTS)}`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'compliment') {
    const name = targetJid ? targetName : userName;
    await sock.sendMessage(dest, {
      text: `💌 *For ${name}:*\n\n${getRandom(COMPLIMENTS)}`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'rps') {
    const choices = ['rock 🪨', 'paper 📄', 'scissors ✂️'];
    const yours   = args[0]?.toLowerCase();
    if (!yours || !['rock', 'paper', 'scissors'].includes(yours)) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.rps <rock|paper|scissors>`' }, { quoted: message }); return true;
    }
    const bot   = getRandom(['rock', 'paper', 'scissors']);
    const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    const result = yours === bot ? '🤝 Tie!' : beats[yours] === bot ? '🎉 You win!' : '😅 I win!';
    await sock.sendMessage(dest, {
      text: `🪨📄✂️ *Rock, Paper, Scissors!*\n\nYou: *${yours}*\nBot: *${bot}*\n\n${result}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'pick') {
    const options = args.join(' ').split('/').map(o => o.trim()).filter(Boolean);
    if (options.length < 2) { await sock.sendMessage(dest, { text: '❌ Usage: `.pick option1/option2/...'` }, { quoted: message }); return true; }
    await sock.sendMessage(dest, { text: `🎲 *I pick:* *${getRandom(options)}*` }, { quoted: message });
    return true;
  }

  if (command === 'reverse') {
    const text = args.join(' ');
    if (!text) { await sock.sendMessage(dest, { text: '❌ Usage: `.reverse <text>`' }, { quoted: message }); return true; }
    await sock.sendMessage(dest, { text: `🔄 ${text.split('').reverse().join('')}` }, { quoted: message });
    return true;
  }

  if (command === 'emojify') {
    const map = { a:'🅰',b:'🅱',c:'©',d:'♦',e:'📧',f:'🎏',g:'⛽',h:'♓',i:'ℹ',j:'🎷',k:'🎋',l:'🌊',m:'〽',n:'♑',o:'⭕',p:'🅿',q:'💟',r:'♋',s:'💲',t:'✝',u:'⛎',v:'♈',w:'〰',x:'❌',y:'✌',z:'💤' };
    const text = args.join(' ').toLowerCase();
    if (!text) { await sock.sendMessage(dest, { text: '❌ Usage: `.emojify <text>`' }, { quoted: message }); return true; }
    const emojified = text.split('').map(c => map[c] || c).join(' ');
    await sock.sendMessage(dest, { text: emojified }, { quoted: message });
    return true;
  }

  if (command === 'fliptext') {
    const flip = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ɓ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z' };
    const text = args.join(' ').toLowerCase();
    if (!text) { await sock.sendMessage(dest, { text: '❌ Usage: `.fliptext <text>`' }, { quoted: message }); return true; }
    const flipped = text.split('').map(c => flip[c] || c).reverse().join('');
    await sock.sendMessage(dest, { text: flipped }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleFun };
