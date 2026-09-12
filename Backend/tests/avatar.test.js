const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = 'avatar-test-only';
const db = require('../config/db');
const { issueAccessToken } = require('../utils/authTokens');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));

test('admin and client pictures persist across handler reloads and only valid uploads replace them', async () => {
    let server;
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8X8AAAAASUVORK5CYII=', 'base64');
    async function start() {
        delete require.cache[require.resolve('../controllers/avatarController')];
        delete require.cache[require.resolve('../routes/profileRoutes')];
        const app = express(); app.use('/profile', require('../routes/profileRoutes'));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
    }
    async function call(user, data) {
        const body = data ? new FormData() : undefined;
        if (body) body.set('avatar', new Blob([data], { type: 'image/png' }), 'avatar.png');
        return fetch(`http://127.0.0.1:${server.address().port}/profile/me/avatar`, {
            method: body ? 'PUT' : 'GET', body,
            headers: user ? { Authorization: `Bearer ${issueAccessToken(user)}` } : {},
        });
    }
    try {
        await query(require('../migrations/avatars').replace('CREATE TABLE IF NOT EXISTS', 'CREATE TEMPORARY TABLE'));
        await start();
        const admin = { id: 910001, role: 'admin' }, client = { id: 910002, role: 'client' };
        assert.equal((await call(null, image)).status, 401);
        for (const user of [admin, client]) {
            assert.equal((await call(user, image)).status, 200);
            assert.deepEqual(Buffer.from(await (await call(user)).arrayBuffer()), image);
        }
        const saved = await query('SELECT user_id, image FROM profile_avatars ORDER BY user_id');
        assert.equal(saved.length, 2);
        assert.deepEqual(saved[1].image, image);
        await new Promise(resolve => server.close(resolve));
        await start();
        for (const user of [admin, client]) {
            const response = await call(user);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
        }
        assert.equal((await call(client, Buffer.from('<svg>invalid</svg>'))).status, 400);
        assert.deepEqual(Buffer.from(await (await call(client)).arrayBuffer()), image);
        const replacement = Buffer.concat([image, Buffer.from('replacement')]);
        assert.equal((await call(client, replacement)).status, 200);
        assert.deepEqual(Buffer.from(await (await call(client)).arrayBuffer()), replacement);
        assert.deepEqual(Buffer.from(await (await call(admin)).arrayBuffer()), image);
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        db.destroy();
    }
});
