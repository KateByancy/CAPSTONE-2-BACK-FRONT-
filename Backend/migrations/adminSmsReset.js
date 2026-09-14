module.exports = [
    `CREATE TABLE IF NOT EXISTS admin_sms_resets (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        phone VARCHAR(30) NOT NULL,
        password_fingerprint CHAR(64) NOT NULL,
        verification_sid VARCHAR(34) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        INDEX (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS admin_sms_rate_limits (
        scope_hash CHAR(64) NOT NULL,
        bucket BIGINT NOT NULL,
        attempts INT NOT NULL DEFAULT 1,
        PRIMARY KEY (scope_hash, bucket)
    )`,
];
