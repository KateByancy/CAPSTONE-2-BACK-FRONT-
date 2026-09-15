module.exports = [
    `CREATE TABLE IF NOT EXISTS admin_email_resets (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_fingerprint CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        INDEX (user_id), INDEX (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS admin_email_rate_limits (
        scope_hash CHAR(64) NOT NULL,
        bucket BIGINT NOT NULL,
        attempts INT NOT NULL DEFAULT 1,
        PRIMARY KEY (scope_hash, bucket)
    )`,
];
