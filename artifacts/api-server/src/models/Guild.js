const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  owner:       { type: String, required: true },
  members:     [{ jid: String, rank: { type: String, default: 'Member' } }],
  level:       { type: Number, default: 1 },
  xp:          { type: Number, default: 0 },
  treasury:    { type: Number, default: 0 },
  description: { type: String, default: 'A brave guild!' },
  createdAt:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
