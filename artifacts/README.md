# KonoBot — Full Stack WhatsApp Bot Platform

  Complete Render-ready deployment: WhatsApp bot backend + user website + admin panel.

  ---

  ## Structure
  ```
  api-server/          → WhatsApp bot (Baileys) + Express API
    server.js          → Main entry, bot logic, message routing
    src/commands/      → 11 command modules (general, economy, gambling, fun,
                           games, pokemon, rpg, guild, admin, interactions, downloader)
    src/models/        → Mongoose models (User, Group, Guild, BotConfig, BotSession)
    src/routes/        → website-sync.js (auth, user, admin REST endpoints)
    src/utils/         → helpers.js, mongoAuthState.js (MongoDB session store)
    src/config.js      → Bot config (prefix, cooldowns, economy rates)
    src/database.js    → MongoDB connection

  konosuba-website/    → Main landing page + auth + user dashboard (React + Vite)
  bot-manager/         → Admin control panel (React + Vite)
  ```

  ---

  ## Deploy on Render

  ### Option A — render.yaml (recommended)
  1. Push this folder to a **GitHub repo**
  2. Render Dashboard → **New** → **Blueprint** → connect the repo
  3. Render reads `render.yaml` and creates all 3 services automatically

  ### Option B — Manual (one service at a time)
  Create each service separately as shown below.

  ---

  ## Service Setup

  ### 1. API Server (Web Service — Node)
  | Setting | Value |
  |---|---|
  | Root Directory | `api-server` |
  | Build Command | `npm install` |
  | Start Command | `npm start` |
  | Node Version | 18+ |

  **Required environment variables:**
  | Variable | Description |
  |---|---|
  | `MONGO_URI` | MongoDB Atlas connection string |
  | `JWT_SECRET` | Any long random string (e.g. 64-char hex) |
  | `BOT_WEBHOOK_SECRET` | Secret key for bot→website API calls |
  | `ADMIN_PASSWORD` | Password for bot manager admin panel |
  | `OWNER_NUMBERS` | Comma-separated WhatsApp numbers (no +), e.g. `2348012345678` |
  | `WEBSITE_URL` | URL of your konosuba-website on Render |

  ### 2. KonoSuba Website (Static Site)
  | Setting | Value |
  |---|---|
  | Root Directory | `konosuba-website` |
  | Build Command | `npm install && npm run build` |
  | Publish Directory | `dist` |

  **Environment variable:**
  | Variable | Value |
  |---|---|
  | `VITE_BOT_API_URL` | Your API server URL, e.g. `https://konosuba-api-server.onrender.com` |

  ### 3. Bot Manager (Static Site)
  | Setting | Value |
  |---|---|
  | Root Directory | `bot-manager` |
  | Build Command | `npm install && npm run build` |
  | Publish Directory | `dist` |

  **Environment variable:**
  | Variable | Value |
  |---|---|
  | `VITE_BOT_API_URL` | Same API server URL as above |

  ---

  ## How the System Works

  ```
  WhatsApp ──► Baileys (api-server) ──► MongoDB
                    │
                    ▼
              Express REST API
              /api/auth/*          ← website signup/login
              /api/user/:phone     ← live stats sync
              /api/admin/*         ← bot manager panel
  ```

  **Website-first registration:** Users must sign up on the website before 
  using bot commands. The bot checks MongoDB for a registered user on every 
  command. Stats (wallet, bank, level, XP) sync live between WhatsApp and dashboard.

  ---

  ## Commands (prefix: `.`)

  | Module | Commands |
  |---|---|
  | General | .menu, .help, .ping, .info, .profile, .register, .top, .invite |
  | Economy | .daily, .weekly, .work, .beg, .wallet, .bank, .deposit, .withdraw, .transfer, .pay, .fish, .dig, .hunt, .rob |
  | Gambling | .slots, .coinflip, .blackjack, .roulette, .dice, .crash, .bet, .highlow |
  | Fun | .meme, .joke, .quote, .8ball, .ship, .roast, .compliment, .truth, .dare |
  | Games | .trivia, .guess, .wordgame, .riddle |
  | Pokemon | .pokemon, .catch, .pokedex, .party, .release, .battle |
  | RPG | .quest, .attack, .defend, .loot, .inventory, .equip, .stats |
  | Guild | .gcreate, .gjoin, .gleave, .ginfo, .gtop, .gwar |
  | Admin | .kick, .mute, .unmute, .ban, .warn, .antilink, .welcome, .goodbye |
  | Interactions | .hug, .pat, .slap, .kiss, .poke |
  | Downloader | .yt, .tiktok, .ig |

  ---

  ## MongoDB Atlas Setup
  1. Create free cluster at https://cloud.mongodb.com
  2. Add database user + allow all IPs (0.0.0.0/0)
  3. Copy connection string → set as `MONGO_URI` env var

  ## Local Development
  ```bash
  # Backend
  cd api-server && npm install
  MONGO_URI=... JWT_SECRET=... npm start

  # Website
  cd konosuba-website && npm install
  VITE_BOT_API_URL=http://localhost:8080 npm run dev

  # Bot Manager
  cd bot-manager && npm install
  VITE_BOT_API_URL=http://localhost:8080 npm run dev
  ```
  