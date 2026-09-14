const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const sms = require('../services/adminSmsVerify');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

// Database-backed limits survive restarts and apply across backend workers.
async function allow(scope, limit) {
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    await query('DELETE FROM admin_sms_rate_limits WHERE bucket < ?', [bucket - 1]);
    const key = hash(scope);
    await query('INSERT INTO admin_sms_rate_limits (scope_hash, bucket) VALUES (?, ?) ON DUPLICATE KEY UPDATE attempts = attempts + 1', [key, bucket]);
    const rows = await query('SELECT attempts FROM admin_sms_rate_limits WHERE scope_hash = ? AND bucket = ?', [key, bucket]);
    return rows[0].attempts <= limit;
}

exports.requestCode = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!sms.configured()) return res.status(503).json({ success: false, message: 'SMS password recovery is not configured. Please contact the system operator.' });
    try {
        const requestedPhone = sms.normalizePhone(req.body.phone);
        if (!await allow('send-ip:' + req.ip, 5) || !await allow('send-phone:' + requestedPhone, 3)) {
            return res.status(429).json({ success: false, message: 'Too many code requests. Please wait 15 minutes before trying again.' });
        }
        const challenge = crypto.randomBytes(32).toString('hex');
        const rows = await query("SELECT id, phone, password FROM users WHERE role = 'admin' AND phone IS NOT NULL");
        const matches = rows.filter(account => sms.normalizePhone(account.phone) === requestedPhone);
        // Phone-only recovery must identify exactly one admin account.
        const admin = matches.length === 1 ? matches[0] : null;
        const phone = sms.normalizePhone(admin?.phone);
        if (admin && phone) {
            const sid = await sms.send(phone);
            await query('DELETE FROM admin_sms_resets WHERE expires_at < NOW()');
            await query(`INSERT INTO admin_sms_resets (token_hash, user_id, phone, password_fingerprint, verification_sid, expires_at)
                VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [hash(challenge), admin.id, admin.phone, hash(admin.password), sid]);
        }
        // Same response for an unknown account, client account, or missing phone.
        return res.json({ success: true, challenge, message: 'If this number matches an admin account, an SMS code has been sent to its saved mobile number. Use the code within 10 minutes.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to send a verification code right now. Please try again later.' });
    }
};

exports.resetPassword = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const invalid = () => res.status(400).json({ success: false, message: 'The code is incorrect, expired, or already used. Try again or request another code.' });
    try {
        if (!await allow('check-ip:' + req.ip, 20)) return res.status(429).json({ success: false, message: 'Too many attempts. Please wait 15 minutes before trying again.' });
        const tokenHash = hash(req.body.challenge);
        const attempt = await query(`UPDATE admin_sms_resets SET attempts = attempts + 1
            WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() AND attempts < 5`, [tokenHash]);
        if (!attempt.affectedRows) return invalid();
        const rows = await query(`SELECT r.verification_sid FROM admin_sms_resets r JOIN users u ON u.id = r.user_id
            WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > NOW()
            AND u.role = 'admin' AND BINARY u.phone = BINARY r.phone AND SHA2(u.password, 256) = r.password_fingerprint`, [tokenHash]);
        if (!rows.length || !await sms.check(rows[0].verification_sid, req.body.code)) return invalid();
        const password = await bcrypt.hash(req.body.password, 12);
        // Atomic consume + update prevents code replay, concurrent resets, or using a changed profile phone.
        const result = await query(`UPDATE users u JOIN admin_sms_resets r ON u.id = r.user_id
            SET u.password = ?, r.used_at = NOW()
            WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > NOW()
            AND u.role = 'admin' AND BINARY u.phone = BINARY r.phone AND SHA2(u.password, 256) = r.password_fingerprint`, [password, tokenHash]);
        if (!result.affectedRows) return invalid();
        return res.json({ success: true, message: 'Password updated. Sign in with your new password.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to reset your password right now. Request a new code and try again.' });
    }
};
