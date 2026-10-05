const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
process.env.JWT_SECRET = 'change-password-test-secret';
process.env.ADMIN_PASSWORD = 'InitialAdmin123!';
const accounts = new Map();
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  query(sql, values, callback) {
    if (sql.startsWith('SELECT password')) return callback(null, accounts.has(values[0]) ? [{ password: accounts.get(values[0]) }] : []);
    if (sql.startsWith('UPDATE users SET password')) { accounts.set(values[1], values[0]); return callback(null, { affectedRows: 1 }); }
    if (sql.startsWith('UPDATE password_reset_requests')) return callback(null, { affectedRows: 0 });
    throw new Error('Unexpected query: ' + sql);
  }
} };
const { issueAccessToken } = require('../utils/authTokens');
const app = express(); app.use(express.json()); app.use('/auth', require('../routes/authRoutes'));
app.get('/protected', require('../middeware/auth'), (req, res) => res.json({ success: true }));

test('client and admin password changes validate credentials, hash passwords and renew admin sessions', async () => {
  accounts.set(1, await bcrypt.hash('OldClient123!', 4)); accounts.set(2, 'ADMIN_ENV_AUTH');
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function change(token, currentPassword, newPassword) {
    const response = await fetch(base + '/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ currentPassword, newPassword }) });
    return { status: response.status, data: await response.json() };
  }
  try {
    const clientToken = issueAccessToken({ id: 1, role: 'client' });
    assert.equal((await change(null, 'OldClient123!', 'NewClient123!')).status, 401);
    assert.equal((await change(clientToken, 'wrong', 'NewClient123!')).status, 400);
    assert.equal((await change(clientToken, 'OldClient123!', 'short')).status, 422);
    assert.equal((await change(clientToken, 'OldClient123!', 'OldClient123!')).status, 422);
    assert.equal((await change(clientToken, 'OldClient123!', 'a'.repeat(73))).status, 422);
    const client = await change(clientToken, 'OldClient123!', 'NewClient123!');
    assert.equal(client.status, 200); assert.equal(await bcrypt.compare('NewClient123!', accounts.get(1)), true);
    assert.equal(jwt.verify(client.data.token, process.env.JWT_SECRET).id, 1);
    const oldAdminToken = issueAccessToken({ id: 2, role: 'admin', password: accounts.get(2) });
    const admin = await change(oldAdminToken, 'InitialAdmin123!', 'NewAdmin123!');
    assert.equal(admin.status, 200); assert.equal(await bcrypt.compare('NewAdmin123!', accounts.get(2)), true);
    assert.equal((await fetch(base + '/protected', { headers: { Authorization: 'Bearer ' + oldAdminToken } })).status, 401);
    assert.equal((await fetch(base + '/protected', { headers: { Authorization: 'Bearer ' + admin.data.token } })).status, 200);
    assert.equal((await change(admin.data.token, 'NewAdmin123!', 'FinalAdmin123!')).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
