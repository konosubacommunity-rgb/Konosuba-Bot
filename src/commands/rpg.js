const User = require('../models/User');
const { randomInt, getRandom, formatMoney } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/website-sync');

const MONSTERS = [
  { name: 'Goblin', hp: 30, attack: 8, xp: 20, gold: 15 },
  { name: 'Skeleton', hp: 40, attack: 12, xp: 30, gold: 25 },
  { name: 'Wolf', hp: 50, attack: 15, xp: 40, gold: 20 },
  { name: 'Orc', hp: 70, attack: 20, xp: 60, gold: 40 },
  { name: 'Dark Knight', hp: 100, attack: 28, xp: 90, gold: 75 },
  { name: 'Dragon', hp: 200, attack: 50, xp: 200, gold: 200 },
];

const BOSS_MONSTERS = [
  { name: 'Demon Lord', hp: 500, attack: 80, xp: 500, gold: 1000 },
  { name: 'Ancient Dragon', hp: 800, attack: 100, xp: 800, gold: 2000 },
  { name: 'Lich King', hp: 600, attack: 90, xp: 600, gold: 1500 },
];

const RPG_SHOP_ITEMS = [
  { name: 'Iron Sword', price: 200, type: 'weapon', bonus: 5 },
  { name: 'Steel Sword', price: 500, type: 'weapon', bonus: 12 },
  { name: 'Flame Blade', price: 1500, type: 'weapon', bonus: 25 },
  { name: 'Leather Armor', price: 150, type: 'armor', bonus: 3 },
  { name: 'Chain Mail', price: 400, type: 'armor', bonus: 8 },
  { name: 'Dragon Scale', price: 2000, type: 'armor', bonus: 20 },
  { name: 'Health Potion', price: 100, type: 'consumable' },
];

const CLASSES = ['Warrior', 'Mage', 'Rogue', 'Paladin', 'Archer', 'Monk'];

const DUNGEONS = [
  { name: 'Goblin Cave', level: 1, reward: 300, monster: 'Goblin' },
  { name: 'Skeleton Crypt', level: 5, reward: 600, monster: 'Skeleton' },
  { name: 'Orc Fortress', level: 10, reward: 1200, monster: 'Orc' },
  { name: "Dragon's Lair", level: 20, reward: 3000, monster: 'Dragon' },
];

async function handleRpg(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const rpgCmds = ['rpg', 'stats', 'boss', 'raid', 'dungeon', 'equip', 'unequip', 'skills', 'craft', 'forge', 'shop', 'rparty', 'dailyreward', 'levelup'];
  if (!rpgCmds.includes(command)) return false;

  // ── Always look up by JID or LID — never assume it's always a JID ──────────
  let user = await User.findByWhatsAppId(sender);
  if (!user) {
    const isLid = sender.includes('@lid');
    user = new User(isLid ? { lid: sender, name: message.pushName } : { jid: sender, name: message.pushName });
    await user.save();
  }

  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  // ── .rpg — choose class ───────────────────────────────────────────────────
  if (command === 'rpg') {
    if (!user.rpg.class || user.rpg.class === 'Adventurer') {
      const classList = CLASSES.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
      const chosen = args[0] ? parseInt(args[0]) - 1 : -1;
      if (chosen >= 0 && chosen < CLASSES.length) {
        user.rpg.class    = CLASSES[chosen];
        user.rpg.hp       = 100;
        user.rpg.maxHp    = 100;
        user.rpg.attack   = 10 + (chosen * 2);
        user.rpg.defense  = 5 + chosen;
        await user.save();
        await syncUserToWebsite(sender, { rpg: user.rpg, level: user.level });
        await logActivity(sender, '⚔️', 'Class Chosen', `Became a ${user.rpg.class}!`, 'rpg');
        await sock.sendMessage(dest, { text: `⚔️ You are now a *${user.rpg.class}*! Your adventure begins...\n\nUse \`.stats\` to see your character.` }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: `⚔️ *Welcome to RPG!*\n\nChoose your class:\n${classList}\n\nUse: \`.rpg <number>\`` }, { quoted: message });
      }
    } else {
      await sock.sendMessage(dest, { text: `⚔️ *RPG Commands*\n\n• \`.stats\` — Character stats\n• \`.hunt\` — Fight monsters\n• \`.dungeon\` — Enter dungeons\n• \`.boss\` — Fight bosses\n• \`.raid\` — Team raid\n• \`.shop\` — RPG shop\n• \`.equip <item>\` — Equip gear\n• \`.skills\` — View skills\n• \`.craft <item>\` — Craft items\n• \`.forge\` — Forge powerful gear` }, { quoted: message });
    }
    return true;
  }

  // ── .stats ────────────────────────────────────────────────────────────────
  if (command === 'stats') {
    const rpg = user.rpg;
    const hpBar = '█'.repeat(Math.floor((rpg.hp / rpg.maxHp) * 10)) + '░'.repeat(10 - Math.floor((rpg.hp / rpg.maxHp) * 10));
    await sock.sendMessage(dest, {
      text: `⚔️ *${user.name}'s Character*\n\n🏷️ Class: ${rpg.class}\n📊 Level: ${user.level}\n❤️ HP: ${rpg.hp}/${rpg.maxHp} [${hpBar}]\n⚔️ Attack: ${rpg.attack}\n🛡️ Defense: ${rpg.defense}\n⚡ Speed: ${rpg.speed}\n\n🗡️ Weapon: ${rpg.weapon}\n🛡️ Armor: ${rpg.armor}\n💰 Gold: ${formatMoney(rpg.gold)}\n\n⭐ Prestige: ${rpg.prestige || 0}`,
    }, { quoted: message });
    return true;
  }

  // ── .boss ─────────────────────────────────────────────────────────────────
  if (command === 'boss') {
    const boss = getRandom(BOSS_MONSTERS);
    if (user.level < 15) {
      await sock.sendMessage(dest, { text: `❌ You need to be at least Level 15 to fight bosses! (You are Lv.${user.level})` }, { quoted: message });
      return true;
    }
    const playerAttack = user.rpg.attack + randomInt(0, 20);
    const bossAttack   = boss.attack + randomInt(0, 20);
    const playerWins   = playerAttack > bossAttack || Math.random() < 0.4;

    if (playerWins) {
      user.wallet    += boss.gold;
      user.rpg.gold  += boss.gold;
      const leveled   = user.addXp(boss.xp);
      await user.save();
      await syncUserToWebsite(sender, { wallet: user.wallet, rpg: user.rpg, level: user.level, xp: user.xp });
      await logActivity(sender, '👑', 'Boss Victory', `Defeated ${boss.name}! +${formatMoney(boss.gold)}`, 'rpg');
      await sock.sendMessage(dest, {
        text: `👑 *BOSS BATTLE*\n\n⚔️ You vs *${boss.name}*\n\n🎉 *VICTORY!*\n💰 Earned: ${formatMoney(boss.gold)}\n⚡ XP: +${boss.xp}${leveled ? '\n🆙 *LEVEL UP!*' : ''}`,
      }, { quoted: message });
    } else {
      const dmg      = Math.floor(boss.attack * 0.5);
      user.rpg.hp    = Math.max(1, user.rpg.hp - dmg);
      await user.save();
      await syncUserToWebsite(sender, { rpg: user.rpg });
      await logActivity(sender, '💔', 'Boss Defeat', `Lost to ${boss.name}. HP: ${user.rpg.hp}/${user.rpg.maxHp}`, 'rpg');
      await sock.sendMessage(dest, {
        text: `👑 *BOSS BATTLE*\n\n⚔️ You vs *${boss.name}*\n\n💔 *DEFEATED!* You took ${dmg} damage.\n❤️ HP: ${user.rpg.hp}/${user.rpg.maxHp}`,
      }, { quoted: message });
    }
    return true;
  }

  // ── .dungeon ──────────────────────────────────────────────────────────────
  if (command === 'dungeon') {
    const availableDungeons = DUNGEONS.filter(d => user.level >= d.level);
    if (availableDungeons.length === 0) {
      await sock.sendMessage(dest, { text: '❌ You\'re too weak for any dungeons! Level up first.' }, { quoted: message });
      return true;
    }
    if (!args[0]) {
      const list = DUNGEONS.map((d, i) => `*${i + 1}.* ${d.name} (Lv.${d.level}+) — ${formatMoney(d.reward)} reward`).join('\n');
      await sock.sendMessage(dest, { text: `🏰 *Dungeons*\n\n${list}\n\nUse: \`.dungeon <number>\`` }, { quoted: message });
      return true;
    }
    const idx     = parseInt(args[0]) - 1;
    const dungeon = DUNGEONS[idx];
    if (!dungeon) {
      await sock.sendMessage(dest, { text: '❌ Invalid dungeon!' }, { quoted: message });
      return true;
    }
    if (user.level < dungeon.level) {
      await sock.sendMessage(dest, { text: `❌ You need Level ${dungeon.level} for this dungeon!` }, { quoted: message });
      return true;
    }
    const win = Math.random() < (0.5 + (user.level - dungeon.level) * 0.02);
    if (win) {
      const reward  = dungeon.reward + randomInt(-100, 200);
      user.wallet  += reward;
      const leveled = user.addXp(dungeon.level * 15);
      await user.save();
      await syncUserToWebsite(sender, { wallet: user.wallet, level: user.level, xp: user.xp, rpg: user.rpg });
      await logActivity(sender, '🏰', 'Dungeon Clear', `Cleared ${dungeon.name}! +${formatMoney(reward)}`, 'rpg');
      await sock.sendMessage(dest, {
        text: `🏰 *${dungeon.name}*\n\n⚔️ You cleared the dungeon!\n💰 Reward: ${formatMoney(reward)}${leveled ? '\n🆙 *LEVEL UP!*' : ''}`,
      }, { quoted: message });
    } else {
      const dmg   = randomInt(20, 50);
      user.rpg.hp = Math.max(1, user.rpg.hp - dmg);
      await user.save();
      await syncUserToWebsite(sender, { rpg: user.rpg });
      await logActivity(sender, '💔', 'Dungeon Failed', `Failed ${dungeon.name}. HP: ${user.rpg.hp}/${user.rpg.maxHp}`, 'rpg');
      await sock.sendMessage(dest, {
        text: `🏰 *${dungeon.name}*\n\n💔 You were defeated in the dungeon!\n❤️ HP: ${user.rpg.hp}/${user.rpg.maxHp}`,
      }, { quoted: message });
    }
    return true;
  }

  // ── .raid ─────────────────────────────────────────────────────────────────
  if (command === 'raid') {
    const boss   = getRandom(BOSS_MONSTERS);
    const win    = Math.random() < 0.55;
    const reward = win ? randomInt(500, 2000) : 0;
    if (win) {
      user.wallet += reward;
      await user.save();
      await syncUserToWebsite(sender, { wallet: user.wallet });
      await logActivity(sender, '⚔️', 'Raid Victory', `Raid won! +${formatMoney(reward)}`, 'rpg');
    }
    await sock.sendMessage(dest, {
      text: `⚔️ *RAID BATTLE vs ${boss.name}!*\n\n${win ? `🎉 *Your party wins!* You earned ${formatMoney(reward)}!` : '💔 *Your party was defeated!* Regroup and try again!'}`,
    }, { quoted: message });
    return true;
  }

  // ── .shop ─────────────────────────────────────────────────────────────────
  if (command === 'shop') {
    const list = RPG_SHOP_ITEMS.map((i, idx) => `*${idx + 1}.* ${i.name} — ${formatMoney(i.price)} (${i.type}${i.bonus ? ` +${i.bonus}` : ''})`).join('\n');
    await sock.sendMessage(dest, {
      text: `⚔️ *RPG Shop*\n\n${list}\n\n💰 Your gold: ${formatMoney(user.rpg.gold)}\n\nUse \`.buy <item name>\` to purchase.`,
    }, { quoted: message });
    return true;
  }

  // ── .equip ────────────────────────────────────────────────────────────────
  if (command === 'equip') {
    const itemName = args.join(' ').toLowerCase();
    const item     = user.inventory.find(i => i.item.toLowerCase().includes(itemName));
    const shopItem = RPG_SHOP_ITEMS.find(i => i.name.toLowerCase().includes(itemName));
    if (!item || !shopItem) {
      await sock.sendMessage(dest, { text: '❌ Item not in inventory! Buy it from `.shop` first.' }, { quoted: message });
      return true;
    }
    if (shopItem.type === 'weapon') {
      user.rpg.weapon  = shopItem.name;
      user.rpg.attack += shopItem.bonus;
    } else if (shopItem.type === 'armor') {
      user.rpg.armor    = shopItem.name;
      user.rpg.defense += shopItem.bonus;
    }
    await user.save();
    await syncUserToWebsite(sender, { rpg: user.rpg });
    await logActivity(sender, '🗡️', 'Equipped', `Equipped ${shopItem.name}!`, 'rpg');
    await sock.sendMessage(dest, {
      text: `✅ Equipped *${shopItem.name}*!\n⚔️ Attack: ${user.rpg.attack}\n🛡️ Defense: ${user.rpg.defense}`,
    }, { quoted: message });
    return true;
  }

  // ── .unequip ──────────────────────────────────────────────────────────────
  if (command === 'unequip') {
    const slot = args[0]?.toLowerCase();
    if (slot === 'weapon') {
      user.rpg.weapon = 'Bare Hands';
      await user.save();
      await syncUserToWebsite(sender, { rpg: user.rpg });
      await sock.sendMessage(dest, { text: '✅ Unequipped weapon.' }, { quoted: message });
    } else if (slot === 'armor') {
      user.rpg.armor = 'No Armor';
      await user.save();
      await syncUserToWebsite(sender, { rpg: user.rpg });
      await sock.sendMessage(dest, { text: '✅ Unequipped armor.' }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text: '❌ Usage: `.unequip weapon` or `.unequip armor`' }, { quoted: message });
    }
    return true;
  }

  // ── .skills ───────────────────────────────────────────────────────────────
  if (command === 'skills') {
    const defaultSkills = ['Basic Strike', 'Dodge Roll', 'Power Attack'];
    const allSkills     = [...defaultSkills, ...(user.rpg.skills || [])];
    await sock.sendMessage(dest, {
      text: `⚡ *${user.name}'s Skills*\n\nClass: ${user.rpg.class}\n\n${allSkills.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    }, { quoted: message });
    return true;
  }

  // ── .craft ────────────────────────────────────────────────────────────────
  if (command === 'craft') {
    const item     = args.join(' ').toLowerCase();
    const craftable = [
      { name: 'health potion', result: 'Health Potion', cost: 50 },
      { name: 'iron sword',    result: 'Iron Sword',    cost: 100 },
    ];
    const recipe = craftable.find(c => c.name.includes(item));
    if (!recipe) {
      await sock.sendMessage(dest, { text: '❌ No recipe found! Check \`.forge\` for craftable items.' }, { quoted: message });
      return true;
    }
    if (user.wallet < recipe.cost) {
      await sock.sendMessage(dest, { text: `❌ Need ${formatMoney(recipe.cost)} to craft this!` }, { quoted: message });
      return true;
    }
    user.wallet -= recipe.cost;
    const existing = user.inventory.find(i => i.item === recipe.result);
    if (existing) existing.qty += 1;
    else user.inventory.push({ item: recipe.result, qty: 1 });
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, inventory: user.inventory });
    await logActivity(sender, '🔨', 'Crafted', `Crafted ${recipe.result}!`, 'rpg');
    await sock.sendMessage(dest, { text: `✅ Crafted *${recipe.result}*!` }, { quoted: message });
    return true;
  }

  // ── .forge ────────────────────────────────────────────────────────────────
  if (command === 'forge') {
    await sock.sendMessage(dest, {
      text: `🔨 *Forge — Craftable Items*\n\n• Health Potion — 50 gold\n• Iron Sword — 100 gold\n\nUse: \`.craft <item name>\``,
    }, { quoted: message });
    return true;
  }

  // ── .rparty ───────────────────────────────────────────────────────────────
  if (command === 'rparty') {
    await sock.sendMessage(dest, {
      text: `⚔️ *RPG Party*\n\nYou — ${user.rpg.class} Lv.${user.level}\n❤️ HP: ${user.rpg.hp}/${user.rpg.maxHp}\n⚔️ ATK: ${user.rpg.attack} | 🛡️ DEF: ${user.rpg.defense}\n\nTip: Tag friends to see their stats!`,
    }, { quoted: message });
    return true;
  }

  // ── .dailyreward ──────────────────────────────────────────────────────────
  if (command === 'dailyreward') {
    if (user.isOnCooldown('claim')) {
      const left = user.getCooldownLeft('claim');
      const { formatMs } = require('../utils/helpers');
      await sock.sendMessage(dest, { text: `⏳ Daily reward already claimed! Try again in *${formatMs(left)}*` }, { quoted: message });
      return true;
    }
    const gold     = randomInt(100, 500);
    user.rpg.gold += gold;
    user.wallet   += gold;
    user.setCooldown('claim');
    await user.save();
    await syncUserToWebsite(sender, { wallet: user.wallet, rpg: user.rpg });
    await logActivity(sender, '🎁', 'RPG Daily', `Claimed ${formatMoney(gold)} gold!`, 'rpg');
    await sock.sendMessage(dest, { text: `✅ *Daily RPG Reward!*\n\n💰 +${formatMoney(gold)} gold!\n💰 Total gold: ${formatMoney(user.rpg.gold)}` }, { quoted: message });
    return true;
  }

  // ── .levelup ──────────────────────────────────────────────────────────────
  if (command === 'levelup') {
    if (user.xp < user.level * 100) {
      await sock.sendMessage(dest, { text: `❌ Not enough XP! Need ${user.level * 100 - user.xp} more XP to level up.` }, { quoted: message });
      return true;
    }
    const oldLevel = user.level;
    user.addXp(0);
    if (user.level > oldLevel) {
      user.rpg.maxHp  += 10;
      user.rpg.hp      = user.rpg.maxHp;
      user.rpg.attack += 2;
      user.rpg.defense += 1;
      await user.save();
      await syncUserToWebsite(sender, { level: user.level, xp: user.xp, rpg: user.rpg });
      await logActivity(sender, '🆙', 'Level Up', `Reached Level ${user.level}!`, 'rpg');
      await sock.sendMessage(dest, { text: `🆙 *LEVEL UP!* ${oldLevel} → ${user.level}\n\n❤️ Max HP: ${user.rpg.maxHp}\n⚔️ Attack: ${user.rpg.attack}\n🛡️ Defense: ${user.rpg.defense}` }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text: `📊 Level: ${user.level} | XP: ${user.xp}/${user.level * 100}` }, { quoted: message });
    }
    return true;
  }

  return false;
}

module.exports = { handleRpg };
