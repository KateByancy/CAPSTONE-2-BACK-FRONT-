const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
process.env.JWT_SECRET = 'payment-test-only';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_fixture';
process.env.NODE_ENV = 'test';
process.env.PAYMENTS_MODE = 'test';
const db = require('../config/db');
const provider = require('../services/paymongoCheckout');
const { issueAccessToken } = require('../utils/authTokens');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (err, rows) => err ? reject(err) : resolve(rows)));

test('GCash QR: ownership, duplicate billing, references, receipts and disabled checkout', async () => {
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
    await query('CREATE TEMPORARY TABLE bookings (id INT PRIMARY KEY, user_id INT, service_type VARCHAR(100), status VARCHAR(30), accepted_at DATETIME, estimate JSON NULL)');
    await query('CREATE TEMPORARY TABLE payments (id INT, booking_id INT, amount DECIMAL(10,2), reference_number VARCHAR(100), payment_status VARCHAR(30), created_at DATETIME)');
    await query("INSERT INTO users VALUES (1,'Test Admin','admin','ADMIN_ENV_AUTH'),(2,'Test Client','client','unused'),(3,'Other Client','client','unused')");
    await query("INSERT INTO bookings (id,user_id,service_type,status,accepted_at) VALUES (1,2,'Kitchen','Approved',NOW()),(2,3,'Bedroom','Approved',NOW()),(3,2,'Office','Pending',NULL)");
    const app = express(); app.use(express.json()); app.use('/payment', require('../routes/paymentRoutes'));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/payment`;
    const admin = { id: 1, role: 'admin' }, client = { id: 2, role: 'client' }, other = { id: 3, role: 'client' };
    const call = async (path, user, method = 'GET', body) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${issueAccessToken(user)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, data: await response.json() };
    };
    await query("INSERT INTO gcash_settings (id,account_name,account_number,qr_image) VALUES (1,'MARC','09123456789','/api/portfolio/images/fixture.png')");
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
    assert.equal(list.payments[0].payment_provider, 'Manual');
    assert.equal(list.payments[0].qr_image, '/api/portfolio/images/fixture.png');
    assert.equal((await call('?user_id=2', other)).data.payments.length, 0);
    assert.equal((await call('/' + id + '/checkout', client, 'POST')).status, 410);
    assert.equal(creates, 0);
    assert.equal((await call('', admin, 'POST', { ...invoice, payment_provider: 'PayMongo' })).status, 400);
    assert.equal((await call('/' + id + '/review', admin, 'PUT', { decision: 'Paid', confirmed: true })).status, 409);
    const submit = async (user, reference) => {
      const body = new FormData(); body.append('reference_number', reference);
      body.append('proof', new Blob([Buffer.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }), 'receipt.png');
      return fetch(base + '/' + id + '/proof', { method: 'POST', headers: { Authorization: 'Bearer ' + issueAccessToken(user) }, body });
    };
    assert.equal((await submit(other, '1234567890123')).status, 409);
    assert.equal((await submit(client, 'bad-reference')).status, 400);
    assert.equal((await submit(client, '1234567890123')).status, 200);
    assert.equal((await call('', client)).data.payments[0].status, 'For verification');
    assert.equal((await call('/' + id + '/review', admin, 'PUT', { decision: 'Paid', confirmed: false })).status, 400);
    assert.equal((await call('/' + id + '/review', admin, 'PUT', { decision: 'Paid', confirmed: true })).status, 200);
    assert.equal((await call('', client)).data.payments[0].status, 'Paid');
    assert.equal((await call('/settings', admin)).data.provider, 'Manual');
  } finally { if (server) await new Promise(resolve => server.close(resolve)); db.destroy(); }
});
