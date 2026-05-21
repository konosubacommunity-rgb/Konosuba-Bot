# Konosuba WhatsApp Bot Platform

A premium anime-inspired WhatsApp bot management platform with dark fantasy aesthetics.

## Structure

```
/api-server      — Express API (Node.js + MongoDB)
/konosuba-website — Landing page + user dashboard (React + Vite)
/bot-manager     — Admin control panel (React + Vite)
```

## Deploy on Render — Recommended (Single Web Service)

Deploy everything as **one** Render Web Service — the API server builds both frontends and serves them as static files.

### In the Render Dashboard → New Web Service:

| Field | Value |
|-------|-------|
| **Root Directory** | *(leave blank — repo root)* |
| **Build Command** | `cd konosuba-website && npm install && npm run build && cd ../bot-manager && npm install && npm run build && cd ../api-server && npm install` |
| **Start Command** | `node api-server/server.js` |

### Environment Variables to set:
| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas URI |
| `JWT_SECRET` | Long random secret for JWT signing |
| `ADMIN_PASSWORD` | Password for admin panel |
| `BOT_WEBHOOK_SECRET` | Optional webhook secret |

---

## Deploy on Render — Separate Services (3 services)

If you prefer separate services, set `VITE_API_URL` on each frontend.

### Service 1 — API Server (Web Service)
- Root: `api-server`
- Build: `npm install`
- Start: `node server.js`

### Service 2 — Website (Static Site)
- Root: `konosuba-website`
- Build: `npm install && npm run build`
- Publish dir: `dist`
- **Environment var**: `VITE_API_URL=https://your-api-server.onrender.com`

### Service 3 — Bot Manager (Static Site)
- Root: `bot-manager`
- Build: `npm install && npm run build`
- Publish dir: `dist`
- **Environment var**: `VITE_API_URL=https://your-api-server.onrender.com`

> The `_redirects` file in each frontend's `public/` folder handles SPA routing on Render static sites automatically.

---

## Routes
- `/` — Landing page
- `/auth` — Login / Register  
- `/dashboard` — User dashboard (requires login)
- `/manager` — Admin bot manager (requires admin key)
- `/api/*` — REST API

## Bot Integration
Point your Baileys bot to POST user data to `/api/website/*` with `x-admin-key` header set to your `BOT_WEBHOOK_SECRET`.
