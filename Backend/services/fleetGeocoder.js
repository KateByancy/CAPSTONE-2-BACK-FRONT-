// A single provider queue avoids duplicate lookups and respects the provider request interval.
function createFleetGeocoder({ fetchLocation = (...args) => fetch(...args), delay = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Set();
  let queue = Promise.resolve();
  const keyFor = booking => JSON.stringify([String(booking.address || '').trim().toLowerCase(), String(booking.landmark || '').trim().toLowerCase()]);
  const canonical = value => String(value || '').toLowerCase().replace(/\bcity\b/g, '').replace(/[^a-z0-9]/g, '');

  function queriesFor(address, landmark) {
    const normalized = address.trim()
      .replace(/\b([a-z]+)-\1\b/gi, (match, word) => word.toLowerCase() === 'lapu' ? match : word + word.toLowerCase())
      .replace(/\blapu[\s-]*lapu\s+city\b/gi, 'Lapu-Lapu')
      .replace(/\s+(Cordova|Lapu-Lapu)\b/gi, ', $1')
      .replace(/\b(Cordova)\s+(Cebu)\b/gi, '$1, $2')
      .replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
    const parts = normalized.split(',').map(part => part.trim()).filter(Boolean);
    const locality = /\blapu[\s-]*lapu\b/i.test(address) ? 'Lapu-Lapu'
      : /\bcordova\b/i.test(address) ? 'Cordova'
      : address.split(',').map(part => part.trim()).find(part => /\bcity\s*$/i.test(part));
    const areaWords = (parts[0] || '').split(' ');
    const areaQuery = locality && areaWords.length > 1 && !/\b(street|st|road|rd|avenue|ave|highway)\b/i.test(parts[0])
      ? areaWords.at(-1) + ', ' + locality : '';
    const candidates = [...new Set([
      address, normalized, areaQuery,
      landmark ? landmark + ', ' + normalized : '',
      ...parts.slice(1).map((_, i) => parts.slice(i + 1).join(', ')).filter(value => value.split(',').length >= 2),
    ].filter(Boolean))].slice(0, 5);
    return { candidates, locality };
  }

  async function locate(booking) {
    const { candidates, locality } = queriesFor(booking.address, booking.landmark);
    for (const candidate of candidates) {
      try {
        const query = new URLSearchParams({ format: 'jsonv2', q: candidate.replace(/,?\s*Philippines\s*$/i, '') + ', Philippines', countrycodes: 'ph', limit: '3', addressdetails: '1' });
        const response = await fetchLocation('https://nominatim.openstreetmap.org/search?' + query, {
          headers: { 'User-Agent': 'MARC-Interior-Design-Fleet/1.0' }, signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) return { reason: 'unavailable' };
        const results = await response.json();
        if (!Array.isArray(results)) return { reason: 'unavailable' };
        for (const result of results) {
          const lat = Number(result.lat), lng = Number(result.lon);
          if (result.lat == null || result.lon == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
          if (locality) {
            const actual = result.address?.city || result.address?.town || result.address?.municipality;
            if (actual ? canonical(actual) !== canonical(locality) : !canonical(result.display_name).includes(canonical(locality))) continue;
          }
          const metadata = result.addresstype ? {
            precision: ['house', 'building'].includes(result.addresstype) ? 'address' : 'area',
            matched_address: result.display_name || candidate,
          } : {};
          return { coordinates: { lat, lng, ...metadata } };
        }
      } catch { return { reason: 'unavailable' }; }
      finally { await delay(1100); }
    }
    return { reason: 'not_found' };
  }

  function read(bookings) {
    const locations = [];
    const unresolved = [];
    const waitingKeys = new Set();
    for (const booking of bookings) {
      if (!booking.address?.trim()) continue;
      const key = keyFor(booking);
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now()) {
        if (cached.coordinates) locations.push({ booking_id: booking.id, ...cached.coordinates });
        else unresolved.push({ booking_id: booking.id, reason: cached.reason });
        continue;
      }
      waitingKeys.add(key);
      if (pending.has(key)) continue;
      pending.add(key);
      queue = queue.then(async () => {
        try {
          const outcome = await locate(booking);
          cache.set(key, { ...outcome, expiresAt: now() + (outcome.coordinates ? 86400000 : outcome.reason === 'unavailable' ? 30000 : 600000) });
        } finally { pending.delete(key); }
      }).catch(() => { pending.delete(key); });
    }
    for (const [key, value] of cache) if (value.expiresAt <= now()) cache.delete(key);
    return { locations, pending: waitingKeys.size, ...(unresolved.length ? { unresolved } : {}) };
  }
  return { read, idle: () => queue };
}
module.exports = { createFleetGeocoder };
