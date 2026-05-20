// FILE: src/routes/website-sync.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';
const BOT_SECRET = process.env.BOT_WEBHOOK_SECRET || 'your_bot_secret';

// Middleware
function verifyBotSecret(req, res, next) {
  const secret = req.headers['x-bot-secret'];
  if (secret !== BOT_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid bot secret' });
  }
  next();
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.phone = decoded.phone;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function generateToken(phone) {
  return jwt.sign({ phone }, JWT_SECRET, { expiresIn: '30d' });
}

// Auth Routes
router.post('/auth/signup', async (req, res) => {
  try {
    const { phone, username, password, country } = req.body;
    
    if (!phone || !username || !password) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    
    let user = await User.findOne({ jid: `${phone}@s.whatsapp.net` });
    if (user) {
      return res.status(400).json({ success: false, message: 'User exists' });
    }
    
    user = new User({
      jid: `${phone}@s.whatsapp.net`,
      name: username,
      username: username,
      password: password,
      country: country || 'NG'
    });
    
    await user.save();
    const token = generateToken(phone);
    
    res.status(201).json({
      success: true,
      message: 'User created',
      token,
      user: {
        phone: phone,
        username: user.name,
        level: user.level,
        wallet: user.wallet,
        bank: user.bank,
        xp: user.xp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Missing credentials' });
    }
    
    const user = await User.findOne({ jid: `${phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }
    
    const token = generateToken(phone);
    
    res.json({
      success: true,
      token,
      user: {
        phone: phone,
        username: user.name,
        level: user.level,
        wallet: user.wallet,
        bank: user.bank,
        xp: user.xp,
        streak: user.streak,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Data Routes
router.get('/user/:phone', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      phone: req.params.phone,
      username: user.name,
      level: user.level,
      xp: user.xp,
      wallet: user.wallet,
      bank: user.bank,
      streak: user.streak,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/user/:phone/activity', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      activities: user.activities || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bot Sync Route
router.post('/sync', verifyBotSecret, async (req, res) => {
  try {
    const { phone, updates } = req.body;
    
    if (!phone || !updates) {
      return res.status(400).json({ success: false, message: 'Missing phone or updates' });
    }
    
    const user = await User.findOne({ jid: `${phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    Object.assign(user, updates);
    user.updatedAt = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Updated',
      user: {
        phone: phone,
        wallet: user.wallet,
        level: user.level,
        xp: user.xp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Activity Log Route
router.post('/user/:phone/activity', verifyBotSecret, async (req, res) => {
  try {
    const { icon, title, desc, type } = req.body;
    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.activities) user.activities = [];
    
    user.activities.push({
      icon,
      title,
      desc,
      type,
      timestamp: new Date()
    });
    
    if (user.activities.length > 50) {
      user.activities = user.activities.slice(-50);
    }
    
    await user.save();
    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
