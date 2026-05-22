const User  = require('../models/User');
const { formatMs, formatMoney, parseAmount, randomInt } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/websiteSync');
const config = require('../config');

// FIX: use findOrCreateByJid instead of findOne({jid}) to handle LID users
async function getOrCreate(jid, name) {
  return User.findOrCreateByJid(jid, name);
}

async function handleGambling(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const gamblingCmds = ['coinflip', 'slots', 'blackjack', 'bj', 'roulette', 'dice', 'lottery', 'bet', 'highlow', 'crash'];
  if (!gamblingCmds.includes(command)) return false;

  const user = await getOrCreate(sender, message.pushName);
  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  const WIN_RATE = config.ECONOMY?.WIN_RATE || 0.45;
  const cdKey    = command === 'bj' ? 'blackjack' : command;

  const checkCd = () => {
    if (user.isOnCooldown(cdKey)) {
      sock.sendMessage(dest, { text: `⏳ \`${command}\` cooldown! Try again in *${formatMs(user.getCooldownLeft(cdKey))}*` }, { quoted: message });
      return true;
    }
    return false;
  };

  const parseAmt = () => {
    const amt = parseAmount(args[0]);
    if (!amt) { sock.sendMessage(dest, { text: `❌ Usage: \`.${command} <amount>\`` }, { quoted: message }); return null; }
    if (amt > user.wallet) { sock.sendMessage(dest, { text: `❌ Insufficient funds! You have ${formatMoney(user.wallet)}` }, { quoted: message }); return null; }
    if (amt <= 0) { sock.sendMessage(dest, { text: '❌ Amount must be positive!' }, { quoted: message }); return null; }
    return amt;
  };

  if (command === 'coinflip') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const win  = Math.random() < WIN_RATE;
    const coin = win ? '🟡 Heads' : '⚪ Tails';
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('coinflip');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🪙', 'Coinflip', win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    await sock.sendMessage(dest, {
      text: `🪙 *Coin Flip!*\n\nResult: *${coin}*\n${win ? `✅ You won ${formatMoney(amount)}!` : `❌ You lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'slots') {
    if (checkCd()) return true;
    const amount  = parseAmt(); if (!amount) return true;
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
    const [s1, s2, s3] = [symbols[randomInt(0, symbols.length - 1)], symbols[randomInt(0, symbols.length - 1)], symbols[randomInt(0, symbols.length - 1)]];
    const allSame  = s1 === s2 && s2 === s3;
    const twoSame  = s1 === s2 || s2 === s3 || s1 === s3;
    const jackpot  = allSame && s1 === '💎';
    let winAmount  = 0, result = '';
    if (jackpot)  { winAmount = amount * 10; result = '💎 *JACKPOT!!* 10x win!'; }
    else if (allSame) { winAmount = amount * 3; result = '🎉 *Three of a kind!* 3x win!'; }
    else if (twoSame && Math.random() < WIN_RATE) { winAmount = amount; result = '✅ *Two of a kind!* 1x win!'; }
    else { winAmount = -amount; result = '❌ No match! You lost.'; }
    user.wallet = Math.max(0, user.wallet + winAmount);
    user.setCooldown('slots');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎰', 'Slots', result, 'gambling');
    await sock.sendMessage(dest, {
      text: `🎰 *[ ${s1} | ${s2} | ${s3} ]*\n\n${result}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'blackjack' || command === 'bj') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const card   = () => Math.min(10, randomInt(1, 13));
    const pScore = card() + card();
    const dScore = card() + card();
    const win    = pScore > dScore && pScore <= 21;
    const bust   = pScore > 21;
    user.wallet  = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('blackjack');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🃏 *Blackjack!*\n\nYour hand: *${pScore}*\nDealer's hand: *${dScore}*\n${bust ? '💥 Bust! You lost!' : win ? `✅ You won ${formatMoney(amount)}!` : `❌ Dealer wins! Lost ${formatMoney(amount)}.`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'roulette') {
    if (checkCd()) return true;
    const amount  = parseAmt(); if (!amount) return true;
    const bet     = args[1]?.toLowerCase() || 'red';
    const num     = randomInt(0, 36);
    const isRed   = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num);
    const isBlack = num > 0 && !isRed;
    let win = false, mult = 1;
    if (bet === 'red'   && isRed)   { win = true; mult = 1; }
    if (bet === 'black' && isBlack) { win = true; mult = 1; }
    if (bet === 'green' && num === 0) { win = true; mult = 17; }
    if (!isNaN(Number(bet)) && Number(bet) === num) { win = true; mult = 35; }
    const change  = win ? amount * mult : -amount;
    user.wallet   = Math.max(0, user.wallet + change);
    user.setCooldown('roulette');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🎡 *Roulette!*\n\nBall landed on: *${num}* (${num === 0 ? '🟢 Green' : isRed ? '🔴 Red' : '⚫ Black'})\n${win ? `✅ You won ${formatMoney(amount * mult)}! (${mult}x)` : `❌ You lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'dice') {
    if (checkCd()) return true;
    const amount  = parseAmt(); if (!amount) return true;
    const p = randomInt(1, 6);
    const d = randomInt(1, 6);
    const win = p > d;
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('dice');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🎲 *Dice Roll!*\n\nYou: *${p}* | Dealer: *${d}*\n${win ? `✅ You won ${formatMoney(amount)}!` : p === d ? `🤝 Tie! No change.` : `❌ You lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'lottery') {
    if (checkCd()) return true;
    const ticket = 500;
    if (user.wallet < ticket) { await sock.sendMessage(dest, { text: `❌ Lottery ticket costs ${formatMoney(ticket)}!` }, { quoted: message }); return true; }
    const win  = Math.random() < 0.05;
    const prize = win ? randomInt(10000, 50000) : 0;
    user.wallet = win ? user.wallet - ticket + prize : user.wallet - ticket;
    user.setCooldown('lottery');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: win
        ? `🎟️ *LOTTERY WINNER!* 🎉\nYou won ${formatMoney(prize)}!\n💸 Wallet: ${formatMoney(user.wallet)}`
        : `🎟️ *Better luck next time!*\nYou lost ${formatMoney(ticket)}.\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'highlow') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const card   = randomInt(1, 13);
    const guess  = args[1]?.toLowerCase();
    if (!guess || !['high', 'low'].includes(guess)) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.highlow <amount> <high|low>`' }, { quoted: message }); return true;
    }
    const next = randomInt(1, 13);
    const win  = (guess === 'high' && next > card) || (guess === 'low' && next < card);
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('highlow');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🃏 *High-Low!*\n\nFirst card: *${card}*\nNext card: *${next}*\n${win ? `✅ Correct! Won ${formatMoney(amount)}!` : `❌ Wrong! Lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'crash') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const mult  = parseFloat((Math.random() * 5 + 1).toFixed(2));
    const crash = parseFloat((Math.random() * mult).toFixed(2));
    const win   = crash >= 2;
    user.wallet = win ? Math.floor(user.wallet + amount * (crash - 1)) : Math.max(0, user.wallet - amount);
    user.setCooldown('crash');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🚀 *Crash!*\n\nMultiplier reached: *${crash}x*\n${win ? `✅ Cashed out! Won ${formatMoney(amount * (crash - 1))}!` : `💥 Crashed! Lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'bet') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const win    = Math.random() < WIN_RATE;
    user.wallet  = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('bet');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: `🎯 *Bet!*\n\n${win ? `✅ You won ${formatMoney(amount)}!` : `❌ You lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  return true;
}

module.exports = { handleGambling };
