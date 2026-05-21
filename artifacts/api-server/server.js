const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { connectDB } = require('./src/database');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API routes ──────────────────────────────────────────────────────────────
app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', service: 'konosuba-api' }));
app.use('/api/website', require('./src/routes/website-sync'));
app.use('/api/website', require('./src/routes/admin-migration'));
app.use('/api/website', require('./src/routes/bot-connect'));

// ─── Static frontend serving ─────────────────────────────────────────────────
const websiteDist = path.join(__dirname, '..', 'konosuba-website', 'dist');
const managerDist = path.join(__dirname, '..', 'bot-manager', 'dist');

// Bot Manager at /manager
app.use('/manager', express.static(managerDist));
app.get('/manager', (_req, res) => res.sendFile(path.join(managerDist, 'index.html')));
app.get('/manager/*', (_req, res) => res.sendFile(path.join(managerDist, 'index.html')));

// Website at root
app.use('/', express.static(websiteDist));
app.get('/*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  res.sendFile(path.join(websiteDist, 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Konosuba Platform running on port ${PORT}`);
    console.log(`   Website:     http://localhost:${PORT}/`);
    console.log(`   Bot Manager: http://localhost:${PORT}/manager`);
    console.log(`   API:         http://localhost:${PORT}/api/healthz`);
  });
})();
