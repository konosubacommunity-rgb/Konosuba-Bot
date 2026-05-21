const User = require('../models/User');
const { randomInt, getRandom, formatMoney } = require('../utils/helpers');
const { syncUserToWebsite, logActivity } = require('../utils/website-sync');

const STARTERS = [
  { name: 'Bulbasaur', type: 'Grass/Poison', hp: 45, moves: ['Vine Whip', 'Tackle', 'Growl', 'Leech Seed'] },
  { name: 'Charmander', type: 'Fire', hp: 39, moves: ['Scratch', 'Ember', 'Growl', 'Smokescreen'] },
  { name: 'Squirtle', type: 'Water', hp: 44, moves: ['Tackle', 'Water Gun', 'Tail Whip', 'Bubble'] },
  { name: 'Pikachu', type: 'Electric', hp: 35, moves: ['Thundershock', 'Quick Attack', 'Growl', 'Thunder Wave'] },
];

const WILD_POKEMON = [
  { name: 'Rattata', type: 'Normal', hp: 30, moves: ['Tackle', 'Quick Attack'] },
  { name: 'Pidgey', type: 'Normal/Flying', hp: 40, moves: ['Gust', 'Tackle'] },
  { name: 'Caterpie', type: 'Bug', hp: 45, moves: ['Tackle', 'String Shot'] },
  { name: 'Geodude', type: 'Rock', hp: 40, moves: ['Tackle', 'Rock Throw'] },
  { name: 'Gastly', type: 'Ghost/Poison', hp: 30, moves: ['Lick', 'Night Shade'] },
  { name: 'Eevee', type: 'Normal', hp: 55, moves: ['Tackle', 'Quick Attack', 'Sand Attack'] },
  { name: 'Magikarp', type: 'Water', hp: 20, moves: ['Splash'] },
  { name: 'Snorlax', type: 'Normal', hp: 160, moves: ['Body Slam', 'Tackle', 'Rest'] },
  { name: 'Mewtwo', type: 'Psychic', hp: 106, moves: ['Psychic', 'Swift', 'Aura Sphere', 'Recover'] },
  { name: 'Gengar', type: 'Ghost/Poison', hp: 60, moves: ['Shadow Ball', 'Lick', 'Hypnosis', 'Dream Eater'] },
];

const EVOLUTIONS = {
  Caterpie: 'Metapod',
  Metapod: 'Butterfree',
  Bulbasaur: 'Ivysaur',
  Ivysaur: 'Venusaur',
  Charmander: 'Charmeleon',
  Charmeleon: 'Charizard',
  Squirtle: 'Wartortle',
  Wartortle: 'Blastoise',
  Eevee: 'Vaporeon',
  Magikarp: 'Gyarados',
};

async function handlePokemon(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const user = await User.findOne({ jid: sender }) || new User({ jid: sender, name: message.pushName });
  if (user.banned) { await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message }); return true; }

  const pokemonCmds = ['pokemon', 'party', 'pc', 'starter', 'catch', 'hunt', 'battle', 'gymbattle', 'heal', 'revive', 'evolve', 'transfer', 'release', 'rename', 'buddy', 'feed', 'train', 'moves', 'team', 'pokeshop'];
  if (!pokemonCmds.includes(command)) return false;

  if (command === 'starter') {
    if (user.starter) {
      await sock.sendMessage(dest, { text: '❌ You already have a starter! Use `.party` to see your Pokémon.' }, { quoted: message });
      return true;
    }
    const list = STARTERS.map((p, i) => `*${i + 1}.* ${p.name} (${p.type})`).join('\n');
    const idx = args[0] ? parseInt(args[0]) - 1 : -1;
    if (idx >= 0 && idx < STARTERS.length) {
      const starter = STARTERS[idx];
      user.starter = true;
      user.pokemon.push({ name: starter.name, level: 5, hp: starter.hp, maxHp: starter.hp, moves: starter.moves, shiny: Math.random() < 0.01 });
      await user.save();
      
      // ✨ SYNC TO WEBSITE
      await syncUserToWebsite(sender, { starter: user.starter, pokemon: user.pokemon });
      await logActivity(sender, '🐾', 'Got Starter', `Got ${starter.name}!`, 'pokemon');
      
      await sock.sendMessage(dest, { text: `✅ You chose *${starter.name}* as your starter! ${Math.random() < 0.01 ? '✨ It\'s SHINY!' : ''}\n\nUse \`.party\` to see your team!` }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text: `🐾 *Choose your Starter Pokémon!*\n\n${list}\n\nUse: \`.starter <number>\`` }, { quoted: message });
    }
    return true;
  }

  if (command === 'party' || command === 'pokemon' || command === 'team') {
    if (!user.starter || user.pokemon.length === 0) {
      await sock.sendMessage(dest, { text: '❌ You don\'t have any Pokémon! Use `.starter` to get one.' }, { quoted: message });
      return true;
    }
    const list = user.pokemon.slice(0, 6).map((p, i) =>
      `*${i + 1}.* ${p.shiny ? '✨' : ''}${p.name} Lv.${p.level} — HP: ${p.hp}/${p.maxHp}`
    ).join('\n');
    await sock.sendMessage(dest, { text: `🐾 *Your Party*\n\n${list}` }, { quoted: message });
    return true;
  }

  if (command === 'pc') {
    if (user.pokemon.length === 0) {
      await sock.sendMessage(dest, { text: '❌ Your PC is empty!' }, { quoted: message });
      return true;
    }
    const list = user.pokemon.map((p, i) =>
      `*${i + 1}.* ${p.shiny ? '✨' : ''}${p.nickname || p.name} Lv.${p.level}`
    ).join('\n');
    await sock.sendMessage(dest, { text: `💻 *PC Storage (${user.pokemon.length} Pokémon)*\n\n${list}` }, { quoted: message });
    return true;
  }

  if (command === 'hunt' || command === 'catch') {
    if (!user.starter) {
      await sock.sendMessage(dest, { text: '❌ Get a starter first! Use `.starter`' }, { quoted: message });
      return true;
    }
    if (user.isOnCooldown('hunt')) {
      const { formatMs } = require('../utils/helpers');
      const left = user.getCooldownLeft('hunt');
      await sock.sendMessage(dest, { text: `⏳ You're still searching! Try again in *${formatMs(left)}*` }, { quoted: message });
      return true;
    }
    const wild = getRandom(WILD_POKEMON);
    const isShiny = Math.random() < 0.01;
    user.setCooldown('hunt');
    if (command === 'hunt') {
      await user.save();
      await sock.sendMessage(dest, {
        text: `🌿 *A wild ${isShiny ? '✨' : ''}${wild.name} appeared!*\n\nType: ${wild.type}\nHP: ${wild.hp}\nMoves: ${wild.moves.join(', ')}\n\nUse \`.catch\` to catch it or \`.battle\` to fight!`,
      }, { quoted: message });
      return true;
    }
    if (command === 'catch') {
      const balls = user.pokeBalls || 0;
      if (balls <= 0) {
        await sock.sendMessage(dest, { text: '❌ No Poké Balls! Buy some at `.pokeshop`' }, { quoted: message });
        return true;
      }
      user.pokeBalls--;
      const catchRate = Math.random() < 0.4;
      if (catchRate) {
        user.pokemon.push({ name: wild.name, level: randomInt(1, 10), hp: wild.hp, maxHp: wild.hp, moves: wild.moves, shiny: isShiny });
        await user.save();
        
        // ✨ SYNC TO WEBSITE
        await syncUserToWebsite(sender, { pokemon: user.pokemon, pokeBalls: user.pokeBalls });
        await logActivity(sender, '🐾', 'Caught Pokémon', `Caught ${isShiny ? '✨ ' : ''}${wild.name}!`, 'pokemon');
        
        await sock.sendMessage(dest, {
          text: `✅ Gotcha! ${isShiny ? '✨ *SHINY* ' : ''}*${wild.name}* was caught!\n🎾 Poké Balls left: ${user.pokeBalls}`,
        }, { quoted: message });
      } else {
        await user.save();
        
        // ✨ SYNC TO WEBSITE
        await syncUserToWebsite(sender, { pokeBalls: user.pokeBalls });
        await logActivity(sender, '🐾', 'Catch Failed', `Failed to catch ${wild.name}!`, 'pokemon');
        
        await sock.sendMessage(dest, { text: `💨 *${wild.name}* broke free! Better luck next time!\n🎾 Poké Balls left: ${user.pokeBalls}` }, { quoted: message });
      }
      return true;
    }
  }

  if (command === 'heal') {
    user.pokemon.forEach(p => { p.hp = p.maxHp; });
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '❤️', 'Healed Pokémon', 'Healed all Pokémon!', 'pokemon');
    
    await sock.sendMessage(dest, { text: '❤️ All your Pokémon have been fully healed!' }, { quoted: message });
    return true;
  }

  if (command === 'evolve') {
    const name = args.join(' ');
    const pokemonIdx = user.pokemon.findIndex(p => p.name.toLowerCase() === name.toLowerCase() || (p.nickname && p.nickname.toLowerCase() === name.toLowerCase()));
    if (pokemonIdx === -1) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found in your party!' }, { quoted: message });
      return true;
    }
    const pokemon = user.pokemon[pokemonIdx];
    const evolution = EVOLUTIONS[pokemon.name];
    if (!evolution) {
      await sock.sendMessage(dest, { text: `❌ *${pokemon.name}* cannot evolve!` }, { quoted: message });
      return true;
    }
    if (pokemon.level < 16) {
      await sock.sendMessage(dest, { text: `❌ *${pokemon.name}* needs to be at least level 16 to evolve! (Currently Lv.${pokemon.level})` }, { quoted: message });
      return true;
    }
    const prevName = pokemon.name;
    pokemon.name = evolution;
    pokemon.maxHp = Math.floor(pokemon.maxHp * 1.2);
    pokemon.hp = pokemon.maxHp;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '🌟', 'Evolved Pokémon', `${prevName} evolved to ${evolution}!`, 'pokemon');
    
    await sock.sendMessage(dest, { text: `🌟 *${prevName}* evolved into *${evolution}*! HP increased to ${pokemon.maxHp}!` }, { quoted: message });
    return true;
  }

  if (command === 'release') {
    const name = args.join(' ');
    const idx = user.pokemon.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    const released = user.pokemon[idx];
    user.pokemon.splice(idx, 1);
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '👋', 'Released Pokémon', `Released ${released.name}!`, 'pokemon');
    
    await sock.sendMessage(dest, { text: `👋 You released *${released.name}*. Goodbye!` }, { quoted: message });
    return true;
  }

  if (command === 'rename') {
    const pokeName = args[0];
    const nickname = args.slice(1).join(' ');
    if (!pokeName || !nickname) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.rename <pokemon> <nickname>`' }, { quoted: message });
      return true;
    }
    const pokemon = user.pokemon.find(p => p.name.toLowerCase() === pokeName.toLowerCase());
    if (!pokemon) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    pokemon.nickname = nickname;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '🏷️', 'Renamed Pokémon', `Nicknamed ${pokemon.name} as ${nickname}!`, 'pokemon');
    
    await sock.sendMessage(dest, { text: `✅ *${pokemon.name}* has been nicknamed *${nickname}*!` }, { quoted: message });
    return true;
  }

  if (command === 'buddy') {
    const name = args.join(' ');
    if (!name) {
      await sock.sendMessage(dest, { text: `🐾 Your buddy: ${user.buddy || 'None set. Use \`.buddy <pokemon name>\`'}` }, { quoted: message });
      return true;
    }
    const pokemon = user.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!pokemon) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    user.buddy = pokemon.name;
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { buddy: user.buddy });
    await logActivity(sender, '🐾', 'Buddy Set', `Set ${pokemon.name} as buddy!`, 'pokemon');
    
    await sock.sendMessage(dest, { text: `🐾 *${pokemon.name}* is now your buddy!` }, { quoted: message });
    return true;
  }

  if (command === 'train') {
    const name = args.join(' ');
    const pokemon = user.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!pokemon) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    pokemon.level += 1;
    if (pokemon.level % 5 === 0) {
      pokemon.maxHp = Math.floor(pokemon.maxHp * 1.1);
      pokemon.hp = pokemon.maxHp;
    }
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '💪', 'Trained Pokémon', `${pokemon.name} reached Lv.${pokemon.level}!`, 'pokemon');
    
    const canEvolve = EVOLUTIONS[pokemon.name] && pokemon.level >= 16;
    await sock.sendMessage(dest, {
      text: `💪 *${pokemon.name}* trained hard and reached Lv.${pokemon.level}!${canEvolve ? '\n✨ *It can evolve!* Use `.evolve ' + pokemon.name + '`' : ''}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'feed') {
    const name = args.join(' ');
    const pokemon = user.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!pokemon) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    pokemon.hp = Math.min(pokemon.maxHp, (pokemon.hp || 0) + 20);
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '🍎', 'Fed Pokémon', `Fed ${pokemon.name}!`, 'pokemon');
    
    await sock.sendMessage(dest, { text: `🍎 You fed *${pokemon.name}*! HP: ${pokemon.hp}/${pokemon.maxHp}` }, { quoted: message });
    return true;
  }

  if (command === 'moves') {
    const name = args.join(' ');
    const pokemon = user.pokemon.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!pokemon) {
      await sock.sendMessage(dest, { text: '❌ Pokémon not found!' }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `⚡ *${pokemon.name}'s Moves*\n\n${pokemon.moves.map((m, i) => `${i + 1}. ${m}`).join('\n')}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'battle') {
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentions[0];
    if (!target) {
      await sock.sendMessage(dest, { text: '❌ Mention a user to battle!' }, { quoted: message });
      return true;
    }
    const myPoke = user.pokemon.find(p => p.hp > 0);
    if (!myPoke) {
      await sock.sendMessage(dest, { text: '❌ All your Pokémon fainted! Use `.heal` to restore them.' }, { quoted: message });
      return true;
    }
    const targetUser = await User.findOne({ jid: target });
    const enemyPoke = targetUser?.pokemon?.find(p => p.hp > 0);
    if (!enemyPoke) {
      const wildPoke = getRandom(WILD_POKEMON);
      const myAttack = randomInt(10, 30);
      const enemyAttack = randomInt(8, 25);
      const myWin = myAttack > enemyAttack || Math.random() < 0.5;
      if (myWin) {
        myPoke.level += 1;
        user.addXp(20);
        await user.save();
        
        // ✨ SYNC TO WEBSITE
        await syncUserToWebsite(sender, { pokemon: user.pokemon, level: user.level, xp: user.xp });
        await logActivity(sender, '⚔️', 'Won Battle', `Defeated wild ${wildPoke.name}!`, 'pokemon');
        
        await sock.sendMessage(dest, {
          text: `⚔️ *Battle!*\n\n${myPoke.name} (Lv.${myPoke.level}) vs Wild ${wildPoke.name}\n\n🎉 *${myPoke.name} wins!* +20 XP, Level up!`,
          mentions: [target],
        }, { quoted: message });
      } else {
        myPoke.hp = Math.max(0, myPoke.hp - enemyAttack);
        await user.save();
        
        // ✨ SYNC TO WEBSITE
        await syncUserToWebsite(sender, { pokemon: user.pokemon });
        await logActivity(sender, '⚔️', 'Lost Battle', `Defeated by wild ${wildPoke.name}!`, 'pokemon');
        
        await sock.sendMessage(dest, {
          text: `⚔️ *Battle!*\n\n${myPoke.name} vs Wild ${wildPoke.name}\n\n💔 *${myPoke.name} lost!* HP: ${myPoke.hp}/${myPoke.maxHp}`,
          mentions: [target],
        }, { quoted: message });
      }
      return true;
    }
    const myWin = randomInt(1, 100) > 45;
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '⚔️', 'Pvp Battle', myWin ? `Defeated ${enemyPoke.name}!` : `Lost to ${enemyPoke.name}!`, 'pokemon');
    
    await sock.sendMessage(dest, {
      text: `⚔️ *Pokémon Battle!*\n\n${myPoke.name} (Lv.${myPoke.level}) vs ${enemyPoke.name} (Lv.${enemyPoke.level})\n\n${myWin ? `🎉 *${myPoke.name}* wins!` : `😔 *${enemyPoke.name}* wins!`}`,
      mentions: [target],
    }, { quoted: message });
    return true;
  }

  if (command === 'pokeshop') {
    await sock.sendMessage(dest, {
      text: `🏪 *Poké Shop*\n\n🎾 Poké Ball — $200\n🎾 Great Ball — $500\n🎾 Ultra Ball — $1,200\n\nUse \`.buy Poké Ball\` etc. to purchase!\n\nYour Poké Balls: ${user.pokeBalls || 0}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'gymbattle') {
    const gyms = ['Brock (Rock)', 'Misty (Water)', 'Lt. Surge (Electric)', 'Erika (Grass)', 'Koga (Poison)'];
    const gym = getRandom(gyms);
    const win = Math.random() < 0.5;
    const reward = win ? randomInt(200, 800) : 0;
    if (win && user) { 
      user.wallet = (user.wallet || 0) + reward; 
      await user.save();
      
      // ✨ SYNC TO WEBSITE
      await syncUserToWebsite(sender, { wallet: user.wallet });
      await logActivity(sender, '🏅', 'Won Gym Battle', `Defeated ${gym} and got ${formatMoney(reward)}!`, 'pokemon');
    }
    await sock.sendMessage(dest, {
      text: `🏅 *Gym Battle vs ${gym}!*\n\n${win ? `🎉 *You won!* Earned ${formatMoney(reward)} prize money!` : '😔 *You lost!* Train harder and try again!'}`,
    }, { quoted: message });
    return true;
  }

  if (command === 'revive') {
    user.pokemon.forEach(p => { if (p.hp <= 0) p.hp = Math.floor(p.maxHp / 2); });
    await user.save();
    
    // ✨ SYNC TO WEBSITE
    await syncUserToWebsite(sender, { pokemon: user.pokemon });
    await logActivity(sender, '💊', 'Revived Pokémon', 'Revived fainted Pokémon!', 'pokemon');
    
    await sock.sendMessage(dest, { text: '💊 Fainted Pokémon have been revived to half HP!' }, { quoted: message });
    return true;
  }

  if (command === 'transfer') {
    await sock.sendMessage(dest, { text: '🔄 Pokémon transfer feature coming soon!' }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handlePokemon };
