const express = require('express');
const cors    = require('cors');
const { connectDB } = require('./src/database');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', service: 'konosuba-api' }));

// Public + user auth routes
app.use('/api/website', require('./src/routes/website-sync'));

// Admin-only migration + duplicate management routes
app.use('/api/website', require('./src/routes/admin-migration'));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ API Server running on port ${PORT}`);
  });
})();
