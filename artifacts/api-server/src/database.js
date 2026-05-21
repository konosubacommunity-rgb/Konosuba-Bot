const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGO_URI || config.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI environment variable is not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
