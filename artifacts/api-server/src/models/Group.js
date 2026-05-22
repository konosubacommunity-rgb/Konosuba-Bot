const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  jid:         { type: String, unique: true, required: true },
  name:        { type: String, default: 'Unknown Group' },
  owner:       { type: String, default: null },
  // feature flags
  antilink:    { type: Boolean, default: false },
  antispam:    { type: Boolean, default: false },
  welcome:     { type: Boolean, default: true },
  goodbye:     { type: Boolean, default: true },
  autoreply:   { type: Boolean, default: false },
  active:      { type: Boolean, default: true },   // bot enabled in this group
  // muted members list (JIDs)
  mutedMembers: [String],
  // per-member activity tracking
  memberActivity: [{
    jid:          String,
    messageCount: { type: Number, default: 0 },
    lastSeen:     { type: Date, default: Date.now },
  }],
  prefix:      { type: String, default: null },
}, { timestamps: true });

groupSchema.statics.findOrCreate = async function (jid, name) {
  let group = await this.findOne({ jid });
  if (!group) {
    group = new this({ jid, name: name || jid.split('@')[0] });
    await group.save();
  }
  return group;
};

module.exports = mongoose.model('Group', groupSchema);
