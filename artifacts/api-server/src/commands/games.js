const { randomInt, getRandom } = require('../utils/helpers');

const activeGames = new Map();

const HANGMAN_WORDS = ['javascript', 'pokemon', 'discord', 'whatsapp', 'dragon', 'wizard', 'castle', 'treasure', 'adventure', 'rainbow', 'butterfly', 'volcano', 'galaxy', 'crystal', 'diamond'];
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
  { q: 'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. I have roads, but no cars drive there. What am I?', a: 'map' },
  { q: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', a: 'keyboard' },
  { q: 'What gets wetter the more it dries?', a: 'towel' },
];
const FASTTYPE_PHRASES = [
  'the quick brown fox jumps over the lazy dog',
  'pack my box with five dozen liquor jugs',
  'how vexingly quick daft zebras jump',
  'the five boxing wizards jump quickly',
  'sphinx of black quartz judge my vow',
];

async function handleGames(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const userName = message.pushName || sender.split('@')[0];
  const gameKey = isGroup ? `${groupJid}_${command}` : `${sender}_${command}`;

  if (command === 'hangman') {
    const existing = activeGames.get(gameKey);
    if (existing) {
      const word = existing.word;
      const guessed = existing.guessed;
      const display = word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
      const input = args[0]?.toLowerCase();
      if (!input || input.length !== 1) {
        await sock.sendMessage(dest, { text: `🎯 *Hangman* — Guess a letter!\n\n${display}\n❤️ Lives: ${existing.lives}\nGuessed: ${guessed.join(', ') || 'none'}` }, { quoted: message });
        return true;
      }
      if (guessed.includes(input)) {
        await sock.sendMessage(dest, { text: `❌ Already guessed "${input}"!` }, { quoted: message });
        return true;
      }
      guessed.push(input);
      const newDisplay = word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
      if (!word.includes(input)) {
        existing.lives--;
        if (existing.lives <= 0) {
          activeGames.delete(gameKey);
          await sock.sendMessage(dest, { text: `💀 *Game Over!* The word was: *${word}*` }, { quoted: message });
          return true;
        }
      }
      if (!newDisplay.includes('_')) {
        activeGames.delete(gameKey);
        await sock.sendMessage(dest, { text: `🎉 *You Won!* The word was: *${word}*` }, { quoted: message });
        return true;
      }
      await sock.sendMessage(dest, { text: `🎯 *Hangman*\n\n${newDisplay}\n❤️ Lives: ${existing.lives}\nGuessed: ${guessed.join(', ')}` }, { quoted: message });
      return true;
    }
    const word = getRandom(HANGMAN_WORDS);
    activeGames.set(gameKey, { word, guessed: [], lives: 6 });
    const display = '_'.repeat(word.length).split('').join(' ');
    await sock.sendMessage(dest, { text: `🎯 *Hangman Started!*\n\n${display}\n\n❤️ Lives: 6\n\nGuess a letter with \`.hangman <letter>\`` }, { quoted: message });
    return true;
  }

  if (command === 'quiz' || command === 'trivia') {
    const trivia = getRandom(TRIVIA);
    activeGames.set(`${gameKey}_trivia`, { answer: trivia.a, started: Date.now() });
    await sock.sendMessage(dest, { text: `🧠 *Trivia!*\n\n${trivia.q}\n\nReply with your answer! You have 30 seconds.` }, { quoted: message });
    setTimeout(() => {
      const g = activeGames.get(`${gameKey}_trivia`);
      if (g) {
        activeGames.delete(`${gameKey}_trivia`);
        sock.sendMessage(dest, { text: `⏰ Time's up! The answer was: *${trivia.a}*` });
      }
    }, 30000);
    return true;
  }

  if (command === 'mathquiz') {
    const a = randomInt(1, 50), b = randomInt(1, 50);
    const ops = ['+', '-', '*'];
    const op = getRandom(ops);
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    activeGames.set(`${gameKey}_math`, { answer: String(answer), started: Date.now() });
    await sock.sendMessage(dest, { text: `🔢 *Math Quiz!*\n\nWhat is *${a} ${op} ${b}*?\n\nYou have 20 seconds!` }, { quoted: message });
    setTimeout(() => {
      const g = activeGames.get(`${gameKey}_math`);
      if (g) {
        activeGames.delete(`${gameKey}_math`);
        sock.sendMessage(dest, { text: `⏰ Time's up! The answer was: *${answer}*` });
      }
    }, 20000);
    return true;
  }

  if (command === 'riddle') {
    const riddle = getRandom(RIDDLES);
    activeGames.set(`${gameKey}_riddle`, { answer: riddle.a, started: Date.now() });
    await sock.sendMessage(dest, { text: `🤔 *Riddle!*\n\n${riddle.q}\n\nReply your answer! 60 seconds.` }, { quoted: message });
    setTimeout(() => {
      const g = activeGames.get(`${gameKey}_riddle`);
      if (g) {
        activeGames.delete(`${gameKey}_riddle`);
        sock.sendMessage(dest, { text: `⏰ Time's up! The answer was: *${riddle.a}*` });
      }
    }, 60000);
    return true;
  }

  if (command === 'guessnumber') {
    const num = randomInt(1, 100);
    activeGames.set(`${gameKey}_guess`, { number: num, attempts: 0, started: Date.now() });
    await sock.sendMessage(dest, { text: `🎲 *Guess the Number!*\n\nI'm thinking of a number between *1 and 100*.\nGuess with \`.guessnumber <number>\`` }, { quoted: message });
    const existingGuess = activeGames.get(`${gameKey}_guess`);
    if (existingGuess && args[0]) {
      const guess = parseInt(args[0]);
      existingGuess.attempts++;
      if (guess === num) {
        activeGames.delete(`${gameKey}_guess`);
        await sock.sendMessage(dest, { text: `🎉 *Correct!* The number was *${num}*! You got it in ${existingGuess.attempts} attempt(s)!` }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: `${guess < num ? '📈 Too low!' : '📉 Too high!'} Try again! Attempts: ${existingGuess.attempts}` }, { quoted: message });
      }
    }
    return true;
  }

  if (command === 'fasttype') {
    const phrase = getRandom(FASTTYPE_PHRASES);
    activeGames.set(`${gameKey}_fast`, { phrase, started: Date.now() });
    await sock.sendMessage(dest, { text: `⌨️ *Fast Type Challenge!*\n\nType this EXACTLY:\n\n_${phrase}_\n\nGO! ⏱️` }, { quoted: message });
    setTimeout(() => {
      const g = activeGames.get(`${gameKey}_fast`);
      if (g) {
        activeGames.delete(`${gameKey}_fast`);
        sock.sendMessage(dest, { text: `⏰ Time's up! Faster next time!` });
      }
    }, 30000);
    return true;
  }

  if (command === 'wordgame') {
    const words = ['APPLE', 'MANGO', 'BRAVE', 'STONE', 'FLAME', 'CLOUD', 'SWORD', 'RIVER', 'TOWER', 'NIGHT'];
    const word = getRandom(words);
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    activeGames.set(`${gameKey}_word`, { answer: word.toLowerCase(), started: Date.now() });
    await sock.sendMessage(dest, { text: `🔤 *Word Scramble!*\n\nUnscramble: *${scrambled}*\n\nYou have 30 seconds!` }, { quoted: message });
    setTimeout(() => {
      const g = activeGames.get(`${gameKey}_word`);
      if (g) {
        activeGames.delete(`${gameKey}_word`);
        sock.sendMessage(dest, { text: `⏰ Time's up! The word was: *${word}*` });
      }
    }, 30000);
    return true;
  }

  if (command === 'minesweeper') {
    const size = 5;
    const mines = 5;
    const board = Array(size).fill(null).map(() => Array(size).fill('🟦'));
    const minePositions = new Set();
    while (minePositions.size < mines) {
      minePositions.add(`${randomInt(0, size - 1)},${randomInt(0, size - 1)}`);
    }
    for (const pos of minePositions) {
      const [r, c] = pos.split(',').map(Number);
      board[r][c] = '💣';
    }
    const display = board.map(row => row.map(cell => cell === '💣' ? '🟦' : cell).join('')).join('\n');
    await sock.sendMessage(dest, { text: `💣 *Minesweeper!*\n\n${display}\n\nFind the mines! (${mines} hidden)` }, { quoted: message });
    return true;
  }

  if (command === 'leaderboard') {
    const User = require('../models/User');
    const top = await User.find().sort({ level: -1, xp: -1 }).limit(10);
    const list = top.map((u, i) => `*${i + 1}.* ${u.name} — Lvl ${u.level} | XP: ${u.xp}`).join('\n');
    await sock.sendMessage(dest, { text: `🏆 *Leaderboard*\n\n${list || 'No players yet!'}` }, { quoted: message });
    return true;
  }

  if (command === 'duel') {
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentions[0];
    if (!target) {
      await sock.sendMessage(dest, { text: '❌ Mention a user to duel!' }, { quoted: message });
      return true;
    }
    const playerRoll = randomInt(1, 100);
    const targetRoll = randomInt(1, 100);
    const winner = playerRoll > targetRoll ? userName : `@${target.split('@')[0]}`;
    const loser = playerRoll > targetRoll ? `@${target.split('@')[0]}` : userName;
    await sock.sendMessage(dest, {
      text: `⚔️ *DUEL!*\n\n${userName} vs @${target.split('@')[0]}\n\n🎲 ${userName}: ${playerRoll}\n🎲 @${target.split('@')[0]}: ${targetRoll}\n\n🏆 *${winner}* wins! 🎉`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'arcade') {
    await sock.sendMessage(dest, {
      text: `🎮 *ARCADE*\n\nAvailable games:\n• \`.hangman\` — Word guessing\n• \`.quiz\` — Trivia questions\n• \`.mathquiz\` — Math challenge\n• \`.riddle\` — Brain teasers\n• \`.guessnumber\` — Number guessing\n• \`.fasttype\` — Typing race\n• \`.wordgame\` — Word scramble\n• \`.minesweeper\` — Minesweeper\n• \`.duel @user\` — PvP battle`,
    }, { quoted: message });
    return true;
  }

  return false;
}

function handleGameAnswer(sock, message, text, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const key = isGroup ? groupJid : sender;
  const clean = text.toLowerCase().trim();

  for (const type of ['_trivia', '_math', '_riddle', '_word', '_fast']) {
    const gameKey = `${key}_quiz${type}` in activeGames ? `${key}_quiz${type}` :
                    `${key}_trivia${type}` in activeGames ? `${key}_trivia${type}` :
                    `${key}_hangman${type}` in activeGames ? `${key}_hangman${type}` : null;
  }

  const triviaKey = `${key}_quiz_trivia`;
  const mathKey = `${key}_quiz_math`;
  const riddleKey = `${key}_quiz_riddle`;
  const wordKey = `${key}_quiz_word`;
  const fastKey = `${key}_quiz_fast`;

  const checkKeys = ['_trivia', '_math', '_riddle', '_word', '_fast'];
  for (const suffix of checkKeys) {
    const gk = `${isGroup ? groupJid : sender}_hangman${suffix}`;
    const fullKey = `${isGroup ? groupJid : sender}_hangman${suffix}`;
  }

  const gameTypes = ['trivia', 'math', 'riddle', 'word', 'fast'];
  for (const type of gameTypes) {
    const gk = `${isGroup ? groupJid : sender}_hangman_${type}`;
    const game = activeGames.get(gk);
    if (game) {
      if (clean === game.answer || clean === game.phrase) {
        const elapsed = ((Date.now() - game.started) / 1000).toFixed(1);
        activeGames.delete(gk);
        sock.sendMessage(dest, {
          text: `🎉 *Correct!* @${sender.split('@')[0]} got it right in *${elapsed}s*!`,
          mentions: [sender],
        });
        return true;
      }
    }
  }

  for (const type of gameTypes) {
    const gk = `${isGroup ? groupJid : sender}_${type}`;
    const game = activeGames.get(gk);
    if (game && game.answer !== undefined) {
      if (clean === game.answer || (game.phrase && clean === game.phrase)) {
        const elapsed = ((Date.now() - game.started) / 1000).toFixed(1);
        activeGames.delete(gk);
        sock.sendMessage(dest, {
          text: `🎉 *Correct!* @${sender.split('@')[0]} got it right in *${elapsed}s*!`,
          mentions: [sender],
        });
        return true;
      }
    }
  }

  const guessGameKey = `${isGroup ? groupJid : sender}_guess`;
  const guessGame = activeGames.get(guessGameKey);
  if (guessGame) {
    const guess = parseInt(clean);
    if (!isNaN(guess)) {
      guessGame.attempts++;
      if (guess === guessGame.number) {
        activeGames.delete(guessGameKey);
        sock.sendMessage(dest, {
          text: `🎉 *Correct!* @${sender.split('@')[0]} guessed *${guessGame.number}* in ${guessGame.attempts} attempt(s)!`,
          mentions: [sender],
        });
      } else {
        sock.sendMessage(dest, { text: `${guess < guessGame.number ? '📈 Too low!' : '📉 Too high!'} Try again! Attempts: ${guessGame.attempts}` });
      }
      return true;
    }
  }

  return false;
}

module.exports = { handleGames, handleGameAnswer, activeGames };
