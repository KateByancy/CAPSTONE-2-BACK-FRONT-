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
    SELECT *
    FROM payments
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
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
  deletePayment,
};