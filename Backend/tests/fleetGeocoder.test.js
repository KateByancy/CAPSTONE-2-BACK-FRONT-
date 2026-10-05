const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFleetGeocoder } = require('../services/fleetGeocoder');
const booking = (id, address = 'Manila') => ({ id, address });
const result = (lat = '14.6', lon = '120.9') => ({ ok: true, json: async () => [{ lat, lon }] });

test('returns immediately, deduplicates concurrent polls and reuses coordinates across projects', async () => {
  let calls = 0, resolveLookup;
  const geocoder = createFleetGeocoder({ fetchLocation: () => { calls++; return new Promise(resolve => { resolveLookup = resolve; }); }, delay: async () => {} });
  assert.deepEqual(geocoder.read([booking(1), booking(2)]), { locations: [], pending: 1 });
  geocoder.read([booking(1)]);
  await Promise.resolve(); assert.equal(calls, 1);
  resolveLookup(result()); await geocoder.idle();
  assert.deepEqual(geocoder.read([booking(1), booking(2)]), { locations: [{ booking_id: 1, lat: 14.6, lng: 120.9 }, { booking_id: 2, lat: 14.6, lng: 120.9 }], pending: 0 });
  assert.equal(calls, 1);
});

test('cached pins remain available while a new address is resolving', async () => {
  let resolveLookup;
  const geocoder = createFleetGeocoder({ fetchLocation: async url => url.includes('Manila') ? result() : new Promise(resolve => { resolveLookup = resolve; }), delay: async () => {} });
  geocoder.read([booking(1)]); await geocoder.idle();
  const partial = geocoder.read([booking(1), booking(2, 'Cebu')]);
  assert.equal(partial.locations.length, 1); assert.equal(partial.pending, 1);
  await Promise.resolve(); resolveLookup(result('10.3', '123.9')); await geocoder.idle();
  assert.equal(geocoder.read([booking(1), booking(2, 'Cebu')]).locations.length, 2);
});

test('misses are cached, lookups have timeouts, and expired misses can retry', async () => {
  let calls = 0, time = 0;
  const geocoder = createFleetGeocoder({ now: () => time, delay: async () => {}, fetchLocation: async (_url, options) => { calls++; assert.ok(options.signal instanceof AbortSignal); throw new Error('provider unavailable'); } });
  geocoder.read([booking(1)]); await geocoder.idle();
  assert.deepEqual(geocoder.read([booking(1)]), { locations: [], pending: 0 }); assert.equal(calls, 1);
  time = 600001; assert.equal(geocoder.read([booking(1)]).pending, 1); await geocoder.idle(); assert.equal(calls, 2);
});
