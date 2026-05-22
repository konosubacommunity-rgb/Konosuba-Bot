const User  = require('../models/User');
const { randomInt, getRandom, formatMoney } = require('../utils/helpers');

const MONSTERS = [
  { name: 'Goblin',     hp: 30,  attack: 8,  xp: 20,  gold: 15 },
  { name: 'Skeleton',   hp: 40,  attack: 12, xp: 30,  gold: 25 },
  { name: 'Wolf',       hp: 50,  attack: 15, xp: 40,  gold: 20 },
  { name: 'Orc',        hp: 70,  attack: 20, xp: 60,  gold: 40 },
  { name: 'Dark Knight',hp: 100, attack: 28, xp: 90,  gold: 75 },
  { name: 'Dragon',     hp: 200, attack: 50, xp: 200, gold: 200 },
];

const BOSS_MONSTERS = [
  { name: 'Demon Lord',    hp: 500, attack: 80,  xp: 500, gold: 1000 },
  { name: 'Ancient Dragon',hp: 800, attack: 100, xp: 800, gold: 2000 },
  { name: 'Lich King',     hp: 600, attack: 90,  xp: 600, gold: 1500 },
];

const RPG_SHOP_ITEMS = [
  { name: 'Iron Sword',   price: 200,  type: 'weapon',     bonus: 5 },
  { name: 'Steel Sword',  price: 500,  type: 'weapon',     bonus: 12 },
  { name: 'Flame Blade',  price: 1500, type: 'weapon',     bonus: 25 },
  { name: 'Leather Armor',price: 150,  type: 'armor',      bonus: 3 },
  { name: 'Chain Mail',   price: 400,  type: 'armor',      bonus: 8 },
  { name: 'Dragon Scale', price: 2000, type: 'armor',      bonus: 20 },
  { name: 'Health Potion',price: 100,  type: 'consumable' },
];

const CLASSES  = ['Warrior', 'Mage', 'Rogue', 'Paladin', 'Archer', 'Monk'];
const DUNGEONS = [
  { name: 'Goblin Cave',    level: 1,  reward: 300,  monster: 'Goblin' },
  { name: 'Skeleton Crypt', level: 5,  reward: 600,  monster: 'Skeleton' },
  { name: 'Orc Fortress',   level: 10, reward: 1200, monster: 'Orc' },
  { name: "Dragon's Lair",  level: 20, reward: 3000, monster: 'Dragon' },
];

async function handleRpg(sock, message, command, args, sender, isGroup, groupJid) {
  const dest    = isGroup ? groupJid : sender;
  const rpgCmds = ['rpg', 'stats', 'boss', 'raid', 'dungeon', 'equip', 'unequip', 'skills', 'craft', 'forge', 'shop', 'rparty', 'dailyreward', 'levelup'];
  if (!rpgCmds.includes(command)) return false;

  // FIX: use findOrCreateByJid instead of findOne({jid}) + new User
  const user = await User.findOrCreateByJid(sender, message.pushName);
  if (user.banned) { await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message }); return true; }

  if (command === 'rpg') {
    if (!user.rpg.class || user.rpg.class === 'Adventurer') {
      const classList = CLASSES.map((c, i) => `*${i + 1}.* ${c}`).join('\n');
      const chosen = args[0] ? parseInt(args[0]) - 1 : -1;
      if (chosen >= 0 && chosen < CLASSES.length) {
        user.rpg.class   = CLASSES[chosen];
        user.rpg.hp      = 100; user.rpg.maxHp = 100;
        user.rpg.attack  = 10 + (chosen * 2);
        user.rpg.defense = 5 + chosen;
        await user.save();
        await sock.sendMessage(dest, { text: `⚔️ You are now a *${user.rpg.class}*! Your adventure begins...\n\nUse \`.stats\` to see your character.` }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: `⚔️ *Welcome to RPG!*\n\nChoose your class:\n${classList}\n\nUse: \`.rpg <number>\`` }, { quoted: message });
      }
    } else {
      await sock.sendMessage(dest, { text: `⚔️ *RPG Commands*\n\n• \`.stats\` — Character stats\n• \`.hunt\` — Fight monsters\n• \`.dungeon\` — Enter dungeons\n• \`.boss\` — Fight bosses\n• \`.shop\` — RPG shop\n• \`.equip <item>\` — Equip gear\n• \`.skills\` — View skills\n• \`.forge\` — Forge powerful gear` }, { quoted: message });
    }
    return true;
  }

  if (command === 'stats') {
    const rpg = user.rpg;
    const hpBar = '█'.repeat(Math.floor((rpg.hp / rpg.maxHp) * 10)) + '░'.repeat(10 - Math.floor((rpg.hp / rpg.maxHp) * 10));
    await sock.sendMessage(dest, {
      text: `⚔️ *${user.name}'s Character*\n\n🏷️ Class: ${rpg.class}\n📊 Level: ${user.level}\n❤️ HP: ${rpg.hp}/${rpg.maxHp} [${hpBar}]\n⚔️ Attack: ${rpg.attack}\n🛡️ Defense: ${rpg.defense}\n\n🗡️ Weapon: ${rpg.weapon}\n🛡️ Armor: ${rpg.armor}\n💰 Gold: ${formatMoney(rpg.gold)}\n\n⭐ Prestige: ${rpg.prestige || 0}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'boss') {
    const boss = getRandom(BOSS_MONSTERS);
    if (user.level < 15) { await sock.sendMessage(dest, { text: `❌ You need Level 15+ to fight bosses! (You are Lv.${user.level})` }, { quoted: message }); return true; }
    const playerAtk = (user.rpg.attack || 10) + randomInt(1, 10);
    const bossAtk   = boss.attack + randomInt(1, 20);
    const playerWin = playerAtk * 3 > bossAtk * 2;
    if (playerWin) {
      user.rpg.gold = (user.rpg.gold || 0) + boss.gold;
      user.addXp(boss.xp);
      await user.save();
      await sock.sendMessage(dest, { text: `⚔️ *Boss Battle!*\n\n👹 ${boss.name}\n\n🗡️ Your attack: ${playerAtk}\n💀 Boss attack: ${bossAtk}\n\n🏆 *VICTORY!*\n+${boss.gold} gold\n+${boss.xp} XP${user.level > 1 ? `\n⬆️ Level ${user.level}!` : ''}` }, { quoted: message });
    } else {
      user.rpg.hp = Math.max(1, user.rpg.hp - bossAtk);
      await user.save();
      await sock.sendMessage(dest, { text: `⚔️ *Boss Battle!*\n\n👹 ${boss.name}\n\n🗡️ Your attack: ${playerAtk}\n💀 Boss attack: ${bossAtk}\n\n💀 *DEFEATED!* HP: ${user.rpg.hp}/${user.rpg.maxHp}\nUse Health Potions to recover!` }, { quoted: message });
    }
    return true;
  }

  if (command === 'dungeon') {
    const dIdx = args[0] ? parseInt(args[0]) - 1 : 0;
    const dungeon = DUNGEONS[Math.min(dIdx, DUNGEONS.length - 1)];
    if (user.level < dungeon.level) { await sock.sendMessage(dest, { text: `❌ You need Level ${dungeon.level}+ for *${dungeon.name}*!` }, { quoted: message }); return true; }
    const win = Math.random() < 0.65;
    if (win) {
      user.rpg.gold = (user.rpg.gold || 0) + dungeon.reward;
      user.addXp(dungeon.reward / 10);
      await user.save();
      await sock.sendMessage(dest, { text: `🏰 *${dungeon.name}*\n\n✅ Dungeon cleared!\n+${formatMoney(dungeon.reward)} gold\n+${Math.floor(dungeon.reward / 10)} XP` }, { quoted: message });
    } else {
      user.rpg.hp = Math.max(1, user.rpg.hp - 20);
      await user.save();
      await sock.sendMessage(dest, { text: `🏰 *${dungeon.name}*\n\n❌ Dungeon failed! You barely escaped...\nHP: ${user.rpg.hp}/${user.rpg.maxHp}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'shop') {
    const items = RPG_SHOP_ITEMS.map(i => `• ${i.name} — ${formatMoney(i.price)}`).join('\n');
    await sock.sendMessage(dest, { text: `🏪 *RPG Shop*\n\n${items}\n\nBuy: \`.equip <item name>\`` }, { quoted: message });
    return true;
  }

  if (command === 'equip') {
    const itemName = args.join(' ').toLowerCase();
    const item     = RPG_SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName);
    if (!item) { await sock.sendMessage(dest, { text: `❌ Item not found. Use \`.shop\` to see available items.` }, { quoted: message }); return true; }
    if (user.rpg.gold < item.price && user.wallet < item.price) { await sock.sendMessage(dest, { text: `❌ You need ${formatMoney(item.price)} to buy this!` }, { quoted: message }); return true; }
    if (user.wallet >= item.price) user.wallet -= item.price;
    else user.rpg.gold -= item.price;
    if (item.type === 'weapon') { user.rpg.weapon = item.name; user.rpg.attack += item.bonus; }
    if (item.type === 'armor')  { user.rpg.armor  = item.name; user.rpg.defense += item.bonus; }
    if (item.type === 'consumable') { user.rpg.hp = Math.min(user.rpg.maxHp, user.rpg.hp + 50); }
    await user.save();
    await sock.sendMessage(dest, { text: `✅ *Equipped ${item.name}!*${item.bonus ? `\n+${item.bonus} ${item.type === 'weapon' ? 'Attack' : 'Defense'}` : '\n+50 HP'}` }, { quoted: message });
    return true;
  }

  if (command === 'skills') {
    const skills = user.rpg.skills?.length ? user.rpg.skills.join(', ') : 'None yet';
    await sock.sendMessage(dest, { text: `🌟 *${user.name}'s Skills*\n\n${skills}\n\nLevel up to unlock more!` }, { quoted: message });
    return true;
  }

  return true;
}

module.exports = { handleRpg };
