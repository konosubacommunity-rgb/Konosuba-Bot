// FILE: src/utils/website-sync.js

const axios = require('axios');

const WEBSITE_API_URL = process.env.WEBSITE_API_URL || 'https://your-render-url.onrender.com/api';
const BOT_SECRET = process.env.BOT_WEBHOOK_SECRET || 'your_bot_secret';

async function syncUserToWebsite(jid, updates) {
  try {
    const phone = jid.replace('@s.whatsapp.net', '');
    await axios.post(
      `${WEBSITE_API_URL}/sync`,
      {
        phone: phone,
        updates: updates
      },
      {
        headers: {
          'x-bot-secret': BOT_SECRET,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    console.log(`✅ Synced ${phone} to website`);
  } catch (error) {
    console.error(`❌ Sync failed for ${jid}:`, error.message);
  }
}

async function logActivity(jid, icon, title, description, type = 'general') {
  try {
    const phone = jid.replace('@s.whatsapp.net', '');
    await axios.post(
      `${WEBSITE_API_URL}/user/${phone}/activity`,
      {
        icon: icon,
        title: title,
        desc: description,
        type: type
      },
      {
        headers: {
          'x-bot-secret': BOT_SECRET,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    console.log(`✅ Logged activity for ${phone}`);
  } catch (error) {
    console.error(`❌ Activity log failed for ${jid}:`, error.message);
  }
}

module.exports = {
  syncUserToWebsite,
  logActivity
};
