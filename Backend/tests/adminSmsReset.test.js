const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ quiet: true });
const db = require('../config/db');
const bcrypt = require('bcrypt');
const sms = require('../services/adminSmsVerify');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));

test('phone normalization supports profile formats and rejects invalid destinations', () => {
    assert.equal(sms.normalizePhone('0992 528 0374'), '+639925280374');
    assert.equal(sms.normalizePhone('639925280374'), '+639925280374');
    assert.equal(sms.normalizePhone('+639925280374'), '+639925280374');
    for (const value of ['', null, 'abc', '0992', '09+925280374']) assert.equal(sms.normalizePhone(value), null);
});

test('SMS recovery uses saved admin phone, enforces verification, and updates real login credentials', async () => {
    process.env.ADMIN_EMAIL = 'sms-admin@example.test';
    process.env.ADMIN_PASSWORD = 'Old-password-123';
    process.env.JWT_SECRET = 'sms-test-secret-only';
    process.env.TWILIO_ACCOUNT_SID = 'AC' + '1'.repeat(32);
    process.env.TWILIO_VERIFY_SERVICE_SID = 'VA' + '2'.repeat(32);
    process.env.TWILIO_AUTH_TOKEN = 'test-only';
    const realFetch = global.fetch;
    const verifications = new Map();
    let sends = 0;
    let providerFails = false;
    let server;
    global.fetch = async (url, options) => {
        if (!String(url).startsWith('https://verify.twilio.com/')) return realFetch(url, options);
        if (providerFails) return new Response('{}', { status: 503 });
        const body = new URLSearchParams(options.body);
        if (String(url).endsWith('/Verifications')) {
            assert.equal(body.get('To'), '+639925280374');
            assert.equal(body.get('Channel'), 'sms');
            const sid = 'VE' + (++sends).toString(16).padStart(32, '0');
            verifications.set(sid, true);
            return Response.json({ sid, status: 'pending' });
        }
        const sid = body.get('VerificationSid');
        const approved = verifications.get(sid) && body.get('Code') === '123456';
        if (approved) verifications.delete(sid);
        return Response.json({ status: approved ? 'approved' : 'pending' });
    };
    try {
        await query(`CREATE TEMPORARY TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, fullname VARCHAR(100),
            email VARCHAR(100) UNIQUE, password VARCHAR(255), role VARCHAR(20), phone VARCHAR(30), last_seen DATETIME)`);
        for (const sql of require('../migrations/adminSmsReset')) await query(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE'));
        await query("INSERT INTO users (fullname, email, password, role, phone) VALUES ('Admin', ?, 'ADMIN_ENV_AUTH', 'admin', '09925280374')", [process.env.ADMIN_EMAIL]);
        await query("INSERT INTO users (fullname, email, password, role, phone) VALUES ('Client', 'client@example.test', 'unused', 'client', '09911111111')");
        const app = express(); app.use(express.json()); app.use('/auth', require('../routes/authRoutes'));
        app.get('/protected', require('../middeware/auth'), (_req, res) => res.json({ success: true }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        async function call(path, body) {
            const response = await realFetch(base + '/auth' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            return { status: response.status, ...(await response.json()) };
        }
        const request = (phone = '09925280374') => call('/admin/forgot-password', { phone });
        const reset = (challenge, code = '123456') => call('/admin/reset-password', { challenge, code, password: 'New-password-456' });
        const clearLimits = () => query('DELETE FROM admin_sms_rate_limits');
        const oldLogin = await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
        assert.equal(oldLogin.status, 200);
        for (const phone of ['09900000000', '09911111111']) {
            const reply = await request(phone); assert.equal(reply.status, 200); assert.equal(reply.challenge.length, 64);
        }
        assert.equal(sends, 0);
        await query("UPDATE users SET phone = NULL WHERE id = 1");
        assert.equal((await request()).status, 200); assert.equal(sends, 0);
        await query("UPDATE users SET phone = '09925280374' WHERE id = 1");
        await clearLimits();
        const sent = await request('+639925280374'); assert.equal(sent.status, 200); assert.equal(sends, 1);
        assert.ok(!JSON.stringify(sent).includes('123456')); assert.ok(!JSON.stringify(sent).includes('09925280374'));
        assert.equal((await reset(sent.challenge, '000000')).status, 400);
        assert.equal((await reset(sent.challenge)).status, 200);
        assert.equal((await reset(sent.challenge)).status, 400);
        const users = await query('SELECT password FROM users WHERE id = 1');
        assert.equal(await bcrypt.compare('New-password-456', users[0].password), true);
        assert.equal((await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).status, 401);
        assert.equal((await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: 'New-password-456' })).status, 200);
        assert.equal((await realFetch(base + '/protected', { headers: { Authorization: 'Bearer ' + oldLogin.token } })).status, 401);
        assert.equal((await call('/forgot-password', { email: process.env.ADMIN_EMAIL })).status, 200);
        assert.equal((await call('/login', { email: process.env.ADMIN_EMAIL, password: 'New-password-456' })).status, 401);
        await clearLimits();
        const changed = await request();
        await query("UPDATE users SET phone = '09999999999' WHERE id = 1");
        assert.equal((await reset(changed.challenge)).status, 400);
        await query("UPDATE users SET phone = '09925280374' WHERE id = 1");
        const expired = await request();
        await query('UPDATE admin_sms_resets SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
        assert.equal((await reset(expired.challenge)).status, 400);
        await clearLimits();
        const exhausted = await request();
        for (let i = 0; i < 5; i++) assert.equal((await reset(exhausted.challenge, '000000')).status, 400);
        assert.equal((await reset(exhausted.challenge)).status, 400);
        await clearLimits();
        for (const phone of ['09925280374', '+639925280374', '639925280374']) assert.equal((await request(phone)).status, 200);
        assert.equal((await request()).status, 429);
        await clearLimits();
        await query("INSERT INTO users (email, password, role, phone) VALUES ('duplicate@example.test', 'unused', 'admin', '+639925280374')");
        const previousSends = sends;
        assert.equal((await request()).status, 200); assert.equal(sends, previousSends);
        await query("DELETE FROM users WHERE email = 'duplicate@example.test'");
        assert.equal((await request('not-a-phone')).status, 422);
        assert.equal((await call('/admin/forgot-password', { email: process.env.ADMIN_EMAIL })).status, 422);
        await clearLimits(); providerFails = true;
        assert.equal((await request()).status, 503);
        assert.equal((await reset('invalid')).status, 422);
        delete process.env.TWILIO_AUTH_TOKEN;
        assert.equal((await request()).status, 503);
    } finally {
        global.fetch = realFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        await new Promise(resolve => db.end(resolve));
    }
});
