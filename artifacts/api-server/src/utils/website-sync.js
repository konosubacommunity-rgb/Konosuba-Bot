// website-sync.js
// Called by command handlers after economy/gambling/pokemon actions to keep
// the MongoDB user document in sync so the website dashboard shows live data.
// Both functions resolve silently on failure — a sync error must never crash
// a bot command.

const User = require('../models/User');

// Normalise any JID / LID / raw phone to a canonical @s.whatsapp.net JID
function toCanonicalJid(sender) {
  if (!sender) return null;
  // Already canonical
  if (sender.endsWith('@s.whatsapp.net')) return sender;
  // Strip domain, then digits only
  const digits = sender.split('@')[0].replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

// Find user by canonical JID or fall back to LID lookup
async function findUser(sender) {
  const jid = toCanonicalJid(sender);
  if (jid) {
    const u = await User.findOne({ jid });
    if (u) return u;
  }
  // LID fallback
  if (sender && sender.includes('@lid')) {
    return User.findOne({ lid: sender });
  }
  return null;
}

/**
 * Merge a partial data object into the user document.
 *
 * Supported keys (all optional):
 *   wallet, bank, bankLimit, level, xp, streak, lastStreak,
 *   inventory, pokemon, pokeBalls, buddy, rpg, pet, guild,
 *   starter, missions, rank
 */
async function syncUserToWebsite(sender, data) {
  if (!sender || !data || typeof data !== 'object') return;
  try {
    const user = await findUser(sender);
    if (!user) return;

    const ALLOWED = [
      'wallet', 'bank', 'bankLimit', 'level', 'xp', 'streak', 'lastStreak',
      'inventory', 'pokemon', 'pokeBalls', 'buddy', 'rpg', 'pet', 'guild',
      'starter', 'missions', 'rank',
    ];

    let changed = false;
    for (const key of ALLOWED) {
      if (key in data) {
        user[key] = data[key];
        changed = true;
      }
    }

    if (changed) await user.save();
  } catch (err) {
    // Swallow — a sync failure must not interrupt a bot command
    console.error('[website-sync] syncUserToWebsite error:', err.message);
  }
}

/**
 * Append an activity entry to the user's activity log.
 *
 * @param {string} sender  - raw sender JID
 * @param {string} icon    - emoji icon, e.g. '💰'
 * @param {string} title   - short title, e.g. 'Daily Reward'
 * @param {string} desc    - description string, e.g. 'Got $500!'
 * @param {string} type    - category: 'economy'|'gambling'|'pokemon'|'daily'|…
 */
async function logActivity(sender, icon, title, desc, type) {
  if (!sender) return;
  try {
    const user = await findUser(sender);
    if (!user) return;

    if (!user.activities) user.activities = [];
    user.activities.push({
      icon:      icon  || '⚡',
      title:     title || type || 'Activity',
      desc:      desc  || '',
      type:      type  || 'activity',
      timestamp: new Date(),
    });

    // Keep only the last 50 activities
    if (user.activities.length > 50) {
      user.activities = user.activities.slice(-50);
    }

    await user.save();
  } catch (err) {
    console.error('[website-sync] logActivity error:', err.message);
  }
}

module.exports = { syncUserToWebsite, logActivity };
