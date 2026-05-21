// FILE: src/routes/website-sync.js
// ─────────────────────────────────────────────────────────────────────────────
//  All routes are mounted at /api (see api-server.js / index.js).
//  Users are always identified by phone number → JID = phone@s.whatsapp.net.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const jwt     = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET        || 'CHANGE_THIS_SECRET_IN_ENV';
const BOT_SECRET     = process.env.BOT_WEBHOOK_SECRET || 'CHANGE_THIS_BOT_SECRET_IN_ENV';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD     || 'konosuba_admin';

// ── middleware ────────────────────────────────────────────────────────────────

function verifyBotSecret(req, res, next) {
  if (req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid bot secret' });
  }
  next();
}

function verifyAdminPassword(req, res, next) {
  const pw = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: 'Invalid admin password' });
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

// ── Helper: find user by bare phone number (JID-first, LID fallback) ─────────
async function findUserByPhone(phone) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const jid        = `${cleanPhone}@s.whatsapp.net`;

  let user = await User.findOne({ jid });
  if (!user) {
    // Edge-case: very old record stored with @lid before JID was known
    user = await User.findOne({ lid: { $regex: `^${cleanPhone}` } });
  }
  return user;
}

// ── POST /api/admin/auth ──────────────────────────────────────────────────────
router.post('/admin/auth', (req, res) => {
  const pw = req.body?.password;
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: 'Wrong password' });
  }
  return res.json({ success: true });
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/auth/signup', async (req, res) => {
  try {
    const { phone, username, password, country } = req.body;
    if (!phone || !username || !password) {
      return res.status(400).json({ success: false, message: 'Phone, username and password are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const jid        = `${cleanPhone}@s.whatsapp.net`;
    let user         = await User.findOne({ jid });

    if (user) {
      if (user.password) {
        return res.status(400).json({
          success: false,
          message: 'This number is already registered. Please log in instead.',
        });
      }
      // Upgrade existing bot user with website credentials
      user.username   = username;
      user.name       = username;
      user.password   = password;
      user.country    = country || 'NG';
      user.registered = true;
      if (!user.wallet || user.wallet <= 500) user.wallet = 43000;
      await user.save();
    } else {
      user = new User({
        jid,
        name:       username,
        username,
        password,
        country:    country || 'NG',
        registered: true,
        wallet:     43000,
      });
      await user.save();
    }

    const token = generateToken(cleanPhone);
    return res.status(201).json({
      success: true,
      message: 'Account created! Your WhatsApp activity is now synced.',
      token,
      user: {
        phone:      cleanPhone,
        username:   user.name,
        level:      user.level,
        wallet:     user.wallet,
        bank:       user.bank,
        xp:         user.xp,
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

    const cleanPhone = phone.replace(/\D/g, '');
    const user       = await findUserByPhone(cleanPhone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found for this number. Please sign up first.',
      });
    }
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This number has not been registered on the website yet. Please sign up.',
      });
    }
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const token = generateToken(cleanPhone);
    return res.json({
      success: true,
      token,
      user: {
        phone:      cleanPhone,
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
// Returns ALL user data needed by the dashboard — stats + game data.
// This is the main endpoint the website polls every 4 seconds.
//
router.get('/user/:phone', verifyToken, async (req, res) => {
  try {
    if (req.phone !== req.params.phone) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const user = await findUserByPhone(req.params.phone);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      // Identity
      phone:      req.params.phone,
      username:   user.username || user.name,
      name:       user.name,
      country:    user.country,
      accNo:      user.accNo,
      registered: user.registered,
      createdAt:  user.createdAt,
      updatedAt:  user.updatedAt,

      // Economy
      wallet:    user.wallet    ?? 0,
      bank:      user.bank      ?? 0,
      bankLimit: user.bankLimit ?? 10000,
      streak:    user.streak    ?? 0,

      // Progression
      level: user.level ?? 1,
      xp:    user.xp    ?? 0,

      // Game data — these are what the Deck / Inventory / Pokémon tabs need
      rpg: user.rpg ?? {
        class: 'Adventurer', hp: 100, maxHp: 100,
        attack: 10, defense: 5, speed: 8,
        weapon: 'Iron Sword', armor: 'Leather Armor',
        gold: 0, dungeonLevel: 1, skills: [], prestige: 0,
      },
      inventory:    user.inventory    ?? [],
      pokemon:      user.pokemon      ?? [],
      pet:          user.pet          ?? null,
      guild:        user.guild        ?? null,
      achievements: user.achievements ?? [],
      pokeBalls:    user.pokeBalls    ?? 5,
      buddy:        user.buddy        ?? null,
    });
  } catch (err) {
    console.error('Get user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/user/:phone/activity ─────────────────────────────────────────────
// Returns the 20 most recent activities, newest first.
//
router.get('/user/:phone/activity', verifyToken, async (req, res) => {
  try {
    if (req.phone !== req.params.phone) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const user = await findUserByPhone(req.params.phone);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return newest-first (the client must NOT reverse this again)
    const activities = (user.activities || [])
      .slice()
      .reverse()
      .slice(0, 20);

    return res.json({ activities });
  } catch (err) {
    console.error('Get activity error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/user/:phone/activity (bot → MongoDB) ────────────────────────────
router.post('/user/:phone/activity', verifyBotSecret, async (req, res) => {
  try {
    const { icon, title, desc, type } = req.body;
    const user = await findUserByPhone(req.params.phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.activities) user.activities = [];
    user.activities.push({ icon, title, desc, type, timestamp: new Date() });
    if (user.activities.length > 50) user.activities = user.activities.slice(-50);

    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('Activity log error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/user/:phone (bot → MongoDB) ──────────────────────────────────────
router.put('/user/:phone', verifyBotSecret, async (req, res) => {
  try {
    const { wallet, bank, level, xp, streak, inventory, pokemon, rpg, pet, activities } = req.body;
    const user = await findUserByPhone(req.params.phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (wallet    !== undefined) user.wallet    = wallet;
    if (bank      !== undefined) user.bank      = bank;
    if (level     !== undefined) user.level     = level;
    if (xp        !== undefined) user.xp        = xp;
    if (streak    !== undefined) user.streak    = streak;
    if (inventory !== undefined) user.inventory = inventory;
    if (pokemon   !== undefined) user.pokemon   = pokemon;
    if (rpg       !== undefined) user.rpg       = rpg;
    if (pet       !== undefined) user.pet       = pet;

    if (Array.isArray(activities)) {
      if (!user.activities) user.activities = [];
      user.activities.push(...activities);
      if (user.activities.length > 50) user.activities = user.activities.slice(-50);
    }

    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ registered: true })
      .sort({ wallet: -1 })
      .limit(20)
      .select('name username wallet bank level xp jid lid');

    return res.json({
      users: users.map((u, i) => {
        const phone = u.jid ? u.jid.split('@')[0] : u.lid?.split('@')[0] || 'unknown';
        return {
          rank:     i + 1,
          username: u.username || u.name || 'Unknown',
          level:    u.level    ?? 1,
          xp:       u.xp       ?? 0,
          wallet:   u.wallet   ?? 0,
          bank:     u.bank     ?? 0,
          netWorth: (u.wallet || 0) + (u.bank || 0),
          phone,
        };
      }),
    });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/admin/users', verifyAdminPassword, async (req, res) => {
  try {
    const users = await User.find({ registered: true })
      .select('jid lid name username wallet bank level xp registered banned createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        phone:      u.jid ? u.jid.split('@')[0] : u.lid?.split('@')[0] || 'unknown',
        name:       u.name,
        username:   u.username,
        wallet:     u.wallet,
        bank:       u.bank,
        level:      u.level,
        xp:         u.xp,
        registered: u.registered,
        banned:     u.banned,
        createdAt:  u.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/users/search ───────────────────────────────────────────────
router.get('/admin/users/search', verifyAdminPassword, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'phone query param required' });

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const userPhone = user.jid ? user.jid.split('@')[0] : user.lid?.split('@')[0] || 'unknown';
    return res.json({
      success: true,
      user: {
        phone:      userPhone,
        name:       user.name,
        username:   user.username,
        wallet:     user.wallet,
        bank:       user.bank,
        level:      user.level,
        xp:         user.xp,
        streak:     user.streak,
        registered: user.registered,
        banned:     user.banned,
        createdAt:  user.createdAt,
        updatedAt:  user.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/reset-user ────────────────────────────────────────────────
router.post('/admin/reset-user', verifyAdminPassword, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.wallet       = 500;    user.bank         = 0;
    user.bankLimit    = 10000;  user.level        = 1;
    user.xp           = 0;      user.rank         = 0;
    user.streak       = 0;      user.lastStreak   = null;
    user.warnings     = 0;      user.inventory    = [];
    user.achievements = [];     user.missions     = 0;
    user.pokemon      = [];     user.starter      = false;
    user.pokeBalls    = 5;      user.buddy        = null;
    user.cooldowns    = new Map();
    user.quests       = [];     user.activities   = [];
    user.guild        = null;
    user.rpg = {
      class: 'Adventurer', hp: 100, maxHp: 100, attack: 10,
      defense: 5, speed: 8, weapon: 'Iron Sword', armor: 'Leather Armor',
      gold: 0, dungeonLevel: 1, skills: [], prestige: 0,
    };
    user.pet = { name: null, type: null, level: 1, hunger: 100, xp: 0 };
    await user.save();

    return res.json({
      success: true,
      message: `Stats for ${user.name} reset. Account and password intact.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/admin/delete-user ─────────────────────────────────────────────
router.delete('/admin/delete-user', verifyAdminPassword, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.deleteOne({ _id: user._id });
    return res.json({ success: true, message: `User ${phone} permanently deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/reset-all-data ────────────────────────────────────────────
// NOTE: route is '/admin/reset-all-data' not '/api/admin/...' — the router
// is already mounted at /api so the full path is /api/admin/reset-all-data.
//
router.post('/admin/reset-all-data', verifyAdminPassword, async (req, res) => {
  try {
    if (req.body?.confirm !== 'YES_DELETE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Send confirm: "YES_DELETE_ALL_DATA" in request body.',
      });
    }
    const result = await User.deleteMany({});
    console.warn(`⚠️  ADMIN RESET: Deleted ${result.deletedCount} user(s)`);
    return res.json({
      success: true,
      message: `Deleted ${result.deletedCount} user(s). All users must sign up again.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
