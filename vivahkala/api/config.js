// GET /api/config  -> prices, the owner's UPI ID and whether paid features are on
const core = require('./_lib/core');

module.exports = core.handler(async (req, res) => {
  const s = await core.getSettings();
  const ready = core.paymentsReady(s);
  core.send(res, 200, {
    accounts: require('./_lib/db').configured(),
    enabled: ready,
    enforce: ready && !!s.enforce,
    monthly: s.monthly,
    yearly: s.yearly,
    upiId: ready ? s.upiId : '',
    payeeName: s.payeeName,
    trialDays: ready && s.enforce ? Number(s.trialDays) || 0 : 0,
  });
});
