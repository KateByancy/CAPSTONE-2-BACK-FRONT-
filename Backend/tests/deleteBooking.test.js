const { test } = require('node:test');
const assert = require('node:assert/strict');

// Set secret before requiring any auth middleware
process.env.JWT_SECRET = 'delete-booking-test-secret';

// Mock DB queries for booking controller
const existingBookings = new Map([
  [10, { id: 10, status: 'Pending', is_archived: 0, is_completed_track: 0 }],
  [20, { id: 20, status: 'Ongoing', is_archived: 0, is_completed_track: 0 }], // has quotes/payments/chats/designs
  [30, { id: 30, status: 'Completed', is_archived: 0, is_completed_track: 1 }], // completed project
  [40, { id: 40, status: 'Rejected', is_archived: 0, is_completed_track: 0 }], // rejected booking eligible for client deletion
]);
const bookingsWithHistory = new Set([20]);

const dbPath = require.resolve('../config/db');
let simulateDbError = false;

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query(sql, values, callback) {
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      if (simulateDbError) {
        return callback(new Error('Simulated database failure'));
      }
      // Check query: SELECT b.id, b.status, b.is_archived ... FROM bookings b WHERE b.id = ?
      if (sql.includes('FROM bookings b') && sql.includes('WHERE b.id = ?')) {
        const id = values[0];
        const row = existingBookings.get(id);
        return callback(null, row ? [row] : []);
      }
      // Archive query: UPDATE bookings SET is_archived = 1, archived_at = NOW() WHERE id = ?
      if (sql.startsWith('UPDATE bookings SET is_archived = 1')) {
        const id = values[0];
        const row = existingBookings.get(id);
        if (row) {
          row.is_archived = 1;
          row.archived_at = new Date();
        }
        return callback(null, { affectedRows: row ? 1 : 0 });
      }
      // Delete query
      if (sql.startsWith('DELETE FROM bookings WHERE id=?')) {
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM gcash_requests/);
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM payments/);
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM quotations/);
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM project_messages/);
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM designs/);

        const id = values[0];
        const canDelete = existingBookings.has(id) && !bookingsWithHistory.has(id);
        if (canDelete) {
          existingBookings.delete(id);
        }
        return callback(null, { affectedRows: canDelete ? 1 : 0 });
      }
      if (sql.startsWith('SELECT id FROM bookings WHERE id=?')) {
        const id = Number(values[0]);
        const booking = existingBookings.get(id);
        if (sql.includes('status')) {
          const isRejected = booking && booking.status && booking.status.toLowerCase() === 'rejected';
          return callback(null, isRejected ? [{ id }] : []);
        }
        return callback(null, existingBookings.has(id) ? [{ id }] : []);
      }
      if (sql.startsWith('SELECT password')) {
        return callback(null, [{ password: 'ADMIN_ENV_AUTH' }]);
      }
      throw new Error('Unexpected query: ' + sql);
    }
  }
};

const cache = require('../utils/cache');
const { deleteBooking } = require('../controllers/bookingController');
const projectAccess = require('../middeware/projectAccess');

function createMockReqRes({ id, role = 'admin', method = 'DELETE', path = `/${id}` }) {
  const req = {
    method,
    path,
    url: path,
    params: { id },
    user: { id: 1, role }
  };
  let statusCode = 200;
  let responseData = null;
  const res = {
    set() { return res; },
    status(code) { statusCode = code; return res; },
    json(data) { responseData = data; return res; },
    send(data) { responseData = data; return res; },
    get statusCode() { return statusCode; },
    get data() { return responseData; }
  };
  return { req, res };
}

test('deleteBooking rejects invalid booking IDs with 400', () => {
  for (const badId of ['abc', '-1', '0', null, undefined]) {
    const { req, res } = createMockReqRes({ id: badId });
    deleteBooking(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.message, /invalid booking id/i);
  }
});

test('deleteBooking returns 404 when booking does not exist', () => {
  const { req, res } = createMockReqRes({ id: '999' });
  deleteBooking(req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.data.success, false);
  assert.equal(res.data.message, 'Booking not found.');
});

test('deleteBooking archives completed project instead of permanently deleting it', () => {
  cache.set('schedule:unavailable-slots', ['dummy-slot'], 60000);
  const { req, res } = createMockReqRes({ id: '30' });
  deleteBooking(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.archived, true);
  assert.match(res.data.message, /completed project archived/i);
  assert.equal(existingBookings.get(30).is_archived, 1, 'Completed booking must be marked as archived');
});

test('deleteBooking preserves records and returns 409 when non-completed booking has project history', () => {
  const { req, res } = createMockReqRes({ id: '20' });
  deleteBooking(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.data.success, false);
  assert.match(res.data.message, /cannot be deleted\. keep them for history/i);
  assert.ok(existingBookings.has(20), 'Booking with history must not be deleted from database');
});

test('deleteBooking deletes eligible booking, clears cache, and returns 200', () => {
  cache.set('schedule:unavailable-slots', ['dummy-slot'], 60000);
  assert.ok(cache.get('schedule:unavailable-slots') !== undefined);

  const { req, res } = createMockReqRes({ id: '10' });
  deleteBooking(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.archived, false);
  assert.equal(res.data.message, 'Booking deleted.');
  assert.equal(existingBookings.has(10), false, 'Booking must be deleted');
  assert.equal(cache.get('schedule:unavailable-slots'), undefined, 'Schedule slot cache must be cleared');
});

test('deleteBooking handles database errors with 500 status and message', () => {
  simulateDbError = true;
  try {
    const { req, res } = createMockReqRes({ id: '20' });
    deleteBooking(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.data.success, false);
    assert.match(res.data.message, /simulated database failure/i);
  } finally {
    simulateDbError = false;
  }
});

test('projectAccess middleware enforces admin authorization for DELETE /booking/:id', async () => {
  const middleware = projectAccess('booking')[2]; // the access rule handler

  // Client user attempting DELETE
  const { req: clientReq, res: clientRes } = createMockReqRes({ id: '20', role: 'client' });
  let clientNextCalled = false;
  await middleware(clientReq, clientRes, () => { clientNextCalled = true; });
  assert.equal(clientNextCalled, false, 'Client must not proceed to deleteBooking');
  assert.equal(clientRes.statusCode, 403);
  assert.equal(clientRes.data.success, false);

  // Admin user attempting DELETE
  const { req: adminReq, res: adminRes } = createMockReqRes({ id: '20', role: 'admin' });
  let adminNextCalled = false;
  await middleware(adminReq, adminRes, () => { adminNextCalled = true; });
  assert.equal(adminNextCalled, true, 'Admin must proceed to deleteBooking');
});

test('projectAccess middleware allows client to delete their own rejected booking', async () => {
  const middleware = projectAccess('booking')[2];

  // Client user attempting DELETE on their own rejected booking (booking 40)
  const { req: clientReq, res: clientRes } = createMockReqRes({ id: '40', role: 'client' });
  let clientNextCalled = false;
  await middleware(clientReq, clientRes, () => { clientNextCalled = true; });
  assert.equal(clientNextCalled, true, 'Client must be authorized to proceed for their own rejected booking');

  // Verify deleteBooking controller permanently deletes the rejected booking
  deleteBooking(clientReq, clientRes);
  assert.equal(clientRes.statusCode, 200);
  assert.equal(clientRes.data.success, true);
  assert.equal(clientRes.data.archived, false);
  assert.equal(clientRes.data.message, 'Booking deleted.');
  assert.equal(existingBookings.has(40), false, 'Rejected booking must be deleted from map');
});
