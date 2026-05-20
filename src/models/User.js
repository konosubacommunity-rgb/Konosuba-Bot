const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // PRIMARY IDENTIFIERS - Both JID and LID are stored to handle WhatsApp's addressing modes
  jid: { type: String, required: true, unique: true, sparse: true },  // phone@s.whatsapp.net
  lid: { type: String, unique: true, sparse: true },                  // xxx@lid (WhatsApp v6+)
  
  name: { type: String, default: 'Unknown' },
  username: String,
  password: String,
  country: String,
  accNo: { type: String, default: () => String(Math.floor(100000 + Math.random() * 900000)) },
  banned: { type: Boolean, default: false },
  registered: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },

  wallet: { type: Number, default: 500 },
  bank: { type: Number, default: 0 },
  bankLimit: { type: Number, default: 10000 },

  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastStreak: { type: Date, default: null },

  warnings: { type: Number, default: 0 },
  muted: { type: Boolean, default: false },

  inventory: [{ item: String, qty: { type: Number, default: 1 } }],
  achievements: [String],
  missions: { type: Number, default: 0 },

  pet: {
    name: { type: String, default: null },
    type: { type: String, default: null },
    level: { type: Number, default: 1 },
    hunger: { type: Number, default: 100 },
    xp: { type: Number, default: 0 },
  },

  pokemon: [{
    name: String,
    level: { type: Number, default: 1 },
    hp: Number,
    maxHp: Number,
    moves: [String],
    shiny: { type: Boolean, default: false },
    nickname: String,
  }],
  starter: { type: Boolean, default: false },
  pokeBalls: { type: Number, default: 5 },
  buddy: { type: String, default: null },

  rpg: {
    class: { type: String, default: 'Adventurer' },
    hp: { type: Number, default: 100 },
    maxHp: { type: Number, default: 100 },
    attack: { type: Number, default: 10 },
    defense: { type: Number, default: 5 },
    speed: { type: Number, default: 8 },
    weapon: { type: String, default: 'Iron Sword' },
    armor: { type: String, default: 'Leather Armor' },
    gold: { type: Number, default: 0 },
    dungeonLevel: { type: Number, default: 1 },
    skills: [String],
    prestige: { type: Number, default: 0 },
  },

  guild: { type: String, default: null },

  cooldowns: {
    type: Map,
    of: Date,
    default: {},
  },

  quests: [{
    name: String,
    progress: Number,
    goal: Number,
    reward: Number,
    completed: { type: Boolean, default: false },
  }],

  activities: [{
    icon: String,
    title: String,
    desc: String,
    type: String,
    timestamp: { type: Date, default: Date.now }
  }],

  isMod: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },

}, { timestamps: true });

// ── INDEXES ────────────────────────────────────────────────────────────
// Index both JID and LID for fast lookups in either addressing mode
userSchema.index({ jid: 1 }, { sparse: true });
userSchema.index({ lid: 1 }, { sparse: true });
// Index for quick discovery of registered users
userSchema.index({ registered: 1, createdAt: -1 });

// ── VIRTUAL GETTERS ────────────────────────────────────────────────────
userSchema.virtual('netWorth').get(function () {
  return this.wallet + this.bank;
});

// Return the phone number extracted from JID (removes @s.whatsapp.net suffix)
userSchema.virtual('phone').get(function () {
  if (this.jid && this.jid.includes('@')) {
    return this.jid.split('@')[0];
  }
  return null;
});

// ── STATICS FOR FINDING BY EITHER JID OR LID ──────────────────────────
/**
 * findByWhatsAppId(identifier)
 * Pass either a JID (phone@s.whatsapp.net) or LID (xxx@lid)
 * and it will find the matching user document.
 */
userSchema.statics.findByWhatsAppId = async function (identifier) {
  if (!identifier) return null;
  
  const isLid = identifier.includes('@lid');
  const query = isLid ? { lid: identifier } : { jid: identifier };
  
  return this.findOne(query);
};

/**
 * findOrCreateByJid(jid, phoneNumber)
 * Creates user if doesn't exist using JID, stores phone for reference
 */
userSchema.statics.findOrCreateByJid = async function (jid, phoneNumber) {
  let user = await this.findOne({ jid });
  
  if (!user) {
    user = new this({
      jid,
      name: phoneNumber || jid.split('@')[0],
    });
    await user.save();
  }
  
  return user;
};

/**
 * linkLid(jid, lid)
 * When WhatsApp gives us a LID for a user, link it to the existing JID document
 */
userSchema.statics.linkLid = async function (jid, lid) {
  return this.findOneAndUpdate(
    { jid },
    { $set: { lid } },
    { new: true }
  );
};

// ── INSTANCE METHODS ─────────────────────────────────────────────────
userSchema.methods.addXp = function (amount) {
  this.xp += amount;
  const needed = this.level * 100;
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
  const cooldownMs = config.COOLDOWNS[command] || 0;
  return Date.now() < cd.getTime() + cooldownMs;
};

userSchema.methods.getCooldownLeft = function (command) {
  const cd = this.cooldowns.get(command);
  if (!cd) return 0;
  const config = require('../config');
  const cooldownMs = config.COOLDOWNS[command] || 0;
  const left = (cd.getTime() + cooldownMs) - Date.now();
  return left > 0 ? left : 0;
};

userSchema.methods.setCooldown = function (command) {
  this.cooldowns.set(command, new Date());
};

module.exports = mongoose.model('User', userSchema);
