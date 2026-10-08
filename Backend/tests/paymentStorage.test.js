const { test } = require('node:test');
const assert = require('node:assert/strict');
const migrate = require('../migrations/paymentStorage');

test('payment setup creates missing storage using MySQL-compatible SQL and preserves existing columns', async () => {
    const tables = new Map([['bookings', new Set(['id'])]]);
    const changes = [];
    const query = async sql => {
        assert.doesNotMatch(sql, /ADD COLUMN IF NOT EXISTS|DROP |TRUNCATE |DELETE FROM/);
        const creation = sql.match(/^CREATE TABLE IF NOT EXISTS (\w+)/);
        if (creation) {
            if (!tables.has(creation[1])) tables.set(creation[1], new Set(['id', 'account_name', 'account_number']));
            return [];
        }
        const inspection = sql.match(/^SHOW COLUMNS FROM `(\w+)`$/);
        if (inspection) return [...tables.get(inspection[1])].map(Field => ({ Field }));
        const alteration = sql.match(/^ALTER TABLE `(\w+)` ADD COLUMN `(\w+)`/);
        assert.ok(alteration, sql);
        assert.equal(tables.get(alteration[1]).has(alteration[2]), false);
        tables.get(alteration[1]).add(alteration[2]);
        changes.push(sql);
        return [];
    };
    await migrate(query);
    assert.ok(tables.get('gcash_settings').has('qr_image'));
    assert.ok(tables.get('gcash_requests').has('qr_image'));
    assert.ok(tables.get('gcash_requests').has('payment_provider'));
    assert.ok(tables.get('bookings').has('estimate'));
    assert.ok(tables.get('bookings').has('accepted_at'));
    const count = changes.length;
    await migrate(query);
    assert.equal(changes.length, count);
});

test('payment setup tolerates concurrent additions but exposes permission failures', async () => {
    const query = async sql => {
        if (sql.startsWith('SHOW COLUMNS')) return [];
        if (sql.startsWith('ALTER TABLE')) throw Object.assign(new Error('Concurrent addition'), { code: 'ER_DUP_FIELDNAME' });
        return [];
    };
    await migrate(query);
    await assert.rejects(migrate(async () => { throw Object.assign(new Error('Denied'), { code: 'ER_TABLEACCESS_DENIED_ERROR' }); }), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
});
