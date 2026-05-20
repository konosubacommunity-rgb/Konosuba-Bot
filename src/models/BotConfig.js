const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
  botId:      { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  phone:      { type: String, required: true },
  avatarPath: { type: String, default: null },
  createdAt:  { type: String, required: true },
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
