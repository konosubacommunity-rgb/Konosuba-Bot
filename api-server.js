require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { connectDB }       = require('./src/database');
const websiteSyncRoutes   = require('./src/routes/website-sync');

const app = express();

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://konosubaweb.vercel.app';

app.use(cors({
  origin: [
    WEBSITE_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
  ],
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-secret'],
}));

app.options('*', cors());
app.use(express.json());

app.use('/api', websiteSyncRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Konosuba API' }));

const PORT = process.env.PORT || 3001;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`CORS enabled for: ${WEBSITE_URL}`);
  });
})();
