require("dotenv").config();
const db = require("./config/db");

const queries = [
...require('./migrations/adminSmsReset'),
...require('./migrations/adminEmailReset'),
...require('./migrations/clientEmailCode'),
...require('./migrations/gcash'),
require('./migrations/avatars'),

`CREATE TABLE IF NOT EXISTS users(
id INT AUTO_INCREMENT PRIMARY KEY,
fullname VARCHAR(100),
phone VARCHAR(20),
address VARCHAR(255),
landmark VARCHAR(255),
email VARCHAR(100) UNIQUE,
password VARCHAR(255),
role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)` ,

`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen DATETIME NULL`,

`ALTER TABLE users ADD COLUMN IF NOT EXISTS landmark VARCHAR(255) NULL`,

`ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'client', 'customer') NOT NULL DEFAULT 'client'`,

`UPDATE users
SET role = 'client'
WHERE role IS NULL OR role = '' OR role NOT IN ('admin', 'client')`,

`ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'client') NOT NULL DEFAULT 'client'`,

`CREATE TABLE IF NOT EXISTS password_reset_requests(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
token_hash CHAR(64) NOT NULL UNIQUE,
expires_at DATETIME NOT NULL,
used_at DATETIME NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
INDEX idx_password_reset_user (user_id),
INDEX idx_password_reset_expiry (expires_at)
)`,

`CREATE TABLE IF NOT EXISTS settings(
id INT PRIMARY KEY,
app_name VARCHAR(150) NOT NULL DEFAULT 'MARC Interior Design',
system_mode VARCHAR(30) NOT NULL DEFAULT 'active',
two_factor BOOLEAN NOT NULL DEFAULT FALSE
)`,

`CREATE TABLE IF NOT EXISTS pricing_options(
id INT AUTO_INCREMENT PRIMARY KEY,
option_type ENUM('style', 'complexity', 'estimate') NOT NULL,
name VARCHAR(100) NOT NULL,
value DECIMAL(10,2) NOT NULL,
sort_order INT NOT NULL DEFAULT 0,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
UNIQUE KEY unique_pricing_option (option_type, name)
)`,

`ALTER TABLE pricing_options MODIFY COLUMN option_type ENUM('style', 'complexity', 'estimate') NOT NULL`,

`INSERT IGNORE INTO pricing_options (option_type, name, value, sort_order) VALUES
('style', 'Modern', 2500, 1),
('style', 'Minimalist', 3000, 2),
('style', 'Luxury', 4500, 3),
('complexity', 'Standard', 1, 1),
('complexity', 'Premium', 1.4, 2),
('estimate', 'Minimum factor', 0.9, 1),
('estimate', 'Maximum factor', 1.1, 2)`,

`CREATE TABLE IF NOT EXISTS booking_services(
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(150) NOT NULL UNIQUE,
sort_order INT NOT NULL DEFAULT 0,
is_active BOOLEAN NOT NULL DEFAULT TRUE
)`,

`INSERT IGNORE INTO booking_services (name, sort_order) VALUES
('Living Room Makeover', 1),
('Bedroom Interior Design', 2),
('Kitchen Interior Design', 3),
('Complete Home Interior', 4),
('Commercial Interior Design', 5)`,

`ALTER TABLE settings
ADD COLUMN IF NOT EXISTS app_name VARCHAR(150) NOT NULL DEFAULT 'MARC Interior Design'`,

`ALTER TABLE settings
ADD COLUMN IF NOT EXISTS system_mode VARCHAR(30) NOT NULL DEFAULT 'active'`,

`ALTER TABLE settings
ADD COLUMN IF NOT EXISTS two_factor BOOLEAN NOT NULL DEFAULT FALSE`,

`INSERT IGNORE INTO settings (id, app_name, system_mode, two_factor)
VALUES (1, 'MARC Interior Design', 'active', FALSE)`,

`CREATE TABLE IF NOT EXISTS portfolio(
id INT AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(150),
description TEXT,
category VARCHAR(100),
image VARCHAR(255)
)`,

`CREATE TABLE IF NOT EXISTS bookings(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
service_type VARCHAR(100),
project_description TEXT,
project_address VARCHAR(255),
project_landmark VARCHAR(255),
status VARCHAR(50) DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

require('./migrations/bookingEstimate'),

`ALTER TABLE bookings MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'`,

`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL`,

`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS project_address VARCHAR(255) NULL`,

`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS project_landmark VARCHAR(255) NULL`,

`UPDATE bookings SET accepted_at = COALESCE(accepted_at, created_at)
 WHERE LOWER(status) IN ('confirmed', 'approved', 'ongoing', 'completed')`,

`UPDATE bookings SET status = 'Pending' WHERE status IS NULL OR status = ''`,

`CREATE TABLE IF NOT EXISTS schedules(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
visit_date DATE,
status VARCHAR(30) DEFAULT 'Pending'
)`,

`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS visit_date DATE NULL`,

`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS date DATE NULL`,

`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS time_start TIME NULL`,

`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS reschedule_count INT NOT NULL DEFAULT 0`,

`UPDATE schedules SET visit_date = date WHERE visit_date IS NULL AND date IS NOT NULL`,

`ALTER TABLE schedules MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Pending'`,

`CREATE TABLE IF NOT EXISTS payments(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
amount DECIMAL(10,2),
reference_number VARCHAR(100),
payment_method ENUM('GCash','Maya','Bank Transfer','Cash') NOT NULL,
payment_status ENUM('Pending','Verifying','Settled','Failed') DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_session_id VARCHAR(100) NULL`,

`ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url TEXT NULL`,

`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(100) NULL`,

`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) NOT NULL DEFAULT 'PayMongo'`,

`CREATE TABLE IF NOT EXISTS tracking(
id INT AUTO_INCREMENT PRIMARY KEY,
booking_id INT,
progress INT DEFAULT 0,
current_stage VARCHAR(100),
remarks TEXT,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`ALTER TABLE tracking ADD COLUMN IF NOT EXISTS remarks TEXT`,

`ALTER TABLE tracking ADD COLUMN IF NOT EXISTS progress INT NOT NULL DEFAULT 0`,

`ALTER TABLE tracking ADD COLUMN IF NOT EXISTS progress_percentage INT NULL`,

`UPDATE tracking SET progress = progress_percentage
 WHERE progress = 0 AND progress_percentage IS NOT NULL`,

`CREATE TABLE IF NOT EXISTS notifications(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
title VARCHAR(150),
message TEXT,
is_read BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS messages(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
sender VARCHAR(20),
message TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`ALTER TABLE messages MODIFY COLUMN sender VARCHAR(20) NOT NULL`,

`UPDATE messages SET sender = 'admin' WHERE sender IS NULL OR TRIM(sender) = ''`,

`CREATE TABLE IF NOT EXISTS designs(
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
title VARCHAR(150),
description TEXT,
image VARCHAR(255),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,

`CREATE TABLE IF NOT EXISTS inquiries(
id INT AUTO_INCREMENT PRIMARY KEY,
fullname VARCHAR(100),
email VARCHAR(100),
subject VARCHAR(150),
message TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`

];

const runQuery = (sql) => new Promise((resolve, reject) => {
    db.query(sql, (error) => {
        if (error) return reject(error);
        resolve();
    });
});

const initializeTables = async () => {
    try {
        await db.connectDatabase();

        for (const [index, sql] of queries.entries()) {
            await runQuery(sql);
            console.log(`Table step ${index + 1} ready.`);
        }
        console.log("Database schema is ready.");
    } catch (error) {
        console.error("Database schema initialization failed:", error.message);
        process.exitCode = 1;
    } finally {
        db.destroy();
    }
};

initializeTables();
