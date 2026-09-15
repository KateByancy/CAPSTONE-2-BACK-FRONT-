const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const mail = require('../services/adminRecoveryMail');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function allow(scope, limit) {
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    const key = hash(scope);
    await query('DELETE FROM client_email_rate_limits WHERE bucket < ?', [bucket - 1]);
    await query('INSERT INTO client_email_rate_limits (scope_hash, bucket) VALUES (?, ?) ON DUPLICATE KEY UPDATE attempts = attempts + 1', [key, bucket]);
    const rows = await query('SELECT attempts FROM client_email_rate_limits WHERE scope_hash=? AND bucket=?', [key, bucket]);
    return rows[0].attempts <= limit;
}

exports.requestCode = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!mail.configuration().configured) return res.status(503).json({ success: false, message: 'Recovery emails are not set up yet. Please contact support.' });
    try {
        const email = req.body.email.trim().toLowerCase();
        if (!await allow('send-ip:' + req.ip, 5) || !await allow('send-email:' + email, 3)) return res.status(429).json({ success: false, message: 'Too many code requests. Wait 15 minutes before trying again.' });
        const challenge = crypto.randomBytes(32).toString('hex');
        const rows = await query("SELECT id, email, password FROM users WHERE email=? AND role='client' LIMIT 1", [email]);
        const client = rows[0];
        if (client) {
            const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
            await query('DELETE FROM client_email_resets WHERE expires_at < NOW()');
            await query('UPDATE client_email_resets SET used_at=NOW() WHERE user_id=? AND used_at IS NULL', [client.id]);
            await query(`INSERT INTO client_email_resets (token_hash, code_hash, user_id, email, password_fingerprint, expires_at)
                VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`, [hash(challenge), hash(challenge + ':' + code), client.id, client.email, hash(client.password)]);
            try { await mail.sendClientCode(client.email, code); }
            catch {
                await query('UPDATE client_email_resets SET used_at=NOW() WHERE token_hash=?', [hash(challenge)]);
                return res.status(503).json({ success: false, message: 'Unable to send the recovery email right now. Please try again later.' });
            }
        }
        return res.json({ success: true, challenge, message: 'If this email matches a registered client account, a 6-digit code has been sent. Check your inbox and spam folder. The code expires in 10 minutes.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to request a recovery code right now. Please try again later.' });
    }
};

exports.resetPassword = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const invalid = () => res.status(400).json({ success: false, message: 'The code is incorrect, expired, or already used. Try again or request a new code.' });
    try {
        if (!await allow('reset-ip:' + req.ip, 20)) return res.status(429).json({ success: false, message: 'Too many attempts. Wait 15 minutes before trying again.' });
        const tokenHash = hash(req.body.challenge);
        const codeHash = hash(req.body.challenge + ':' + req.body.code);
        const attempt = await query(`UPDATE client_email_resets SET attempts=attempts+1
            WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW() AND attempts<5`, [tokenHash]);
        if (!attempt.affectedRows) return invalid();
        const rows = await query(`SELECT r.user_id FROM client_email_resets r JOIN users u ON u.id=r.user_id
            WHERE r.token_hash=? AND r.code_hash=? AND r.used_at IS NULL AND r.expires_at>NOW()
            AND u.role='client' AND BINARY u.email=BINARY r.email AND SHA2(u.password, 256)=r.password_fingerprint`, [tokenHash, codeHash]);
        if (!rows.length) return invalid();
        const password = await bcrypt.hash(req.body.password, 12);
        const result = await query(`UPDATE users u JOIN client_email_resets r ON u.id=r.user_id
            SET u.password=?, r.used_at=NOW()
            WHERE r.token_hash=? AND r.code_hash=? AND r.used_at IS NULL AND r.expires_at>NOW()
            AND u.role='client' AND BINARY u.email=BINARY r.email AND SHA2(u.password, 256)=r.password_fingerprint`, [password, tokenHash, codeHash]);
        if (!result.affectedRows) return invalid();
        return res.json({ success: true, message: 'Your password has been updated. Sign in with your registered email and new password.' });
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to reset your password right now. Please try again later.' });
    }
};
