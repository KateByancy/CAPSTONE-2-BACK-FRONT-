const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
require('dotenv').config({ quiet: true });
const db = require('../config/db');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const { calculateEstimate } = require('../utils/bookingEstimate');
const pricing = [
  ['style', 'Modern', 2500], ['complexity', 'Standard', 1],
  ['estimate', 'Minimum factor', 0.9], ['estimate', 'Maximum factor', 1.1],
].map(([option_type, name, value]) => ({ option_type, name, value }));
const estimateInput = { area: 100, unit: 'sq ft', service: 'Living room', style: 'Modern', complexity: 'Standard' };
test('sq ft and square meters preserve existing rates and reject invalid inputs', () => {
  const feet = calculateEstimate(estimateInput, pricing);
  assert.equal(feet.min, 20903); assert.equal(feet.max, 25548);
  const meters = calculateEstimate({ ...estimateInput, area: 100, unit: 'm\u00b2' }, pricing);
  assert.equal(meters.min, 225000); assert.equal(meters.max, 275000);
  const equivalent = calculateEstimate({ ...estimateInput, area: 9.290304, unit: 'm\u00b2' }, pricing);
  assert.equal(equivalent.min, feet.min); assert.equal(equivalent.max, feet.max);
  for (const patch of [{ area: -1 }, { area: 0 }, { area: Infinity }, { unit: 'yards' }, { style: 'unknown' }, { service: 'toString' }]) {
    assert.throws(() => calculateEstimate({ ...estimateInput, ...patch }, pricing), { status: 400 });
  }
});

test('booking API: Other persistence, concurrency, status handling and estimate retrieval for both roles', async () => {
  const originalDatabase = db.config.database;
  const testDatabase = `mcidbms_booking_test_${process.pid}_${Date.now()}`;
  let server;
  try {
    await query(`CREATE DATABASE \`${testDatabase}\``);
    await query(`USE \`${testDatabase}\``);
    db.config.database = testDatabase;
    await query('CREATE TABLE users (id INT PRIMARY KEY, fullname VARCHAR(100), email VARCHAR(150), address VARCHAR(255), landmark VARCHAR(255))');
    await query("CREATE TABLE bookings (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, service_type VARCHAR(100), project_description TEXT, project_address VARCHAR(255), project_landmark VARCHAR(255), preferred_date DATE NOT NULL, preferred_time TIME NOT NULL, location TEXT NOT NULL, status VARCHAR(50) DEFAULT 'Pending', accepted_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
    await query(require('../migrations/bookingEstimate'));
    await query(require('../migrations/bookingEstimate'));
    await query("CREATE TABLE schedules (id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT, visit_date DATE, date DATE, time_start TIME, status VARCHAR(30) DEFAULT 'Pending')");
    await query('CREATE TABLE pricing_options (option_type VARCHAR(30), name VARCHAR(100), value DECIMAL(10,2), is_active BOOLEAN DEFAULT TRUE)');
    await query("INSERT INTO users VALUES (1,'Test Client','fixture@example.invalid','',''),(2,'Second Client','fixture2@example.invalid','','')");
    for (const row of pricing) await query('INSERT INTO pricing_options SET ?', row);
    const app = express(); app.use(express.json()); app.use('/booking', require('../routes/bookingRoutes')); app.get('/unavailable', require('../controllers/scheduleController').getUnavailableSlots);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const call = async (path, body) => { const response = await fetch(base + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined); return { status: response.status, data: await response.json() }; };
    const body = { user_id: 1, service_type: 'Other', other_service: '  Custom reading nook  ', project_description: 'Test project', project_address: 'Test address', project_landmark: 'Test landmark', preferred_start_date: '2030-01-01', preferred_start_time: '09:00', estimate: { ...estimateInput, min: 1, max: 2 } };
    assert.equal((await call('/booking', { ...body, other_service: ' ' })).status, 400);
    assert.equal((await call('/booking', { ...body, estimate: { ...estimateInput, unit: 'yards' } })).status, 400);
    const parallel = await Promise.all([call('/booking', body), call('/booking', body)]);
    assert.deepEqual(parallel.map(r => r.status).sort(), [201, 409]);
    assert.equal(parallel.find(r => r.status === 409).data.code, 'DUPLICATE_BOOKING');
    const created = parallel.find(r => r.status === 201).data.booking;
    assert.equal(created.service_type, 'Custom reading nook'); assert.equal(created.estimate.min, 20903);
    assert.equal((await query('SELECT COUNT(*) AS total FROM bookings'))[0].total, 1);
    assert.equal((await query('SELECT COUNT(*) AS total FROM schedules'))[0].total, 1);
    for (const path of ['/booking?user_id=1', '/booking']) {
      const result = await call(path); assert.equal(result.status, 200);
      const stored = result.data.bookings[0]; const estimate = typeof stored.estimate === 'string' ? JSON.parse(stored.estimate) : stored.estimate;
      assert.equal(stored.service_type, 'Custom reading nook'); assert.equal(estimate.min, 20903); assert.equal(estimate.unit, 'sq ft');
    }
    assert.equal((await call('/booking', { ...body, user_id: 2 })).data.code, 'SCHEDULE_CONFLICT');
    for (const status of ['Confirmed', 'Completed']) {
      await query('UPDATE bookings SET status = ?', [status]);
      assert.equal((await call('/booking', body)).data.code, 'DUPLICATE_BOOKING');
    }
    await query("UPDATE bookings SET status = 'Rejected'");
    require('../utils/cache').clear('schedule:unavailable-slots');
    assert.equal((await call('/unavailable')).data.slots.length, 0);
    assert.equal((await call('/booking', body)).status, 201);
    await query("UPDATE bookings SET status = 'Cancelled'");
    assert.equal((await call('/booking', { ...body, estimate: { ...estimateInput, area: 100, unit: 'm\u00b2' } })).data.booking.estimate.min, 225000);
    assert.equal((await call('/booking', { ...body, preferred_start_time: '10:00', estimate: undefined })).status, 201);
    assert.equal((await call('/booking', { ...body, preferred_start_date: '2030-01-02' })).status, 201);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    db.config.database = originalDatabase;
    await query(`USE \`${originalDatabase}\``);
    await query(`DROP DATABASE IF EXISTS \`${testDatabase}\``);
    db.destroy();
  }
});
