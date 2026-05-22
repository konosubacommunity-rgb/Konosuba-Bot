# Konosuba Bot — Patch Notes

## Identity Fixes (Critical)
- `User.findOrCreateByJid()` — all bot commands now use this instead of `findOne({jid})`
- `User.findByWhatsAppId()` — used for target lookups (reply/mention)
- `User.findByPhone()` — used in web routes
- LID users (`@lid.whatsapp.net`) are now handled correctly in all 11 command modules

## Dashboard.tsx — Infinite Loading Bug FIXED
- Root cause: `serializeUser()` returned empty phone for LID users → `if (!phone) return` never cleared loading state
- Fix: `setLoading(false)` is now called even when phone is missing, with a friendly error message

## Bot Management (Manager.tsx)
- **Restart** button on each bot card (with confirmation dialog)
- **Stop** button on each bot card (with confirmation dialog)
- **Logs** button (📋) opens a modal with scrollable, colour-coded log output
- Status badge now shows: Online / Reconnecting / Pending / Stopped / Error / Offline
- api.ts: added `restartBot()`, `stopBot()`, `getBotLogs()` methods

## New Bot Routes (bot-connect.js)
- `POST /api/website/admin/bots/:botId/restart` — restarts the Baileys session
- `POST /api/website/admin/bots/:botId/stop` — disconnects and marks as stopped
- `GET /api/website/admin/bots/:botId/logs` — returns last 200 log lines

## Pokémon — PokéAPI Integration
- `fetchPoke(name|id)` — hits `https://pokeapi.co/api/v2/pokemon/{id}` for real stats
- Official artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- Images downloaded as Buffer and sent via `sock.sendMessage` (WhatsApp renders at full size)
- In-memory `POKE_CACHE` (Map) prevents repeated API calls
- Added `.pokedex <name>` command to look up any Pokémon
- `.catch` / `.hunt` now draws from gen-1 wild pool (WILD_IDS array) with real data
- `.evolve` fetches the evolved form's stats from PokéAPI
- `.battle` uses real attack/HP values from PokéAPI
- `.moves`, `.rename`, `.release` commands added

## Commands Added/Fixed
- All 11 modules: `admin`, `general`, `economy`, `gambling`, `rpg`, `guild`, `pokemon`, `fun`, `games`, `interactions`, `downloader`
- Central `bot/handler.js` — routes messages to all command modules

## Environment Variables
- `WEBSITE_URL` — no longer hardcoded. Set to your Render URL.
- `OWNER_NUMBERS` — comma-separated, no spaces, with country code
- `ADMIN_PASSWORD` — default `kono.suba001`
