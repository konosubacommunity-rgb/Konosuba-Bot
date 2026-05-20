const mongoose = require('mongoose');

const botSessionSchema = new mongoose.Schema({
  botId:   { type: String, required: true, index: true },
  dataKey: { type: String, required: true },
  data:    { type: mongoose.Schema.Types.Mixed, required: true },
}, {
  timestamps: true,
});

botSessionSchema.index({ botId: 1, dataKey: 1 }, { unique: true });

module.exports = mongoose.model('BotSession', botSessionSchema);
