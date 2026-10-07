const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequestProtection, LIMITS } = require('../middeware/requestProtection');

function request(limiter, { path = '/home', method = 'GET', ip = '192.0.2.1' } = {}) {
    const result = { status: 200, headers: {}, passed: false };
    limiter({ path, method, ip, socket: { remoteAddress: ip } }, {
        set(key, value) { result.headers[key] = value; return this; },
        status(code) { result.status = code; return this; },
        json(body) { result.body = body; return this; },
    }, () => { result.passed = true; });
    return result;
}

test('each policy allows normal traffic and blocks the first excessive request', () => {
    const paths = { api: '/home', writes: '/settings', login: '/auth/login', register: '/auth/register',
        recovery: '/auth/forgot-password/code', submissions: '/booking', inquiries: '/inquiries',
        chat: '/chat', checkout: '/payment/1/checkout' };
    for (const [scope, policy] of Object.entries(LIMITS)) {
        let time = 1000;
        const limiter = createRequestProtection({ now: () => time });
        const options = { path: paths[scope], method: scope === 'api' ? 'GET' : 'POST' };
        for (let i = 0; i < policy.max; i++) assert.equal(request(limiter, options).passed, true, scope);
        const blocked = request(limiter, options);
        assert.equal(blocked.status, 429, scope);
        assert.equal(blocked.passed, false);
        assert.equal(blocked.headers['Retry-After'], String(policy.windowMs / 1000));
        assert.equal(blocked.headers['Cache-Control'], 'no-store');
        assert.equal(blocked.body.success, false);
        assert.equal(request(limiter, { ...options, ip: '192.0.2.2' }).passed, true);
        time += policy.windowMs;
        assert.equal(request(limiter, options).passed, true, scope + ' expires');
    }
});

test('aliases, checkout IDs, IPv6 address rotation and mapped IPv4 cannot reset counters', () => {
    const limiter = createRequestProtection();
    for (let i = 0; i < LIMITS.login.max; i++) {
        assert.equal(request(limiter, { method: 'POST', path: ['/auth/login', '/AUTH/ADMIN-LOGIN/', '/auth/google'][i % 3] }).passed, true);
    }
    assert.equal(request(limiter, { method: 'POST', path: '/auth/google', ip: '::ffff:c000:201' }).status, 429);
    const checkout = createRequestProtection();
    for (let i = 0; i < LIMITS.checkout.max; i++) {
        assert.equal(request(checkout, { method: 'POST', path: `/payment/${i}/checkout`, ip: '2001:db8:1:2::1' }).passed, true);
    }
    assert.equal(request(checkout, { method: 'POST', path: '/payment/new/checkout', ip: '2001:0db8:0001:0002::abcd' }).status, 429);
    assert.equal(request(checkout, { method: 'POST', path: '/payment/new/checkout', ip: '2001:db8:1:3::1' }).passed, true);
});

test('preflights and normal polling do not consume sensitive limits', () => {
    const limiter = createRequestProtection();
    for (let i = 0; i < 1000; i++) assert.equal(request(limiter, { method: 'OPTIONS', path: '/auth/login' }).passed, true);
    for (let i = 0; i < 120; i++) assert.equal(request(limiter, { path: '/chat/1' }).passed, true);
    assert.equal(request(limiter, { method: 'POST', path: '/auth/login' }).passed, true);
    assert.equal(request(limiter, { method: 'POST', path: '/auth/presence' }).passed, true);
});

test('bounded storage never evicts active limits and reclaims expired entries', () => {
    let time = 0;
    const limiter = createRequestProtection({ now: () => time, maxEntries: 1 });
    assert.equal(request(limiter).passed, true);
    assert.equal(request(limiter, { ip: '192.0.2.2' }).status, 429);
    assert.equal(request(limiter).passed, true);
    time = 60000;
    assert.equal(request(limiter, { ip: '192.0.2.2' }).passed, true);
});

test('existing server supports Client/Admin login, profiles and presence; blocks bots before controllers', async () => {
    process.env.JWT_SECRET = 'request-protection-test-only';
    process.env.ADMIN_EMAIL = 'admin@example.test';
    process.env.ADMIN_PASSWORD = 'Admin-password-123';
    delete process.env.ANTI_BOT_TRUSTED_PROXIES;
    const password = await require('bcrypt').hash('Client-password-123', 4);
    const client = { id: 1, email: 'client@example.test', fullname: 'Client', role: 'client', password };
    const admin = { id: 2, email: process.env.ADMIN_EMAIL, fullname: 'Admin', role: 'admin', password: 'ADMIN_ENV_AUTH' };
    let queries = 0;
    const dbPath = require.resolve('../config/db');
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
        query(sql, values, callback) {
            queries++;
            if (sql.startsWith('SELECT password')) return callback(null, [{ password: admin.password }]);
            if (sql.includes('WHERE email = ?')) return callback(null, [values[0] === client.email ? client : admin]);
            if (sql.startsWith('SELECT id, fullname, phone')) {
                const { password: ignored, ...profile } = Number(values[0]) === 1 ? client : admin;
                return callback(null, [profile]);
            }
            if (sql.startsWith('UPDATE users SET last_seen')) return callback(null, { affectedRows: 1 });
            throw new Error('Unexpected query: ' + sql);
        },
        ping(callback) { callback(null); },
    } };
    const app = require('../server');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    try {
        const signedClient = await post('/auth/login', { email: client.email, password: 'Client-password-123' });
        assert.equal(signedClient.status, 200);
        const clientToken = (await signedClient.json()).token;
        const signedAdmin = await post('/auth/admin-login', { email: admin.email, password: process.env.ADMIN_PASSWORD });
        assert.equal(signedAdmin.status, 200);
        const adminToken = (await signedAdmin.json()).token;
        for (const [id, token] of [[1, clientToken], [2, adminToken]]) {
            assert.equal((await fetch(base + `/profile/${id}`, { headers: { Authorization: `Bearer ${token}` } })).status, 200);
            assert.equal((await post('/auth/presence', {}, { Authorization: `Bearer ${token}` })).status, 200);
        }
        for (let i = 2; i < LIMITS.login.max; i++) {
            assert.equal((await post('/auth/login', {}, { 'X-Forwarded-For': `192.0.2.${i}` })).status, 422);
        }
        const beforeBlocked = queries;
        // Invalid JSON proves the limiter runs before parsing as well as before auth/database work.
        const blocked = await fetch(base + '/AUTH/ADMIN-LOGIN/', { method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.1' }, body: '{' });
        assert.equal(blocked.status, 429);
        assert.ok(Number(blocked.headers.get('retry-after')) > 0);
        assert.equal(queries, beforeBlocked);
        assert.equal((await fetch(base + '/profile/1', { headers: { Authorization: `Bearer ${clientToken}` } })).status, 200);
        assert.equal((await fetch(base + '/profile/1', { headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);
        assert.equal((await fetch(base + '/health')).status, 200);
        assert.equal((await fetch(base + '/auth/login', { method: 'OPTIONS' })).status, 204);
        const webhook = await post('/payment/webhook', {});
        assert.notEqual(webhook.status, 429);
        assert.notEqual(webhook.status, 404);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
