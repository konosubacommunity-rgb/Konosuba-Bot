// FILE: src/utils/website-sync.js
// ─────────────────────────────────────────────────────────────────────────────
//  Helper functions for bot command files to log activity entries and push
//  field updates.  These write DIRECTLY to MongoDB — no HTTP round-trip needed
//  since the bot and the API share the same process and database connection.
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../models/User');

/**
 * Append an entry to a user's activity log (visible on the website dashboard).
 *
 * @param {string} jid        - Full WhatsApp JID, e.g. "234xxxxxxxx@s.whatsapp.net"
 * @param {string} icon       - Emoji to show next to the activity, e.g. "💰"
 * @param {string} title      - Short title, e.g. "Daily Reward"
 * @param {string} description - Detail text, e.g. "Claimed $450"
 * @param {string} type       - Category tag: 'economy' | 'gambling' | 'rpg' | 'pokemon' | 'general'
 */
async function logActivity(jid, icon, title, description, type = 'general') {
  try {
    const user = await User.findOne({ jid });
    if (!user) return;

    if (!user.activities) user.activities = [];

    user.activities.push({
      icon,
      title,
      desc: description,
      type,
      timestamp: new Date(),
    });

    // Keep only the latest 50 entries
    if (user.activities.length > 50) {
      user.activities = user.activities.slice(-50);
    }

    await user.save();
  } catch (err) {
    console.error(`[activity-log] Failed for ${jid}:`, err.message);
  }
}

/**
 * Push arbitrary field updates to a user document.
 * Use this if you need to update fields from a command file without
 * importing the User model directly.
 *
 * @param {string} jid     - Full WhatsApp JID
 * @param {object} updates - Plain object of fields to set, e.g. { wallet: 5000 }
 */
async function syncUser(jid, updates) {
  try {
    await User.findOneAndUpdate(
      { jid },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  } catch (err) {
    console.error(`[sync-user] Failed for ${jid}:`, err.message);
  }
}

module.exports = { logActivity, syncUser };
