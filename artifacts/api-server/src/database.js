const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGO_URI || config.MONGO_URI;
  if (!uri) {
    console.warn('⚠️  MONGO_URI is not set — server starting without database. Set MONGO_URI in Replit Secrets to enable full functionality.');
    return;
  }
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚠️  Server starting without database connection.');
  }
}

module.exports = { connectDB };
