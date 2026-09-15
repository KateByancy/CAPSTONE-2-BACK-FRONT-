const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'client-email-test-only';
process.env.ADMIN_RECOVERY_GMAIL_USER = 'sender@gmail.com';
process.env.ADMIN_RECOVERY_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';
process.env.FRONTEND_URL = 'http://localhost:3000';
const db = require('../config/db');
const nodemailer = require('nodemailer');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));

test('registration email receives a one-time code that resets only the registered client password', async () => {
    let server;
    let code;
    let sends = 0;
    let mailFails = false;
    const originalTransport = nodemailer.createTransport;
    nodemailer.createTransport = options => {
        assert.equal(options.host, 'smtp.gmail.com');
        assert.equal(options.secure, true);
        return { sendMail: async message => {
            sends++;
            assert.equal(message.to, 'client@gmail.com');
            code = message.text.match(/code is: (\d{6})/)[1];
            return { accepted: mailFails ? [] : [message.to] };
        } };
    };
    try {
        await query(`CREATE TEMPORARY TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, fullname VARCHAR(100), phone VARCHAR(30),
            address VARCHAR(255), landmark VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(20) DEFAULT 'client')`);
        for (const sql of require('../migrations/clientEmailCode')) await query(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE'));
        await query("INSERT INTO users (email, password, role) VALUES ('admin@gmail.com', 'unchanged', 'admin')");
        const app = express(); app.use(express.json()); app.use('/api/auth', require('../routes/authRoutes'));
        server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
        const base = `http://127.0.0.1:${server.address().port}/api/auth`;
        const call = async (path, body) => {
            const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            return { status: response.status, ...(await response.json()) };
        };
        const request = (email = 'client@gmail.com') => call('/forgot-password/code', { email });
        const reset = (challenge, value = code) => call('/reset-password/code', { challenge, code: value, password: 'New-password-456' });
        const clear = () => query('DELETE FROM client_email_rate_limits');
        const registered = await call('/register', { fullname: 'Client', phone: '09911111111', address: 'Test Address', landmark: 'Test Landmark', email: ' Client@Gmail.Com ', password: 'Old-password-123' });
        assert.equal(registered.status, 201);
        assert.equal(registered.user.email, 'client@gmail.com');
        assert.equal((await request('invalid')).status, 422);
        const unknown = await request('unknown@gmail.com');
        const admin = await request('admin@gmail.com');
        assert.equal(unknown.status, 200); assert.equal(admin.status, 200); assert.equal(sends, 0);
        const sent = await request('CLIENT@gmail.com');
        assert.equal(sent.status, 200);
        assert.equal(sent.challenge.length, 64);
        assert.equal(sent.code, undefined);
        assert.equal(sent.message, unknown.message);
        assert.equal((await reset(sent.challenge, code === '000000' ? '000001' : '000000')).status, 400);
        assert.equal((await reset(sent.challenge)).status, 200);
        assert.equal((await reset(sent.challenge)).status, 400);
        assert.equal((await call('/login', { email: 'client@gmail.com', password: 'Old-password-123' })).status, 401);
        assert.equal((await call('/login', { email: 'client@gmail.com', password: 'New-password-456' })).status, 200);
        assert.equal((await query("SELECT password FROM users WHERE role='admin'"))[0].password, 'unchanged');
        await clear();
        const old = await request(); const oldCode = code; await request();
        assert.equal((await reset(old.challenge, oldCode)).status, 400);
        await clear(); const expired = await request();
        await query('UPDATE client_email_resets SET expires_at=DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
        assert.equal((await reset(expired.challenge)).status, 400);
        await clear(); const exhausted = await request(); const correctCode = code;
        for (let i = 0; i < 5; i++) assert.equal((await reset(exhausted.challenge, correctCode === '000000' ? '000001' : '000000')).status, 400);
        assert.equal((await reset(exhausted.challenge, correctCode)).status, 400);
        await clear(); const changed = await request();
        await query("UPDATE users SET email='changed@gmail.com' WHERE role='client'");
        assert.equal((await reset(changed.challenge)).status, 400);
        await query("UPDATE users SET email='client@gmail.com' WHERE role='client'");
        await clear(); const concurrent = await request();
        assert.deepEqual((await Promise.all([reset(concurrent.challenge), reset(concurrent.challenge)])).map(r => r.status).sort(), [200, 400]);
        await clear(); mailFails = true;
        assert.equal((await request()).status, 503);
        assert.equal((await query('SELECT COUNT(*) AS total FROM client_email_resets WHERE used_at IS NULL AND expires_at>NOW()'))[0].total, 0);
        mailFails = false; await clear();
        for (let i = 0; i < 3; i++) assert.equal((await request()).status, 200);
        assert.equal((await request()).status, 429);
        delete process.env.ADMIN_RECOVERY_GMAIL_APP_PASSWORD;
        assert.equal((await request()).status, 503);
    } finally {
        nodemailer.createTransport = originalTransport;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        db.destroy();
    }
});
