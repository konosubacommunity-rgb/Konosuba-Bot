// Image generation stubs
// These functions optionally generate image buffers for profile/balance cards.
// Returning null causes the caller to fall back to text-only responses,
// which is safe — all call sites already handle a null return value.

async function generateProfileCard(_user, _avatarUrl) {
  return null;
}

async function generateBalanceCard(_user) {
  return null;
}

module.exports = { generateProfileCard, generateBalanceCard };
