const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = 'profile-test-only-secret';
const rows = new Map([
    [1, { id: 1, fullname: 'Admin', phone: '', address: '', landmark: 'Existing', role: 'admin' }],
    [2, { id: 2, fullname: 'Client', phone: '', address: '', landmark: '', role: 'client' }]
]);
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    query(sql, values, callback) {
        const row = rows.get(Number(values.at(-1)));
        if (sql.startsWith('SELECT')) return callback(null, row ? [{ ...row }] : []);
        assert.match(sql, /^UPDATE users SET /);
        if (!row) return callback(null, { affectedRows: 0 });
        const columns = sql.split(' SET ')[1].split(' WHERE ')[0].split(', ').map(part => part.split(' = ')[0]);
        columns.forEach((column, index) => { row[column] = values[index]; });
        callback(null, { affectedRows: 1 });
    }
} };
const { issueAccessToken } = require('../utils/authTokens');
const app = express();
app.use(express.json());
app.use('/api/profile', require('../routes/profileRoutes'));

test('existing profile routes: admin/client save, reload, validation and authorization', async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/profile`;
    async function request(id, user, body) {
        const response = await fetch(`${base}/${id}`, {
            method: body ? 'PUT' : 'GET',
            headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${issueAccessToken(user)}` } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        return { status: response.status, data: await response.json() };
    }
    try {
        const admin = { id: 1, role: 'admin' };
        const client = { id: 2, role: 'client' };
        const adminSave = await request(1, admin, { fullname: ' Updated Admin ', phone: '123', address: 'Admin address' });
        assert.equal(adminSave.status, 200);
        assert.equal(adminSave.data.profile.fullname, 'Updated Admin');
        assert.equal(adminSave.data.profile.landmark, 'Existing');
        assert.deepEqual((await request(1, admin)).data.profile, adminSave.data.profile);
        const clientSave = await request(2, client, { fullname: 'Updated Client', phone: '456', address: 'Client address', landmark: 'Hall', role: 'admin', password: 'forbidden' });
        assert.equal(clientSave.status, 200);
        assert.equal(clientSave.data.profile.role, 'client');
        assert.equal(clientSave.data.profile.password, undefined);
        assert.deepEqual((await request(2, client)).data.profile, clientSave.data.profile);
        assert.equal((await request(2, client, { fullname: 'Name only' })).status, 200);
        assert.equal(rows.get(2).phone, '456');
        assert.equal((await request(2, client, { landmark: '' })).status, 200);
        for (const body of [{ fullname: ' ' }, { phone: '1'.repeat(31) }, { fullname: {} }, { role: 'admin' }]) {
            assert.equal((await request(2, client, body)).status, 400);
        }
        assert.equal((await request(1, client, { fullname: 'Forbidden' })).status, 403);
        assert.equal((await request(2, null, { fullname: 'Forbidden' })).status, 401);
        assert.equal((await request(999, admin, { fullname: 'Missing' })).status, 404);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
