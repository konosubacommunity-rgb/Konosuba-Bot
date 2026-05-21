require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { connectDB }     = require('./src/database');
const websiteSyncRoutes = require('./src/routes/website-sync');

const app = express();

// ── CORS — accept any Vercel deployment + local dev ───────────────────────────
//
// The old code used a single hardcoded WEBSITE_URL origin, so any Vercel
// preview URL or renamed deployment would be blocked.
// We now allow ALL *.vercel.app subdomains plus any WEBSITE_URL you set.
//
const EXTRA_ORIGIN = process.env.WEBSITE_URL || '';

function isAllowedOrigin(origin) {
  if (!origin) return true;                          // server-to-server / curl
  if (origin === EXTRA_ORIGIN) return true;          // explicit env override
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret', 'x-admin-password'],
}));

app.options('*', cors());
app.use(express.json());

app.use('/api', websiteSyncRoutes);

app.get('/health', (_req, res) => res.json({
  status:    'ok',
  service:   'Konosuba API',
  timestamp: new Date().toISOString(),
}));

const PORT = process.env.PORT || 3001;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`CORS: all *.vercel.app subdomains allowed`);
    if (EXTRA_ORIGIN) console.log(`CORS extra origin: ${EXTRA_ORIGIN}`);
  });
})();
