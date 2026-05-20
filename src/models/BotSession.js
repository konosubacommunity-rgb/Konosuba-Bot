const mongoose = require('mongoose');

const botSessionSchema = new mongoose.Schema({
  // Session identifier - should be unique per bot instance
  sessionId: { type: String, required: true, unique: true },
  
  // Bot credentials and auth state
  botNumber: String,
  botJid: String,
  
  // Track when session was created/last updated
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  
  // Session state: 'pairing', 'connected', 'disconnected'
  status: { type: String, enum: ['pairing', 'connected', 'disconnected'], default: 'disconnected' },
  
  // Pairing code (temporary, expires after use)
  pairingCode: String,
  pairingCodeExpires: Date,
  
  // Configuration
  config: {
    prefix: { type: String, default: '.' },
    botName: { type: String, default: 'Aqua Bot' },
    timezone: { type: String, default: 'UTC' },
  },
  
  // Baileys auth state (credentials stored in MongoDB for persistence)
  authState: {
    creds: mongoose.Schema.Types.Mixed,  // Full credentials object
    keys: mongoose.Schema.Types.Mixed,   // Keys map
  },
  
  // Connection metadata
  lastQRCode: String,
  connectionErrors: [{
    timestamp: Date,
    error: String,
    statusCode: Number,
  }],
  
  // Stats
  messagesProcessed: { type: Number, default: 0 },
  commandsExecuted: { type: Number, default: 0 },
  groupsActive: { type: Number, default: 0 },
  usersActive: { type: Number, default: 0 },

}, { timestamps: true });

// Keep connection errors limited to last 50
botSessionSchema.pre('save', function () {
  if (this.connectionErrors && this.connectionErrors.length > 50) {
    this.connectionErrors = this.connectionErrors.slice(-50);
  }
});

// Static method to get or create the default bot session
botSessionSchema.statics.getOrCreate = async function (sessionId = 'default') {
  let session = await this.findOne({ sessionId });
  
  if (!session) {
    session = new this({
      sessionId,
      status: 'disconnected',
    });
    await session.save();
  }
  
  return session;
};

// Update session as active
botSessionSchema.methods.markActive = async function () {
  this.lastActive = new Date();
  await this.save();
};

// Update connection status
botSessionSchema.methods.setStatus = async function (status) {
  this.status = status;
  this.lastActive = new Date();
  await this.save();
};

// Record a connection error
botSessionSchema.methods.recordError = async function (error, statusCode = null) {
  if (!this.connectionErrors) this.connectionErrors = [];
  
  this.connectionErrors.push({
    timestamp: new Date(),
    error: error.message || String(error),
    statusCode,
  });
  
  await this.save();
};

module.exports = mongoose.model('BotSession', botSessionSchema);
