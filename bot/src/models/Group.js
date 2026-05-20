const mongoose = require('mongoose');

const memberActivitySchema = new mongoose.Schema({
  jid: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  name: { type: String, default: 'Group' },
  antilink: { type: Boolean, default: false },
  antispam: { type: Boolean, default: false },
  welcome: { type: Boolean, default: true },
  goodbye: { type: Boolean, default: true },
  autoreply: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  mods: [String],
  mutedMembers: [String],
  warnedMembers: { type: Map, of: Number, default: {} },
  autoReplyPairs: [{ trigger: String, response: String }],
  memberActivity: [memberActivitySchema],
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
