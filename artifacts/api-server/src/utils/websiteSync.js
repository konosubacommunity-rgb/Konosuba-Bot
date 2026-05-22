/**
 * utils/websiteSync.js
 * Direct MongoDB sync — no HTTP needed since we share the same DB.
 */
const User = require('../models/User');

/**
 * Push field updates straight to the User document.
 * Called after every economy/bot command that changes user state.
 *
 * @param {string} jidOrPhone  The JID (with @) or bare phone number
 * @param {object} updates     Fields to $set on the user doc
 */
async function syncUserToWebsite(jidOrPhone, updates) {
  try {
    if (!jidOrPhone || !updates || Object.keys(updates).length === 0) return;

    // FIX: use findByWhatsAppId — handles both JID and LID
    let user = await User.findByWhatsAppId(jidOrPhone);
    if (!user && !jidOrPhone.includes('@')) {
      // Bare phone passed in
      user = await User.findByPhone(jidOrPhone);
    }
    if (!user) return;

    Object.assign(user, updates);
    await user.save();
  } catch (err) {
    console.error('[websiteSync] Error syncing user:', err.message);
  }
}

/**
 * Log an activity event on the user's activity feed.
 */
async function logActivity(jidOrPhone, icon, title, description, type) {
  try {
    let user = await User.findByWhatsAppId(jidOrPhone);
    if (!user && !jidOrPhone.includes('@')) user = await User.findByPhone(jidOrPhone);
    if (!user) return;

    if (!Array.isArray(user.activityLog)) user.activityLog = [];
    user.activityLog.unshift({ icon, title, description, type, createdAt: new Date() });
    // Keep only last 50 events
    if (user.activityLog.length > 50) user.activityLog = user.activityLog.slice(0, 50);
    await user.save();
  } catch (err) {
    console.error('[websiteSync] Error logging activity:', err.message);
  }
}

module.exports = { syncUserToWebsite, logActivity };
