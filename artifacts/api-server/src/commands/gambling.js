const User = require('../models/User');
const { formatMs, formatMoney, parseAmount, randomInt } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/website-sync');
const config = require('../config');

async function getOrCreate(jid, name) {
  let user = await User.findOne({ jid });
  if (!user) { user = new User({ jid, name: name || jid.split('@')[0] }); await user.save(); }
  return user;
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

  const WIN_RATE = config.ECONOMY.WIN_RATE;

  const cdKey = command === 'bj' ? 'blackjack' : command;

  const checkCd = () => {
    if (user.isOnCooldown(cdKey)) {
      const left = user.getCooldownLeft(cdKey);
      sock.sendMessage(dest, { text: `⏳ \`${command}\` cooldown! Try again in *${formatMs(left)}*` }, { quoted: message });
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
    const win = Math.random() < WIN_RATE;
    const coin = win ? '🟡 Heads' : '⚪ Tails';
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('coinflip');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🪙', 'Coinflip', win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `🪙 *Coin Flip!*\n\nResult: *${coin}*\n${win ? `✅ You won ${formatMoney(amount)}!` : `❌ You lost ${formatMoney(amount)}!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'slots') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
    const s1 = symbols[randomInt(0, symbols.length - 1)];
    const s2 = symbols[randomInt(0, symbols.length - 1)];
    const s3 = symbols[randomInt(0, symbols.length - 1)];
    const allSame = s1 === s2 && s2 === s3;
    const twoSame = s1 === s2 || s2 === s3 || s1 === s3;
    const jackpot = allSame && s1 === '💎';
    let winAmount = 0;
    let result = '';
    if (jackpot) { winAmount = amount * 10; result = '💎 *JACKPOT!!* 10x win!'; }
    else if (allSame) { winAmount = amount * 3; result = '🎉 *Three of a kind!* 3x win!'; }
    else if (twoSame && Math.random() < WIN_RATE) { winAmount = amount; result = '✅ *Two of a kind!* 1x win!'; }
    else { winAmount = -amount; result = '❌ No match! You lost.'; }
    user.wallet += winAmount;
    if (user.wallet < 0) user.wallet = 0;
    user.setCooldown('slots');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎰', 'Slots', winAmount > 0 ? `Won ${formatMoney(winAmount)}!` : `Lost ${formatMoney(Math.abs(winAmount))}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `🎰 *SLOTS*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n${result}\n${winAmount > 0 ? `Won: ${formatMoney(winAmount)}` : `Lost: ${formatMoney(Math.abs(winAmount))}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'blackjack' || command === 'bj') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const cardValue = () => randomInt(1, 11);
    const playerHand = [cardValue(), cardValue()];
    const dealerHand = [cardValue(), cardValue()];
    const pTotal = playerHand.reduce((a, b) => a + b, 0);
    const dTotal = dealerHand.reduce((a, b) => a + b, 0);
    const win = Math.random() < WIN_RATE || (pTotal > dTotal && pTotal <= 21);
    const bust = pTotal > 21;
    user.wallet = (!bust && win) ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('blackjack');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🃏', 'Blackjack', bust ? 'Bust! Lost!' : win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `🃏 *BLACKJACK*\n\nYour hand: ${playerHand.join(' + ')} = *${pTotal}*\nDealer hand: ${dealerHand.join(' + ')} = *${dTotal}*\n\n${bust ? '💥 *BUST!* You went over 21!' : win ? `✅ *You win!* +${formatMoney(amount)}` : `❌ *Dealer wins!* -${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'roulette') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const num = randomInt(0, 36);
    const color = num === 0 ? '🟢' : num % 2 === 0 ? '⚫' : '🔴';
    const win = Math.random() < WIN_RATE;
    const winAmt = win ? amount * 2 : amount;
    user.wallet = win ? user.wallet + winAmt : Math.max(0, user.wallet - winAmt);
    user.setCooldown('roulette');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎡', 'Roulette', win ? `Won ${formatMoney(winAmt)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `🎡 *ROULETTE*\n\nThe ball lands on: *${num}* ${color}\n\n${win ? `✅ You win! +${formatMoney(winAmt)}` : `❌ You lose! -${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'dice') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const roll = randomInt(1, 6);
    const win = Math.random() < WIN_RATE;
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('dice');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎲', 'Dice Roll', win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `🎲 *DICE ROLL*\n\nYou rolled: *${roll}* 🎲\n\n${win ? `✅ Lucky roll! +${formatMoney(amount)}` : `❌ Unlucky! -${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'lottery') {
    if (checkCd()) return true;
    const ticket = 100;
    if (user.wallet < ticket) {
      await sock.sendMessage(dest, { text: `❌ A lottery ticket costs ${formatMoney(ticket)}!` }, { quoted: message });
      return true;
    }
    user.wallet -= ticket;
    const win = Math.random() < WIN_RATE;
    const prize = randomInt(500, 5000);
    if (win) user.wallet += prize;
    user.setCooldown('lottery');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎟️', 'Lottery', win ? `Won ${formatMoney(prize)}!` : 'Lost ticket!', 'gambling');
    
    const nums = [randomInt(1, 49), randomInt(1, 49), randomInt(1, 49), randomInt(1, 49), randomInt(1, 49), randomInt(1, 49)];
    await sock.sendMessage(dest, {
      text: `🎟️ *LOTTERY*\n\nYour numbers: ${nums.join(' - ')}\n\n${win ? `🎉 *WINNER!* You won ${formatMoney(prize)}!` : `😔 No luck this time!`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'bet') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const win = Math.random() < WIN_RATE;
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('bet');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎯', 'Bet', win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    const outcomes = ['horse racing', 'a boxing match', 'a football game', 'a coin toss'];
    const outcome = outcomes[randomInt(0, outcomes.length - 1)];
    await sock.sendMessage(dest, {
      text: `🎯 *BET*\n\nYou bet on ${outcome}!\n\n${win ? `✅ Your bet paid off! +${formatMoney(amount)}` : `❌ You lost the bet! -${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'highlow') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const num = randomInt(1, 10);
    const isHigh = num > 5;
    const guess = Math.random() < 0.5 ? 'high' : 'low';
    const win = Math.random() < WIN_RATE;
    user.wallet = win ? user.wallet + amount : Math.max(0, user.wallet - amount);
    user.setCooldown('highlow');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '📈', 'High-Low', win ? `Won ${formatMoney(amount)}!` : `Lost ${formatMoney(amount)}!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `📈 *HIGH-LOW*\n\nNumber: *${num}* (${isHigh ? 'HIGH' : 'LOW'})\nYour guess: *${guess.toUpperCase()}*\n\n${win ? `✅ Correct! +${formatMoney(amount)}` : `❌ Wrong! -${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'crash') {
    if (checkCd()) return true;
    const amount = parseAmt(); if (!amount) return true;
    const multiplier = parseFloat((Math.random() * 4 + 1).toFixed(2));
    const crashAt = parseFloat((Math.random() * 3 + 1).toFixed(2));
    const win = Math.random() < WIN_RATE;
    const finalMult = win ? multiplier : crashAt;
    const winAmt = win ? Math.floor(amount * finalMult) - amount : amount;
    user.wallet = win ? user.wallet + winAmt : Math.max(0, user.wallet - amount);
    user.setCooldown('crash');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '💥', 'Crash', win ? `Cashed out at ${finalMult}x!` : `Crashed at ${crashAt}x!`, 'gambling');
    
    await sock.sendMessage(dest, {
      text: `💥 *CRASH*\n\n${win ? `🚀 Cashed out at *${finalMult}x*!\n✅ Won ${formatMoney(winAmt)}` : `💥 Crashed at *${crashAt}x*!\n❌ Lost ${formatMoney(amount)}`}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleGambling };
