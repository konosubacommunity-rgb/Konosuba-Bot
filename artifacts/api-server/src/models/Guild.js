const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  name:        { type: String, unique: true, required: true, trim: true },
  owner:       { type: String, required: true },
  description: { type: String, default: 'A legendary guild!' },
  level:       { type: Number, default: 1 },
  treasury:    { type: Number, default: 0 },
  maxMembers:  { type: Number, default: 20 },
  members: [{
    jid:  { type: String },
    rank: { type: String, enum: ['Owner', 'Officer', 'Member'], default: 'Member' },
  }],
  wins:  { type: Number, default: 0 },
  losses:{ type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
