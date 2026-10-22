const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

test('existing registration/login routes succeed and reject invalid inputs with isolated DB', async () => {
  const users = [];
  const dbPath = require.resolve('../config/db');
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    query(sql, values, callback) {
      if (sql.startsWith('SELECT * FROM users WHERE email')) {
        return callback(null, users.filter(user => user.email === values[0]));
      }
      if (sql.trim().startsWith('INSERT INTO users')) {
        const [fullname, phone, address, landmark, email, password] = values;
        users.push({ id: 1, fullname, phone, address, landmark, email, password, role: 'client' });
        return callback(null, { insertId: 1 });
      }
      throw new Error('Unexpected query in auth route test');
    },
  } };
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const password = crypto.randomBytes(18).toString('hex');
  const account = { fullname: 'Test Client', phone: '09000000000', address: 'Test address',
    landmark: 'Test landmark', email: 'test@example.test', password };
  const post = (route, body) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://marcinteriorbooking.vercel.app' }, body: JSON.stringify(body),
  });
  try {
    for (const route of ['login', 'register']) {
      const response = await post(route, {});
      assert.equal(response.status, 422);
      assert.equal((await response.json()).message, 'Validation failed.');
    }
    let response = await post('register', account);
    assert.equal(response.status, 201);
    let result = await response.json();
    assert.equal(result.success, true);
    assert.equal(result.user.email, account.email);
    assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).id, 1);
    assert.notEqual(users[0].password, password);
    assert.equal(await bcrypt.compare(password, users[0].password), true);
    response = await post('login', { email: account.email, password });
    assert.equal(response.status, 200);
    result = await response.json();
    assert.equal(result.user.id, 1);
    assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).role, 'client');
    response = await post('register', account);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, 'Email already registered.');
    for (const credentials of [{ email: account.email, password: 'wrong-password' },
      { email: 'missing@example.test', password }]) {
      response = await post('login', credentials);
      assert.equal(response.status, 401);
      assert.equal((await response.json()).message, 'Invalid email or password.');
    }
    response = await post('register', { ...account, password: 'short' });
    assert.equal(response.status, 422);
    assert.equal((await response.json()).success, false);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
