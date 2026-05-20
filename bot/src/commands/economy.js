const User = require('../models/User');
const { formatMs, formatMoney, isOwner, parseAmount, randomInt } = require('../utils/helpers');
const { generateBalanceCard } = require('../utils/imageGen');
const { syncUserToWebsite, logActivity } = require('../utils/website-sync');
const config = require('../config');

const SHOP_ITEMS = [
  { name: 'Fishing Rod', price: 500, desc: 'Used for fishing' },
  { name: 'Shovel', price: 300, desc: 'Used for digging' },
  { name: 'Lucky Charm', price: 2000, desc: 'Boosts luck slightly' },
  { name: 'Bank Card', price: 5000, desc: 'Increases bank limit' },
  { name: 'Poké Ball', price: 200, desc: 'Catch Pokémon' },
  { name: 'Great Ball', price: 500, desc: 'Better catch rate' },
  { name: 'Ultra Ball', price: 1200, desc: 'Even better catch rate' },
  { name: 'Health Potion', price: 150, desc: 'Restore HP in RPG' },
  { name: 'XP Booster', price: 3000, desc: 'Double XP for 1 hour' },
  { name: 'Pet Egg', price: 4000, desc: 'Hatch a pet!' },
];

async function getOrCreateUser(jid, name) {
  let user = await User.findOne({ jid });
  if (!user) {
    user = new User({ jid, name: name || jid.split('@')[0] });
    await user.save();
  }
  return user;
}

function cdCheck(user, command, dest, sock, message) {
  if (user.isOnCooldown(command)) {
    const left = user.getCooldownLeft(command);
    return sock.sendMessage(dest, {
      text: `⏳ You're on cooldown for \`${command}\`! Try again in *${formatMs(left)}*`,
    }, { quoted: message });
  }
  return null;
}

async function handleEconomy(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const user = await getOrCreateUser(sender, message.pushName);
  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  if (command === 'balance' || command === 'bal') {
    const displayName = user.name || message.pushName || sender.split('@')[0];
    const balText = `━━━━━━━━━━━━━━━━━━━\n💰 *ACCOUNT BALANCE*\n━━━━━━━━━━━━━━━━━━━\n\n👤 *${displayName}*\n\n💸 Wallet:  [ ${formatMoney(user.wallet)} ]\n🏦 Bank:    [ ${formatMoney(user.bank)} ]\n🌌 Max Capacity: [ ${formatMoney(user.bankLimit)} ]\n\n━━━━━━━━━━━━━━━━━━━\n💎 Total:  [ ${formatMoney(user.wallet + user.bank)} ]`;

    let avatarBuffer = null;
    try {
      const avatarUrl = await sock.profilePictureUrl(sender, 'image');
      if (avatarUrl) {
        const fetch = require('node-fetch');
        const res = await fetch(avatarUrl);
        avatarBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch (_) {}

    if (avatarBuffer) {
      await sock.sendMessage(dest, {
        image: avatarBuffer,
        caption: balText,
        contextInfo: {
          externalAdReply: {
            title: `${displayName} | Balance`,
            body: 'thedankoe.com',
            sourceUrl: 'https://thedankoe.com/',
            mediaType: 1,
            renderLargerThumbnail: false,
          }
        }
      }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text: balText }, { quoted: message });
    }
    return true;
  }

  if (command === 'wallet') {
    await sock.sendMessage(dest, {
      text: `💸 *Wallet Balance*\n\n👤 ${user.name}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'bank') {
    await sock.sendMessage(dest, {
      text: `🏦 *Bank Balance*\n\n👤 ${user.name}\n🏦 Bank: ${formatMoney(user.bank)}\n🌌 Bank Limit: ${formatMoney(user.bankLimit)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'deposit' || command === 'dep') {
    const amount = args[0] === 'all' ? user.wallet : parseAmount(args[0]);
    if (!amount) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.deposit <amount>` or `.deposit all`' }, { quoted: message });
      return true;
    }
    if (amount > user.wallet) {
      await sock.sendMessage(dest, { text: `❌ You only have ${formatMoney(user.wallet)} in your wallet.` }, { quoted: message });
      return true;
    }
    if (user.bank + amount > user.bankLimit) {
      await sock.sendMessage(dest, { text: `❌ Bank limit reached! Max: ${formatMoney(user.bankLimit)}` }, { quoted: message });
      return true;
    }
    user.wallet -= amount;
    user.bank += amount;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await logActivity(sender, '🏧', 'Deposit', `Deposited ${formatMoney(amount)}!`, 'economy');
    
    try {
      const fs = require('fs');
      const path = require('path');
      const imgPath = path.join(__dirname, '../assets/deposit.jpg');
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(dest, {
        image: imgBuffer,
        caption: `✅ *Deposited* ${formatMoney(amount)} to your bank!\n🏦 Bank: ${formatMoney(user.bank)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
      }, { quoted: message });
    } catch (_) {
      await sock.sendMessage(dest, {
        text: `✅ Deposited ${formatMoney(amount)} to your bank!\n🏦 Bank: ${formatMoney(user.bank)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
      }, { quoted: message });
    }
    return true;
  }

  if (command === 'withdraw' || command === 'with') {
    const amount = args[0] === 'all' ? user.bank : parseAmount(args[0]);
    if (!amount) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.withdraw <amount>` or `.withdraw all`' }, { quoted: message });
      return true;
    }
    if (amount > user.bank) {
      await sock.sendMessage(dest, { text: `❌ You only have ${formatMoney(user.bank)} in your bank.` }, { quoted: message });
      return true;
    }
    user.bank -= amount;
    user.wallet += amount;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await logActivity(sender, '🏧', 'Withdraw', `Withdrew ${formatMoney(amount)}!`, 'economy');
    
    try {
      const fs = require('fs');
      const path = require('path');
      const imgPath = path.join(__dirname, '../assets/withdraw.jpg');
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(dest, {
        image: imgBuffer,
        caption: `✅ *Withdrew* ${formatMoney(amount)} from bank!\n💸 Wallet: ${formatMoney(user.wallet)}\n🏦 Bank: ${formatMoney(user.bank)}`,
      }, { quoted: message });
    } catch (_) {
      await sock.sendMessage(dest, {
        text: `✅ Withdrew ${formatMoney(amount)} from bank!\n💸 Wallet: ${formatMoney(user.wallet)}\n🏦 Bank: ${formatMoney(user.bank)}`,
      }, { quoted: message });
    }
    return true;
  }

  if (command === 'withdrawall') {
    const amount = user.bank;
    if (amount <= 0) {
      await sock.sendMessage(dest, { text: '❌ Your bank is empty.' }, { quoted: message });
      return true;
    }
    user.wallet += amount;
    user.bank = 0;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, bank: user.bank });
    await logActivity(sender, '🏧', 'Withdraw All', `Withdrew all ${formatMoney(amount)}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `✅ Withdrew all ${formatMoney(amount)} from bank!`,
    }, { quoted: message });
    return true;
  }

  if (command === 'pay') {
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const target = quotedSender || mentions[0];
    const amount = parseAmount(args[mentions.length > 0 ? 1 : 0]);
    if (!target || !amount) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.pay @user <amount>`' }, { quoted: message });
      return true;
    }
    if (target === sender) {
      await sock.sendMessage(dest, { text: '❌ You cannot pay yourself!' }, { quoted: message });
      return true;
    }
    if (amount > user.wallet) {
      await sock.sendMessage(dest, { text: `❌ Insufficient wallet balance. You have ${formatMoney(user.wallet)}.` }, { quoted: message });
      return true;
    }
    const targetUser = await getOrCreateUser(target);
    user.wallet -= amount;
    targetUser.wallet += amount;
    await user.save();
    await targetUser.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '💳', 'Pay', `Sent ${formatMoney(amount)}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `💸 Sent ${formatMoney(amount)} to @${target.split('@')[0]}!`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'daily') {
    const cdLeft = await cdCheck(user, 'daily', dest, sock, message);
    if (cdLeft) return true;
    const amount = config.ECONOMY.DAILY_AMOUNT();
    user.wallet += amount;
    user.streak = (user.streak || 0) + 1;
    user.lastStreak = new Date();
    user.setCooldown('daily');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, lastDaily: user.lastStreak });
    await logActivity(sender, '💰', 'Daily Reward', `Got ${formatMoney(amount)}! Streak: ${user.streak}`, 'daily');
    
    await sock.sendMessage(dest, {
      text: `💰 *Daily Reward!*\n\nYou got: ${formatMoney(amount)}\n🔥 Streak: ${user.streak}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'work') {
    const cdLeft = await cdCheck(user, 'work', dest, sock, message);
    if (cdLeft) return true;
    const amount = randomInt(100, 400);
    user.wallet += amount;
    user.addXp(5);
    user.setCooldown('work');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, level: user.level, xp: user.xp });
    await logActivity(sender, '👨‍💼', 'Work', `Earned ${formatMoney(amount)}!`, 'economy');
    
    const jobs = ['Programmer', 'Designer', 'Chef', 'Doctor', 'Teacher'];
    const job = jobs[randomInt(0, jobs.length - 1)];
    await sock.sendMessage(dest, {
      text: `👨‍💼 *Work Shift!*\n\nWorked as a ${job}\nEarned: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'fish') {
    const cdLeft = await cdCheck(user, 'fish', dest, sock, message);
    if (cdLeft) return true;
    const has = user.inventory.find(i => i.item === 'Fishing Rod');
    if (!has) {
      await sock.sendMessage(dest, { text: '🎣 You need a *Fishing Rod* from `.market`!' }, { quoted: message });
      return true;
    }
    const amount = randomInt(150, 500);
    user.wallet += amount;
    user.addXp(3);
    user.setCooldown('fish');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, level: user.level, xp: user.xp });
    await logActivity(sender, '🎣', 'Fishing', `Caught fish worth ${formatMoney(amount)}!`, 'economy');
    
    const fishes = ['Bass', 'Tuna', 'Salmon', 'Goldfish', 'Catfish'];
    const fish = fishes[randomInt(0, fishes.length - 1)];
    await sock.sendMessage(dest, {
      text: `🎣 *Fishing!*\n\nYou caught a ${fish}!\nSold for: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'dig') {
    const cdLeft = await cdCheck(user, 'dig', dest, sock, message);
    if (cdLeft) return true;
    const has = user.inventory.find(i => i.item === 'Shovel');
    if (!has) {
      await sock.sendMessage(dest, { text: '⛏️ You need a *Shovel* from `.market`!' }, { quoted: message });
      return true;
    }
    const amount = randomInt(200, 600);
    user.wallet += amount;
    user.addXp(4);
    user.setCooldown('dig');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, level: user.level, xp: user.xp });
    await logActivity(sender, '⛏️', 'Digging', `Found treasure worth ${formatMoney(amount)}!`, 'economy');
    
    const treasures = ['Gold Coin', 'Diamond', 'Ruby', 'Pearl', 'Emerald'];
    const treasure = treasures[randomInt(0, treasures.length - 1)];
    await sock.sendMessage(dest, {
      text: `⛏️ *Digging!*\n\nYou found: ${treasure}!\nSold for: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'weekly') {
    const cdLeft = await cdCheck(user, 'weekly', dest, sock, message);
    if (cdLeft) return true;
    const amount = randomInt(500, 1500);
    user.wallet += amount;
    user.setCooldown('weekly');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '📅', 'Weekly Bonus', `Got ${formatMoney(amount)}!`, 'daily');
    
    await sock.sendMessage(dest, {
      text: `📅 *Weekly Bonus!*\n\nYou got: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'monthly') {
    const cdLeft = await cdCheck(user, 'monthly', dest, sock, message);
    if (cdLeft) return true;
    const amount = randomInt(2000, 5000);
    user.wallet += amount;
    user.setCooldown('monthly');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🗓️', 'Monthly Bonus', `Got ${formatMoney(amount)}!`, 'daily');
    
    await sock.sendMessage(dest, {
      text: `🗓️ *Monthly Bonus!*\n\nYou got: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'beg') {
    const cdLeft = await cdCheck(user, 'beg', dest, sock, message);
    if (cdLeft) return true;
    const amount = randomInt(20, 100);
    user.wallet += amount;
    user.setCooldown('beg');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🙏', 'Begging', `Got ${formatMoney(amount)}!`, 'economy');
    
    const responses = ['Someone felt bad for you...', 'A kind stranger helped you!', 'You found some coins!'];
    const resp = responses[randomInt(0, responses.length - 1)];
    await sock.sendMessage(dest, {
      text: `🙏 *Begging!*\n\n${resp}\n💰 Earned: ${formatMoney(amount)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'market' || command === 'shop') {
    const list = SHOP_ITEMS.map((item, i) => `*${i + 1}.* ${item.name} — ${formatMoney(item.price)} — ${item.desc}`).join('\n');
    await sock.sendMessage(dest, {
      text: `🏪 *MARKET*\n\n${list}\n\nUse: \`.buy <name>\``,
    }, { quoted: message });
    return true;
  }

  if (command === 'buy') {
    const itemName = args.join(' ').toLowerCase();
    const item = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName);
    if (!item) {
      await sock.sendMessage(dest, { text: '❌ Item not found! Use `.market` to see items.' }, { quoted: message });
      return true;
    }
    if (user.wallet < item.price) {
      await sock.sendMessage(dest, { text: `❌ You need ${formatMoney(item.price - user.wallet)} more!` }, { quoted: message });
      return true;
    }
    user.wallet -= item.price;
    const invIdx = user.inventory.findIndex(i => i.item === item.name);
    if (invIdx === -1) {
      user.inventory.push({ item: item.name, qty: 1 });
    } else {
      user.inventory[invIdx].qty += 1;
    }
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🛍️', 'Purchase', `Bought ${item.name}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `✅ *Purchased: ${item.name}*\n\nCost: ${formatMoney(item.price)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'sell') {
    const itemName = args.join(' ').toLowerCase();
    const idx = user.inventory.findIndex(i => i.item.toLowerCase().includes(itemName));
    if (idx === -1) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have that item!' }, { quoted: message });
      return true;
    }
    const item = user.inventory[idx];
    const itemData = SHOP_ITEMS.find(i => i.name === item.item);
    const sellPrice = itemData ? Math.floor(itemData.price * 0.8) : 100;
    user.wallet += sellPrice;
    if (item.qty <= 1) {
      user.inventory.splice(idx, 1);
    } else {
      item.qty -= 1;
    }
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '💵', 'Sold Item', `Sold ${item.item} for ${formatMoney(sellPrice)}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `✅ *Sold: ${item.item}*\n\nPrice: ${formatMoney(sellPrice)}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'inventory' || command === 'inv') {
    if (user.inventory.length === 0) {
      await sock.sendMessage(dest, { text: '🎒 Your inventory is empty!' }, { quoted: message });
      return true;
    }
    const list = user.inventory.map(i => `• ${i.item} (${i.qty}x)`).join('\n');
    await sock.sendMessage(dest, { text: `🎒 *Inventory*\n\n${list}` }, { quoted: message });
    return true;
  }

  if (command === 'cd' || command === 'cooldowns') {
    const cdMap = user.cooldowns;
    const cdList = [];
    for (const [cmd, time] of cdMap.entries()) {
      const cdMs = config.COOLDOWNS[cmd] || 0;
      const left = (time.getTime() + cdMs) - Date.now();
      if (left > 0) cdList.push(`\`${cmd}\` | *${formatMs(left)}*`);
    }
    if (cdList.length === 0) {
      await sock.sendMessage(dest, { text: '✅ You have no active cooldowns!' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `*⏳ Your Active Cooldowns ⏳*\n${cdList.map(c => `* ${c}`).join('\n')}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'rank') {
    const count = await User.countDocuments({ wallet: { $gt: user.wallet } });
    user.rank = count + 1;
    await user.save();
    await sock.sendMessage(dest, {
      text: `🏆 *Your Rank*\n\n👤 ${user.name}\n🏆 Rank: #${user.rank}\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'xp') {
    await sock.sendMessage(dest, {
      text: `⚡ *XP Info*\n\n👤 ${user.name}\n📊 Level: ${user.level}\n⚡ XP: ${user.xp}/${user.level * 100}\n🏆 Rank: #${user.rank || '?'}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'achievements') {
    const list = user.achievements.length ? user.achievements.map(a => `• ${a}`).join('\n') : 'No achievements yet!';
    await sock.sendMessage(dest, { text: `🔓 *Achievements*\n\n${list}` }, { quoted: message });
    return true;
  }

  if (command === 'quests') {
    const q = user.quests;
    if (!q || q.length === 0) {
      await sock.sendMessage(dest, { text: '📜 No active quests. Check back later!' }, { quoted: message });
    } else {
      const list = q.map(quest => `• *${quest.name}* — ${quest.progress}/${quest.goal} ${quest.completed ? '✅' : '⏳'}`).join('\n');
      await sock.sendMessage(dest, { text: `📜 *Active Quests*\n\n${list}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'claim') {
    const cdLeft = await cdCheck(user, 'claim', dest, sock, message);
    if (cdLeft) return true;
    const completedQuests = user.quests.filter(q => q.completed && q.reward);
    if (completedQuests.length === 0) {
      await sock.sendMessage(dest, { text: '❌ No completed quests to claim!' }, { quoted: message });
      return true;
    }
    let total = 0;
    completedQuests.forEach(q => { total += q.reward; q.claimed = true; });
    user.wallet += total;
    user.quests = user.quests.filter(q => !q.claimed);
    user.setCooldown('claim');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎉', 'Quest Claimed', `Claimed ${formatMoney(total)}!`, 'economy');
    
    await sock.sendMessage(dest, { text: `✅ Claimed ${formatMoney(total)} from completed quests!` }, { quoted: message });
    return true;
  }

  if (command === 'bonus') {
    const cdLeft = await cdCheck(user, 'bonus', dest, sock, message);
    if (cdLeft) return true;
    const amount = randomInt(100, 500);
    user.wallet += amount;
    user.setCooldown('bonus');
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet });
    await logActivity(sender, '🎁', 'Bonus', `Got ${formatMoney(amount)}!`, 'daily');
    
    await sock.sendMessage(dest, {
      text: `🎁 *Bonus!* You received ${formatMoney(amount)}!\n💸 Wallet: ${formatMoney(user.wallet)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'bankupgrade') {
    const cost = 5000;
    if (user.wallet < cost) {
      await sock.sendMessage(dest, { text: `❌ You need ${formatMoney(cost)} to upgrade your bank limit.` }, { quoted: message });
      return true;
    }
    user.wallet -= cost;
    user.bankLimit += 5000;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, bankLimit: user.bankLimit });
    await logActivity(sender, '🏦', 'Bank Upgrade', `Upgraded bank limit to ${formatMoney(user.bankLimit)}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `✅ Bank upgraded! New limit: ${formatMoney(user.bankLimit)}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'upgrade') {
    await sock.sendMessage(dest, { text: `⬆️ *Upgrade Menu*\n\n• \`.bankupgrade\` — Increase bank limit by ${formatMoney(5000)} (costs ${formatMoney(5000)})` }, { quoted: message });
    return true;
  }

  if (command === 'prestige') {
    if (user.level < 50) {
      await sock.sendMessage(dest, { text: '❌ You need to be at least *Level 50* to prestige!' }, { quoted: message });
      return true;
    }
    user.rpg.prestige = (user.rpg.prestige || 0) + 1;
    user.level = 1;
    user.xp = 0;
    user.wallet = 500;
    user.bank = 0;
    user.inventory = [];
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, level: user.level, bank: user.bank });
    await logActivity(sender, '⭐', 'Prestige', `Prestiged to level ${user.rpg.prestige}!`, 'economy');
    
    await sock.sendMessage(dest, {
      text: `⭐ *PRESTIGE ${user.rpg.prestige}!*\nYou have reset your progress and gained Prestige ${user.rpg.prestige}! You are now stronger than ever.`,
    }, { quoted: message });
    return true;
  }

  if (command === 'pet') {
    if (!user.pet.type) {
      await sock.sendMessage(dest, { text: '🥚 You don\'t have a pet! Buy a *Pet Egg* from `.market`.' }, { quoted: message });
    } else {
      await sock.sendMessage(dest, {
        text: `🐾 *Your Pet*\n\n🏷️ Name: ${user.pet.name || 'Unnamed'}\n🐉 Type: ${user.pet.type}\n📊 Level: ${user.pet.level}\n🍖 Hunger: ${user.pet.hunger}%\n⚡ XP: ${user.pet.xp}`,
      }, { quoted: message });
    }
    return true;
  }

  if (command === 'feedpet') {
    if (!user.pet.type) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have a pet!' }, { quoted: message });
      return true;
    }
    user.pet.hunger = Math.min(100, (user.pet.hunger || 0) + 20);
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pet: user.pet });
    await logActivity(sender, '🐾', 'Fed Pet', `Fed ${user.pet.name}!`, 'economy');
    
    await sock.sendMessage(dest, { text: `🍖 You fed ${user.pet.name || 'your pet'}! Hunger: ${user.pet.hunger}%` }, { quoted: message });
    return true;
  }

  if (command === 'trainpet') {
    if (!user.pet.type) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have a pet!' }, { quoted: message });
      return true;
    }
    user.pet.xp = (user.pet.xp || 0) + 10;
    if (user.pet.xp >= user.pet.level * 50) {
      user.pet.level += 1;
      user.pet.xp = 0;
      await user.save();
      
      // ✨ SYNC TO WEBSITE
      await syncUserToWebsite(sender, { pet: user.pet });
      await logActivity(sender, '🐾', 'Pet Leveled', `${user.pet.name} reached level ${user.pet.level}!`, 'economy');
      
      await sock.sendMessage(dest, { text: `🎉 ${user.pet.name || 'Your pet'} leveled up to level ${user.pet.level}!` }, { quoted: message });
    } else {
      await user.save();
      
      // ✨ SYNC TO WEBSITE
      await syncUserToWebsite(sender, { pet: user.pet });
      await logActivity(sender, '🐾', 'Trained Pet', `Training ${user.pet.name}!`, 'economy');
      
      await sock.sendMessage(dest, { text: `💪 You trained ${user.pet.name || 'your pet'}! XP: ${user.pet.xp}/${user.pet.level * 50}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'sellpet') {
    if (!user.pet.type) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have a pet!' }, { quoted: message });
      return true;
    }
    const petValue = (user.pet.level || 1) * 500;
    user.wallet += petValue;
    user.pet = { name: null, type: null, level: 1, hunger: 100, xp: 0 };
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { wallet: user.wallet, pet: user.pet });
    await logActivity(sender, '💵', 'Sold Pet', `Sold pet for ${formatMoney(petValue)}!`, 'economy');
    
    await sock.sendMessage(dest, { text: `💸 You sold your pet for ${formatMoney(petValue)}!` }, { quoted: message });
    return true;
  }

  if (command === 'use') {
    const itemName = args.join(' ').toLowerCase();
    const idx = user.inventory.findIndex(i => i.item.toLowerCase().includes(itemName));
    if (idx === -1) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have that item.' }, { quoted: message });
      return true;
    }
    const itemObj = user.inventory[idx];
    let effect = '';
    if (itemObj.item === 'Health Potion') {
      user.rpg.hp = Math.min(user.rpg.maxHp, (user.rpg.hp || 0) + 50);
      effect = `❤️ HP restored to ${user.rpg.hp}/${user.rpg.maxHp}`;
    } else if (itemObj.item === 'Lucky Charm') {
      effect = '🍀 Lucky Charm activated! Your luck is boosted for the next roll.';
    } else if (itemObj.item === 'Pet Egg') {
      const pets = ['🐉 Dragon', '🦊 Fox', '🐺 Wolf', '🐱 Cat', '🐶 Dog', '🦁 Lion'];
      const petType = pets[randomInt(0, pets.length - 1)];
      user.pet = { name: petType.split(' ')[1], type: petType, level: 1, hunger: 100, xp: 0 };
      effect = `🥚 The egg hatched! You got a ${petType}!`;
    } else {
      effect = `You used ${itemObj.item}!`;
    }
    if (itemObj.qty <= 1) user.inventory.splice(idx, 1);
    else itemObj.qty -= 1;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    if (itemObj.item === 'Pet Egg') {
      await syncUserToWebsite(sender, { pet: user.pet, inventory: user.inventory });
    } else {
      await syncUserToWebsite(sender, { inventory: user.inventory });
    }
    await logActivity(sender, '🎒', 'Used Item', `Used ${itemObj.item}!`, 'economy');
    
    await sock.sendMessage(dest, { text: `✅ ${effect}` }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleEconomy };
