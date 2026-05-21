const User = require('../models/User');

async function syncUserToWebsite(user) {
  try {
    await user.save();
  } catch (err) {
    console.error('[website-sync] syncUserToWebsite error:', err.message);
  }
}

async function logActivity(user, { icon, title, desc, type }) {
  try {
    if (!user.activities) user.activities = [];
    user.activities.push({ icon, title, desc, type, timestamp: new Date() });
    if (user.activities.length > 50) user.activities = user.activities.slice(-50);
    await user.save();
  } catch (err) {
    console.error('[website-sync] logActivity error:', err.message);
  }
}

module.exports = { syncUserToWebsite, logActivity };
