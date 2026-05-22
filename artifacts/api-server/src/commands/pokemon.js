const User  = require('../models/User');
const { randomInt, getRandom, formatMoney } = require('../utils/helpers');
const { syncUserToWebsite, logActivity }    = require('../utils/websiteSync');

// ─── PokéAPI helpers ─────────────────────────────────────────────────────────

const POKE_CACHE = new Map();   // cache { name/id -> pokeData } to avoid rate-limit

async function fetchPoke(nameOrId) {
  const key = String(nameOrId).toLowerCase();
  if (POKE_CACHE.has(key)) return POKE_CACHE.get(key);
  try {
    const res  = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
    if (!res.ok) return null;
    const data = await res.json();
    const info = {
      id:     data.id,
      name:   data.name,
      types:  data.types.map(t => capitalize(t.type.name)).join('/'),
      hp:     data.stats.find(s => s.stat.name === 'hp')?.base_stat || 45,
      attack: data.stats.find(s => s.stat.name === 'attack')?.base_stat || 50,
      defense:data.stats.find(s => s.stat.name === 'defense')?.base_stat || 45,
      speed:  data.stats.find(s => s.stat.name === 'speed')?.base_stat || 45,
      weight: (data.weight / 10).toFixed(1),   // kg
      height: (data.height / 10).toFixed(1),   // m
      moves:  data.moves.slice(0, 4).map(m => capitalize(m.move.name.replace(/-/g, ' '))),
      // Official artwork — high-res (up to 475×475 PNG, upscaled by WhatsApp on display)
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`,
      // Animated sprite fallback (smaller)
      spriteUrl: data.sprites.front_default,
    };
    POKE_CACHE.set(key, info);
    return info;
  } catch { return null; }
}

async function downloadPokeImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab  = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch { return null; }
}

function capitalize(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Wild Pokémon pool (PokéAPI IDs 1-151 gen-1) ─────────────────────────────

const WILD_IDS = [
  16, 19, 23, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54,
  56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90,
  92, 96, 98, 100, 102, 104, 107, 109, 111, 113, 114, 115, 116, 118,
  120, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
  137, 138, 140, 147, 150, 151,
];

const STARTER_IDS = [1, 4, 7, 25];   // Bulbasaur, Charmander, Squirtle, Pikachu

const EVOLUTIONS = {
  bulbasaur: 'ivysaur',   ivysaur: 'venusaur',
  charmander:'charmeleon',charmeleon:'charizard',
  squirtle:  'wartortle', wartortle:'blastoise',
  caterpie:  'metapod',   metapod:'butterfree',
  eevee:     'vaporeon',  magikarp:'gyarados',
  pikachu:   'raichu',
};

async function handlePokemon(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;

  const pokemonCmds = [
    'pokemon', 'party', 'pc', 'starter', 'catch', 'hunt',
    'battle', 'gymbattle', 'heal', 'revive', 'evolve',
    'transfer', 'release', 'rename', 'buddy', 'feed', 'train',
    'moves', 'team', 'pokeshop', 'pokedex',
  ];
  if (!pokemonCmds.includes(command)) return false;

  // FIX: use findOrCreateByJid instead of findOne({jid}) + new User
  const user = await User.findOrCreateByJid(sender, message.pushName);
  if (user.banned) {
    await sock.sendMessage(dest, { text: '*🚫 Access Denied*' }, { quoted: message });
    return true;
  }

  // ── .starter ───────────────────────────────────────────────────────────────
  if (command === 'starter') {
    if (user.starter) {
      await sock.sendMessage(dest, { text: '❌ You already have a starter! Use `.party` to see your Pokémon.' }, { quoted: message });
      return true;
    }

    const idx = args[0] ? parseInt(args[0]) - 1 : -1;

    if (idx >= 0 && idx < STARTER_IDS.length) {
      const pokeId   = STARTER_IDS[idx];
      const poke     = await fetchPoke(pokeId);
      if (!poke) { await sock.sendMessage(dest, { text: '❌ PokéAPI unavailable. Try again.' }, { quoted: message }); return true; }

      const shiny = Math.random() < 0.01;
      user.starter = true;
      user.pokemon.push({
        name:   capitalize(poke.name),
        level:  5,
        hp:     poke.hp,
        maxHp:  poke.hp,
        moves:  poke.moves,
        shiny,
        pokeId: poke.id,
      });
      await user.save();
      await syncUserToWebsite(sender, { starter: true, pokemon: user.pokemon });
      await logActivity(sender, '🌟', 'Starter Pokémon', `Chose ${capitalize(poke.name)}!`, 'pokemon');

      const img = await downloadPokeImage(poke.imageUrl);
      const caption = `🌟 *You chose ${shiny ? '✨ Shiny ' : ''}${capitalize(poke.name)}!*\n\n🏷️ Type: ${poke.types}\n❤️ HP: ${poke.hp}\n⚔️ Atk: ${poke.attack} | 🛡️ Def: ${poke.defense}\n⚡ Speed: ${poke.speed}\n📐 ${poke.height}m / ${poke.weight}kg\n\n🎯 Moves: ${poke.moves.join(', ')}\n\nUse \`.party\` to see your team!`;
      if (img) {
        await sock.sendMessage(dest, { image: img, caption }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: caption }, { quoted: message });
      }
    } else {
      // Show starter list with images
      const starters = await Promise.all(STARTER_IDS.map(id => fetchPoke(id)));
      const list = starters.map((p, i) => `*${i + 1}.* ${p ? capitalize(p.name) + ` (${p.types})` : '?'}`).join('\n');
      await sock.sendMessage(dest, {
        text: `🌟 *Choose your starter Pokémon:*\n\n${list}\n\nUse: \`.starter <number>\``,
      }, { quoted: message });
    }
    return true;
  }

  // ── .party / .team ─────────────────────────────────────────────────────────
  if (command === 'party' || command === 'team') {
    if (!user.pokemon.length) {
      await sock.sendMessage(dest, { text: '❌ No Pokémon! Use `.starter` to choose one.' }, { quoted: message });
      return true;
    }
    const list = user.pokemon.slice(0, 6).map((p, i) =>
      `${i + 1}. ${p.shiny ? '✨ ' : ''}*${p.nickname || p.name}* Lv.${p.level} — HP: ${p.hp}/${p.maxHp}`
    ).join('\n');
    await sock.sendMessage(dest, { text: `🐾 *${user.name}'s Party*\n\n${list}` }, { quoted: message });
    return true;
  }

  // ── .pokedex / .pc ─────────────────────────────────────────────────────────
  if (command === 'pokedex' || command === 'pc') {
    const query = args.join(' ');
    if (!query) {
      const count = user.pokemon.length;
      await sock.sendMessage(dest, { text: `📖 *Pokédex*\n\nYou've caught *${count}* Pokémon.\n\nUse \`.pokedex <name>\` to look up any Pokémon.` }, { quoted: message });
      return true;
    }
    const poke = await fetchPoke(query.toLowerCase().replace(/\s+/g, '-'));
    if (!poke) { await sock.sendMessage(dest, { text: `❌ Pokémon "*${query}*" not found.` }, { quoted: message }); return true; }
    const img = await downloadPokeImage(poke.imageUrl);
    const text = `📖 *#${poke.id} ${capitalize(poke.name)}*\n\n🏷️ Type: ${poke.types}\n❤️ HP: ${poke.hp}\n⚔️ Atk: ${poke.attack}\n🛡️ Def: ${poke.defense}\n⚡ Speed: ${poke.speed}\n📐 Height: ${poke.height}m | Weight: ${poke.weight}kg\n\n🎯 Moves: ${poke.moves.join(', ')}`;
    if (img) {
      await sock.sendMessage(dest, { image: img, caption: text }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text }, { quoted: message });
    }
    return true;
  }

  // ── .catch / .hunt ─────────────────────────────────────────────────────────
  if (command === 'catch' || command === 'hunt') {
    if (!user.starter) {
      await sock.sendMessage(dest, { text: '❌ Choose a starter first with `.starter`!' }, { quoted: message });
      return true;
    }
    if (!user.pokeBalls) {
      await sock.sendMessage(dest, { text: '❌ No Poké Balls! Buy more with `.pokeshop`.' }, { quoted: message });
      return true;
    }

    const wildId  = getRandom(WILD_IDS);
    const poke    = await fetchPoke(wildId);
    if (!poke) { await sock.sendMessage(dest, { text: '❌ PokéAPI unavailable. Try again.' }, { quoted: message }); return true; }

    user.pokeBalls--;
    const caught = Math.random() < 0.35;
    const shiny  = Math.random() < 0.005;

    const img = await downloadPokeImage(poke.imageUrl);

    if (caught) {
      user.pokemon.push({
        name:   capitalize(poke.name),
        level:  randomInt(2, 20),
        hp:     poke.hp,
        maxHp:  poke.hp,
        moves:  poke.moves,
        shiny,
        pokeId: poke.id,
      });
      await user.save();
      await syncUserToWebsite(sender, { pokemon: user.pokemon, pokeBalls: user.pokeBalls });
      await logActivity(sender, '🎉', 'Caught Pokémon', `Caught ${shiny ? '✨ Shiny ' : ''}${capitalize(poke.name)}!`, 'pokemon');

      const caption = `🎉 *Caught ${shiny ? '✨ Shiny ' : ''}${capitalize(poke.name)}!*\n\n🏷️ Type: ${poke.types}\n❤️ HP: ${poke.hp}\n⚔️ Atk: ${poke.attack} | ⚡ Spd: ${poke.speed}\n\n🎯 Moves: ${poke.moves.join(', ')}\n🎒 Poké Balls left: ${user.pokeBalls}`;
      if (img) {
        await sock.sendMessage(dest, { image: img, caption }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: caption }, { quoted: message });
      }
    } else {
      await user.save();
      const caption = `💨 *A wild ${capitalize(poke.name)} appeared but escaped!*\n\n🏷️ Type: ${poke.types}\n🎒 Poké Balls left: ${user.pokeBalls}`;
      if (img) {
        await sock.sendMessage(dest, { image: img, caption }, { quoted: message });
      } else {
        await sock.sendMessage(dest, { text: caption }, { quoted: message });
      }
    }
    return true;
  }

  // ── .heal / .revive ────────────────────────────────────────────────────────
  if (command === 'heal' || command === 'revive') {
    user.pokemon.forEach(p => { p.hp = p.maxHp; });
    await user.save();
    await sock.sendMessage(dest, { text: '💊 *All Pokémon healed to full HP!*' }, { quoted: message });
    return true;
  }

  // ── .evolve ────────────────────────────────────────────────────────────────
  if (command === 'evolve') {
    const name    = args.join(' ');
    if (!name) { await sock.sendMessage(dest, { text: '❌ Usage: `.evolve <pokemon name>`' }, { quoted: message }); return true; }
    const pokemon = user.pokemon.find(p => (p.nickname || p.name).toLowerCase() === name.toLowerCase());
    if (!pokemon) { await sock.sendMessage(dest, { text: `❌ You don't have a ${name}!` }, { quoted: message }); return true; }
    if (pokemon.level < 16) { await sock.sendMessage(dest, { text: `❌ ${pokemon.name} needs to be Level 16+ to evolve!` }, { quoted: message }); return true; }

    const evoName = EVOLUTIONS[pokemon.name.toLowerCase()];
    if (!evoName) { await sock.sendMessage(dest, { text: `❌ ${pokemon.name} can't evolve!` }, { quoted: message }); return true; }

    const evoPoke  = await fetchPoke(evoName);
    const oldName  = pokemon.name;

    pokemon.name   = evoPoke ? capitalize(evoPoke.name) : capitalize(evoName);
    pokemon.maxHp  = evoPoke ? evoPoke.hp : Math.floor(pokemon.maxHp * 1.2);
    pokemon.hp     = pokemon.maxHp;
    if (evoPoke) { pokemon.moves = evoPoke.moves; pokemon.pokeId = evoPoke.id; }

    await user.save();
    await syncUserToWebsite(sender, { pokemon: user.pokemon });

    const img     = evoPoke ? await downloadPokeImage(evoPoke.imageUrl) : null;
    const caption = `🌟 *${oldName} evolved into ${pokemon.name}!*\n\n${evoPoke ? `🏷️ Type: ${evoPoke.types}\n❤️ HP: ${evoPoke.hp}\n⚔️ Atk: ${evoPoke.attack} | 🛡️ Def: ${evoPoke.defense}` : `💪 HP increased to ${pokemon.maxHp}!`}`;
    if (img) {
      await sock.sendMessage(dest, { image: img, caption }, { quoted: message });
    } else {
      await sock.sendMessage(dest, { text: caption }, { quoted: message });
    }
    return true;
  }

  // ── .battle ────────────────────────────────────────────────────────────────
  if (command === 'battle') {
    if (!user.pokemon.length) { await sock.sendMessage(dest, { text: '❌ You have no Pokémon to battle with!' }, { quoted: message }); return true; }
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;
    const mentions     = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const targetJid    = quotedSender || mentions[0];

    // Wild battle if no target
    const wildId  = getRandom(WILD_IDS);
    const wild    = await fetchPoke(wildId);
    if (!wild) { await sock.sendMessage(dest, { text: '❌ PokéAPI unavailable.' }, { quoted: message }); return true; }

    const myPoke  = user.pokemon[0];
    const myAtk   = 10 + myPoke.level * 2 + randomInt(1, 10);
    const wildAtk = wild.attack + randomInt(1, 15);
    const win     = myAtk > wildAtk;

    if (win) {
      const xpGain = Math.floor(wild.hp / 2);
      myPoke.level += Math.random() < 0.3 ? 1 : 0;
      user.addXp(xpGain);
      await user.save();
      await syncUserToWebsite(sender, { pokemon: user.pokemon, xp: user.xp, level: user.level });
      await sock.sendMessage(dest, {
        text: `⚔️ *${myPoke.name} vs ${capitalize(wild.name)}!*\n\n🗡️ Your attack: ${myAtk}\n👾 Wild attack: ${wildAtk}\n\n🏆 *${myPoke.name} wins!*\n+${xpGain} XP`,
      }, { quoted: message });
    } else {
      myPoke.hp = Math.max(0, myPoke.hp - Math.floor(wild.attack / 2));
      await user.save();
      await sock.sendMessage(dest, {
        text: `⚔️ *${myPoke.name} vs ${capitalize(wild.name)}!*\n\n🗡️ Your attack: ${myAtk}\n👾 Wild attack: ${wildAtk}\n\n💀 *${myPoke.name} lost!*\nHP: ${myPoke.hp}/${myPoke.maxHp}\nUse \`.heal\` to recover!`,
      }, { quoted: message });
    }
    return true;
  }

  // ── .moves ─────────────────────────────────────────────────────────────────
  if (command === 'moves') {
    const name    = args.join(' ');
    const pokemon = name ? user.pokemon.find(p => (p.nickname || p.name).toLowerCase() === name.toLowerCase()) : user.pokemon[0];
    if (!pokemon) { await sock.sendMessage(dest, { text: '❌ Pokémon not found in your party.' }, { quoted: message }); return true; }
    await sock.sendMessage(dest, {
      text: `🎯 *${pokemon.nickname || pokemon.name}'s Moves*\n\n${pokemon.moves.join('\n• ')}`,
    }, { quoted: message });
    return true;
  }

  // ── .rename ────────────────────────────────────────────────────────────────
  if (command === 'rename') {
    const [pokeName, ...nickParts] = args;
    const nick    = nickParts.join(' ');
    if (!pokeName || !nick) { await sock.sendMessage(dest, { text: '❌ Usage: `.rename <pokemon> <nickname>`' }, { quoted: message }); return true; }
    const pokemon = user.pokemon.find(p => (p.nickname || p.name).toLowerCase() === pokeName.toLowerCase());
    if (!pokemon) { await sock.sendMessage(dest, { text: `❌ You don't have "${pokeName}".` }, { quoted: message }); return true; }
    const old = pokemon.nickname || pokemon.name;
    pokemon.nickname = nick;
    await user.save();
    await sock.sendMessage(dest, { text: `✅ Renamed *${old}* to *${nick}*!` }, { quoted: message });
    return true;
  }

  // ── .release ───────────────────────────────────────────────────────────────
  if (command === 'release') {
    const name    = args.join(' ');
    if (!name) { await sock.sendMessage(dest, { text: '❌ Usage: `.release <pokemon name>`' }, { quoted: message }); return true; }
    const idx     = user.pokemon.findIndex(p => (p.nickname || p.name).toLowerCase() === name.toLowerCase());
    if (idx === -1) { await sock.sendMessage(dest, { text: `❌ You don't have "${name}".` }, { quoted: message }); return true; }
    const [released] = user.pokemon.splice(idx, 1);
    await user.save();
    await sock.sendMessage(dest, { text: `👋 *${released.nickname || released.name} was released!* Goodbye, friend!` }, { quoted: message });
    return true;
  }

  // ── .pokeshop ──────────────────────────────────────────────────────────────
  if (command === 'pokeshop') {
    await sock.sendMessage(dest, {
      text: `🏪 *Pokéshop*\n\n🎒 Poké Ball ×10 — $500\n🔵 Great Ball ×10 — $1,000\n💊 Health Pack — $300 (full heal)\n\nTo buy, use:\n\`.buy pokeball\` / \`.buy greatball\` / \`.buy healthpack\`\n\n🎒 Poké Balls you have: *${user.pokeBalls || 0}*`,
    }, { quoted: message });
    return true;
  }

  // ── .pokemon (help) ────────────────────────────────────────────────────────
  if (command === 'pokemon') {
    await sock.sendMessage(dest, {
      text: `🐾 *Pokémon Commands*\n\n• \`.starter\` — Choose your starter\n• \`.party\` — See your team\n• \`.catch\` — Catch a wild Pokémon\n• \`.heal\` — Heal all Pokémon\n• \`.evolve <name>\` — Evolve a Pokémon\n• \`.battle\` — Battle a wild Pokémon\n• \`.pokedex <name>\` — Look up any Pokémon\n• \`.moves <name>\` — See a Pokémon's moves\n• \`.rename <pokemon> <nick>\` — Rename a Pokémon\n• \`.release <name>\` — Release a Pokémon\n• \`.pokeshop\` — Buy items`,
    }, { quoted: message });
    return true;
  }

  return true;
}

module.exports = { handlePokemon };
