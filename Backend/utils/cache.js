const store = new Map();

const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const ttl = {
  portfolio: toPositiveNumber(process.env.CACHE_TTL_PORTFOLIO_MS, 5 * 60 * 1000),
  landing: toPositiveNumber(process.env.CACHE_TTL_LANDING_MS, 5 * 60 * 1000),
  settings: toPositiveNumber(process.env.CACHE_TTL_SETTINGS_MS, 60 * 1000),
  unavailableSlots: toPositiveNumber(process.env.CACHE_TTL_UNAVAILABLE_SLOTS_MS, 30 * 1000),
  clientHomeLookups: toPositiveNumber(process.env.CACHE_TTL_CLIENT_HOME_LOOKUPS_MS, 5 * 60 * 1000),
};

const get = (key) => {
  const cached = store.get(key);
  if (!cached) return undefined;

  if (cached.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return cached.value;
};

const set = (key, value, ttlMs) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
};

const clear = (key) => {
  store.delete(key);
};

const clearByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

const sendCachedJson = (res, value) => {
  res.set("X-Cache", "HIT");
  return res.json(value);
};

const sendFreshJson = (res, key, value, ttlMs) => {
  set(key, value, ttlMs);
  res.set("X-Cache", "MISS");
  return res.json(value);
};

module.exports = {
  ttl,
  get,
  set,
  clear,
  clearByPrefix,
  sendCachedJson,
  sendFreshJson,
};
