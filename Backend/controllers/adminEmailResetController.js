const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const mail = require('../services/adminRecoveryMail');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function allow(scope, limit) {
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    await query('DELETE FROM admin_email_rate_limits WHERE bucket < ?', [bucket - 1]);
    const key = hash(scope);
    await query('INSERT INTO admin_email_rate_limits (scope_hash, bucket) VALUES (?, ?) ON DUPLICATE KEY UPDATE attempts = attempts + 1', [key, bucket]);
    const rows = await query('SELECT attempts FROM admin_email_rate_limits WHERE scope_hash=? AND bucket=?', [key, bucket]);
    return rows[0].attempts <= limit;
}

exports.requestLink = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!mail.configuration().configured) return res.status(503).json({ success: false, message: 'Admin recovery email is not set up yet. Configure the Gmail sender account on the backend.' });
    try {
        const email = req.body.email.trim().toLowerCase();
        if (!await allow('send-ip:' + req.ip, 5) || !await allow('send-email:' + email, 3)) return res.status(429).json({ success: false, message: 'Too many reset requests. Wait 15 minutes before trying again.' });
        const rows = await query("SELECT id, email, password FROM users WHERE email=? AND role='admin' LIMIT 1", [email]);
        const admin = rows[0];
        if (admin) {
            const token = crypto.randomBytes(32).toString('hex');
            await query('DELETE FROM admin_email_resets WHERE expires_at < NOW()');
            await query('UPDATE admin_email_resets SET used_at=NOW() WHERE user_id=? AND used_at IS NULL', [admin.id]);
            await query('INSERT INTO admin_email_resets (token_hash, user_id, email, password_fingerprint, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))', [hash(token), admin.id, admin.email, hash(admin.password)]);
            try { await mail.send(admin.email, token); }
            catch {
                await query('UPDATE admin_email_resets SET used_at=NOW() WHERE token_hash=?', [hash(token)]);
                return res.status(503).json({ success: false, message: 'Unable to send the reset email. Check the Gmail sender setup and try again.' });
            }
        }
        return res.json({ success: true, message: 'If this email matches an admin account, a reset link has been sent. Check your inbox and spam folder. The link expires in 15 minutes.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to request a reset link right now. Please try again later.' });
    }
};

exports.resetPassword = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        if (!await allow('reset-ip:' + req.ip, 20)) return res.status(429).json({ success: false, message: 'Too many attempts. Wait 15 minutes before trying again.' });
        const password = await bcrypt.hash(req.body.password, 12);
        // Consume the token and update the password atomically, including concurrent requests.
        const result = await query(`UPDATE users u JOIN admin_email_resets r ON u.id=r.user_id
            SET u.password=?, r.used_at=NOW()
            WHERE r.token_hash=? AND r.used_at IS NULL AND r.expires_at>NOW()
            AND u.role='admin' AND BINARY u.email=BINARY r.email AND SHA2(u.password, 256)=r.password_fingerprint`,
        [password, hash(req.body.token)]);
        if (!result.affectedRows) return res.status(400).json({ success: false, message: 'This reset link is invalid, expired, or already used. Request a new link.' });
        return res.json({ success: true, message: 'Admin password updated. Sign in with your new password.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to reset your password right now. Please try again later.' });
    }
};
