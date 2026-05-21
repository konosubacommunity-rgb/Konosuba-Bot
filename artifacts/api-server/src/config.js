const ownerNumbersEnv = process.env.OWNER_NUMBERS || '12232838631673';
const ownerNumbersList = ownerNumbersEnv
  .split(',')
  .map(n => n.trim())
  .filter(Boolean);

module.exports = {
  OWNER_NUMBERS: ownerNumbersList,
  OWNER_JID: ownerNumbersList.length > 0 ? `${ownerNumbersList[0]}@lid` : '12232838631673@lid',
  BOT_NAME: 'Aqua',
  COMMUNITY: 'KONOSUBA',
  PREFIX: '.',
  MONGO_URI: process.env.MONGO_URI || '',
  COOLDOWNS: {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    work: 30 * 60 * 1000,
    beg: 10 * 60 * 1000,
    crime: 20 * 60 * 1000,
    rob: 30 * 60 * 1000,
    heist: 60 * 60 * 1000,
    fish: 15 * 60 * 1000,
    dig: 15 * 60 * 1000,
    bonus: 12 * 60 * 60 * 1000,
    hunt: 10 * 60 * 1000,
    quest: 60 * 60 * 1000,
    claim: 12 * 60 * 60 * 1000,
    coinflip: 30 * 1000,
    slots: 45 * 1000,
    blackjack: 60 * 1000,
    roulette: 30 * 1000,
    dice: 20 * 1000,
    lottery: 5 * 60 * 1000,
    bet: 60 * 1000,
    highlow: 30 * 1000,
    crash: 90 * 1000,
  },
  ECONOMY: {
    DAILY_AMOUNT: () => Math.floor(Math.random() * 500) + 100,
    WEEKLY_AMOUNT: () => Math.floor(Math.random() * 3000) + 500,
    MONTHLY_AMOUNT: () => Math.floor(Math.random() * 10000) + 2000,
    WORK_AMOUNT: () => Math.floor(Math.random() * 200) + 50,
    BEG_AMOUNT: () => Math.floor(Math.random() * 50) + 1,
    FISH_MAX: 1000,
    DIG_MAX: 1000,
    STARTING_BALANCE: 500,
    STARTING_BANK_LIMIT: 10000,
    BANK_UPGRADE_COST: 5000,
    BANK_UPGRADE_AMOUNT: 5000,
    WIN_RATE: 0.30,
  },
};
