const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Client/Admin login accepts both custom domain origins and retains strict CORS', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000,https://configured-preview.example.test/';
    const dbPath = require.resolve('../config/db');
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
        query() { throw new Error('Invalid login input must not access the database'); },
    } };
    const app = require('../server');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/auth`;
    try {
        for (const origin of ['https://marcinteriordesign.site', 'https://www.marcinteriordesign.site',
            'http://localhost:3000', 'https://configured-preview.example.test']) {
            for (const route of ['/login', '/admin-login']) {
                const preflight = await fetch(base + route, { method: 'OPTIONS', headers: {
                    Origin: origin, 'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type,authorization',
                } });
                assert.equal(preflight.status, 204);
                assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
                assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
                const response = await fetch(base + route, { method: 'POST', headers: {
                    Origin: origin, 'Content-Type': 'application/json',
                }, body: '{}' });
                // Reaching the unchanged login validator demonstrates CORS no longer rejects it.
                assert.equal(response.status, 422);
                assert.equal(response.headers.get('access-control-allow-origin'), origin);
                assert.notEqual((await response.json()).message, 'Origin is not allowed by CORS.');
            }
        }
        for (const origin of ['https://attacker.example', 'https://marcinteriordesign.site.attacker.example',
            'http://marcinteriordesign.site', 'https://www.marcinteriordesign.site:444']) {
            const response = await fetch(base + '/login', { method: 'POST', headers: {
                Origin: origin, 'Content-Type': 'application/json',
            }, body: '{}' });
            assert.equal(response.status, 403);
            assert.equal(response.headers.get('access-control-allow-origin'), null);
            assert.equal((await response.json()).message, 'Origin is not allowed by CORS.');
        }
        assert.equal((await fetch(base + '/login', { method: 'POST', headers: {
            'Content-Type': 'application/json',
        }, body: '{}' })).status, 422);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
