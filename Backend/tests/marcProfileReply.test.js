const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { getMarcProfileReply } = require('../services/marcProfileReply');

test('answers specific English and Filipino profile questions from the saved knowledge', () => {
    for (const question of ["What's Marc's phone number?", 'Ano ang numero ni Marc?', 'Contact number please', "Marc's number?"]) {
        assert.equal(getMarcProfileReply(question), "Marc's contact number is 09925280374.");
    }
    assert.match(getMarcProfileReply("What is Marc's info?"), /Marc Rossel P\. Lecciones/);
    assert.match(getMarcProfileReply('Sino si Marc?'), /09925280374/);
    assert.match(getMarcProfileReply('Marc Facebook account name'), /Marc Rossel Lecciones/);
    assert.match(getMarcProfileReply('Saan nakatira si Marc?'), /Placer, Masbate/);
    assert.match(getMarcProfileReply("Marc's birthday?"), /February 20, 1997/);
    assert.match(getMarcProfileReply('What is Marc advertising work?'), /digital and print/);
    assert.equal(getMarcProfileReply('How old is Marc?', new Date('2026-02-19T12:00:00Z')), 'Marc is 28 years old.');
    assert.equal(getMarcProfileReply('How old is Marc?', new Date('2026-02-20T12:00:00Z')), 'Marc is 29 years old.');
    for (const question of ['Change my phone number', 'What is my address?', 'Pay GCash to Marc phone number?', 'Show portfolio', 'What is my verification code?']) {
        assert.equal(getMarcProfileReply(question), null);
    }
});

test('client profile inquiry saves an automatic bot reply without checking presence or calling Gemini', async () => {
    const saved = [];
    const testModule = { exports: {} };
    const source = fs.readFileSync(path.join(__dirname, '../controllers/chatController.js'), 'utf8');
    vm.runInNewContext(source, {
        module: testModule, console,
        require(name) {
            if (name === '../config/db') return { query(sql, values, callback) {
                assert.match(sql, /^INSERT INTO messages/);
                saved.push(values); callback(null, { affectedRows: 1 });
            } };
            if (name === '../services/geminiChat') return { generateReply() { throw new Error('Should not call AI'); } };
            if (name === '../services/marcProfileReply') return { getMarcProfileReply };
            if (name === '../services/portfolioChat') return require('../services/portfolioChat');
            throw new Error(name);
        },
    });
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await testModule.exports.sendMessage({ body: { user_id: 1, message: "What's Marc's phone number?" }, user: { id: 1, role: 'client' } }, res);
    assert.equal(res.code, 201); assert.equal(res.body.responder, 'knowledge');
    assert.equal(saved.length, 2); assert.equal(saved[1][1], "Marc's contact number is 09925280374.");
});
