const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.JWT_SECRET = 'delete-client-test-secret';
const clients = new Set([2, 3]); const booked = new Set([3]);
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query(sql, values, callback) {
  if (sql.startsWith('SELECT password')) return callback(null, [{ password: 'ADMIN_ENV_AUTH' }]);
  if (sql.startsWith('DELETE u,')) {
    assert.match(sql, /u.role = 'client'/); assert.match(sql, /NOT EXISTS .*FROM bookings/s);
    assert.match(sql, /LEFT JOIN messages/); assert.match(sql, /LEFT JOIN client_email_resets/);
    const deleted = clients.has(values[0]) && !booked.has(values[0]);
    if (deleted) clients.delete(values[0]); return callback(null, { affectedRows: deleted ? 1 : 0 });
  }
  if (sql.startsWith('SELECT id FROM users')) return callback(null, clients.has(values[0]) ? [{ id: values[0] }] : []);
  throw new Error('Unexpected query: ' + sql);
} } };
const { issueAccessToken } = require('../utils/authTokens');
const app = express(); app.use(express.json()); app.use('/auth', require('../routes/authRoutes'));

test('only admins can delete clients; booking history and admin accounts are protected', async () => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function remove(id, role) {
    return fetch(base + '/auth/clients/' + id, { method: 'DELETE', headers: role ? { Authorization: 'Bearer ' + issueAccessToken({ id: role === 'admin' ? 1 : 2, role }) } : {} });
  }
  try {
    assert.equal((await remove(2)).status, 401);
    assert.equal((await remove(2, 'client')).status, 403);
    assert.equal((await remove('bad', 'admin')).status, 400);
    assert.equal((await remove(3, 'admin')).status, 409); assert.ok(clients.has(3));
    assert.equal((await remove(1, 'admin')).status, 404);
    assert.equal((await remove(2, 'admin')).status, 200); assert.equal(clients.has(2), false);
    assert.equal((await remove(2, 'admin')).status, 404);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
