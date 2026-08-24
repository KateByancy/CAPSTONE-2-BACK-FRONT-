const db = require("../config/db");

// Create payment
const createPayment = (req, res) => {
  const { booking_id, amount, reference_number } = req.body;

  const sql = `
    INSERT INTO payments
    (booking_id, amount, reference_number, status)
    VALUES (?, ?, ?, 'Pending')
  `;

  db.query(
    sql,
    [booking_id, amount, reference_number],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        success: true,
        message: "Payment created successfully."
      });
    }
  );
};

// Get all payments
const getPayments = (req, res) => {
  const sql = `
    SELECT payments.*, users.fullname AS client_name
    FROM payments
    LEFT JOIN bookings ON bookings.id = payments.booking_id
    LEFT JOIN users ON users.id = bookings.user_id
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
};

const declinePayment = (req, res) => {
  db.query("UPDATE payments SET status='Declined' WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Payment not found." });
    res.json({ success: true, message: "Payment declined." });
  });
};

// Verify payment
const verifyPayment = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE payments
    SET status='Verified'
    WHERE id=?
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json({
      success: true,
      message: "Payment verified."
    });
  });
};

// Delete payment
const deletePayment = (req, res) => {
  const { id } = req.params;

  db.query(
    "DELETE FROM payments WHERE id=?",
    [id],
    (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        success: true,
        message: "Payment deleted."
      });
    }
  );
};

module.exports = {
  createPayment,
  getPayments,
  verifyPayment,
  declinePayment,
  deletePayment,
};
