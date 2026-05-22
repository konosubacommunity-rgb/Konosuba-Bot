const User  = require('../models/User');
const { formatMs, formatMoney, parseAmount, randomInt } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/websiteSync');
const config = require('../config');

// FIX: use findOrCreateByJid — handles LID users without creating duplicates
async function getOrCreateUser(jid, name) {
  return User.findOrCreateByJid(jid, name);
}

async function handleEconomy(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;

  const economyCmds = [
    'balance', 'bal', 'wallet', 'bank',
    'deposit', 'dep', 'withdraw', 'with',
    'pay', 'daily', 'weekly', 'monthly',
    'work', 'beg', 'crime', 'fish', 'dig',
    'rob', 'heist',
    'market', 'buy', 'sell', 'inventory', 'inv', 'use', 'gift',
    'topmoney', 'topbank',
    'cooldowns', 'cds',
    'rank', 'xp', 'achievements', 'quests', 'claim', 'bonus',
    'upgrade', 'prestige', 'bankupgrade', 'withdrawall',
  ];
  if (!economyCmds.includes(command)) return false;

  const user = await getOrCreateUser(sender, message.pushName);
  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  // ── balance / bal / wallet ──────────────────────────────────────────────────
  if (command === 'balance' || command === 'bal' || command === 'wallet' || command === 'bank') {
    const imageBuffer = null; // imageGen stub returns null
    const text = `💰 *${user.name}'s Balance*\n\n💵 Wallet: ${formatMoney(user.wallet)}\n🏦 Bank: ${formatMoney(user.bank)} / ${formatMoney(user.bankLimit)}\n💎 Net Worth: ${formatMoney(user.wallet + user.bank)}`;
    await sock.sendMessage(dest, { text }, { quoted: message });
    return true;
  }

  // ── deposit / dep ──────────────────────────────────────────────────────────
  if (command === 'deposit' || command === 'dep') {
    const amt = parseAmount(args[0], user.wallet);
    if (!amt) { await sock.sendMessage(dest, { text: '❌ Usage: `.deposit <amount|all>`' }, { quoted: message }); return true; }
    if (amt > user.wallet) { await sock.sendMessage(dest, { text: `❌ You only have ${formatMoney(user.wallet)} in your wallet!` }, { quoted: message }); return true; }
    const space = user.bankLimit - user.bank;
    const actual = Math.min(amt, space);
    if (actual <= 0) { await sock.sendMessage(dest, { text: '❌ Your bank is full!' }, { quoted: message }); return true; }
    user.wallet -= actual; user.bank += actual;
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await sock.sendMessage(dest, { text: `✅ Deposited ${formatMoney(actual)}!\n💵 Wallet: ${formatMoney(user.wallet)}\n🏦 Bank: ${formatMoney(user.bank)}` }, { quoted: message });
    return true;
  }

  // ── withdraw / with ────────────────────────────────────────────────────────
  if (command === 'withdraw' || command === 'with') {
    const amt = parseAmount(args[0], user.bank);
    if (!amt) { await sock.sendMessage(dest, { text: '❌ Usage: `.withdraw <amount|all>`' }, { quoted: message }); return true; }
    if (amt > user.bank) { await sock.sendMessage(dest, { text: `❌ You only have ${formatMoney(user.bank)} in your bank!` }, { quoted: message }); return true; }
    user.bank -= amt; user.wallet += amt;
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await sock.sendMessage(dest, { text: `✅ Withdrew ${formatMoney(amt)}!\n💵 Wallet: ${formatMoney(user.wallet)}\n🏦 Bank: ${formatMoney(user.bank)}` }, { quoted: message });
    return true;
  }

  // ── withdrawall ────────────────────────────────────────────────────────────
  if (command === 'withdrawall') {
    if (!user.bank) { await sock.sendMessage(dest, { text: '❌ Your bank is empty!' }, { quoted: message }); return true; }
    user.wallet += user.bank; user.bank = 0;
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await sock.sendMessage(dest, { text: `✅ Withdrew all!\n💵 Wallet: ${formatMoney(user.wallet)}` }, { quoted: message });
    return true;
  }

  // ── pay ────────────────────────────────────────────────────────────────────
  if (command === 'pay') {
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const targetJid    = quotedSender || mentions[0];
    if (!targetJid) { await sock.sendMessage(dest, { text: '❌ Mention or reply to a user to pay.' }, { quoted: message }); return true; }
    const amt = parseAmount(args[0] || args[1]);
    if (!amt || amt <= 0) { await sock.sendMessage(dest, { text: '❌ Usage: `.pay @user <amount>`' }, { quoted: message }); return true; }
    if (amt > user.wallet) { await sock.sendMessage(dest, { text: `❌ Insufficient funds! You have ${formatMoney(user.wallet)}` }, { quoted: message }); return true; }
    const recipient = await User.findOrCreateByJid(targetJid, targetJid.split('@')[0]);
    user.wallet -= amt; recipient.wallet += amt;
    await Promise.all([user.save(), recipient.save()]);
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await syncUserToWebsite(targetJid, { wallet: recipient.wallet });
    await logActivity(sender, '💸', 'Paid', `Sent ${formatMoney(amt)} to ${recipient.name}`, 'economy');
    await sock.sendMessage(dest, {
      text: `✅ *Payment Sent!*\n💸 Sent ${formatMoney(amt)} to @${targetJid.split('@')[0]}\n💵 Your wallet: ${formatMoney(user.wallet)}`,
      mentions: [targetJid],
    }, { quoted: message });
    return true;
  }

  // ── daily ──────────────────────────────────────────────────────────────────
  if (command === 'daily') {
    if (user.isOnCooldown('daily')) {
      await sock.sendMessage(dest, { text: `⏳ Daily cooldown! Try again in *${formatMs(user.getCooldownLeft('daily'))}*` }, { quoted: message });
      return true;
    }
    const base   = config.ECONOMY.DAILY_AMOUNT || 500;
    const bonus  = Math.floor(Math.random() * 200);
    const streak = (user.streak || 0) + 1;
    const reward = base + bonus + (streak * 50);
    user.wallet += reward;
    user.streak  = streak;
    user.lastStreak = new Date();
    user.setCooldown('daily');
    const leveled = user.addXp(25);
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, streak: user.streak, xp: user.xp, level: user.level });
    await logActivity(sender, '📅', 'Daily Reward', `Collected ${formatMoney(reward)}! Streak: ${streak}`, 'economy');
    await sock.sendMessage(dest, {
      text: `📅 *Daily Reward!*\n\n💰 +${formatMoney(reward)}\n🔥 Streak: ${streak} days (+${streak * 50} bonus)\n💵 Wallet: ${formatMoney(user.wallet)}${leveled ? `\n\n⬆️ *LEVEL UP!* You're now Level ${user.level}!` : ''}`,
    }, { quoted: message });
    return true;
  }

  // ── weekly ─────────────────────────────────────────────────────────────────
  if (command === 'weekly') {
    if (user.isOnCooldown('weekly')) {
      await sock.sendMessage(dest, { text: `⏳ Weekly cooldown! Try again in *${formatMs(user.getCooldownLeft('weekly'))}*` }, { quoted: message });
      return true;
    }
    const reward = (config.ECONOMY.WEEKLY_AMOUNT || 3500) + Math.floor(Math.random() * 1000);
    user.wallet += reward;
    user.setCooldown('weekly');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '📆', 'Weekly Reward', `Collected ${formatMoney(reward)}!`, 'economy');
    await sock.sendMessage(dest, { text: `📆 *Weekly Reward!*\n\n💰 +${formatMoney(reward)}\n💵 Wallet: ${formatMoney(user.wallet)}` }, { quoted: message });
    return true;
  }

  // ── monthly ────────────────────────────────────────────────────────────────
  if (command === 'monthly') {
    if (user.isOnCooldown('monthly')) {
      await sock.sendMessage(dest, { text: `⏳ Monthly cooldown! Try again in *${formatMs(user.getCooldownLeft('monthly'))}*` }, { quoted: message });
      return true;
    }
    const reward = (config.ECONOMY.MONTHLY_AMOUNT || 15000) + Math.floor(Math.random() * 5000);
    user.wallet += reward;
    user.setCooldown('monthly');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🗓️', 'Monthly Reward', `Collected ${formatMoney(reward)}!`, 'economy');
    await sock.sendMessage(dest, { text: `🗓️ *Monthly Reward!*\n\n💰 +${formatMoney(reward)}\n💵 Wallet: ${formatMoney(user.wallet)}` }, { quoted: message });
    return true;
  }

  // ── work ───────────────────────────────────────────────────────────────────
  if (command === 'work') {
    if (user.isOnCooldown('work')) {
      await sock.sendMessage(dest, { text: `⏳ Work cooldown! *${formatMs(user.getCooldownLeft('work'))}*` }, { quoted: message });
      return true;
    }
    const jobs = ['programmer', 'chef', 'driver', 'teacher', 'doctor', 'mechanic', 'artist', 'farmer'];
    const job  = jobs[randomInt(0, jobs.length - 1)];
    const earn = randomInt(100, 500);
    user.wallet += earn;
    user.setCooldown('work');
    user.addXp(10);
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, xp: user.xp, level: user.level });
    await sock.sendMessage(dest, { text: `💼 *You worked as a ${job}!*\n💰 +${formatMoney(earn)}\n💵 Wallet: ${formatMoney(user.wallet)}` }, { quoted: message });
    return true;
  }

  // ── beg ────────────────────────────────────────────────────────────────────
  if (command === 'beg') {
    if (user.isOnCooldown('beg')) {
      await sock.sendMessage(dest, { text: `⏳ Beg cooldown! *${formatMs(user.getCooldownLeft('beg'))}*` }, { quoted: message });
      return true;
    }
    const success = Math.random() < 0.7;
    const earn    = success ? randomInt(10, 150) : 0;
    user.wallet += earn;
    user.setCooldown('beg');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: success ? `🙏 *Someone gave you ${formatMoney(earn)}!*\n💵 Wallet: ${formatMoney(user.wallet)}` : '😔 Nobody gave you anything... try again later.',
    }, { quoted: message });
    return true;
  }

  // ── crime ──────────────────────────────────────────────────────────────────
  if (command === 'crime') {
    if (user.isOnCooldown('crime')) {
      await sock.sendMessage(dest, { text: `⏳ Crime cooldown! *${formatMs(user.getCooldownLeft('crime'))}*` }, { quoted: message });
      return true;
    }
    const success = Math.random() < 0.6;
    const amount  = randomInt(100, 700);
    if (success) { user.wallet += amount; }
    else         { user.wallet = Math.max(0, user.wallet - amount); }
    user.setCooldown('crime');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: success ? `🔫 *Crime successful!* +${formatMoney(amount)}\n💵 Wallet: ${formatMoney(user.wallet)}` : `👮 *Caught!* Lost ${formatMoney(amount)}\n💵 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  // ── fish ───────────────────────────────────────────────────────────────────
  if (command === 'fish') {
    if (user.isOnCooldown('fish')) {
      await sock.sendMessage(dest, { text: `⏳ Fishing cooldown! *${formatMs(user.getCooldownLeft('fish'))}*` }, { quoted: message });
      return true;
    }
    const catches = [
      { name: 'Tuna', val: 80 }, { name: 'Salmon', val: 120 }, { name: 'Shark', val: 300 },
      { name: 'Boot', val: 5 }, { name: 'Treasure', val: 500 }, { name: 'Nothing', val: 0 },
    ];
    const caught = catches[randomInt(0, catches.length - 1)];
    user.wallet += caught.val;
    user.setCooldown('fish');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: caught.val > 0 ? `🎣 *You caught a ${caught.name}!* +${formatMoney(caught.val)}\n💵 Wallet: ${formatMoney(user.wallet)}` : `🎣 You caught *nothing* this time!`,
    }, { quoted: message });
    return true;
  }

  // ── dig ────────────────────────────────────────────────────────────────────
  if (command === 'dig') {
    if (user.isOnCooldown('dig')) {
      await sock.sendMessage(dest, { text: `⏳ Digging cooldown! *${formatMs(user.getCooldownLeft('dig'))}*` }, { quoted: message });
      return true;
    }
    const finds = [
      { name: 'Gold Coin', val: 50 }, { name: 'Diamond', val: 500 }, { name: 'Rock', val: 2 },
      { name: 'Old Bottle', val: 10 }, { name: 'Chest', val: 800 }, { name: 'Worm', val: 0 },
    ];
    const find = finds[randomInt(0, finds.length - 1)];
    user.wallet += find.val;
    user.setCooldown('dig');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await sock.sendMessage(dest, {
      text: find.val > 0 ? `⛏️ *You found ${find.name}!* +${formatMoney(find.val)}\n💵 Wallet: ${formatMoney(user.wallet)}` : '⛏️ You dug up a worm... nothing valuable.',
    }, { quoted: message });
    return true;
  }

  // ── rob ────────────────────────────────────────────────────────────────────
  if (command === 'rob') {
    if (user.isOnCooldown('rob')) {
      await sock.sendMessage(dest, { text: `⏳ Rob cooldown! *${formatMs(user.getCooldownLeft('rob'))}*` }, { quoted: message });
      return true;
    }
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const targetJid    = quotedSender || mentions[0];
    if (!targetJid) { await sock.sendMessage(dest, { text: '❌ Mention or reply to a user to rob.' }, { quoted: message }); return true; }
    const victim = await User.findOrCreateByJid(targetJid, targetJid.split('@')[0]);
    if (victim.wallet < 100) { await sock.sendMessage(dest, { text: '❌ That user is too poor to rob!' }, { quoted: message }); return true; }
    const success = Math.random() < 0.5;
    const amount  = Math.floor(victim.wallet * (Math.random() * 0.3 + 0.1));
    user.setCooldown('rob');
    if (success) {
      victim.wallet -= amount; user.wallet += amount;
      await Promise.all([user.save(), victim.save()]);
      await syncUserToWebsite(sender, { wallet: user.wallet });
      await syncUserToWebsite(targetJid, { wallet: victim.wallet });
      await sock.sendMessage(dest, { text: `🔫 *Robbery successful!*\nStole ${formatMoney(amount)} from @${targetJid.split('@')[0]}!\n💵 Wallet: ${formatMoney(user.wallet)}`, mentions: [targetJid] }, { quoted: message });
    } else {
      const fine = Math.floor(user.wallet * 0.1);
      user.wallet = Math.max(0, user.wallet - fine);
      await user.save();
      await syncUserToWebsite(sender, { wallet: user.wallet });
      await sock.sendMessage(dest, { text: `👮 *Robbery failed!* You were caught and fined ${formatMoney(fine)}!\n💵 Wallet: ${formatMoney(user.wallet)}` }, { quoted: message });
    }
    return true;
  }

  // ── inventory / inv ────────────────────────────────────────────────────────
  if (command === 'inventory' || command === 'inv') {
    if (!user.inventory.length) { await sock.sendMessage(dest, { text: '🎒 Your inventory is empty! Buy items with `.buy <item>`' }, { quoted: message }); return true; }
    const list = user.inventory.map(i => `• ${i.item} ×${i.qty}`).join('\n');
    await sock.sendMessage(dest, { text: `🎒 *${user.name}'s Inventory*\n\n${list}` }, { quoted: message });
    return true;
  }

  // ── topmoney ───────────────────────────────────────────────────────────────
  if (command === 'topmoney') {
    const top = await User.find({}, { name: 1, wallet: 1, phone: 1 }).sort({ wallet: -1 }).limit(10).lean();
    const list = top.map((u, i) => `${i + 1}. ${u.name} — ${formatMoney(u.wallet)}`).join('\n');
    await sock.sendMessage(dest, { text: `💰 *Top Wallets*\n\n${list}` }, { quoted: message });
    return true;
  }

  // ── topbank ────────────────────────────────────────────────────────────────
  if (command === 'topbank') {
    const top = await User.find({}, { name: 1, bank: 1, phone: 1 }).sort({ bank: -1 }).limit(10).lean();
    const list = top.map((u, i) => `${i + 1}. ${u.name} — ${formatMoney(u.bank)}`).join('\n');
    await sock.sendMessage(dest, { text: `🏦 *Top Banks*\n\n${list}` }, { quoted: message });
    return true;
  }

  // ── rank / xp ──────────────────────────────────────────────────────────────
  if (command === 'rank' || command === 'xp') {
    const rank = await User.countDocuments({ xp: { $gt: user.xp } }) + 1;
    const needed = user.level * 100;
    const bar = '█'.repeat(Math.floor((user.xp / needed) * 10)) + '░'.repeat(10 - Math.floor((user.xp / needed) * 10));
    await sock.sendMessage(dest, {
      text: `⭐ *${user.name}'s Progress*\n\n📊 Level: ${user.level}\n⚡ XP: ${user.xp}/${needed} [${bar}]\n🏆 Global Rank: #${rank}`,
    }, { quoted: message });
    return true;
  }

  // ── cooldowns / cds ────────────────────────────────────────────────────────
  if (command === 'cooldowns' || command === 'cds') {
    const cmds = ['daily', 'weekly', 'monthly', 'work', 'beg', 'crime', 'rob', 'fish', 'dig', 'coinflip', 'slots', 'blackjack', 'roulette'];
    const lines = cmds.map(c => {
      if (user.isOnCooldown(c)) return `⏳ \`${c}\` — ${formatMs(user.getCooldownLeft(c))}`;
      return `✅ \`${c}\` — ready`;
    });
    await sock.sendMessage(dest, { text: `⏱️ *Cooldowns for ${user.name}*\n\n${lines.join('\n')}` }, { quoted: message });
    return true;
  }

  // ── bankupgrade ────────────────────────────────────────────────────────────
  if (command === 'bankupgrade') {
    const cost = Math.floor(user.bankLimit * 0.1);
    if (user.wallet < cost) { await sock.sendMessage(dest, { text: `❌ You need ${formatMoney(cost)} to upgrade your bank!` }, { quoted: message }); return true; }
    user.wallet   -= cost;
    user.bankLimit = Math.floor(user.bankLimit * 1.5);
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, bankLimit: user.bankLimit });
    await sock.sendMessage(dest, { text: `🏦 *Bank Upgraded!*\nNew limit: ${formatMoney(user.bankLimit)}\nCost: ${formatMoney(cost)}` }, { quoted: message });
    return true;
  }

  // Unhandled economy command — still consumed so no other handler fires
  return true;
}

module.exports = { handleEconomy };
