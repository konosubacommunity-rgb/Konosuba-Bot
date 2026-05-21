# KonoBot — Render Deployment

Two standalone React + Vite frontends. Deploy each as a separate **Static Site** on Render.

## Structure
```
konosuba-website/   → Main landing page + user dashboard
bot-manager/        → Admin control panel (protected by admin key)
```

## Deploy Steps (each folder = one Render Static Site)

1. **Push to GitHub** (or upload zip to Render directly)
2. On Render → New → Static Site → connect repo
3. For `konosuba-website`:
   - Root directory: `konosuba-website`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
4. For `bot-manager`:
   - Root directory: `bot-manager`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`

## Environment Variables

These frontends are static SPAs — no required env vars for the frontend itself.
They call `/api/*` endpoints — point those to your backend API server URL by
updating `src/lib/api.ts` in each app:

```ts
// konosuba-website/src/lib/api.ts
const BASE = "https://your-api.onrender.com/api";

// bot-manager/src/lib/api.ts
const BASE = "https://your-api.onrender.com/api/admin";
```

## Local Development

```bash
# konosuba-website
cd konosuba-website && npm install && npm run dev

# bot-manager
cd bot-manager && npm install && npm run dev
```

## Stack
- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Wouter (client-side routing)
- Poppins + Cinzel fonts (Google Fonts)
- Custom CSS design system (dark #0B0D12, cyan #4EFFFF, gold #ffd700)

## Bot Manager Login
The admin panel is protected by an admin key stored in localStorage.
Enter any key (min 4 chars) in the demo — hook up your backend `/api/admin/verify` to validate real keys.
