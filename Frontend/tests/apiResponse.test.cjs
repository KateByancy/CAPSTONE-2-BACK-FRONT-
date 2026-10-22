/* eslint-disable @typescript-eslint/no-require-imports -- Compile the actual API helper for Node tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/api.ts');
const instance = new Module(filename, module);
instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { readApiResponse } = instance.exports;

test('preserves auth success and JSON validation/credential errors', async () => {
  for (const [status, body] of [
    [200, { success: true, user: { id: 1 }, token: 'test-token' }],
    [201, { success: true, user: { id: 1 } }],
    [422, { success: false, message: 'Validation failed.', errors: [{ field: 'email' }] }],
    [401, { success: false, message: 'Invalid email or password.' }],
    [400, { success: false, message: 'Email already registered.' }],
  ]) {
    assert.deepEqual(await readApiResponse(Response.json(body, { status })), body);
  }
});

test('plain text proxy errors retain HTTP status and useful text', async () => {
  await assert.rejects(readApiResponse(new Response('The page could not be found', { status: 404 })),
    /HTTP 404.*The page could not be found/);
});

test('HTML, empty, malformed JSON and non-object JSON produce useful errors', async () => {
  for (const body of ['<html>private diagnostic</html>', '', '{broken', 'null', '[]', 'true']) {
    await assert.rejects(readApiResponse(new Response(body, { status: 502 })), error => {
      assert.match(error.message, /HTTP 502/);
      assert.doesNotMatch(error.message, /SyntaxError|Unexpected token|private diagnostic/);
      return true;
    });
  }
});

test('API proxy uses public Render in production, retains development/override targets, and rejects production loopback', async () => {
  const configFilename = path.resolve(__dirname, '../next.config.ts');
  const config = new Module(configFilename, module);
  config._compile(ts.transpileModule(fs.readFileSync(configFilename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, configFilename);
  const previous = { NODE_ENV: process.env.NODE_ENV, BACKEND_API_URL: process.env.BACKEND_API_URL };
  const destination = async () => (await config.exports.default.rewrites())[0].destination;
  try {
    delete process.env.BACKEND_API_URL;
    process.env.NODE_ENV = 'production';
    assert.equal(await destination(), 'https://api-marc.onrender.com/api/:path*');
    process.env.NODE_ENV = 'development';
    assert.equal(await destination(), 'http://localhost:5000/api/:path*');
    process.env.BACKEND_API_URL = ' https://custom-api.example.test/api/ ';
    process.env.NODE_ENV = 'production';
    assert.equal(await destination(), 'https://custom-api.example.test/api/:path*');
    for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
      process.env.BACKEND_API_URL = `http://${hostname}:5000/api`;
      await assert.rejects(destination(), /BACKEND_API_URL must point to the public backend/);
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
