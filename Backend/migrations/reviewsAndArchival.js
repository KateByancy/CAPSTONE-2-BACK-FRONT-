module.exports = async (query) => {
  // 1. Archival columns for bookings
  const bookingCols = await query('SHOW COLUMNS FROM bookings');
  if (!bookingCols.some(col => col.Field === 'is_archived')) {
    try {
      await query('ALTER TABLE bookings ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
  if (!bookingCols.some(col => col.Field === 'archived_at')) {
    try {
      await query('ALTER TABLE bookings ADD COLUMN archived_at DATETIME NULL');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }

  // 2. Admin notification reads and action tracking
  await query(`CREATE TABLE IF NOT EXISTS admin_notification_reads (
    admin_id INT NOT NULL,
    event_key VARCHAR(100) NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME NULL,
    deleted_at DATETIME NULL,
    PRIMARY KEY (admin_id, event_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const readCols = await query('SHOW COLUMNS FROM admin_notification_reads');
  if (!readCols.some(col => col.Field === 'archived_at')) {
    try {
      await query('ALTER TABLE admin_notification_reads ADD COLUMN archived_at DATETIME NULL');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
  if (!readCols.some(col => col.Field === 'deleted_at')) {
    try {
      await query('ALTER TABLE admin_notification_reads ADD COLUMN deleted_at DATETIME NULL');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }

  // 3. Project reviews table
  await query(`CREATE TABLE IF NOT EXISTS project_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    design_id VARCHAR(80) NULL,
    rating INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_booking_review (booking_id),
    KEY idx_design (design_id),
    KEY idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
};

