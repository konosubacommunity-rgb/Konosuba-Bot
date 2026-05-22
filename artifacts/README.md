# Konosuba WhatsApp Bot Platform

A premium anime-inspired WhatsApp bot management platform with dark fantasy aesthetics.

## Structure

```
/api-server        — Express API (Node.js + MongoDB)
/konosuba-website  — Landing page + user dashboard (React + Vite)
/bot-manager       — Admin control panel (React + Vite)
```

---

## Option A — Deploy on Render as 3 Separate Services (Current Setup)

This is the easiest option on Render's free tier.

### Service 1 — API Server (Web Service)

| Field | Value |
|-------|-------|
| **Root Directory** | `api-server` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |

**Environment variables to set:**

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Long random secret for JWT tokens |
| `ADMIN_PASSWORD` | ✅ | Password for the bot manager panel |
| `OWNER_NUMBERS` | ✅ | Comma-separated phone numbers with country code |
| `BOT_WEBHOOK_SECRET` | optional | Shared secret for bot webhook calls |
| `WEBSITE_URL` | optional | Your API server's Render URL |
| `PREFIX` | optional | Bot command prefix (default: `.`) |

---

### Service 2 — Website (Static Site)

| Field | Value |
|-------|-------|
| **Root Directory** | `konosuba-website` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**Environment variable to set:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your API server URL, e.g. `https://konosuba-api.onrender.com` |

> ⚠️ Without `VITE_API_URL`, all API calls (login, register, stats, etc.) will 404 because they will go to the static site's own domain, which has no API.

---

### Service 3 — Bot Manager (Static Site)

| Field | Value |
|-------|-------|
| **Root Directory** | `bot-manager` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**Environment variables to set:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your API server URL, e.g. `https://konosuba-api.onrender.com` |

> ⚠️ Without `VITE_API_URL`, all bot manager API calls will 404.
>
> Do **NOT** set `VITE_BASE_PATH` for this service — the default `/` is correct for a separate static site.

---

## Option B — Deploy as a Single Web Service (All-in-One)

The API server builds both frontends and serves them as static files.

| Field | Value |
|-------|-------|
| **Root Directory** | *(leave blank — repo root)* |
| **Build Command** | `cd konosuba-website && npm install && npm run build && cd ../bot-manager && npm install && npm run build && cd ../api-server && npm install` |
| **Start Command** | `node api-server/server.js` |

**Additional env var for the bot manager build** (add to Render environment):

| Variable | Value |
|----------|-------|
| `VITE_BASE_PATH` | `/manager/` |

Then your build command becomes:
```
cd konosuba-website && npm install && npm run build && cd ../bot-manager && VITE_BASE_PATH=/manager/ npm install && npm run build && cd ../api-server && npm install
```

**All other environment variables** (same as Option A Service 1):
`MONGO_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, `OWNER_NUMBERS`, `BOT_WEBHOOK_SECRET`, `WEBSITE_URL`, `PREFIX`

> In single-service mode, `VITE_API_URL` is NOT needed — all requests go to the same origin automatically.

---

## URLs

**Option A (Separate Services):**
- Website: `https://your-website.onrender.com/`
- Bot Manager: `https://your-bot-manager.onrender.com/`
- API: `https://your-api.onrender.com/api/`

**Option B (Single Service):**
- Website: `https://your-app.onrender.com/`
- Bot Manager: `https://your-app.onrender.com/manager/`
- API: `https://your-app.onrender.com/api/`

---

## Authentication

- **Website**: Register/login with your WhatsApp phone number and a password.
- **Bot Manager**: Enter your `ADMIN_PASSWORD` to unlock the control panel.

## Bot Integration

Point your Baileys bot to POST to `/api/website/*` with the `x-admin-key` header set to your `ADMIN_PASSWORD` or `BOT_WEBHOOK_SECRET`.
