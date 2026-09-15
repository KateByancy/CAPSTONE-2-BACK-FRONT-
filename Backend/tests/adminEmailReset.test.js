const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcrypt');
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin-email@example.test';
process.env.ADMIN_PASSWORD = 'Old-password-123';
process.env.JWT_SECRET = 'admin-email-test-only';
process.env.ADMIN_RECOVERY_GMAIL_USER = 'sender@gmail.com';
process.env.ADMIN_RECOVERY_GMAIL_APP_PASSWORD = 'abcdefghijklmnop';
process.env.FRONTEND_URL = 'http://localhost:3000';
const db = require('../config/db');
const nodemailer = require('nodemailer');
const mail = require('../services/adminRecoveryMail');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));

test('Gmail admin recovery changes real login credentials only with a valid single-use email link', async () => {
    const originalTransport = nodemailer.createTransport;
    let token;
    let sends = 0;
    let rejected = false;
    let server;
    nodemailer.createTransport = options => {
        assert.equal(options.host, 'smtp.gmail.com');
        assert.equal(options.port, 465);
        assert.equal(options.secure, true);
        assert.equal(options.auth.user, 'sender@gmail.com');
        return { sendMail: async message => {
            sends++;
            assert.equal(message.to, process.env.ADMIN_EMAIL);
            assert.equal(message.from.address, 'sender@gmail.com');
            token = new URL(message.text.match(/http:\/\/localhost:3000\/admin\/forgot-password\?token=[a-f0-9]+/)[0]).searchParams.get('token');
            return { accepted: rejected ? [] : [message.to] };
        } };
    };
    try {
        await query(`CREATE TEMPORARY TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, fullname VARCHAR(100),
            email VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(20), phone VARCHAR(30), last_seen DATETIME)`);
        for (const sql of require('../migrations/adminEmailReset')) await query(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE'));
        await query("INSERT INTO users (fullname, email, password, role) VALUES ('Admin', ?, 'ADMIN_ENV_AUTH', 'admin')", [process.env.ADMIN_EMAIL]);
        await query("INSERT INTO users (fullname, email, password, role) VALUES ('Client', 'client@example.test', 'unchanged', 'client')");
        const app = express(); app.use(express.json()); app.use('/auth', require('../routes/authRoutes'));
        app.get('/protected', require('../middeware/auth'), (_req, res) => res.json({ success: true }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const call = async (path, body) => {
            const response = await fetch(base + '/auth' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            return { status: response.status, ...(await response.json()) };
        };
        const request = (email = process.env.ADMIN_EMAIL) => call('/admin/forgot-password/email', { email });
        const reset = (value = token) => call('/admin/reset-password/email', { token: value, password: 'New-password-456' });
        const clearLimits = () => query('DELETE FROM admin_email_rate_limits');
        const oldLogin = await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
        assert.equal(oldLogin.status, 200);
        assert.equal((await request('bad-email')).status, 422);
        assert.equal((await request('unknown@example.test')).status, 200);
        assert.equal((await request('client@example.test')).status, 200);
        assert.equal(sends, 0);
        const sent = await request();
        assert.equal(sent.status, 200);
        assert.equal(token.length, 64);
        assert.equal(JSON.stringify(sent).includes(token), false);
        assert.equal((await reset('0'.repeat(64))).status, 400);
        assert.equal((await reset()).status, 200);
        assert.equal((await reset()).status, 400);
        assert.equal((await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).status, 401);
        assert.equal((await call('/admin-login', { email: process.env.ADMIN_EMAIL, password: 'New-password-456' })).status, 200);
        assert.equal((await fetch(base + '/protected', { headers: { Authorization: 'Bearer ' + oldLogin.token } })).status, 401);
        assert.equal(await bcrypt.compare('New-password-456', (await query('SELECT password FROM users WHERE id=1'))[0].password), true);
        assert.equal((await query('SELECT password FROM users WHERE id=2'))[0].password, 'unchanged');
        await clearLimits();
        await request(); const replacedToken = token; await request();
        assert.equal((await reset(replacedToken)).status, 400);
        await query('UPDATE admin_email_resets SET expires_at=DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
        assert.equal((await reset()).status, 400);
        await clearLimits(); await request();
        await query("UPDATE users SET email='changed@example.test' WHERE id=1");
        assert.equal((await reset()).status, 400);
        await query('UPDATE users SET email=? WHERE id=1', [process.env.ADMIN_EMAIL]);
        await request();
        await query("UPDATE users SET password='changed-password-fingerprint' WHERE id=1");
        assert.equal((await reset()).status, 400);
        await clearLimits(); await request();
        const concurrent = await Promise.all([reset(), reset()]);
        assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 400]);
        await clearLimits(); rejected = true;
        assert.equal((await request()).status, 503);
        assert.equal((await reset()).status, 400);
        rejected = false; await clearLimits();
        for (let i = 0; i < 3; i++) assert.equal((await request()).status, 200);
        assert.equal((await request()).status, 429);
        delete process.env.ADMIN_RECOVERY_GMAIL_APP_PASSWORD;
        assert.equal(mail.configuration().configured, false);
        assert.equal((await request()).status, 503);
    } finally {
        nodemailer.createTransport = originalTransport;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        db.destroy();
    }
});
