const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BotConfig = require('../models/BotConfig');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || '';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!key || (key !== ADMIN_PASSWORD && (!WEBHOOK_SECRET || key !== WEBHOOK_SECRET))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function userAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── PUBLIC AUTH ─────────────────────────────────────────────────────────────

// POST /api/website/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!password) return res.status(400).json({ error: 'Password required' });

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone) return res.status(400).json({ error: 'Invalid phone number' });

    const user = await User.findByPhone(cleanPhone);

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please use the bot first or register.' });
    }
    if (user.banned) return res.status(403).json({ error: 'Your account is banned.' });

    if (user.password) {
      if (password !== user.password) return res.status(401).json({ error: 'Wrong password' });
    } else {
      // First time logging in with password — set it
      user.password = password;
      await user.save();
    }

    const token = jwt.sign(
      { phone: cleanPhone, jid: user.jid || null, _id: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/website/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    let user = await User.findByPhone(cleanPhone);

    if (user) {
      // Existing user (from bot) — set or verify password
      if (user.password) {
        if (password !== user.password) return res.status(401).json({ error: 'Wrong password. If you already have an account, use Login instead.' });
      } else {
        user.password = password;
      }
      if (name) user.name = name;
      user.registered = true;
      await user.save();
    } else {
      user = new User({
        phone: cleanPhone,
        jid: `${cleanPhone}@s.whatsapp.net`,
        name: name || cleanPhone,
        password,
        registered: true,
      });
      await user.save();
    }

    const token = jwt.sign(
      { phone: cleanPhone, jid: user.jid || null, _id: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/user/me
router.get('/user/me', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(serializeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/user/:phone/profile
router.get('/user/:phone/profile', userAuth, async (req, res) => {
  try {
    const cleanPhone = req.params.phone.replace(/\D/g, '');
    const user = await User.findByPhone(cleanPhone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rank = await User.countDocuments({ wallet: { $gt: user.wallet } }) + 1;
    res.json({ ...serializeUser(user), rank });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/user/:phone/activity
router.get('/user/:phone/activity', userAuth, async (req, res) => {
  try {
    const cleanPhone = req.params.phone.replace(/\D/g, '');
    const user = await User.findByPhone(cleanPhone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activities = (user.activities || [])
      .slice(-20)
      .reverse()
      .map(a => ({
        _id:         a._id,
        icon:        a.icon || '📌',
        title:       a.title || 'Activity',
        description: a.desc || a.description || '',
        type:        a.type || 'general',
        createdAt:   a.timestamp || a.createdAt || new Date(),
      }));

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/user/:phone/inventory
router.get('/user/:phone/inventory', userAuth, async (req, res) => {
  try {
    const cleanPhone = req.params.phone.replace(/\D/g, '');
    const user = await User.findByPhone(cleanPhone);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.inventory || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, {
      jid: 1, lid: 1, phone: 1, name: 1, wallet: 1, bank: 1, level: 1, xp: 1,
    }).sort({ wallet: -1 }).limit(50).lean();

    const result = users.map((u, i) => {
      const netWorth = (u.wallet || 0) + (u.bank || 0);
      const phone = u.phone || (u.jid ? u.jid.split('@')[0] : (u.lid ? u.lid.split('@')[0] : ''));
      return {
        rank:         i + 1,
        name:         u.name || phone,
        phone,
        level:        u.level || 1,
        xp:           u.xp || 0,
        wallet:       u.wallet || 0,
        bank:         u.bank || 0,
        netWorth,
        totalBalance: netWorth,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website/stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } });
    const totalWallet = await User.aggregate([{ $group: { _id: null, total: { $sum: '$wallet' } } }]);
    const bots = await BotConfig.find({}, { name: 1, phone: 1, createdAt: 1 }).lean();

    res.json({
      totalUsers,
      activeUsers,
      totalCoinsInCirculation: totalWallet[0]?.total || 0,
      activeBots: bots.length,
      bots,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search ? String(req.query.search).trim() : '';

    const query = {};
    if (search) {
      const phone = search.replace(/\D/g, '');
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        ...(phone ? [
          { phone: { $regex: `^${phone}` } },
          { jid:   { $regex: `^${phone}` } },
          { lid:   { $regex: `^${phone}` } },
        ] : []),
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      users: users.map(serializeAdminUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/user/:phone', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPhone(req.params.phone.replace(/\D/g, ''));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(serializeAdminUser(user.toObject()));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/admin/edit-user', adminAuth, async (req, res) => {
  try {
    const { phone, wallet, bank, bankLimit, level, xp, isMod, isAdmin, name } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const user = await User.findByPhone(String(phone).replace(/\D/g, ''));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (wallet    !== undefined) user.wallet    = Number(wallet);
    if (bank      !== undefined) user.bank      = Number(bank);
    if (bankLimit !== undefined) user.bankLimit = Number(bankLimit);
    if (level     !== undefined) user.level     = Number(level);
    if (xp        !== undefined) user.xp        = Number(xp);
    if (isMod     !== undefined) user.isMod     = Boolean(isMod);
    if (isAdmin   !== undefined) user.isAdmin   = Boolean(isAdmin);
    if (name      !== undefined) user.name      = String(name);

    await user.save();
    res.json({ success: true, user: serializeAdminUser(user.toObject()) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/ban-user', adminAuth, async (req, res) => {
  try {
    const { phone } = req.body || {};
    const user = await User.findByPhone(String(phone).replace(/\D/g, ''));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.banned = true;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/unban-user', adminAuth, async (req, res) => {
  try {
    const { phone } = req.body || {};
    const user = await User.findByPhone(String(phone).replace(/\D/g, ''));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.banned = false;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/reset-cooldowns', adminAuth, async (req, res) => {
  try {
    const { phone } = req.body || {};
    const user = await User.findByPhone(String(phone).replace(/\D/g, ''));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.cooldowns = new Map();
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/admin/delete-user', adminAuth, async (req, res) => {
  try {
    const phone = ((req.body || {}).phone || req.query.phone || '').replace(/\D/g, '');
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const user = await User.findByPhone(phone);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/wipe-economy', adminAuth, async (req, res) => {
  try {
    await User.updateMany({}, { $set: { wallet: 500, bank: 0, bankLimit: 10000 } });
    res.json({ success: true, message: 'Economy wiped and reset to default values' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/wipe-xp', adminAuth, async (req, res) => {
  try {
    await User.updateMany({}, { $set: { xp: 0, level: 1, rank: 0 } });
    res.json({ success: true, message: 'All XP and levels reset' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/wipe-inventory', adminAuth, async (req, res) => {
  try {
    await User.updateMany({}, { $set: { inventory: [] } });
    res.json({ success: true, message: 'All inventories wiped' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/export-users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, {
      jid: 1, lid: 1, phone: 1, name: 1, wallet: 1, bank: 1, level: 1, xp: 1,
      banned: 1, createdAt: 1, updatedAt: 1,
    }).lean();

    const rows = users.map(u => {
      const phone = u.phone || (u.jid ? u.jid.split('@')[0] : (u.lid ? u.lid.split('@')[0] : ''));
      return [
        phone, u.name || '', u.wallet || 0, u.bank || 0, u.level || 1,
        u.xp || 0, u.banned ? 'yes' : 'no',
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
      ].join(',');
    });

    const csv = ['phone,name,wallet,bank,level,xp,banned,createdAt', ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BOT WEBHOOK ─────────────────────────────────────────────────────────────

router.post('/bot-event', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { event, data } = req.body || {};
  if (!event || !data) return res.status(400).json({ error: 'Missing event or data' });

  try {
    if (event === 'register_bot') {
      const { botId, name, phone, createdAt } = data;
      await BotConfig.findOneAndUpdate(
        { botId },
        { $set: { name, phone, createdAt: createdAt || new Date().toISOString() } },
        { upsert: true }
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function serializeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  const phone = obj.phone ||
    (obj.jid ? obj.jid.split('@')[0] : '') ||
    (obj.lid ? obj.lid.split('@')[0] : '');
  return {
    _id:          obj._id,
    phone,
    name:         obj.name || phone,
    level:        obj.level || 1,
    xp:           obj.xp || 0,
    wallet:       obj.wallet || 0,
    bank:         obj.bank || 0,
    bankLimit:    obj.bankLimit || 10000,
    netWorth:     (obj.wallet || 0) + (obj.bank || 0),
    totalBalance: (obj.wallet || 0) + (obj.bank || 0),
    banned:       obj.banned || false,
    isMod:        obj.isMod || false,
    isAdmin:      obj.isAdmin || false,
    warnings:     obj.warnings || 0,
    joinedAt:     obj.joinedAt || obj.createdAt,
    registered:   obj.registered || false,
  };
}

function serializeAdminUser(obj) {
  const phone = obj.phone ||
    (obj.jid ? obj.jid.split('@')[0] : '') ||
    (obj.lid ? obj.lid.split('@')[0] : '');
  return {
    _id:       obj._id,
    phone,
    jid:       obj.jid,
    lid:       obj.lid,
    name:      obj.name || phone,
    wallet:    obj.wallet || 0,
    bank:      obj.bank || 0,
    bankLimit: obj.bankLimit || 10000,
    netWorth:  (obj.wallet || 0) + (obj.bank || 0),
    level:     obj.level || 1,
    xp:        obj.xp || 0,
    banned:    obj.banned || false,
    isMod:     obj.isMod || false,
    isAdmin:   obj.isAdmin || false,
    warnings:  obj.warnings || 0,
    registered: obj.registered || false,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    inventory: obj.inventory || [],
    cooldowns: obj.cooldowns ? Object.fromEntries(
      obj.cooldowns instanceof Map ? obj.cooldowns : new Map(Object.entries(obj.cooldowns || {}))
    ) : {},
  };
}

module.exports = router;
