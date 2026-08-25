const db = require("../config/db");

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});

const getClientHome = async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) return res.status(400).json({ success: false, message: "A client account is required." });

    const [clients, pricingOptions, services, bookings] = await Promise.all([
      query("SELECT id, fullname, email, phone, address FROM users WHERE id = ? LIMIT 1", [userId]),
      query("SELECT option_type, name, value FROM pricing_options WHERE is_active = TRUE ORDER BY option_type, sort_order, id"),
      query("SELECT id, name FROM booking_services WHERE is_active = TRUE ORDER BY sort_order, id"),
      query(
        `SELECT bookings.id, bookings.service_type, bookings.project_description, bookings.status,
                bookings.created_at, schedules.id AS schedule_id,
                DATE_FORMAT(schedules.visit_date, '%Y-%m-%d') AS visit_date,
                TIME_FORMAT(schedules.time_start, '%H:%i') AS time_start
         FROM bookings
         LEFT JOIN schedules ON schedules.booking_id = bookings.id
         WHERE bookings.user_id = ?
           AND LOWER(bookings.status) NOT IN ('completed', 'cancelled', 'rejected')
         ORDER BY bookings.created_at DESC, bookings.id DESC, schedules.id DESC
         LIMIT 1`,
        [userId],
      ),
    ]);

    if (!clients.length) return res.status(404).json({ success: false, message: "Client account not found." });
    return res.json({
      success: true,
      client: clients[0],
      pricing: {
        styles: pricingOptions.filter((item) => item.option_type === "style"),
        complexities: pricingOptions.filter((item) => item.option_type === "complexity"),
        estimateFactors: pricingOptions.filter((item) => item.option_type === "estimate"),
      },
      services,
      activeProject: bookings[0] || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getClientHome };
