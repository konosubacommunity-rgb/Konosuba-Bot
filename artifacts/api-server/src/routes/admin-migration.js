const express = require('express');
const User = require('../models/User');

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || '';

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (key !== ADMIN_PASSWORD && key !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── DUPLICATE DETECTION ─────────────────────────────────────────────────────

// GET /api/website/admin/detect-duplicates
// Scans every user, derives their phone from JID, groups by phone,
// and returns groups with more than one record.
router.get('/admin/detect-duplicates', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, {
      jid: 1, lid: 1, phone: 1, name: 1, wallet: 1, bank: 1,
      level: 1, xp: 1, banned: 1, createdAt: 1,
    }).lean();

    const phoneMap = {};
    for (const u of users) {
      let phone = u.phone;
      if (!phone && u.jid && u.jid.includes('@')) {
        phone = u.jid.split('@')[0];
      }
      if (!phone) continue;
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push({ ...u, resolvedPhone: phone });
    }

    const duplicates = Object.entries(phoneMap)
      .filter(([, arr]) => arr.length > 1)
      .map(([phone, arr]) => ({
        phone,
        count: arr.length,
        users: arr.map(u => ({
          _id:       u._id,
          jid:       u.jid || null,
          lid:       u.lid || null,
          phone:     u.resolvedPhone,
          name:      u.name || phone,
          wallet:    u.wallet || 0,
          bank:      u.bank   || 0,
          level:     u.level  || 1,
          xp:        u.xp     || 0,
          banned:    u.banned || false,
          createdAt: u.createdAt,
        })),
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ duplicates, totalGroups: duplicates.length });
  } catch (err) {
    console.error('detect-duplicates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── MERGE ───────────────────────────────────────────────────────────────────

// POST /api/website/admin/merge-users
// Merges secondaryPhone into primaryPhone, preserving the best of all data.
// The secondary record is permanently deleted afterwards.
router.post('/admin/merge-users', adminAuth, async (req, res) => {
  try {
    const { primaryPhone, secondaryPhone } = req.body;
    if (!primaryPhone || !secondaryPhone) {
      return res.status(400).json({ error: 'primaryPhone and secondaryPhone are required' });
    }

    const cleanPrimary   = String(primaryPhone).replace(/\D/g, '');
    const cleanSecondary = String(secondaryPhone).replace(/\D/g, '');

    const primary   = await User.findByPhone(cleanPrimary);
    const secondary = await User.findByPhone(cleanSecondary);

    if (!primary)   return res.status(404).json({ error: 'Primary user not found' });
    if (!secondary) return res.status(404).json({ error: 'Secondary user not found' });
    if (primary._id.equals(secondary._id)) {
      return res.status(400).json({ error: 'Cannot merge a user with themselves' });
    }

    // ── Economy: sum balances ──────────────────────────────────────────────
    primary.wallet    = (primary.wallet    || 0) + (secondary.wallet    || 0);
    primary.bank      = Math.min(
      (primary.bank   || 0) + (secondary.bank    || 0),
      primary.bankLimit || 10000
    );
    // Keep higher bank limit
    if ((secondary.bankLimit || 0) > (primary.bankLimit || 0)) {
      primary.bankLimit = secondary.bankLimit;
    }

    // ── XP / Level: keep best ─────────────────────────────────────────────
    const secNetXp = ((secondary.level || 1) - 1) * 100 + (secondary.xp || 0);
    const priNetXp = ((primary.level   || 1) - 1) * 100 + (primary.xp   || 0);
    if (secNetXp > priNetXp) {
      primary.level = secondary.level;
      primary.xp    = secondary.xp;
    }

    // ── Inventory: merge stacks ────────────────────────────────────────────
    for (const secItem of secondary.inventory || []) {
      const existing = primary.inventory.find(i => i.item === secItem.item);
      if (existing) {
        existing.qty = (existing.qty || 1) + (secItem.qty || 1);
      } else {
        primary.inventory.push({ item: secItem.item, qty: secItem.qty || 1 });
      }
    }

    // ── Achievements: union ────────────────────────────────────────────────
    const achSet = new Set([...(primary.achievements || []), ...(secondary.achievements || [])]);
    primary.achievements = [...achSet];

    // ── Streak: keep longer ────────────────────────────────────────────────
    if ((secondary.streak || 0) > (primary.streak || 0)) {
      primary.streak     = secondary.streak;
      primary.lastStreak = secondary.lastStreak;
    }

    // ── Cooldowns: keep earlier timestamps (more lenient) ─────────────────
    const priCd  = primary.cooldowns   instanceof Map ? primary.cooldowns   : new Map();
    const secCd  = secondary.cooldowns instanceof Map ? secondary.cooldowns : new Map();
    for (const [cmd, ts] of secCd) {
      const priTs = priCd.get(cmd);
      if (!priTs || ts < priTs) priCd.set(cmd, ts);
    }
    primary.cooldowns = priCd;

    // ── Roles: keep highest ────────────────────────────────────────────────
    if (secondary.isMod)   primary.isMod   = true;
    if (secondary.isAdmin) primary.isAdmin = true;

    // ── Join date: keep earliest ────────────────────────────────────────────
    if (secondary.joinedAt && (!primary.joinedAt || secondary.joinedAt < primary.joinedAt)) {
      primary.joinedAt = secondary.joinedAt;
    }

    // ── Activity: merge and deduplicate ────────────────────────────────────
    const combinedActivity = [...(primary.activities || []), ...(secondary.activities || [])]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    primary.activities = combinedActivity;

    // ── Identity: if primary has no JID, borrow from secondary ─────────────
    if (!primary.jid && secondary.jid) primary.jid = secondary.jid;
    if (!primary.lid && secondary.lid) primary.lid = secondary.lid;

    // ── Phone: ensure primary has phone set ────────────────────────────────
    if (!primary.phone && cleanPrimary) primary.phone = cleanPrimary;

    // ── Missions ──────────────────────────────────────────────────────────
    primary.missions = (primary.missions || 0) + (secondary.missions || 0);

    await primary.save();
    await secondary.deleteOne();

    res.json({
      success: true,
      merged: primary._id,
      deleted: secondary._id,
      summary: {
        wallet:       primary.wallet,
        bank:         primary.bank,
        level:        primary.level,
        xp:           primary.xp,
        inventoryItems: primary.inventory.length,
        achievements:   primary.achievements.length,
      },
    });
  } catch (err) {
    console.error('merge-users error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── MIGRATION ────────────────────────────────────────────────────────────────

// POST /api/website/admin/run-migration
// Backfills the `phone` field for every user that has a JID.
// Also detects and reports any phone conflicts it cannot auto-resolve.
router.post('/admin/run-migration', adminAuth, async (req, res) => {
  try {
    const users = await User.find({});
    let normalized = 0;
    let alreadySet = 0;
    let conflicts  = 0;
    let lidOnly    = 0;
    const conflictList = [];

    for (const user of users) {
      let phone = null;
      if (user.jid && user.jid.includes('@')) {
        phone = user.jid.split('@')[0].replace(/\D/g, '');
      }

      // LID-only users can't have their phone extracted — skip them.
      if (!phone) { lidOnly++; continue; }

      if (user.phone === phone) { alreadySet++; continue; }

      // Check if another user already owns this phone
      const conflict = await User.findOne({ phone, _id: { $ne: user._id } });
      if (conflict) {
        conflicts++;
        conflictList.push({ phone, userA: user._id, userB: conflict._id });
        continue;
      }

      user.phone = phone;
      await user.save();
      normalized++;
    }

    res.json({
      success: true,
      normalized,
      alreadySet,
      lidOnly,
      conflicts,
      conflictList: conflictList.slice(0, 100),
      message: conflicts > 0
        ? `${conflicts} phone conflict(s) found — use the Duplicates tab to merge them.`
        : 'Migration complete — no conflicts found.',
    });
  } catch (err) {
    console.error('run-migration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/website/admin/delete-all-users  (nuclear option — requires confirmation header)
router.post('/admin/delete-all-users', adminAuth, async (req, res) => {
  const confirm = req.headers['x-confirm-delete'];
  if (confirm !== 'YES_DELETE_EVERYTHING') {
    return res.status(400).json({ error: 'Send header x-confirm-delete: YES_DELETE_EVERYTHING to confirm' });
  }
  try {
    const result = await User.deleteMany({});
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
