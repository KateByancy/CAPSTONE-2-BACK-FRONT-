const { test } = require('node:test');
const assert = require('node:assert/strict');
const dbPath = require.resolve('../config/db');
let queryHandler;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    query(sql, values, callback) {
        if (typeof values === 'function') { callback = values; values = []; }
        try { callback(null, queryHandler(sql, values)); } catch (error) { callback(error); }
    },
} };
const payments = require('../controllers/gcashController');
const mail = require('../services/adminRecoveryMail');
const chat = require('../controllers/chatController');
function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('manual billing snapshots the saved GCash account and QR without PayMongo configuration', async () => {
    delete process.env.PAYMONGO_SECRET_KEY;
    const settings = { account_name: 'MARC', account_number: '09123456789', qr_image: '/api/portfolio/images/fixture.png' };
    let inserted;
    queryHandler = (sql, values) => {
        if (sql.startsWith('SELECT account_name')) return [settings];
        assert.match(sql, /INSERT INTO gcash_requests/);
        assert.match(sql, /accepted_at/);
        inserted = values;
        return { affectedRows: 1 };
    };
    const res = response();
    await payments.create({ body: { booking_id: 5, amount: '100.50', description: 'Deposit' } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(inserted, ['100.50', 'Deposit', 'MARC', '09123456789', 'Manual', settings.qr_image, 5]);
    queryHandler = () => [{ ...settings, qr_image: null }];
    const missing = response();
    await payments.create({ body: { booking_id: 5, amount: '100.50', description: 'Deposit', payment_provider: 'Manual' } }, missing);
    assert.equal(missing.statusCode, 409);
});

test('new PayMongo requests and checkout are disabled without querying billing records', async () => {
    queryHandler = () => { throw new Error('No provider checkout or billing mutation allowed'); };
    const res = response();
    await payments.create({ body: { booking_id: 5, amount: '100.50', description: 'Deposit', payment_provider: 'PayMongo' } }, res);
    assert.equal(res.statusCode, 400);
    const checkout = response();
    await payments.checkout({}, checkout);
    assert.equal(checkout.statusCode, 410);
});

test('QR settings reject external image paths', async () => {
    queryHandler = () => { throw new Error('Must not write invalid settings'); };
    const res = response();
    await payments.saveSettings({ body: { account_name: 'MARC', account_number: '09123456789', qr_image: 'https://example.com/qr.png' } }, res);
    assert.equal(res.statusCode, 400);
});

test('client payment estimates are scoped to the signed-in client and decoded', async () => {
    queryHandler = (sql, values) => {
        assert.match(sql, /b.user_id=\?/);
        assert.deepEqual(values, [7]);
        return sql.includes('b.estimate IS NOT NULL') ? [{ id: 5, estimate: '{"min":1000,"max":2000}' }] : [];
    };
    const res = response();
    await payments.list({ user: { id: 7, role: 'client' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.estimates[0].estimate, { min: 1000, max: 2000 });
});

test('admin messages email the full message without requiring client presence and expose delivery failures', async () => {
    queryHandler = sql => sql.startsWith('INSERT') ? { affectedRows: 1 } : [{ fullname: 'Client', email: 'client@gmail.com' }];
    const original = mail.sendChatNotification;
    const sent = [];
    try {
        mail.sendChatNotification = async (...args) => { sent.push(args); };
        const req = { user: { id: 1, role: 'admin' }, body: { user_id: 7, message: 'Your project update is ready.' } };
        const delivered = response();
        await chat.sendMessage(req, delivered);
        assert.equal(delivered.statusCode, 201);
        assert.equal(delivered.body.emailDelivered, true);
        assert.deepEqual(sent[0], ['client@gmail.com', 'MARC Admin', req.body.message]);
        mail.sendChatNotification = async () => { throw new Error('SMTP unavailable'); };
        const failed = response();
        await chat.sendMessage(req, failed);
        assert.equal(failed.statusCode, 201);
        assert.equal(failed.body.success, true);
        assert.equal(failed.body.emailDelivered, false);
        assert.match(failed.body.notificationWarning, /Message saved/);
    } finally { mail.sendChatNotification = original; }
});
