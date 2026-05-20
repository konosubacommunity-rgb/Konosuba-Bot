// FILE: src/routes/website-sync.js
// ─────────────────────────────────────────────────────────────────────────────
//  HOW SYNC WORKS
//  ─────────────
//  The phone number is the shared key between WhatsApp and the website.
//
//  Bot side:  stores every user as  jid = "234xxxxxxxx@s.whatsapp.net"
//  Web side:  signs up / logs in with the bare phone number "234xxxxxxxx"
//
//  Both sides read and write the SAME MongoDB User document.
//  There is no separate "website database" — it's one collection.
//
//  Flow:
//    1. User types .reg in WhatsApp → bot replies with the website link + their number
//    2. User opens website, signs up with that exact phone number
//       → website finds / creates the doc at jid = phone@s.whatsapp.net
//       → sets registered=true, username, password, and gives $43 000 welcome bonus
//    3. User goes back to WhatsApp and plays normally
//       → every wallet/bank/xp/level change happens in the same doc
//    4. Website dashboard polls /api/user/:phone every 5 s → always shows live data
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const jwt     = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET        || 'CHANGE_THIS_SECRET_IN_ENV';
const BOT_SECRET = process.env.BOT_WEBHOOK_SECRET || 'CHANGE_THIS_BOT_SECRET_IN_ENV';

// ── middleware ────────────────────────────────────────────────────────────────

function verifyBotSecret(req, res, next) {
  if (req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid bot secret' });
  }
  next();
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.phone = decoded.phone;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function generateToken(phone) {
  return jwt.sign({ phone }, JWT_SECRET, { expiresIn: '30d' });
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
//
//  Creates a new account OR upgrades an existing bot-only account so the same
//  phone number works on both WhatsApp and the website.
//
router.post('/auth/signup', async (req, res) => {
  try {
    const { phone, username, password, country } = req.body;

    if (!phone || !username || !password) {
      return res.status(400).json({ success: false, message: 'Phone, username and password are required' });
    }

    const jid = `${phone}@s.whatsapp.net`;
    let user  = await User.findOne({ jid });

    if (user) {
      // ── Case A: user document already exists (bot auto-created it when they
      //           first messaged the bot).  We UPGRADE it instead of rejecting.
      if (user.password) {
        // They already completed website registration — send them to login
        return res.status(400).json({
          success: false,
          message: 'This number is already registered. Please log in instead.',
        });
      }

      // Upgrade: attach website credentials and mark as registered
      user.username   = username;
      user.name       = username;
      user.password   = password;
      user.country    = country || 'NG';
      user.registered = true;

      // Only give the welcome bonus if they haven't earned much yet
      if (user.wallet <= 500) {
        user.wallet = 43000;
      }

      await user.save();

    } else {
      // ── Case B: brand new user — create from scratch
      user = new User({
        jid,
        name:       username,
        username,
        password,
        country:    country || 'NG',
        registered: true,
        wallet:     43000,   // welcome bonus
      });
      await user.save();
    }

    const token = generateToken(phone);

    return res.status(201).json({
      success: true,
      message: 'Account created! Your WhatsApp activity is now synced.',
      token,
      user: {
        phone,
        username:  user.name,
        level:     user.level,
        wallet:    user.wallet,
        bank:      user.bank,
        xp:        user.xp,
        registered: user.registered,
      },
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }

    const user = await User.findOne({ jid: `${phone}@s.whatsapp.net` });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found for this number. Please sign up first.' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This number has not been registered on the website yet. Please sign up.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const token = generateToken(phone);

    return res.json({
      success: true,
      token,
      user: {
        phone,
        username:   user.name,
        level:      user.level,
        wallet:     user.wallet,
        bank:       user.bank,
        xp:         user.xp,
        streak:     user.streak,
        registered: user.registered,
        createdAt:  user.createdAt,
      },
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/user/:phone ──────────────────────────────────────────────────────
//  Returns live user data (wallet, bank, level, xp, streak …)
//  The website dashboard polls this every 5 s — that is how sync works.
//
router.get('/user/:phone', verifyToken, async (req, res) => {
  try {
    if (req.phone !== req.params.phone) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      phone:      req.params.phone,
      username:   user.name,
      level:      user.level,
      xp:         user.xp,
      wallet:     user.wallet,
      bank:       user.bank,
      streak:     user.streak,
      registered: user.registered,
      accNo:      user.accNo,
      country:    user.country,
      createdAt:  user.createdAt,
      updatedAt:  user.updatedAt,
    });

  } catch (err) {
    console.error('Get user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/user/:phone/activity ─────────────────────────────────────────────
router.get('/user/:phone/activity', verifyToken, async (req, res) => {
  try {
    if (req.phone !== req.params.phone) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ activities: user.activities || [] });

  } catch (err) {
    console.error('Activity fetch error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/sync  (bot → MongoDB, called internally by bot command handlers)
//  Allows bot command files to push a field update without importing the model
//  directly (useful if you split files).  Protected by BOT_WEBHOOK_SECRET.
//
router.post('/sync', verifyBotSecret, async (req, res) => {
  try {
    const { phone, updates } = req.body;

    if (!phone || !updates) {
      return res.status(400).json({ success: false, message: 'phone and updates are required' });
    }

    const user = await User.findOneAndUpdate(
      { jid: `${phone}@s.whatsapp.net` },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Synced',
      user: { phone, wallet: user.wallet, level: user.level, xp: user.xp },
    });

  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/user/:phone/activity  (bot → MongoDB)
//  Bot command handlers call this to append an entry to the activity feed.
//
router.post('/user/:phone/activity', verifyBotSecret, async (req, res) => {
  try {
    const { icon, title, desc, type } = req.body;

    const user = await User.findOne({ jid: `${req.params.phone}@s.whatsapp.net` });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.activities) user.activities = [];

    user.activities.push({ icon, title, desc, type, timestamp: new Date() });

    // Keep only the latest 50 entries
    if (user.activities.length > 50) {
      user.activities = user.activities.slice(-50);
    }

    await user.save();
    return res.json({ success: true, message: 'Activity logged' });

  } catch (err) {
    console.error('Activity log error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
