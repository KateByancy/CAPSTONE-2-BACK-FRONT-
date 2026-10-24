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
  assert.deepEqual(geocoder.read([booking(1)]), { locations: [], pending: 0, unresolved: [{ booking_id: 1, reason: 'unavailable' }] }); assert.equal(calls, 1);
  time = 30001; assert.equal(geocoder.read([booking(1)]).pending, 1); await geocoder.idle(); assert.equal(calls, 2);
});


test('normalizes repeated barangay spelling and resolves the accepted Cordova project', async () => {
  const queries = [];
  const geocoder = createFleetGeocoder({ delay: async () => {}, fetchLocation: async url => {
    const q = new URL(url).searchParams.get('q'); queries.push(q);
    return { ok: true, json: async () => q.includes('Bangbang') ? [{ lat: '10.2589319', lon: '123.9439905', addresstype: 'suburb', display_name: 'Bangbang, Cordova, Cebu, Philippines', address: { town: 'Cordova' } }] : [] };
  } });
  const projects = [booking(22, 'Bang-Bang Cordova Cebu')];
  geocoder.read(projects); await geocoder.idle();
  const outcome = geocoder.read(projects);
  assert.equal(outcome.locations[0].booking_id, 22);
  assert.equal(outcome.locations[0].precision, 'area');
  assert.ok(queries.some(query => query.includes('Bangbang, Cordova, Cebu')));
});

test('rejects a wrong-city landmark and resolves the barangay in the requested city', async () => {
  const geocoder = createFleetGeocoder({ delay: async () => {}, fetchLocation: async url => {
    const q = new URL(url).searchParams.get('q');
    return { ok: true, json: async () => q.toLowerCase().startsWith('basak, lapu-lapu,')
      ? [{ lat: '10.2895732', lon: '123.9655201', addresstype: 'suburb', display_name: 'Basak, Lapu-Lapu, Philippines', address: { city: 'Lapu-Lapu' } }]
      : [{ lat: '10.2918049', lon: '123.9043976', addresstype: 'tourism', address: { city: 'Cebu City' } }] };
  } });
  const projects = [booking(21, 'Ibabao basak, lapu-lapu city')];
  geocoder.read(projects); await geocoder.idle();
  assert.equal(geocoder.read(projects).locations[0].lng, 123.9655201);
});

test('resolves Lapu-Lapu City accurately with area fallback when street is unrecognized', async () => {
  const geocoder = createFleetGeocoder({ delay: async () => {}, fetchLocation: async url => {
    const parsed = new URL(url);
    const city = parsed.searchParams.get('city');
    if (city === 'Lapu-Lapu') {
      return { ok: true, json: async () => [{ lat: '10.3126722', lon: '123.9488177', addresstype: 'city', display_name: 'Lapu-Lapu, Central Visayas, Philippines', address: { city: 'Lapu-Lapu' } }] };
    }
    return { ok: true, json: async () => [] };
  } });
  const projects = [booking(30, 'Unmapped Street, Lapu-Lapu City')];
  geocoder.read(projects); await geocoder.idle();
  const outcome = geocoder.read(projects);
  assert.equal(outcome.locations[0].booking_id, 30);
  assert.equal(outcome.locations[0].lat, 10.3126722);
  assert.equal(outcome.locations[0].precision, 'area');
});

test('provider errors are distinguishable from unrecognized addresses', async () => {
  const geocoder = createFleetGeocoder({ delay: async () => {}, fetchLocation: async () => ({ ok: true, json: async () => [] }) });
  geocoder.read([booking(9, 'Unknown address')]); await geocoder.idle();
  assert.equal(geocoder.read([booking(9, 'Unknown address')]).unresolved[0].reason, 'not_found');
});
