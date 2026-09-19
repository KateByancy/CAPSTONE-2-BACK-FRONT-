const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const { configuration, checkRegisteredWebhook } = require('../services/paymentConfig');
const { verifySignature, createHandler } = require('../services/paymongoWebhook');
const { paidPayment } = require('../services/paymongoCheckout');

function liveConfig() {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENTS_MODE = 'live';
    process.env.PAYMONGO_SECRET_KEY = 'sk_live_fixture';
    process.env.PAYMONGO_WEBHOOK_SECRET = 'webhook-fixture';
    process.env.FRONTEND_URL = 'https://example.test';
}
function sign(body, live = true, timestamp = Math.floor(Date.now() / 1000)) {
    const digest = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET).update(`${timestamp}.`).update(body).digest('hex');
    return `t=${timestamp},${live ? 'li' : 'te'}=${digest}`;
}

test('production refuses test keys, missing webhook secrets and insecure return URLs', () => {
    liveConfig();
    assert.equal(configuration().configured, true);
    process.env.PAYMONGO_SECRET_KEY = 'sk_test_fixture';
    assert.equal(configuration().configured, false);
    liveConfig(); process.env.PAYMENTS_MODE = 'test';
    assert.equal(configuration().configured, false);
    liveConfig(); delete process.env.PAYMONGO_WEBHOOK_SECRET;
    assert.equal(configuration().configured, false);
    liveConfig(); process.env.PAYMONGO_WEBHOOK_SECRET = '   ';
    assert.equal(configuration().configured, false);
    liveConfig(); process.env.FRONTEND_URL = 'http://localhost:3000';
    assert.equal(configuration().configured, false);
    liveConfig();
});

test('signatures reject tampering, expired delivery timestamps and wrong modes', () => {
    liveConfig();
    const body = Buffer.from('{"example":true}');
    const signature = sign(body);
    assert.equal(verifySignature(body, signature, process.env.PAYMONGO_WEBHOOK_SECRET, true), true);
    assert.equal(verifySignature(Buffer.from('{}'), signature, process.env.PAYMONGO_WEBHOOK_SECRET, true), false);
    assert.equal(verifySignature(body, sign(body, false), process.env.PAYMONGO_WEBHOOK_SECRET, true), false);
    assert.equal(verifySignature(body, sign(body, true, 1), process.env.PAYMONGO_WEBHOOK_SECRET, true), false);
    assert.equal(verifySignature(body, 't=1,li=bad', process.env.PAYMONGO_WEBHOOK_SECRET, true), false);
});

test('webhook verifies provider funds, retries failures and applies duplicate notifications once', async () => {
    liveConfig();
    const payment = { id: 1, amount: '100.50', status: 'Awaiting payment', checkout_session_id: 'cs_fixture' };
    const session = { id: 'cs_fixture', attributes: { livemode: true, payments: [
        { id: 'pay_fixture', attributes: { status: 'paid', currency: 'PHP', amount: 10050, source: { type: 'gcash' } } },
    ] } };
    let writes = 0;
    let providerFails = false;
    let databaseFails = false;
    let missing = false;
    const app = express();
    app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), createHandler({
        configuration,
        provider: { paidPayment, request: async path => {
            assert.equal(path, '/checkout_sessions/cs_fixture');
            if (providerFails) throw new Error('Provider unavailable');
            return session;
        } },
        query: async sql => {
            if (databaseFails) throw new Error('Database unavailable');
            if (sql.startsWith('SELECT')) return missing ? [] : [payment];
            assert.ok(sql.includes("status <> 'Paid'"));
            writes++; payment.status = 'Paid'; return { affectedRows: 1 };
        },
    }));
    // This ordering matches server.js: the normal JSON parser must come after the webhook.
    app.use(express.json());
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const event = { data: { id: 'evt_fixture', attributes: { type: 'checkout_session.payment.paid', livemode: true, data: { id: 'cs_fixture', attributes: { reference_number: 'GCASH-1' } } } } };
    const send = async (payload = event, signature) => {
        const body = JSON.stringify(payload);
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payment/webhook`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Paymongo-Signature': signature || sign(body) }, body,
        });
        await response.json();
        return response.status;
    };
    try {
        assert.equal(await send(event, 'invalid'), 401);
        event.data.attributes.livemode = false;
        assert.equal(await send(), 400);
        event.data.attributes.livemode = true;
        providerFails = true; assert.equal(await send(), 503); providerFails = false;
        databaseFails = true; assert.equal(await send(), 503); databaseFails = false;
        missing = true; assert.equal(await send(), 503); missing = false;
        const attributes = session.attributes.payments[0].attributes;
        attributes.amount = 1; assert.equal(await send(), 409); attributes.amount = 10050;
        attributes.currency = 'USD'; assert.equal(await send(), 409); attributes.currency = 'PHP';
        attributes.source.type = 'card'; assert.equal(await send(), 409); attributes.source.type = 'gcash';
        session.attributes.livemode = false; assert.equal(await send(), 409); session.attributes.livemode = true;
        assert.equal(writes, 0);
        assert.equal(await send(), 200);
        assert.equal(await send(), 200);
        assert.equal(writes, 1);
        assert.equal(payment.status, 'Paid');
        payment.status = 'Awaiting payment';
        const currentEnvelope = { event_type: 'send.webhook', data: { ...event.data.attributes, resource: 'checkout_session' } };
        assert.equal(await send(currentEnvelope), 200);
        assert.equal(await send(currentEnvelope), 200);
        assert.equal(writes, 2);
        currentEnvelope.data.livemode = false;
        assert.equal(await send(currentEnvelope), 400);
        assert.equal(await send(null), 400);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('live webhook readiness verifies registration without exposing its secret', () => {
    liveConfig();
    const url = 'https://api.example.test/api/payment/webhook';
    const secret = 'private-fixture-signing-secret';
    const hook = { attributes: { url, livemode: true, status: 'enabled', events: ['checkout_session.payment.paid'], secret_key: secret } };
    const check = (hooks = [hook], endpoint = url, signingSecret = secret) => checkRegisteredWebhook(hooks, configuration(), endpoint, signingSecret);
    assert.equal(check(), 1);
    for (const patch of [{ livemode: false }, { status: 'disabled' }, { events: ['payment.paid'] }, { url: 'https://wrong.example.test/api/payment/webhook' }, { secret_key: 'wrong' }]) {
        assert.throws(() => check([{ attributes: { ...hook.attributes, ...patch } }]), error => !error.message.includes(secret));
    }
    for (const endpoint of ['', 'http://api.example.test/api/payment/webhook', 'https://localhost/api/payment/webhook', 'https://api.example.test/wrong', url + '?secret=unsafe']) assert.throws(() => check([hook], endpoint));
    assert.throws(() => check([]));
    assert.throws(() => check(null));
    assert.throws(() => check([hook], url, ''));
});
