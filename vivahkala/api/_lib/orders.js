// Orders: a customer pays the owner's UPI QR and submits the 12-digit UPI
// transaction number (UTR). The owner checks it against their bank or UPI app
// and approves it in /admin, which adds the plan. Each UTR can be submitted only once.
const crypto = require('crypto');
const db = require('./db');
const core = require('./core');

const orderKey = (id) => `order:${id}`;
const getOrder = (id) => db.getJSON(orderKey(id));
const saveOrder = (o) => db.setJSON(orderKey(o.id), o);

function normUtr(raw) {
  const d = String(raw || '').replace(/\s/g, '');
  return /^\d{12}$/.test(d) ? d : '';
}

function price(settings, plan) {
  if (!core.PLAN_DAYS[plan]) throw new core.HttpError(400, 'Pick the monthly or yearly plan.');
  return plan === 'yearly' ? settings.yearly : settings.monthly;
}

async function claim(user, plan, rawUtr) {
  const amount = price(await core.getSettings(), plan);
  const utr = normUtr(rawUtr);
  if (!utr) throw new core.HttpError(400, 'Enter the 12-digit UPI transaction number (UTR) from your payment app.');
  const id = `VK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const free = await db.cmd(['SET', `utr:${utr}`, id, 'NX']);
  if (!free) throw new core.HttpError(409, 'This transaction number has already been submitted.');
  const order = {
    id,
    phone: user.phone,
    name: user.name || '',
    plan,
    amount: Math.round(amount * 100),
    utr,
    state: 'PENDING',
    createdAt: Date.now(),
  };
  await saveOrder(order);
  await db.cmd(['ZADD', 'orders', order.createdAt, id]);
  await db.cmd(['ZADD', `orders:${user.phone}`, order.createdAt, id]);
  return order;
}

async function mine(phone) {
  const ids = await db.cmd(['ZREVRANGE', `orders:${phone}`, 0, 4]);
  return (await db.mgetJSON(ids.map(orderKey))).filter(Boolean);
}

async function approve(id) {
  const order = await getOrder(id);
  if (!order) throw new core.HttpError(404, 'Payment not found.');
  if (order.state === 'COMPLETED') return order;
  const first = await db.cmd(['SET', `applied:${id}`, '1', 'NX']);
  if (first) {
    const user = await core.getUser(order.phone);
    if (!user) throw new core.HttpError(404, 'The customer account no longer exists.');
    core.extend(user, core.PLAN_DAYS[order.plan]);
    user.lastPlan = order.plan;
    await core.saveUser(user);
  }
  order.state = 'COMPLETED';
  order.paidAt = order.paidAt || Date.now();
  order.appliedAt = order.appliedAt || Date.now();
  await saveOrder(order);
  return order;
}

// Rejecting frees the UTR so a customer who mistyped it can submit the right one.
async function reject(id) {
  const order = await getOrder(id);
  if (!order) throw new core.HttpError(404, 'Payment not found.');
  if (order.state === 'COMPLETED') throw new core.HttpError(400, 'This payment is already approved. Use Remove Pro on the customer instead.');
  order.state = 'REJECTED';
  order.rejectedAt = Date.now();
  await saveOrder(order);
  await db.cmd(['DEL', `utr:${order.utr}`]);
  return order;
}

module.exports = { getOrder, claim, mine, approve, reject };
