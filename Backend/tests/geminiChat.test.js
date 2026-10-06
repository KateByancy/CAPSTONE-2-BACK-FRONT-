const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { generateReply } = require('../services/geminiChat');
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
before(() => { process.env.GEMINI_API_KEY = 'test-only-key'; process.env.GEMINI_MODEL = ' models/gemini-3.8-flash '; });
after(() => {
    for (const [name, value] of [['GEMINI_API_KEY', originalKey], ['GEMINI_MODEL', originalModel]]) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
});
const history = [{ sender: 'bot', message: 'Old reply' }, { sender: 'client', message: 'What services do you offer?' }];
const success = () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'Private reasoning' }, { text: 'Signage and renovation.' }] } }] }) });

test('unconfigured model uses the lightweight concierge default', async () => {
    const model = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    try {
        await generateReply(history, { fetchImpl: async url => {
            assert.ok(url.endsWith('/models/gemini-3.5-flash-lite:generateContent'));
            return success();
        } });
    } finally { process.env.GEMINI_MODEL = model; }
});

test('temporary HTTP errors retry once and preserve the conversation', async () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
        let calls = 0;
        let waits = 0;
        const reply = await generateReply(history, {
            wait: async ms => { assert.ok(ms >= 1000 && ms < 1250); waits++; },
            fetchImpl: async (url, options) => {
                assert.ok(url.endsWith('/models/gemini-3.8-flash:generateContent'));
                const body = JSON.parse(options.body);
                assert.equal(body.contents.length, 1);
                assert.equal(body.contents[0].parts[0].text, history[1].message);
                assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'low');
                return ++calls === 1 ? { ok: false, status } : success();
            },
        });
        assert.equal(reply, 'Signage and renovation.');
        assert.equal(calls, 2); assert.equal(waits, 1);
    }
});

test('network failures retry with a fresh timeout signal', async () => {
    let calls = 0;
    let firstSignal;
    assert.equal(await generateReply(history, {
        wait: async () => {},
        fetchImpl: async (_url, options) => {
            if (++calls === 1) { firstSignal = options.signal; throw new TypeError('fetch failed'); }
            assert.notEqual(options.signal, firstSignal);
            return success();
        },
    }), 'Signage and renovation.');
    assert.equal(calls, 2);
});

test('configuration errors do not retry or expose provider details', async () => {
    for (const status of [400, 401, 403, 404]) {
        let calls = 0;
        await assert.rejects(generateReply(history, { fetchImpl: async () => { calls++; return { ok: false, status }; } }), { message: `GEMINI_HTTP_${status}` });
        assert.equal(calls, 1);
    }
});

test('persistent failure stops after one retry; empty responses stay honest', async () => {
    let calls = 0;
    await assert.rejects(generateReply(history, { wait: async () => {}, fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } }), { message: 'GEMINI_HTTP_503' });
    assert.equal(calls, 2);
    await assert.rejects(generateReply(history, { fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [] }) }) }), { message: 'GEMINI_EMPTY_RESPONSE' });
});
