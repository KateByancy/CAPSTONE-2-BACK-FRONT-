const db = require('../config/db');

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});

// Resolve design_id from snapshot or service type
const resolveDesignId = async (booking) => {
  if (booking.design_snapshot) {
    try {
      const snapshot = typeof booking.design_snapshot === 'string'
        ? JSON.parse(booking.design_snapshot)
        : booking.design_snapshot;
      if (snapshot?.design_id) return snapshot.design_id;
      if (snapshot?.id) return snapshot.id;
    } catch {
      // ignore
    }
  }
  if (booking.service_type) {
    const rows = await query('SELECT id FROM design_catalog WHERE category = ? AND deleted = FALSE LIMIT 1', [booking.service_type]);
    if (rows.length) return rows[0].id;
  }
  return null;
};

// GET /api/reviews
exports.getReviews = async (req, res) => {
  try {
    const { design_id, booking_id, user_id } = req.query;
    const conditions = [];
    const values = [];

    if (design_id && design_id !== 'All' && design_id !== 'all') {
      conditions.push('(r.design_id = ? OR b.service_type = (SELECT category FROM design_catalog WHERE id = ? LIMIT 1))');
      values.push(design_id, design_id);
    }
    if (booking_id) {
      conditions.push('r.booking_id = ?');
      values.push(Number(booking_id));
    }
    if (user_id) {
      conditions.push('r.user_id = ?');
      values.push(Number(user_id));
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `SELECT r.id, r.booking_id, r.user_id, r.design_id, r.rating, r.comment,
                        r.created_at, r.updated_at,
                        u.fullname AS client_name,
                        b.service_type, b.project_description, b.status AS booking_status
                 FROM project_reviews r
                 JOIN users u ON u.id = r.user_id
                 JOIN bookings b ON b.id = r.booking_id
                 ${whereClause}
                 ORDER BY r.created_at DESC`;

    const reviews = await query(sql, values);

    // Calculate metrics
    const totalCount = reviews.length;
    const average = totalCount
      ? Math.round((reviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalCount) * 10) / 10
      : 5.0;

    res.json({
      success: true,
      reviews,
      count: totalCount,
      average
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to load reviews.' });
  }
};

// POST /api/reviews (Submit or update verified client review)
exports.submitReview = async (req, res) => {
  try {
    const bookingId = Number(req.body.booking_id);
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid completed booking ID is required.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5 stars.' });
    }
    if (!comment || comment.length < 5 || comment.length > 2000) {
      return res.status(400).json({ success: false, message: 'Comment must be between 5 and 2000 characters.' });
    }

    // Verify relationship and completion
    const userId = req.user.id;
    const rows = await query(`
      SELECT b.id, b.user_id, b.service_type, b.status, b.design_snapshot,
             COALESCE(t.progress, 0) AS progress, t.current_stage
      FROM bookings b
      LEFT JOIN tracking t ON t.booking_id = b.id
      WHERE b.id = ? AND b.user_id = ?
    `, [bookingId, userId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Project record not found or does not belong to your account.' });
    }

    const booking = rows[0];
    const isCompleted = booking.status?.toLowerCase() === 'completed'
      || Number(booking.progress) >= 100
      || booking.current_stage === 'Final Handover'
      || booking.current_stage === 'Completed';

    if (!isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Client reviews can only be submitted for completed projects with 100% handover.'
      });
    }

    const designId = req.body.design_id || await resolveDesignId(booking);

    // Upsert review (1 genuine review per booking)
    const result = await query(`
      INSERT INTO project_reviews (booking_id, user_id, design_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        design_id = COALESCE(VALUES(design_id), design_id),
        updated_at = NOW()
    `, [bookingId, userId, designId || null, rating, comment]);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your verified rating and review have been recorded.',
      review: {
        booking_id: bookingId,
        user_id: userId,
        design_id: designId,
        rating,
        comment
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to submit review.' });
  }
};

// GET /api/reviews/mine
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const reviews = await query(`
      SELECT r.*, b.service_type, b.status AS booking_status
      FROM project_reviews r
      JOIN bookings b ON b.id = r.booking_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to load reviews.' });
  }
};

