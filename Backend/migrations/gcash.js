module.exports = [
`CREATE TABLE IF NOT EXISTS gcash_settings (
 id INT PRIMARY KEY, account_name VARCHAR(100) NOT NULL, account_number VARCHAR(11) NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS gcash_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_id INT NOT NULL,
 amount DECIMAL(10,2) NOT NULL,
 description VARCHAR(200) NOT NULL,
 account_name VARCHAR(100) NOT NULL,
 account_number VARCHAR(11) NOT NULL,
 status ENUM('Awaiting payment','For verification','Paid','Returned','Cancelled') NOT NULL DEFAULT 'Awaiting payment',
 reference_number VARCHAR(30) NULL UNIQUE,
 proof MEDIUMBLOB NULL,
 proof_type VARCHAR(30) NULL,
 review_note VARCHAR(500) NULL,
 reviewed_by INT NULL,
 reviewed_at DATETIME NULL,
 submitted_at DATETIME NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 active_booking INT GENERATED ALWAYS AS (CASE WHEN status IN ('Awaiting payment','For verification','Returned') THEN booking_id ELSE NULL END) STORED,
 UNIQUE KEY one_open_request (active_booking)
)`,
`ALTER TABLE gcash_requests ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) NOT NULL DEFAULT 'Manual'`,
`ALTER TABLE gcash_requests ADD COLUMN IF NOT EXISTS checkout_session_id VARCHAR(100) NULL`,
`ALTER TABLE gcash_requests ADD COLUMN IF NOT EXISTS checkout_url TEXT NULL`,
`ALTER TABLE gcash_requests ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(100) NULL`,
`ALTER TABLE gcash_requests ADD COLUMN IF NOT EXISTS checkout_creating BOOLEAN NOT NULL DEFAULT FALSE`
];
