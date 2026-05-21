// FILE: src/utils/website-sync.js
// ─────────────────────────────────────────────────────────────────────────────
//  Helper functions for bot command files to log activity entries and push
//  field updates directly to MongoDB (no HTTP round-trip needed since the
//  bot and API share the same process and database connection).
//
//  IMPORTANT: All lookups are by JID first, with LID fallback.
//  Never pass an @lid address as the primary identifier when the JID is known.
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../models/User');

/**
 * Find a user by their WhatsApp JID (or LID as fallback).
 * Always prefer JID — it maps 1-to-1 with the phone number.
 *
 * @param {string} jid  - Full JID "234xxxxxxxx@s.whatsapp.net" or LID "xxx@lid"
 */
async function findUser(jid) {
  if (!jid) return null;

  // Use the model static that handles both JID and LID
  return User.findByWhatsAppId(jid);
}

/**
 * Append an entry to a user's activity log (visible on the website dashboard).
 *
 * @param {string} jid         - Full WhatsApp JID, e.g. "234xxxxxxxx@s.whatsapp.net"
 * @param {string} icon        - Emoji to show next to the activity, e.g. "💰"
 * @param {string} title       - Short title, e.g. "Daily Reward"
 * @param {string} description - Detail text, e.g. "Claimed $450"
 * @param {string} type        - Category: 'economy' | 'gambling' | 'rpg' | 'pokemon' | 'general' | 'daily'
 */
async function logActivity(jid, icon, title, description, type = 'general') {
  try {
    const user = await findUser(jid);
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
 * Use this to sync fields (wallet, bank, level, xp, etc.) after any command.
 *
 * @param {string} jid     - Full WhatsApp JID (or LID as fallback)
 * @param {object} updates - Plain object of fields to set, e.g. { wallet: 5000 }
 */
async function syncUser(jid, updates) {
  try {
    const isLid = jid.includes('@lid');
    await User.findOneAndUpdate(
      isLid ? { lid: jid } : { jid },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  } catch (err) {
    console.error(`[sync-user] Failed for ${jid}:`, err.message);
  }
}

/**
 * ALIAS — identical to syncUser().
 * economy.js and other command files import this name.
 * Both names are exported so either import works.
 */
const syncUserToWebsite = syncUser;

module.exports = { logActivity, syncUser, syncUserToWebsite };
