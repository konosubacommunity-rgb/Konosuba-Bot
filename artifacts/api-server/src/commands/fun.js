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
  '"It is during our darkest moments that we must focus to see the light." – Aristotle',
  '"Spread love everywhere you go." – Mother Teresa',
  '"When you reach the end of your rope, tie a knot in it and hang on." – Franklin D. Roosevelt',
  '"Always remember that you are absolutely unique. Just like everyone else." – Margaret Mead',
  '"Do not go where the path may lead, go instead where there is no path and leave a trail." – Ralph Waldo Emerson',
];

const FACTS = [
  "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that's still good.",
  "A group of flamingos is called a flamboyance.",
  "Octopuses have three hearts and blue blood.",
  "Bananas are berries, but strawberries aren't.",
  "The shortest war in history was between Zanzibar and England. Zanzibar surrendered after 38 minutes.",
  "A day on Venus is longer than a year on Venus.",
  "The average person walks about 100,000 miles in their lifetime.",
  "Crows are capable of recognizing human faces.",
  "Wombat poop is cube-shaped.",
  "There are more possible iterations of a game of chess than there are atoms in the observable universe.",
];

const TRUTHS = [
  "What's the most embarrassing thing that happened to you in school?",
  "Have you ever lied to get out of trouble? What was it?",
  "What's your biggest fear?",
  "What's the most childish thing you still do?",
  "What's something you've never told anyone?",
  "Have you ever cheated on a test?",
  "What's the most recent lie you've told?",
  "What's your most embarrassing moment?",
  "Have you ever pretended to be sick to avoid something?",
  "What's the strangest dream you've ever had?",
];

const DARES = [
  "Send a voice note singing a nursery rhyme!",
  "Change your status to 'I love Aqua Bot!' for 10 minutes.",
  "Text the 5th contact in your phonebook 'You're my hero!'",
  "Do 20 jumping jacks and send a video!",
  "Speak in rhymes for the next 5 minutes.",
  "Post a selfie with a funny face.",
  "Call someone and speak in a fake accent.",
  "Let the person next to you post a status from your phone.",
  "Send a voice note of your best animal impression.",
  "Type everything backward for the next 3 messages.",
];

const WYR = [
  "Would you rather be able to fly or be invisible?",
  "Would you rather have unlimited money or unlimited time?",
  "Would you rather always be 10 minutes late or always be 20 minutes early?",
  "Would you rather be able to speak every language or play every instrument?",
  "Would you rather live in a world without music or without movies?",
  "Would you rather have super strength or super speed?",
  "Would you rather always know when people are lying or always get away with lying?",
  "Would you rather explore space or the deep ocean?",
  "Would you rather lose all your memories or never be able to make new ones?",
  "Would you rather be famous for something bad or forgotten forever?",
];

const ROASTS = [
  "You're like a software update — whenever I see you, I think 'Not now.'",
  "I'd roast you but my parents told me not to burn trash.",
  "You're proof that even evolution makes mistakes.",
  "I'd explain it to you but I left my crayons at home.",
  "You're not stupid — you just have bad luck thinking.",
  "I'd agree with you but then we'd both be wrong.",
  "Your secrets are always safe with me. I never even listen when you tell me them.",
  "Somewhere out there is a tree tirelessly producing oxygen for you. You owe it an apology.",
  "I've met some pricks in my time, but you really are a full cactus.",
  "You're as bright as a black hole, and twice as dense.",
];

const COMPLIMENTS = [
  "You light up every room you walk into — and that's not just the phone screen reflecting off you!",
  "You're genuinely one of the most thoughtful people I know.",
  "Your smile could cure someone's bad day.",
  "You're smart, kind, and incredible. Don't forget that!",
  "The world is genuinely better with you in it.",
  "You make everything more fun just by being there.",
  "You have an amazing sense of humor and a heart to match.",
  "Your positive energy is absolutely contagious — in the best way.",
  "Anyone lucky enough to know you doesn't know how good they have it.",
  "You're a rare gem in this world. Never change.",
];

const EIGHTBALL = [
  "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.",
  "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
  "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
  "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.",
  "Outlook not so good.", "Very doubtful.",
];

async function handleFun(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const userName = message.pushName || sender.split('@')[0];
  const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
  const targetJid = quotedSender || mentions[0];
  const targetName = targetJid ? `@${targetJid.split('@')[0]}` : 'someone';

  if (command === 'joke') {
    await sock.sendMessage(dest, { text: `😂 *Joke Time!*\n\n${getRandom(JOKES)}` }, { quoted: message });
    return true;
  }

  if (command === 'quote') {
    await sock.sendMessage(dest, { text: `💭 *Quote of the Moment*\n\n${getRandom(QUOTES)}` }, { quoted: message });
    return true;
  }

  if (command === 'fact') {
    await sock.sendMessage(dest, { text: `🧠 *Random Fact!*\n\n${getRandom(FACTS)}` }, { quoted: message });
    return true;
  }

  if (command === 'truth') {
    await sock.sendMessage(dest, { text: `💬 *Truth Question for ${userName}:*\n\n${getRandom(TRUTHS)}` }, { quoted: message });
    return true;
  }

  if (command === 'dare') {
    await sock.sendMessage(dest, { text: `🎯 *Dare for ${userName}:*\n\n${getRandom(DARES)}` }, { quoted: message });
    return true;
  }

  if (command === '8ball') {
    const question = args.join(' ');
    if (!question) {
      await sock.sendMessage(dest, { text: '❓ Ask me a question! Usage: `.8ball <question>`' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `🎱 *Magic 8-Ball*\n\n❓ ${question}\n\n🔮 ${getRandom(EIGHTBALL)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'ship') {
    const m = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const name1 = m[0] ? `@${m[0].split('@')[0]}` : args[0] || userName;
    const name2 = m[1] ? `@${m[1].split('@')[0]}` : args[1] || 'someone';
    const compat = randomInt(0, 100);
    const hearts = compat >= 80 ? '💕💕💕' : compat >= 50 ? '💙' : '💔';
    await sock.sendMessage(dest, {
      text: `💞 *Ship Calculator*\n\n${name1} ❤️ ${name2}\n\nCompatibility: *${compat}%* ${hearts}`,
      mentions: m,
    }, { quoted: message });
    return true;
  }

  if (command === 'rate') {
    const name = targetJid ? targetName : userName;
    const rate = randomInt(0, 100);
    await sock.sendMessage(dest, {
      text: `⭐ *Rating*\n\nI rate ${name} *${rate}/100*!`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'roast') {
    const name = targetJid ? targetName : userName;
    await sock.sendMessage(dest, {
      text: `🔥 *Roast for ${name}:*\n\n${getRandom(ROASTS)}`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'compliment') {
    const name = targetJid ? targetName : userName;
    await sock.sendMessage(dest, {
      text: `💖 *Compliment for ${name}:*\n\n${getRandom(COMPLIMENTS)}`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'pick') {
    const options = args.join(' ').split('/').map(o => o.trim()).filter(Boolean);
    if (options.length < 2) {
      await sock.sendMessage(dest, { text: '❌ Provide at least 2 options: `.pick option1/option2`' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `🎯 *I choose...*\n\n*${getRandom(options)}*`,
    }, { quoted: message });
    return true;
  }

  if (command === 'reverse') {
    const text = args.join(' ');
    if (!text) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.reverse <text>`' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, { text: `🔄 ${text.split('').reverse().join('')}` }, { quoted: message });
    return true;
  }

  if (command === 'fliptext') {
    const text = args.join(' ');
    if (!text) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.fliptext <text>`' }, { quoted: message });
      return true;
    }
    const flipped = text.split('').map(c => {
      const map = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' };
      return map[c.toLowerCase()] || c;
    }).reverse().join('');
    await sock.sendMessage(dest, { text: `🙃 ${flipped}` }, { quoted: message });
    return true;
  }

  if (command === 'emojify') {
    const text = args.join(' ');
    if (!text) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.emojify <text>`' }, { quoted: message });
      return true;
    }
    const emojiMap = { a: '🅰️', b: '🅱️', c: '🇨', d: '🇩', e: '📧', f: '🎏', g: '🇬', h: '♓', i: 'ℹ️', j: '🗾', k: '🇰', l: '🇱', m: 'Ⓜ️', n: '🇳', o: '🅾️', p: '🅿️', q: '🇶', r: '🇷', s: '🇸', t: '✝️', u: '⛎', v: '✅', w: '🇼', x: '❌', y: '🇾', z: '💤' };
    const emojified = text.toLowerCase().split('').map(c => emojiMap[c] || (c === ' ' ? '   ' : c)).join(' ');
    await sock.sendMessage(dest, { text: emojified }, { quoted: message });
    return true;
  }

  if (command === 'rps') {
    const choice = args[0]?.toLowerCase();
    if (!['rock', 'paper', 'scissors'].includes(choice)) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.rps <rock/paper/scissors>`' }, { quoted: message });
      return true;
    }
    const botChoices = ['rock', 'paper', 'scissors'];
    const botChoice = getRandom(botChoices);
    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    let result;
    if (choice === botChoice) result = '🤝 It\'s a tie!';
    else if ((choice === 'rock' && botChoice === 'scissors') || (choice === 'paper' && botChoice === 'rock') || (choice === 'scissors' && botChoice === 'paper')) result = '🎉 You win!';
    else result = '😈 I win!';
    await sock.sendMessage(dest, {
      text: `✂️ *Rock Paper Scissors*\n\nYou: ${emoji[choice]} ${choice}\nMe: ${emoji[botChoice]} ${botChoice}\n\n${result}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'wouldyourather') {
    await sock.sendMessage(dest, { text: `🤔 *Would You Rather?*\n\n${getRandom(WYR)}` }, { quoted: message });
    return true;
  }

  if (command === 'howgay') {
    const name = targetJid ? targetName : userName;
    const pct = randomInt(0, 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    await sock.sendMessage(dest, {
      text: `🏳️‍🌈 *How Gay Meter*\n\n${name} is *${pct}% gay!*\n[${bar}]`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'howcool') {
    const name = targetJid ? targetName : userName;
    const pct = randomInt(0, 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    await sock.sendMessage(dest, {
      text: `😎 *Coolness Meter*\n\n${name} is *${pct}% cool!*\n[${bar}]`,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: message });
    return true;
  }

  if (command === 'meme') {
    const memes = [
      'https://api.memegen.link/images/doge/wow/such+bot.png',
      'https://api.memegen.link/images/buzz/aqua+bot/is+everywhere.png',
      'https://api.memegen.link/images/drake/other+bots/aqua+bot.png',
      'https://api.memegen.link/images/success/used+aqua+bot/profit.png',
    ];
    const url = getRandom(memes);
    try {
      const axios = require('axios');
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
      await sock.sendMessage(dest, { image: Buffer.from(res.data), caption: '😂 *Random Meme!*' }, { quoted: message });
    } catch {
      await sock.sendMessage(dest, { text: `😂 Here's a meme: ${url}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'nickname') {
    const m = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const nick = args.slice(m.length > 0 ? 1 : 0).join(' ');
    const name = m[0] ? `@${m[0].split('@')[0]}` : userName;
    await sock.sendMessage(dest, {
      text: `🏷️ Nickname set! ${name} shall now be called *${nick || 'nameless'}* 🎭`,
      mentions: m,
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleFun };
