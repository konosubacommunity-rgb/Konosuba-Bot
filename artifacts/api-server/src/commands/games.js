const { randomInt, getRandom } = require('../utils/helpers');

const activeGames = new Map();

const HANGMAN_WORDS = [
  'javascript','pokemon','discord','whatsapp','dragon','wizard','castle',
  'treasure','adventure','rainbow','butterfly','volcano','galaxy','crystal','diamond',
];

const TRIVIA = [
  { q: 'What planet is known as the Red Planet?', a: 'mars' },
  { q: 'How many sides does a hexagon have?', a: '6' },
  { q: 'What is the largest ocean on Earth?', a: 'pacific' },
  { q: 'Who painted the Mona Lisa?', a: 'leonardo da vinci' },
  { q: 'What is the capital of France?', a: 'paris' },
  { q: 'How many bones are in the human body?', a: '206' },
  { q: 'What is the fastest land animal?', a: 'cheetah' },
  { q: 'What gas do plants absorb?', a: 'carbon dioxide' },
  { q: 'What is H2O?', a: 'water' },
  { q: 'What is the largest planet in our solar system?', a: 'jupiter' },
];

const RIDDLES = [
  { q: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', a: 'echo' },
  { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
  { q: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', a: 'keyboard' },
  { q: 'What gets wetter the more it dries?', a: 'towel' },
  { q: 'I have cities, but no houses live there. I have mountains, but no trees grow there. What am I?', a: 'map' },
];

const FASTTYPE_PHRASES = [
  'the quick brown fox jumps over the lazy dog',
  'pack my box with five dozen liquor jugs',
  'how vexingly quick daft zebras jump',
  'the five boxing wizards jump quickly',
  'sphinx of black quartz judge my vow',
];

async function handleGames(sock, message, command, args, sender, isGroup, groupJid) {
  const dest     = isGroup ? groupJid : sender;
  const userName = message.pushName || sender.split('@')[0];
  const gameKey  = isGroup ? `${groupJid}_${command}` : `${sender}_${command}`;

  if (command === 'hangman') {
    const existing = activeGames.get(gameKey);
    if (existing) {
      const { word, guessed, lives } = existing;
      const display = word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
      const input   = args[0]?.toLowerCase();
      if (!input || input.length !== 1) {
        await sock.sendMessage(dest, { text: `🎯 *Hangman*\n\n${display}\n❤️ Lives: ${lives}\nGuessed: ${guessed.join(', ') || 'none'}` }, { quoted: message });
        return true;
      }
      if (guessed.includes(input)) {
        await sock.sendMessage(dest, { text: `❌ Already guessed "${input}"!` }, { quoted: message }); return true;
      }
      guessed.push(input);
      const newDisplay = word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
      if (!word.includes(input)) {
        existing.lives--;
        if (existing.lives <= 0) { activeGames.delete(gameKey); await sock.sendMessage(dest, { text: `💀 *Game Over!* The word was: *${word}*` }, { quoted: message }); return true; }
      }
      if (!newDisplay.includes('_')) { activeGames.delete(gameKey); await sock.sendMessage(dest, { text: `🎉 *You Won!* The word was: *${word}*` }, { quoted: message }); return true; }
      await sock.sendMessage(dest, { text: `🎯 *Hangman*\n\n${newDisplay}\n❤️ Lives: ${existing.lives}\nGuessed: ${guessed.join(', ')}` }, { quoted: message });
      return true;
    }
    const word = getRandom(HANGMAN_WORDS);
    activeGames.set(gameKey, { word, guessed: [], lives: 6 });
    await sock.sendMessage(dest, { text: `🎯 *Hangman Started!*\n\n${'_ '.repeat(word.length).trim()}\n❤️ Lives: 6\n\nGuess a letter: \`.hangman <letter>\`` }, { quoted: message });
    return true;
  }

  if (command === 'quiz' || command === 'trivia') {
    const trivia = getRandom(TRIVIA);
    activeGames.set(`${gameKey}_trivia`, { answer: trivia.a, started: Date.now() });
    await sock.sendMessage(dest, { text: `🧠 *Trivia!*\n\n${trivia.q}\n\n_Reply with your answer!_` }, { quoted: message });
    setTimeout(() => activeGames.delete(`${gameKey}_trivia`), 30000);
    return true;
  }

  if (command === 'riddle') {
    const riddle = getRandom(RIDDLES);
    activeGames.set(`${gameKey}_riddle`, { answer: riddle.a, started: Date.now() });
    await sock.sendMessage(dest, { text: `🤔 *Riddle!*\n\n${riddle.q}\n\n_Reply with your answer! (30 seconds)_` }, { quoted: message });
    setTimeout(() => activeGames.delete(`${gameKey}_riddle`), 30000);
    return true;
  }

  if (command === 'fasttype') {
    const phrase = getRandom(FASTTYPE_PHRASES);
    activeGames.set(`${gameKey}_fasttype`, { phrase, started: Date.now() });
    await sock.sendMessage(dest, { text: `⌨️ *Fast Type!*\n\nType this exactly:\n\n"${phrase}"\n\nTimer starts now! ⏱️` }, { quoted: message });
    setTimeout(() => activeGames.delete(`${gameKey}_fasttype`), 60000);
    return true;
  }

  if (command === 'guessnumber') {
    const number = randomInt(1, 100);
    activeGames.set(gameKey, { number, attempts: 0 });
    await sock.sendMessage(dest, { text: `🔢 *Guess the Number!*\n\nI'm thinking of a number between *1 and 100*.\nYou have 7 attempts!\n\nGuess: \`.guessnumber <number>\`` }, { quoted: message });
    return true;
  }

  if (command === 'mathquiz') {
    const a   = randomInt(1, 50);
    const b   = randomInt(1, 50);
    const ops = ['+', '-', '*'];
    const op  = getRandom(ops);
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    activeGames.set(`${gameKey}_math`, { answer: ans, started: Date.now() });
    await sock.sendMessage(dest, { text: `🔢 *Math Quiz!*\n\nWhat is *${a} ${op} ${b}*?\n\n_Reply with the answer! (20 seconds)_` }, { quoted: message });
    setTimeout(() => activeGames.delete(`${gameKey}_math`), 20000);
    return true;
  }

  if (command === 'minesweeper') {
    const size  = 5;
    const mines = 5;
    const grid  = Array.from({ length: size }, () => Array(size).fill('🟦'));
    let placed  = 0;
    while (placed < mines) {
      const r = randomInt(0, size - 1);
      const c = randomInt(0, size - 1);
      if (grid[r][c] !== '💣') { grid[r][c] = '💣'; placed++; }
    }
    const display = grid.map(row => row.map(c => c === '💣' ? '||💣||' : '||🟦||').join('')).join('\n');
    await sock.sendMessage(dest, { text: `💣 *Minesweeper* (5x5, 5 mines)\n\n${display}` }, { quoted: message });
    return true;
  }

  if (command === 'leaderboard') {
    const User = require('../models/User');
    const top  = await User.find({}, { name: 1, level: 1, xp: 1 }).sort({ level: -1, xp: -1 }).limit(10).lean();
    const list = top.map((u, i) => `${i + 1}. *${u.name}* — Lv.${u.level} (${u.xp} XP)`).join('\n');
    await sock.sendMessage(dest, { text: `🏆 *Game Leaderboard*\n\n${list}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGames };
