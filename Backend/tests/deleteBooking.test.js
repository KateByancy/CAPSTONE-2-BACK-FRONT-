const { test } = require('node:test');
const assert = require('node:assert/strict');

// Set secret before requiring any auth middleware
process.env.JWT_SECRET = 'delete-booking-test-secret';

// Mock DB queries for booking controller
const existingBookings = new Set([10, 20]);
const bookingsWithHistory = new Set([20]); // Booking 20 has quotes/payments/chats/designs

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
        const id = values[0];
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

test('deleteBooking preserves records and returns 409 when booking has project history', () => {
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

