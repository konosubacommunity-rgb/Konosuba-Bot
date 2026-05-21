const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const jwt     = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET        || 'CHANGE_THIS_SECRET_IN_ENV';
const BOT_SECRET     = process.env.BOT_WEBHOOK_SECRET || 'CHANGE_THIS_BOT_SECRET_IN_ENV';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD    || 'konosuba_admin';

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

// Normalize any phone/JID/LID string to a clean phone number
function normalizePhone(input) {
  if (!input) return null;
  // Strip @s.whatsapp.net or @lid.whatsapp.net or @g.us
  let clean = String(input).split('@')[0];
  // Strip all non-digit characters
  clean = clean.replace(/\D/g, '');
  return clean || null;
}

// Build a canonical JID from a phone number
function phoneToJid(phone) {
  const clean = normalizePhone(phone);
  return clean ? `${clean}@s.whatsapp.net` : null;
}

// Find a user by any identifier: phone number, JID, or LID
async function findUserByPhone(input) {
  if (!input) return null;
  const phone = normalizePhone(input);
  if (!phone) return null;
  const jid = phoneToJid(phone);

  // Try exact JID match first (fastest)
  let user = await User.findOne({ jid });
  if (user) return user;

  // Try LID match (WhatsApp sometimes uses LID format)
  user = await User.findOne({ lid: new RegExp(`^${phone}`) });
  if (user) return user;

  return null;
}

// Serialize user document to API response shape
function serializeUser(user, phone) {
  const p = phone || (user.jid ? user.jid.split('@')[0] : null);
  return {
    phone:        p,
    username:     user.username || user.name || 'Adventurer',
    name:         user.name || user.username || 'Adventurer',
    country:      user.country || '',
    level:        user.level   || 1,
    xp:           user.xp      || 0,
    xpNeeded:     (user.level || 1) * 100,
    wallet:       user.wallet  || 0,
    bank:         user.bank    || 0,
    totalBalance: (user.wallet || 0) + (user.bank || 0),
    bankLimit:    user.bankLimit || 10000,
    health:       user.rpg?.hp    || 100,
    maxHealth:    user.rpg?.maxHp || 100,
    class:        user.rpg?.class || 'Adventurer',
    streak:       user.streak      || 0,
    dailyStreak:  user.streak      || 0,
    lastStreak:   user.lastStreak  || null,
    rank:         user.rank        || 0,
    banned:       user.banned      || false,
    registered:   user.registered  || false,
    accNo:        user.accNo       || '',
    isMod:        user.isMod       || false,
    isAdmin:      user.isAdmin     || false,
    achievements: user.achievements || [],
    missions:     user.missions    || 0,
    inventory:    user.inventory   || [],
    pokemon:      user.pokemon     || [],
    pokeBalls:    user.pokeBalls   || 5,
    buddy:        user.buddy       || null,
    pet:          user.pet         || {},
    rpg:          user.rpg         || {},
    guild:        user.guild       || null,
    quests:       user.quests      || [],
    stats: {
      fishCaught:      0,
      itemsDug:        0,
      monstersKilled:  0,
      pokemonCaught:   (user.pokemon || []).length,
      timesGambled:    0,
      totalGambleWon:  0,
    },
    joinedDate:   user.createdAt,
    createdAt:    user.createdAt,
    updatedAt:    user.updatedAt,
  };
}

// ── POST /api/admin/auth ───────────────────────────────────────────────────────
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
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    const jid = phoneToJid(cleanPhone);
    let user = await User.findOne({ jid });

    if (user) {
      if (user.password) {
        return res.status(400).json({ success: false, message: 'This number is already registered. Please log in instead.' });
      }
      // Claim a bot-created user record
      user.username   = username;
      user.name       = username;
      user.password   = password;
      user.country    = country || 'NG';
      user.registered = true;
      if (user.wallet <= 500) user.wallet = 43000;
      await user.save();
    } else {
      user = new User({ jid, name: username, username, password, country: country || 'NG', registered: true, wallet: 43000 });
      await user.save();
    }

    const token = generateToken(cleanPhone);
    return res.status(201).json({
      success: true,
      message: 'Account created! Your WhatsApp activity is now synced.',
      token,
      user: serializeUser(user, cleanPhone),
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
    if (!phone || !password) return res.status(400).json({ success: false, message: 'Phone and password are required' });
    const cleanPhone = normalizePhone(phone);
    const user = await findUserByPhone(cleanPhone);
    if (!user) return res.status(401).json({ success: false, message: 'No account found for this number. Please sign up first.' });
    if (!user.password) return res.status(401).json({ success: false, message: 'This number has not been registered on the website yet. Please sign up.' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Incorrect password' });
    const token = generateToken(cleanPhone);
    return res.json({
      success: true,
      token,
      user: serializeUser(user, cleanPhone),
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/user/:phone ──────────────────────────────────────────────────────
router.get('/user/:phone', verifyToken, async (req, res) => {
  try {
    const reqPhone  = normalizePhone(req.phone);
    const paramPhone = normalizePhone(req.params.phone);
    if (reqPhone !== paramPhone) return res.status(403).json({ success: false, message: 'Forbidden' });
    const user = await findUserByPhone(paramPhone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json(serializeUser(user, paramPhone));
  } catch (err) {
    console.error('Get user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/user/:phone/activity ─────────────────────────────────────────────
router.get('/user/:phone/activity', verifyToken, async (req, res) => {
  try {
    const reqPhone   = normalizePhone(req.phone);
    const paramPhone = normalizePhone(req.params.phone);
    if (reqPhone !== paramPhone) return res.status(403).json({ success: false, message: 'Forbidden' });
    const user = await findUserByPhone(paramPhone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Normalize activity fields for frontend
    const activities = (user.activities || []).slice().reverse().slice(0, 20).map(a => ({
      _id:         a._id,
      type:        a.type || 'activity',
      description: a.desc || a.description || a.title || a.type || 'Activity',
      title:       a.title || a.type,
      icon:        a.icon  || '⚡',
      amount:      a.amount != null ? a.amount : undefined,
      createdAt:   a.timestamp || a.createdAt,
    }));
    return res.json({ activities });
  } catch (err) {
    console.error('Get activity error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/user/:phone ──────────────────────────────────────────────────────
router.put('/user/:phone', verifyBotSecret, async (req, res) => {
  try {
    const { wallet, bank, level, xp, streak, inventory, pokemon, rpg, activities } = req.body;
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
    if (activities && Array.isArray(activities)) {
      if (!user.activities) user.activities = [];
      user.activities.push(...activities);
      if (user.activities.length > 50) user.activities = user.activities.slice(-50);
    }
    await user.save();
    return res.json({ success: true, message: 'User updated' });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/user/:phone/activity ────────────────────────────────────────────
router.post('/user/:phone/activity', verifyBotSecret, async (req, res) => {
  try {
    const { icon, title, desc, type, amount } = req.body;
    const user = await findUserByPhone(req.params.phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.activities) user.activities = [];
    user.activities.push({ icon, title, desc, type, amount, timestamp: new Date() });
    if (user.activities.length > 50) user.activities = user.activities.slice(-50);
    await user.save();
    return res.json({ success: true, message: 'Activity logged' });
  } catch (err) {
    console.error('Activity log error:', err.message);
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
        const phone = u.jid ? u.jid.split('@')[0] : (u.lid ? u.lid.split('@')[0] : 'unknown');
        return {
          rank:         i + 1,
          username:     u.username || u.name || 'Unknown',
          level:        u.level,
          xp:           u.xp,
          wallet:       u.wallet,
          bank:         u.bank,
          netWorth:     (u.wallet || 0) + (u.bank || 0),
          totalBalance: (u.wallet || 0) + (u.bank || 0),
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
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      const s = req.query.search.replace(/\D/g, '');
      if (s) query.jid = new RegExp(s);
    }
    if (req.query.banned === 'true') query.banned = true;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('jid lid name username wallet bank level xp streak registered banned createdAt updatedAt rpg guild achievements'),
      User.countDocuments(query),
    ]);

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      users: users.map(u => {
        const phone = u.jid ? u.jid.split('@')[0] : (u.lid ? u.lid.split('@')[0] : 'unknown');
        return {
          phone,
          name:         u.name,
          username:     u.username,
          wallet:       u.wallet,
          bank:         u.bank,
          totalBalance: (u.wallet || 0) + (u.bank || 0),
          level:        u.level,
          xp:           u.xp,
          streak:       u.streak,
          class:        u.rpg?.class || 'Adventurer',
          guild:        u.guild,
          registered:   u.registered,
          banned:       u.banned,
          achievements: (u.achievements || []).length,
          createdAt:    u.createdAt,
          updatedAt:    u.updatedAt,
        };
      }),
    });
  } catch (err) {
    console.error('List users error:', err.message);
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
    const userPhone = user.jid ? user.jid.split('@')[0] : (user.lid ? user.lid.split('@')[0] : 'unknown');
    return res.json({ success: true, user: serializeUser(user, userPhone) });
  } catch (err) {
    console.error('Search user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/ban-user ───────────────────────────────────────────────────
router.post('/admin/ban-user', verifyAdminPassword, async (req, res) => {
  try {
    const { phone, banned } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.banned = banned !== false;
    await user.save();
    const userPhone = user.jid ? user.jid.split('@')[0] : phone;
    return res.json({ success: true, message: `User ${userPhone} has been ${user.banned ? 'banned' : 'unbanned'}.` });
  } catch (err) {
    console.error('Ban user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/edit-user ─────────────────────────────────────────────────
router.post('/admin/edit-user', verifyAdminPassword, async (req, res) => {
  try {
    const { phone, wallet, bank, level, xp, streak } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (wallet !== undefined && !isNaN(Number(wallet))) user.wallet = Number(wallet);
    if (bank   !== undefined && !isNaN(Number(bank)))   user.bank   = Number(bank);
    if (level  !== undefined && !isNaN(Number(level)))  user.level  = Number(level);
    if (xp     !== undefined && !isNaN(Number(xp)))     user.xp     = Number(xp);
    if (streak !== undefined && !isNaN(Number(streak))) user.streak = Number(streak);
    await user.save();
    return res.json({ success: true, message: 'User updated', user: serializeUser(user, phone) });
  } catch (err) {
    console.error('Edit user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/reset-cooldowns ──────────────────────────────────────────
router.post('/admin/reset-cooldowns', verifyAdminPassword, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.cooldowns = new Map();
    await user.save();
    return res.json({ success: true, message: 'Cooldowns reset for ' + phone });
  } catch (err) {
    console.error('Reset cooldowns error:', err.message);
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
    user.wallet = 500; user.bank = 0; user.bankLimit = 10000; user.level = 1; user.xp = 0;
    user.rank = 0; user.streak = 0; user.lastStreak = null; user.warnings = 0;
    user.inventory = []; user.achievements = []; user.missions = 0; user.pokemon = [];
    user.starter = false; user.pokeBalls = 5; user.buddy = null; user.cooldowns = new Map();
    user.quests = []; user.activities = []; user.guild = null;
    user.rpg = { class: 'Adventurer', hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 8, weapon: 'Iron Sword', armor: 'Leather Armor', gold: 0, dungeonLevel: 1, skills: [], prestige: 0 };
    user.pet = { name: null, type: null, level: 1, hunger: 100, xp: 0 };
    await user.save();
    const userPhone = user.jid ? user.jid.split('@')[0] : phone;
    return res.json({ success: true, message: `Stats for ${user.name} (${userPhone}) have been reset.` });
  } catch (err) {
    console.error('Reset user error:', err.message);
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
    return res.json({ success: true, message: `User ${phone} has been permanently deleted.` });
  } catch (err) {
    console.error('Delete user error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/reset-users ───────────────────────────────────────────────
router.post('/admin/reset-users', verifyAdminPassword, async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'YES_DELETE_ALL_DATA') {
    return res.status(400).json({ success: false, message: 'Confirmation required. Send confirm: "YES_DELETE_ALL_DATA"' });
  }
  try {
    const result = await User.deleteMany({});
    return res.json({ success: true, message: `Deleted ${result.deletedCount} user(s).` });
  } catch (err) {
    console.error('Reset users error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/admin/merge-users ───────────────────────────────────────────────
router.post('/admin/merge-users', verifyAdminPassword, async (req, res) => {
  try {
    const { sourcePhone, targetPhone } = req.body;
    if (!sourcePhone || !targetPhone) {
      return res.status(400).json({ success: false, message: 'sourcePhone and targetPhone are required' });
    }
    const source = await findUserByPhone(sourcePhone);
    const target = await findUserByPhone(targetPhone);
    if (!source) return res.status(404).json({ success: false, message: 'Source user not found' });
    if (!target) return res.status(404).json({ success: false, message: 'Target user not found' });

    // Merge balances (take higher value)
    target.wallet    = Math.max(target.wallet, source.wallet);
    target.bank      = Math.max(target.bank, source.bank);
    target.bankLimit = Math.max(target.bankLimit, source.bankLimit);
    // Merge progression
    target.level = Math.max(target.level, source.level);
    target.xp    = Math.max(target.xp, source.xp);
    target.rank  = Math.max(target.rank, source.rank);
    target.streak = Math.max(target.streak, source.streak);
    // Merge inventory (concat unique items)
    const existingItems = new Set(target.inventory.map(i => i.item));
    for (const item of source.inventory) {
      if (!existingItems.has(item.item)) { target.inventory.push(item); existingItems.add(item.item); }
      else {
        const t = target.inventory.find(i => i.item === item.item);
        if (t) t.qty = (t.qty || 1) + (item.qty || 1);
      }
    }
    // Merge pokemon
    target.pokemon.push(...source.pokemon);
    target.pokeBalls = Math.max(target.pokeBalls, source.pokeBalls);
    // Merge achievements
    const existingAchievements = new Set(target.achievements);
    for (const a of source.achievements) existingAchievements.add(a);
    target.achievements = [...existingAchievements];
    // Merge activities
    if (!target.activities) target.activities = [];
    target.activities.push(...(source.activities || []));
    if (target.activities.length > 50) target.activities = target.activities.slice(-50);
    // RPG: keep higher level
    if ((source.rpg?.dungeonLevel || 0) > (target.rpg?.dungeonLevel || 0)) target.rpg = source.rpg;

    await target.save();
    await User.deleteOne({ _id: source._id });
    return res.json({ success: true, message: `Merged ${sourcePhone} into ${targetPhone}. Source account deleted.` });
  } catch (err) {
    console.error('Merge users error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
module.exports.normalizePhone = normalizePhone;
module.exports.phoneToJid     = phoneToJid;
module.exports.findUserByPhone = findUserByPhone;
