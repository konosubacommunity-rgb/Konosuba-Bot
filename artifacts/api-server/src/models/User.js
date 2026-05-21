const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // ── Canonical identity ──────────────────────────────────────────────────
  // `phone` is the single source of truth for user identity.
  // It is automatically derived from `jid` on save.
  // Unique sparse index: prevents two records sharing the same phone number.
  // `sparse: true` allows multiple null values (e.g. LID-only users without
  // a known phone number).
  phone: { type: String, index: true, sparse: true },

  // WhatsApp JID (@s.whatsapp.net)  — stored for bot lookups
  jid:   { type: String, unique: true, sparse: true },
  // WhatsApp LID (@lid.whatsapp.net) — stored as fallback when JID unavailable
  lid:   { type: String, unique: true, sparse: true },

  name:     { type: String, default: 'Unknown' },
  username: String,
  password: String,
  country:  String,
  accNo:    { type: String, default: () => String(Math.floor(100000 + Math.random() * 900000)) },
  banned:   { type: Boolean, default: false },
  registered: { type: Boolean, default: false },
  joinedAt:   { type: Date, default: Date.now },

  // ── Economy ─────────────────────────────────────────────────────────────
  wallet:    { type: Number, default: 500 },
  bank:      { type: Number, default: 0 },
  bankLimit: { type: Number, default: 10000 },

  // ── Progression ─────────────────────────────────────────────────────────
  level:      { type: Number, default: 1 },
  xp:         { type: Number, default: 0 },
  rank:       { type: Number, default: 0 },
  streak:     { type: Number, default: 0 },
  lastStreak: { type: Date,   default: null },

  // ── Moderation ──────────────────────────────────────────────────────────
  warnings: { type: Number, default: 0 },
  muted:    { type: Boolean, default: false },
  isMod:    { type: Boolean, default: false },
  isAdmin:  { type: Boolean, default: false },

  // ── Collections ─────────────────────────────────────────────────────────
  inventory:    [{ item: String, qty: { type: Number, default: 1 } }],
  achievements: [String],
  missions:     { type: Number, default: 0 },

  // ── Pet ─────────────────────────────────────────────────────────────────
  pet: {
    name:   { type: String, default: null },
    type:   { type: String, default: null },
    level:  { type: Number, default: 1 },
    hunger: { type: Number, default: 100 },
    xp:     { type: Number, default: 0 },
  },

  // ── Pokémon ─────────────────────────────────────────────────────────────
  pokemon: [{
    name:     String,
    level:    { type: Number, default: 1 },
    hp:       Number,
    maxHp:    Number,
    moves:    [String],
    shiny:    { type: Boolean, default: false },
    nickname: String,
  }],
  starter:   { type: Boolean, default: false },
  pokeBalls: { type: Number, default: 5 },
  buddy:     { type: String, default: null },

  // ── RPG ─────────────────────────────────────────────────────────────────
  rpg: {
    class:        { type: String, default: 'Adventurer' },
    hp:           { type: Number, default: 100 },
    maxHp:        { type: Number, default: 100 },
    attack:       { type: Number, default: 10 },
    defense:      { type: Number, default: 5 },
    speed:        { type: Number, default: 8 },
    weapon:       { type: String, default: 'Iron Sword' },
    armor:        { type: String, default: 'Leather Armor' },
    gold:         { type: Number, default: 0 },
    dungeonLevel: { type: Number, default: 1 },
    skills:       [String],
    prestige:     { type: Number, default: 0 },
  },

  guild:     { type: String, default: null },
  cooldowns: { type: Map, of: Date, default: {} },

  quests: [{
    name:      String,
    progress:  Number,
    goal:      Number,
    reward:    Number,
    completed: { type: Boolean, default: false },
  }],

  activities: [{
    icon:      String,
    title:     String,
    desc:      String,
    type:      String,
    timestamp: { type: Date, default: Date.now },
  }],

}, { timestamps: true });

// ── Indexes ─────────────────────────────────────────────────────────────────
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ registered: 1, createdAt: -1 });
userSchema.index({ wallet: -1 });

// ── Pre-save hook: auto-derive `phone` from JID ──────────────────────────────
// This is the key guard against future identity drift. Every time a user
// document is saved, we ensure `phone` reflects the JID.
userSchema.pre('save', function (next) {
  if (this.jid && this.jid.includes('@') && !this.phone) {
    this.phone = this.jid.split('@')[0].replace(/\D/g, '') || null;
  }
  next();
});

// ── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('netWorth').get(function () {
  return (this.wallet || 0) + (this.bank || 0);
});

// ── Static helpers ────────────────────────────────────────────────────────────

/**
 * Find a user by any WhatsApp identifier.
 * Handles @s.whatsapp.net (JID) and @lid.whatsapp.net (LID) transparently.
 */
userSchema.statics.findByWhatsAppId = async function (identifier) {
  if (!identifier) return null;
  const isLid = identifier.includes('@lid');
  return this.findOne(isLid ? { lid: identifier } : { jid: identifier });
};

/**
 * Find a user by their phone number (the canonical identity).
 * Tries the indexed `phone` field first, then falls back to JID pattern,
 * then to LID pattern (for legacy LID-only records).
 */
userSchema.statics.findByPhone = async function (phone) {
  if (!phone) return null;
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone) return null;

  // 1. Try the indexed phone field (fastest)
  let user = await this.findOne({ phone: cleanPhone });
  if (user) return user;

  // 2. Try deriving from JID
  const jid = `${cleanPhone}@s.whatsapp.net`;
  user = await this.findOne({ jid });
  if (user) return user;

  // 3. Fall back to LID prefix match (legacy)
  user = await this.findOne({ lid: { $regex: `^${cleanPhone}` } });
  return user || null;
};

/**
 * Find or create a user by JID. Used by the bot when processing messages.
 * Automatically sets the `phone` field from the JID.
 */
userSchema.statics.findOrCreateByJid = async function (jid, displayName) {
  let user = await this.findOne({ jid });
  if (!user) {
    const phone = jid.includes('@') ? jid.split('@')[0].replace(/\D/g, '') : null;
    // Before creating, check if a user with this phone already exists
    // (could happen if they previously sent a LID message)
    if (phone) {
      user = await this.findOne({ phone });
      if (user) {
        // Link the JID to the existing account instead of creating a duplicate
        user.jid = jid;
        await user.save();
        return user;
      }
    }
    user = new this({ jid, phone, name: displayName || phone || jid.split('@')[0] });
    await user.save();
  }
  return user;
};

// ── Instance helpers ──────────────────────────────────────────────────────────

userSchema.methods.addXp = function (amount) {
  this.xp += amount;
  const needed = (this.level || 1) * 100;
  if (this.xp >= needed) {
    this.level += 1;
    this.xp -= needed;
    return true;
  }
  return false;
};

userSchema.methods.isOnCooldown = function (command) {
  const cd = this.cooldowns.get(command);
  if (!cd) return false;
  const config = require('../config');
  const ms = config.COOLDOWNS[command] || 0;
  return Date.now() < cd.getTime() + ms;
};

userSchema.methods.getCooldownLeft = function (command) {
  const cd = this.cooldowns.get(command);
  if (!cd) return 0;
  const config = require('../config');
  const ms = config.COOLDOWNS[command] || 0;
  const left = (cd.getTime() + ms) - Date.now();
  return left > 0 ? left : 0;
};

userSchema.methods.setCooldown = function (command) {
  this.cooldowns.set(command, new Date());
};

module.exports = mongoose.model('User', userSchema);
