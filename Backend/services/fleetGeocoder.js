// A shared queue prevents duplicate lookups and returns cached pins without waiting for the provider.
function createFleetGeocoder({ fetchLocation = (...args) => fetch(...args), delay = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Set();
  let queue = Promise.resolve();
  const keyFor = booking => JSON.stringify([String(booking.address || '').trim().toLowerCase(), String(booking.landmark || '').trim().toLowerCase()]);

  async function locate(booking) {
    const parts = booking.address.split(',').map(part => part.trim()).filter(Boolean);
    const candidates = [...new Set([booking.address, booking.landmark ? booking.address + ', near ' + booking.landmark : '', ...parts.map((_, index) => parts.slice(index).join(', '))].filter(Boolean))].slice(0, 4);
    for (const candidate of candidates) {
      try {
        const query = new URLSearchParams({ format: 'jsonv2', q: candidate + ', Philippines', countrycodes: 'ph', limit: '1' });
        const response = await fetchLocation('https://nominatim.openstreetmap.org/search?' + query, {
          headers: { 'User-Agent': 'MARC-Interior-Design-Fleet/1.0' }, signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return null;
        const results = await response.json();
        const lat = Number(results[0]?.lat), lng = Number(results[0]?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
      } catch { return null; }
      finally { await delay(1100); }
    }
    return null;
  }

  function read(bookings) {
    const locations = [];
    const waitingKeys = new Set();
    for (const booking of bookings) {
      if (!booking.address?.trim()) continue;
      const key = keyFor(booking);
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now()) {
        if (cached.coordinates) locations.push({ booking_id: booking.id, ...cached.coordinates });
        continue;
      }
      waitingKeys.add(key);
      if (pending.has(key)) continue;
      pending.add(key);
      queue = queue.then(async () => {
        try {
          const coordinates = await locate(booking);
          cache.set(key, { coordinates, expiresAt: now() + (coordinates ? 86400000 : 600000) });
        } finally { pending.delete(key); }
      }).catch(() => { pending.delete(key); });
    }
    // Remove expired entries so changing project addresses do not grow memory indefinitely.
    for (const [key, value] of cache) if (value.expiresAt <= now()) cache.delete(key);
    return { locations, pending: waitingKeys.size };
  }
  return { read, idle: () => queue };
}
module.exports = { createFleetGeocoder };
