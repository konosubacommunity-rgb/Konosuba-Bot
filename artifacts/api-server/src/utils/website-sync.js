const User = require('../models/User');

/**
 * Sync updated fields to the user's MongoDB document.
 * Called as: syncUserToWebsite(jid, { wallet, bank, level, xp, ... })
 * Since the bot and website share the same MongoDB, saving here makes
 * the change immediately visible on the website.
 */
async function syncUserToWebsite(jid, fields = {}) {
  try {
    if (!jid || typeof jid !== 'string') return;
    const user = await User.findByWhatsAppId(jid);
    if (!user) return;
    Object.assign(user, fields);
    await user.save();
  } catch (err) {
    console.error('[website-sync] syncUserToWebsite error:', err.message);
  }
}

/**
 * Append an activity entry to the user's activity feed.
 * Called as: logActivity(jid, icon, title, desc, type)
 */
async function logActivity(jid, icon, title, desc, type) {
  try {
    if (!jid || typeof jid !== 'string') return;
    const user = await User.findByWhatsAppId(jid);
    if (!user) return;
    if (!user.activities) user.activities = [];
    user.activities.push({ icon, title, desc, type, timestamp: new Date() });
    if (user.activities.length > 50) user.activities = user.activities.slice(-50);
    await user.save();
  } catch (err) {
    console.error('[website-sync] logActivity error:', err.message);
  }
}

module.exports = { syncUserToWebsite, logActivity };
