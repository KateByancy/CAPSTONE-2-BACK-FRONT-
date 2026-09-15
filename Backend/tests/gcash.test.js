const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'payment-test-only';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_fixture';
process.env.NODE_ENV = 'test';
process.env.PAYMENTS_MODE = 'test';
const db = require('../config/db');
const provider = require('../services/paymongoCheckout');
const { issueAccessToken } = require('../utils/authTokens');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (err, rows) => err ? reject(err) : resolve(rows)));

test('PayMongo GCash: ownership, fixed amount, duplicate checkout, provider confirmation and legacy protection', async () => {
  let server;
  const sessions = new Map(); let creates = 0;
  provider.request = async (path, options) => {
    if (options?.method === 'POST') {
      const attributes = JSON.parse(options.body).data.attributes;
      assert.deepEqual(attributes.payment_method_types, ['gcash']);
      assert.equal(attributes.line_items[0].amount, 10050);
      const id = `cs_test${++creates}`;
      const session = { id, attributes: { status: 'active', livemode: false, payments: [], checkout_url: `https://checkout.paymongo.com/${id}` } };
      sessions.set(id, session); return session;
    }
    return sessions.get(path.split('/').at(-1));
  };
  try {
    for (const sql of require('../migrations/gcash')) await query(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE'));
    await query('CREATE TEMPORARY TABLE users (id INT PRIMARY KEY, fullname VARCHAR(100), role VARCHAR(20), password VARCHAR(255))');
    await query('CREATE TEMPORARY TABLE bookings (id INT PRIMARY KEY, user_id INT, service_type VARCHAR(100), status VARCHAR(30), accepted_at DATETIME)');
    await query('CREATE TEMPORARY TABLE payments (id INT, booking_id INT, amount DECIMAL(10,2), reference_number VARCHAR(100), payment_status VARCHAR(30), created_at DATETIME)');
    await query("INSERT INTO users VALUES (1,'Test Admin','admin','ADMIN_ENV_AUTH'),(2,'Test Client','client','unused'),(3,'Other Client','client','unused')");
    await query("INSERT INTO bookings VALUES (1,2,'Kitchen','Approved',NOW()),(2,3,'Bedroom','Approved',NOW()),(3,2,'Office','Pending',NULL)");
    const app = express(); app.use(express.json()); app.use('/payment', require('../routes/paymentRoutes'));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/payment`;
    const admin = { id: 1, role: 'admin' }, client = { id: 2, role: 'client' }, other = { id: 3, role: 'client' };
    const call = async (path, user, method = 'GET', body) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${issueAccessToken(user)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, data: await response.json() };
    };
    const invoice = { booking_id: 1, amount: '100.50', description: 'Deposit' };
    assert.equal((await call('', null)).status, 401);
    assert.equal((await call('', client, 'POST', invoice)).status, 403);
    assert.equal((await call('', admin, 'POST', { ...invoice, amount: '99.99' })).status, 400);
    assert.equal((await call('', admin, 'POST', { ...invoice, booking_id: 3 })).status, 409);
    assert.equal((await call('', admin, 'POST', invoice)).status, 201);
    assert.equal((await call('', admin, 'POST', invoice)).status, 409);
    const list = (await call('', client)).data;
    for (const name of ['payments','bookings','legacy']) assert.ok(Array.isArray(list[name]));
    const id = list.payments[0].id;
    assert.equal(list.payments[0].payment_provider, 'PayMongo');
    assert.equal((await call('?user_id=2', other)).data.payments.length, 0);
    assert.equal((await call(`/${id}/checkout`, other, 'POST')).status, 404);
    assert.equal((await call(`/${id}/checkout`, admin, 'POST')).status, 403);
    const started = await Promise.all([call(`/${id}/checkout`, client, 'POST', { amount: 1 }),call(`/${id}/checkout`, client, 'POST')]);
    assert.ok(started.some(result => result.status === 200));
    assert.equal(creates, 1);
    assert.equal((await call(`/${id}/checkout`, client, 'POST')).data.checkoutUrl, 'https://checkout.paymongo.com/cs_test1');
    assert.equal(creates, 1);
    assert.equal((await call(`/${id}/cancel`, admin, 'PUT', { note: 'No cancellation with active checkout' })).status, 409);
    assert.equal((await call(`/${id}/review`, admin, 'PUT', { decision: 'Paid', confirmed: true })).status, 409);
    const session = sessions.get('cs_test1');
    session.attributes.payments = [{ id: 'pay_test', attributes: { status: 'paid', amount: 1, currency: 'PHP', source: { type: 'gcash' } } }];
    assert.equal((await call('', client)).data.payments[0].status, 'Awaiting payment');
    session.attributes.payments[0].attributes.amount = 10050;
    session.attributes.livemode = true;
    assert.equal((await call('', client)).data.payments[0].status, 'Awaiting payment');
    session.attributes.livemode = false;
    assert.equal((await call('', client)).data.payments[0].status, 'Paid');
    assert.equal((await call(`/${id}/checkout`, client, 'POST')).data.paid, true);
    assert.equal((await call('', admin, 'POST', invoice)).status, 201);
    assert.equal((await call('/settings', admin)).data.testMode, true);
  } finally { if (server) await new Promise(resolve => server.close(resolve)); db.destroy(); }
});
