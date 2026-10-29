const router = require('express').Router();
const auth = require('../middeware/auth');
const db = require('../config/db');

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});

const events = `
  SELECT CONCAT('booking:', b.id) AS event_key, 'booking' AS kind, b.id AS booking_id, b.user_id, u.fullname AS client_name, b.created_at
  FROM bookings b
  JOIN users u ON u.id = b.user_id
  UNION ALL
  SELECT CONCAT('support:', m.id), 'support', NULL, m.user_id, u.fullname, m.created_at
  FROM messages m
  JOIN users u ON u.id = m.user_id
  WHERE m.sender = 'client'
  UNION ALL
  SELECT CONCAT('project:', m.id), 'project', m.booking_id, b.user_id, u.fullname, m.created_at
  FROM project_messages m
  JOIN bookings b ON b.id = m.booking_id
  JOIN users u ON u.id = b.user_id
  WHERE m.sender = 'client'
  UNION ALL
  SELECT CONCAT('quote:', q.id),
         CASE WHEN q.status = 'Accepted' THEN 'quote_accepted' ELSE 'quote_changes' END,
         q.booking_id, b.user_id, u.fullname, q.responded_at
  FROM quotations q
  JOIN bookings b ON b.id = q.booking_id
  JOIN users u ON u.id = b.user_id
  WHERE q.status IN ('Accepted', 'Changes requested') AND q.responded_at IS NOT NULL
`;

router.use(auth, auth.authorizeRoles('admin'));

const wrap = (fn) => async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    await fn(req, res);
  } catch (err) {
    console.error('Admin notification error:', err);
    res.status(503).json({ success: false, message: 'Unable to process notifications. Please retry.' });
  }
};

// GET /api/admin-notifications?status=active|archived
router.get('/', wrap(async (req, res) => {
  const status = req.query.status === 'archived' ? 'archived' : 'active';
  
  // Active: deleted_at IS NULL AND archived_at IS NULL
  // Archived: deleted_at IS NULL AND archived_at IS NOT NULL
  const condition = status === 'archived'
    ? 'r.deleted_at IS NULL AND r.archived_at IS NOT NULL'
    : '(r.deleted_at IS NULL AND r.archived_at IS NULL)';

  const notifications = await query(`
    SELECT e.*, r.read_at, r.archived_at
    FROM (${events}) e
    LEFT JOIN admin_notification_reads r ON r.event_key = e.event_key AND r.admin_id = ?
    WHERE ${condition}
    ORDER BY e.created_at DESC, e.event_key DESC
    LIMIT 100
  `, [req.user.id]);

  const [unreadCount] = await query(`
    SELECT COUNT(*) AS unread
    FROM (${events}) e
    LEFT JOIN admin_notification_reads r ON r.event_key = e.event_key AND r.admin_id = ?
    WHERE r.deleted_at IS NULL AND r.archived_at IS NULL AND r.read_at IS NULL
  `, [req.user.id]);

  const [activeCount] = await query(`
    SELECT COUNT(*) AS total
    FROM (${events}) e
    LEFT JOIN admin_notification_reads r ON r.event_key = e.event_key AND r.admin_id = ?
    WHERE r.deleted_at IS NULL AND r.archived_at IS NULL
  `, [req.user.id]);

  const [archivedCount] = await query(`
    SELECT COUNT(*) AS total
    FROM (${events}) e
    JOIN admin_notification_reads r ON r.event_key = e.event_key AND r.admin_id = ?
    WHERE r.deleted_at IS NULL AND r.archived_at IS NOT NULL
  `, [req.user.id]);

  res.json({
    success: true,
    notifications,
    unread: Number(unreadCount?.unread || 0),
    active_count: Number(activeCount?.total || 0),
    archived_count: Number(archivedCount?.total || 0),
  });
}));

// PUT /api/admin-notifications/read-all
router.put('/read-all', wrap(async (req, res) => {
  await query(`
    INSERT INTO admin_notification_reads (admin_id, event_key, read_at)
    SELECT ?, e.event_key, NOW()
    FROM (${events}) e
    ON DUPLICATE KEY UPDATE read_at = COALESCE(read_at, NOW())
  `, [req.user.id]);
  res.json({ success: true });
}));

// PUT /api/admin-notifications/archive-all
router.put('/archive-all', wrap(async (req, res) => {
  await query(`
    INSERT INTO admin_notification_reads (admin_id, event_key, read_at, archived_at)
    SELECT ?, e.event_key, NOW(), NOW()
    FROM (${events}) e
    ON DUPLICATE KEY UPDATE archived_at = NOW(), read_at = COALESCE(read_at, NOW())
  `, [req.user.id]);
  res.json({ success: true });
}));

// PUT /api/admin-notifications/:key/read
router.put('/:key/read', wrap(async (req, res) => {
  if (!/^(booking|support|project|quote):[1-9]\d*$/.test(req.params.key)) {
    return res.status(400).json({ message: 'Invalid notification.' });
  }
  const result = await query(`
    INSERT INTO admin_notification_reads (admin_id, event_key, read_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE read_at = COALESCE(read_at, NOW())
  `, [req.user.id, req.params.key]);
  res.json({ success: true, updated: result.affectedRows > 0 });
}));

// PUT /api/admin-notifications/:key/archive
router.put('/:key/archive', wrap(async (req, res) => {
  if (!/^(booking|support|project|quote):[1-9]\d*$/.test(req.params.key)) {
    return res.status(400).json({ message: 'Invalid notification.' });
  }
  const existing = await query(
    'SELECT archived_at FROM admin_notification_reads WHERE admin_id = ? AND event_key = ?',
    [req.user.id, req.params.key]
  );
  if (!existing.length) {
    await query(
      'INSERT INTO admin_notification_reads (admin_id, event_key, read_at, archived_at) VALUES (?, ?, NOW(), NOW())',
      [req.user.id, req.params.key]
    );
    return res.json({ success: true, archived: true });
  }
  const newArchived = existing[0].archived_at ? null : new Date();
  await query(
    'UPDATE admin_notification_reads SET archived_at = ?, read_at = COALESCE(read_at, NOW()) WHERE admin_id = ? AND event_key = ?',
    [newArchived, req.user.id, req.params.key]
  );
  res.json({ success: true, archived: Boolean(newArchived) });
}));

// DELETE /api/admin-notifications/:key
router.delete('/:key', wrap(async (req, res) => {
  if (!/^(booking|support|project|quote):[1-9]\d*$/.test(req.params.key)) {
    return res.status(400).json({ message: 'Invalid notification.' });
  }
  await query(`
    INSERT INTO admin_notification_reads (admin_id, event_key, read_at, deleted_at)
    VALUES (?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE deleted_at = NOW(), read_at = COALESCE(read_at, NOW())
  `, [req.user.id, req.params.key]);
  res.json({ success: true });
}));

module.exports = router;
