const { test } = require('node:test');
const assert = require('node:assert/strict');

test('server mounts both recovery flows at the frontend API paths', async () => {
    // Validation should reject these requests without accessing any database.
    const mysql = require('mysql2');
    const originalCreateConnection = mysql.createConnection;
    mysql.createConnection = () => ({
        query() { throw new Error('Unexpected database query during route validation'); },
        destroy() {},
    });
    const app = require('../server');
    mysql.createConnection = originalCreateConnection;
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        for (const path of ['admin/forgot-password', 'admin/reset-password', 'forgot-password', 'reset-password']) {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
            });
            assert.equal(response.status, 422, path);
            assert.equal((await response.json()).success, false);
        }
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        require('../config/db').destroy();
    }
});

test('reset email delivers a usable link and reports provider failures', async () => {
    const mail = require('../services/passwordResetMail');
    process.env.RESEND_API_KEY = 'mock-key';
    process.env.PASSWORD_RESET_FROM = 'test@example.test';
    process.env.FRONTEND_URL = 'https://example.test,https://other.example.test';
    const originalFetch = global.fetch;
    try {
        global.fetch = async (url, options) => {
            assert.equal(url, 'https://api.resend.com/emails');
            const message = JSON.parse(options.body);
            assert.deepEqual(message.to, ['client@example.test']);
            assert.ok(message.text.includes('https://example.test/reset-password?token=' + 'a'.repeat(64)));
            return Response.json({ id: 'mock-id' });
        };
        await mail.send('client@example.test', 'a'.repeat(64), 15);
        global.fetch = async () => new Response('{}', { status: 503 });
        await assert.rejects(mail.send('client@example.test', 'a'.repeat(64), 15), /MAIL_PROVIDER_UNAVAILABLE/);
        delete process.env.RESEND_API_KEY;
        assert.equal(mail.configured(), false);
        await assert.rejects(mail.send('client@example.test', 'a'.repeat(64), 15), /MAIL_NOT_CONFIGURED/);
    } finally {
        global.fetch = originalFetch;
    }
});

test('Google recovery requires a verified Google identity and keeps admin accounts separate', async () => {
    const controller = require('../controllers/authController');
    const db = require('../config/db');
    const originalQuery = db.query;
    const originalFetch = global.fetch;
    process.env.GOOGLE_CLIENT_ID = 'google-client-fixture';
    process.env.JWT_SECRET = 'google-recovery-test-only';
    let verified = true;
    let role = 'client';
    let queries = 0;
    global.fetch = async () => Response.json({ aud: 'google-client-fixture', email: 'google@example.test', email_verified: verified });
    db.query = (_sql, values, callback) => {
        queries++;
        assert.deepEqual(values, ['google@example.test']);
        callback(null, [{ id: 7, fullname: 'Google Client', email: 'google@example.test', role }]);
    };
    const call = async () => {
        const result = { statusCode: 200 };
        const response = { status(code) { result.statusCode = code; return this; }, json(body) { result.body = body; return this; } };
        await controller.googleLogin({ body: { credential: 'google-signed-credential-fixture' } }, response);
        return result;
    };
    try {
        const signedIn = await call();
        assert.equal(signedIn.statusCode, 200);
        assert.ok(signedIn.body.token);
        assert.equal(signedIn.body.user.id, 7);
        verified = false;
        assert.equal((await call()).statusCode, 403);
        assert.equal(queries, 1);
        verified = true; role = 'admin';
        assert.equal((await call()).statusCode, 403);
    } finally {
        global.fetch = originalFetch;
        db.query = originalQuery;
    }
});

test('missing email configuration reports unavailable delivery without issuing a reset token', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    const result = { statusCode: 200 };
    const response = { set() {}, status(code) { result.statusCode = code; return this; }, json(body) { result.body = body; return this; } };
    await require('../controllers/authController').forgotPassword({ body: { email: 'google@example.test' } }, response, error => { throw error; });
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.code, 'EMAIL_RECOVERY_UNAVAILABLE');
    assert.ok(result.body.message.includes('Password reset emails are currently unavailable'));
    assert.equal(result.body.resetToken, undefined);
});
