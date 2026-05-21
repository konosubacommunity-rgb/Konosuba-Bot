# Konosuba Bot — Render Deployment Package

Three services, each in its own folder:

| Folder             | Type          | Purpose                  |
|--------------------|---------------|--------------------------|
| api-server/        | Node.js       | REST API + MongoDB       |
| konosuba-website/  | Static (Vite) | Player-facing website    |
| bot-manager/       | Static (Vite) | Admin panel              |

## Deploy to Render

### Option A — Blueprint (recommended)
1. Push this folder to a GitHub repo.
2. In Render, click "New → Blueprint" and point to the repo.
3. Render reads `render.yaml` and creates all 3 services automatically.
4. Set the secret env vars (MONGO_URI, JWT_SECRET, ADMIN_PASSWORD, BOT_WEBHOOK_SECRET) in the Render dashboard.

### Option B — Manual
Deploy each folder as a separate Render service:

**api-server** → Web Service → Node
- Build: `npm install`
- Start: `node server.js`
- Env vars: see `api-server/.env.example`

**konosuba-website** → Static Site
- Build: `npm install && npm run build`
- Publish dir: `dist`

**bot-manager** → Static Site
- Build: `npm install && npm run build`
- Publish dir: `dist`

## Bot Manager Login
Enter your ADMIN_PASSWORD when the Bot Manager asks for a key.

## Identity / Duplicate Fix
After first deployment, open the Bot Manager → Migration tab → Run Migration.
Then check the Duplicates tab and merge any conflicts.
