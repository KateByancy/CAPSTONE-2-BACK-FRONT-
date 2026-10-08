const { test } = require('node:test');
const assert = require('node:assert/strict');
const compare = require('../utils/paymentOrder');

test('latest submitted payment comes first, ahead of a newer unpaid bill', () => {
    const rows = [
        { id: 30, status: 'Awaiting payment', created_at: '2026-10-08T12:00:00Z' },
        { id: 20, status: 'For verification', submitted_at: '2026-10-08T10:00:00Z' },
        { id: 10, status: 'For verification', submitted_at: '2026-10-08T11:00:00Z' },
    ];
    assert.deepEqual(rows.sort(compare).map(row => row.id), [10, 20, 30]);
});

test('confirmation and resubmission dates update order, with IDs breaking ties', () => {
    const rows = [
        { id: 3, status: 'Returned', submitted_at: '2026-10-07T10:00:00Z', reviewed_at: '2026-10-08T15:00:00Z' },
        { id: 2, status: 'Paid', submitted_at: '2026-10-07T09:00:00Z', reviewed_at: '2026-10-08T12:00:00Z' },
        { id: 1, status: 'For verification', submitted_at: '2026-10-08T12:00:00Z' },
    ];
    assert.deepEqual(rows.sort(compare).map(row => row.id), [2, 1, 3]);
});

test('unpaid bills retain newest-first ordering and missing timestamps are supported', () => {
    const rows = [
        { id: 3, status: 'Awaiting payment', created_at: '2026-10-07T12:00:00Z' },
        { id: 1, status: 'Awaiting payment', created_at: '2026-10-08T12:00:00Z' },
        { id: 2, status: 'Awaiting payment', created_at: 'invalid' },
    ];
    assert.deepEqual(rows.sort(compare).map(row => row.id), [1, 3, 2]);
});
