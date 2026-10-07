const { isIP } = require('node:net');

const MINUTE = 60 * 1000;
const LIMITS = Object.freeze({
    api: { max: 600, windowMs: MINUTE },
    writes: { max: 120, windowMs: MINUTE },
    login: { max: 30, windowMs: 15 * MINUTE },
    register: { max: 10, windowMs: 60 * MINUTE },
    recovery: { max: 20, windowMs: 15 * MINUTE },
    submissions: { max: 30, windowMs: 15 * MINUTE },
    inquiries: { max: 10, windowMs: 15 * MINUTE },
    chat: { max: 60, windowMs: MINUTE },
    checkout: { max: 20, windowMs: MINUTE },
});

// Group IPv6 privacy addresses by /64; IPv4-mapped addresses share the IPv4 bucket.
function clientKey(ip) {
    if (isIP(ip) !== 6) return ip || 'unknown';
    let address = ip.split('%')[0].toLowerCase();
    if (address.includes('.')) {
        const split = address.lastIndexOf(':');
        const bytes = address.slice(split + 1).split('.').map(Number);
        address = address.slice(0, split + 1) + ((bytes[0] << 8) | bytes[1]).toString(16)
            + ':' + ((bytes[2] << 8) | bytes[3]).toString(16);
    }
    const [left, right] = address.split('::');
    const head = left ? left.split(':') : [];
    const tail = right ? right.split(':') : [];
    const parts = (right !== undefined
        ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail]
        : head).map(part => parseInt(part, 16));
    if (parts.slice(0, 5).every(part => part === 0) && parts[5] === 0xffff) {
        return [parts[6] >> 8, parts[6] & 255, parts[7] >> 8, parts[7] & 255].join('.');
    }
    return parts.slice(0, 4).map(part => part.toString(16)).join(':') + '::/64';
}

function sensitiveScope(method, path) {
    if (method === 'POST') {
        if (/^\/auth\/(login|admin-login|google)$/.test(path)) return 'login';
        if (path === '/auth/register') return 'register';
        if (/^\/auth\/(?:admin\/)?(?:forgot-password|reset-password)(?:\/code|\/email)?$/.test(path)) return 'recovery';
        if (path === '/inquiries') return 'inquiries';
        if (/^\/(booking|schedule|designs)$/.test(path)) return 'submissions';
        if (path === '/chat') return 'chat';
        if (/^\/payment\/[^/]+\/checkout$/.test(path)) return 'checkout';
    }
    return null;
}

function createRequestProtection({ now = Date.now, maxEntries = 10000 } = {}) {
    const entries = new Map();
    let nextCleanup = 0;
    return (req, res, next) => {
        if (req.method === 'OPTIONS') return next();
        const time = now();
        if (time >= nextCleanup || entries.size >= maxEntries) {
            for (const [key, entry] of entries) {
                if (entry.resetAt <= time) entries.delete(key);
            }
            nextCleanup = time + MINUTE;
        }
        const ip = clientKey(req.ip || req.socket.remoteAddress);
        const path = req.path.toLowerCase().replace(/\/+$/, '') || '/';
        const scopes = ['api'];
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) scopes.push('writes');
        const sensitive = sensitiveScope(req.method, path);
        if (sensitive) scopes.push(sensitive);
        for (const scope of scopes) {
            const policy = LIMITS[scope];
            const key = `${scope}:${ip}`;
            let entry = entries.get(key);
            if (!entry || entry.resetAt <= time) {
                // Never evict active counters: flooding new addresses must not reset limits.
                if (!entry && entries.size >= maxEntries) {
                    res.set('Retry-After', '60');
                    res.set('Cache-Control', 'no-store');
                    return res.status(429).json({ success: false, message: 'Too many requests. Please try again shortly.' });
                }
                entry = { count: 0, resetAt: time + policy.windowMs };
                entries.set(key, entry);
            }
            if (entry.count >= policy.max) {
                res.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - time) / 1000))));
                res.set('Cache-Control', 'no-store');
                return res.status(429).json({ success: false, message: 'Too many requests. Please wait before trying again.' });
            }
            entry.count++;
        }
        return next();
    };
}

module.exports = { createRequestProtection, LIMITS };
