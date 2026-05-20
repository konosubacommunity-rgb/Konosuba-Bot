/**
 * MongoDB-backed Baileys auth state.
 * Replaces useMultiFileAuthState so session keys survive Render restarts.
 */

const {
  initAuthCreds,
  BufferJSON,
  proto,
} = require('@whiskeysockets/baileys');

const BotSession = require('../models/BotSession');

async function useMongoDBAuthState(botId) {
  async function readData(key) {
    const doc = await BotSession.findOne({ botId, dataKey: key }).lean();
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc.data), BufferJSON.reviver);
  }

  async function writeData(key, value) {
    const data = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
    await BotSession.findOneAndUpdate(
      { botId, dataKey: key },
      { $set: { data } },
      { upsert: true, new: true }
    );
  }

  async function removeData(key) {
    await BotSession.deleteOne({ botId, dataKey: key });
  }

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              const key  = `${type}-${id}`;
              let   val  = await readData(key);
              if (type === 'app-state-sync-key' && val) {
                val = proto.Message.AppStateSyncKeyData.fromObject(val);
              }
              data[id] = val;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const [type, ids] of Object.entries(data)) {
            for (const [id, value] of Object.entries(ids)) {
              const key = `${type}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  };
}

module.exports = { useMongoDBAuthState };
