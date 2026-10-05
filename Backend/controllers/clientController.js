const db = require('../config/db');
exports.deleteClient = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid client ID.' });
  // Delete an unused account and its private data in one statement. Booking history stays intact.
  db.query(`DELETE u, m, n, d, r, c FROM users u
    LEFT JOIN messages m ON m.user_id = u.id
    LEFT JOIN notifications n ON n.user_id = u.id
    LEFT JOIN designs d ON d.user_id = u.id
    LEFT JOIN password_reset_requests r ON r.user_id = u.id
    LEFT JOIN client_email_resets c ON c.user_id = u.id
    WHERE u.id = ? AND u.role = 'client'
      AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = u.id)`, [id], (error, result) => {
    if (error) return res.status(500).json({ success: false, message: 'Unable to delete this client.' });
    if (result.affectedRows) return res.json({ success: true, message: 'Client deleted.' });
    db.query("SELECT id FROM users WHERE id = ? AND role = 'client'", [id], (lookupError, rows) => {
      if (lookupError) return res.status(500).json({ success: false, message: 'Unable to delete this client.' });
      if (!rows.length) return res.status(404).json({ success: false, message: 'Client not found.' });
      return res.status(409).json({ success: false, message: 'This client has booking history and cannot be deleted. Their project and payment records must be retained.' });
    });
  });
};
