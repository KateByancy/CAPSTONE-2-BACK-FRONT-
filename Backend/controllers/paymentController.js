const db = require("../config/db");

const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, result) => error ? reject(error) : resolve(result));
});

const payMongoRequest = async (path, options = {}) => {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    const error = new Error("PayMongo is not configured. Add PAYMONGO_SECRET_KEY to the backend environment.");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${PAYMONGO_API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const result = await response.json();

  if (!response.ok) {
    const detail = result?.errors?.[0]?.detail || "PayMongo could not process the request.";
    const error = new Error(detail);
    error.statusCode = response.status;
    throw error;
  }

  return result.data;
};

const syncPendingPayments = async (payments) => Promise.all(payments.map(async (payment) => {
  if (payment.status !== "Pending" || !payment.checkout_session_id) return payment;

  try {
    const checkout = await payMongoRequest(`/checkout_sessions/${payment.checkout_session_id}`);
    const paidPayment = Array.isArray(checkout.attributes?.payments)
      ? checkout.attributes.payments.find((item) => item?.attributes?.status === "paid")
      : null;
    if (!paidPayment) return payment;

    await query("UPDATE payments SET payment_status='Settled', provider_payment_id=? WHERE id=?", [paidPayment.id, payment.id]);
    return { ...payment, status: "Paid", provider_payment_id: paidPayment.id };
  } catch (error) {
    console.error(`Unable to sync PayMongo checkout ${payment.checkout_session_id}:`, error.message);
    return payment;
  }
}));

const createCheckoutSession = async (req, res) => {
  try {
    const bookingId = Number(req.body.booking_id);
    const userId = Number(req.body.user_id);
    const amount = Number(req.body.amount);
    if (!bookingId || !userId || !Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ success: false, message: "Select a booking and enter an amount of at least PHP 100." });
    }

    const bookings = await query(
      `SELECT bookings.id, bookings.service_type, users.fullname, users.email, users.phone
       FROM bookings JOIN users ON users.id = bookings.user_id
       WHERE bookings.id = ? AND bookings.user_id = ?
         AND (bookings.accepted_at IS NOT NULL OR LOWER(bookings.status) IN ('confirmed', 'approved'))
         AND LOWER(bookings.status) NOT IN ('rejected', 'cancelled') LIMIT 1`,
      [bookingId, userId],
    );
    if (!bookings.length) {
      return res.status(404).json({ success: false, message: "An accepted booking was not found for this account. Refresh your projects and try again." });
    }

    const booking = bookings[0];
    const referenceNumber = `BOOKING-${bookingId}-${Date.now()}`;
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].replace(/\/$/, "");
    const checkout = await payMongoRequest("/checkout_sessions", {
      method: "POST",
      body: JSON.stringify({ data: { attributes: {
        billing: { name: booking.fullname, email: booking.email, phone: booking.phone || undefined },
        cancel_url: `${frontendUrl}/?payment=cancelled`,
        success_url: `${frontendUrl}/?payment=success`,
        description: `Payment for ${booking.service_type}`,
        line_items: [{
          amount: Math.round(amount * 100), currency: "PHP", description: `Booking #${bookingId}`,
          name: booking.service_type, quantity: 1,
        }],
        payment_method_types: ["gcash"],
        reference_number: referenceNumber,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
      } } }),
    });

    await query(
      `INSERT INTO payments
       (booking_id, amount, reference_number, payment_status, payment_method, checkout_session_id, checkout_url, payment_provider)
       VALUES (?, ?, ?, 'Pending', 'GCash', ?, ?, 'PayMongo')`,
      [bookingId, amount, referenceNumber, checkout.id, checkout.attributes.checkout_url],
    );

    return res.status(201).json({ success: true, checkoutUrl: checkout.attributes.checkout_url });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    const payments = await query(
      `SELECT payments.id, payments.booking_id, payments.amount, payments.reference_number,
              CASE payments.payment_status WHEN 'Settled' THEN 'Paid' WHEN 'Failed' THEN 'Declined'
                ELSE 'Pending' END AS status,
              payments.created_at, payments.checkout_session_id,
              payments.checkout_url, payments.payment_provider, bookings.service_type,
              users.fullname AS client_name
       FROM payments JOIN bookings ON bookings.id = payments.booking_id
       JOIN users ON users.id = bookings.user_id
       ${userId ? "WHERE bookings.user_id = ?" : ""}
       ORDER BY payments.created_at DESC, payments.id DESC`,
      userId ? [userId] : [],
    );
    const syncedPayments = await syncPendingPayments(payments);
    return res.json(userId ? { success: true, payments: syncedPayments } : syncedPayments);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

const declinePayment = (req, res) => {
  db.query("UPDATE payments SET payment_status='Failed' WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Payment not found." });
    res.json({ success: true, message: "Payment declined." });
  });
};

const verifyPayment = (req, res) => {
  db.query("UPDATE payments SET payment_status='Settled' WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Payment not found." });
    res.json({ success: true, message: "Payment verified." });
  });
};

const deletePayment = (req, res) => {
  db.query("DELETE FROM payments WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, message: "Payment deleted." });
  });
};

module.exports = { createCheckoutSession, getPayments, verifyPayment, declinePayment, deletePayment };
