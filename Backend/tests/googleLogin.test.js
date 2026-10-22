const { test } = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const dbPath = require.resolve('../config/db');
const queries = [];
let users = [];
let databaseFails = false;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  query(sql, values, callback) {
    queries.push({ sql, values });
    if (databaseFails) return callback(new Error('private database error'));
    if (sql.startsWith('SELECT')) return callback(null, users);
    if (sql.startsWith('INSERT')) return callback(null, { insertId: 42 });
    throw new Error('Unexpected query');
  },
} };
const controller = require('../controllers/authController');
const { getGoogleClientId } = require('../utils/googleIdentity');
const clientId = '1234567890-testclient.apps.googleusercontent.com';
const call = async (credential = 'valid-token') => {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await controller.googleLogin({ body: { credential } }, response);
  return response;
};

test('Google sign-in verifies credentials, returns client sessions, and rejects invalid accounts', async () => {
  const previousId = process.env.GOOGLE_CLIENT_ID;
  const previousSecret = process.env.JWT_SECRET;
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  process.env.JWT_SECRET = 'google-auth-test-only';
  let verificationError;
  let profile = { sub: 'google-user-123', email: 'Client@Gmail.com', name: 'Test Client', email_verified: true };
  OAuth2Client.prototype.verifyIdToken = async function(options) {
    assert.equal(options.audience, clientId);
    assert.equal(options.idToken, 'valid-token');
    if (verificationError) throw verificationError;
    return { getPayload: () => profile };
  };
  try {
    process.env.GOOGLE_CLIENT_ID = 'your-google-oauth.apps.googleusercontent.com';
    assert.equal(getGoogleClientId(), null);
    assert.equal((await call()).statusCode, 503);
    process.env.GOOGLE_CLIENT_ID = ' ' + clientId + ' ';
    assert.equal(getGoogleClientId(), clientId);
    assert.equal((await call('')).statusCode, 400);
    verificationError = new Error('invalid signature or audience');
    assert.equal((await call()).statusCode, 401);
    verificationError = Object.assign(new Error('network failed'), { code: 'ENOTFOUND' });
    assert.equal((await call()).statusCode, 502);
    verificationError = undefined;
    profile.email_verified = false;
    assert.equal((await call()).statusCode, 403);
    profile.email_verified = true;
    users = [{ id: 1, fullname: 'Existing Client', email: 'client@gmail.com', role: 'client' }];
    let result = await call();
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.user.id, 1);
    assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).role, 'client');
    assert.equal(queries.at(-1).values[0], 'client@gmail.com');
    users = [{ id: 2, email: 'client@gmail.com', role: 'admin' }];
    assert.equal((await call()).statusCode, 403);
    users = [];
    result = await call();
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.user.id, 42);
    assert.equal(result.body.user.landmark, '');
    assert.match(queries.at(-1).sql, /landmark/);
    assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, 42);
    databaseFails = true;
    result = await call();
    assert.equal(result.statusCode, 500);
    assert.doesNotMatch(result.body.message, /private database error/);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});
