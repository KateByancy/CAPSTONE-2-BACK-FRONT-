const db = require("../config/db");

// Create Booking
const createBooking = (req, res) => {

    const user_id = Number(req.body.user_id);
    const service_type = (req.body.service_type || "").trim();
    const project_description = (req.body.project_description || "").trim();
    const preferred_start_date = (req.body.preferred_start_date || "").trim();
    const preferred_start_time = (req.body.preferred_start_time || "").trim();

    if (!user_id || !service_type || !project_description || !/^\d{4}-\d{2}-\d{2}$/.test(preferred_start_date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferred_start_time)) {
        return res.status(400).json({
            success: false,
            message: "Booking details and a valid preferred start date and time are required."
        });
    }

    db.query(
      `SELECT id FROM schedules
       WHERE visit_date = ? AND TIME_FORMAT(time_start, '%H:%i') = ?
         AND LOWER(status) NOT IN ('cancelled', 'rejected')
       LIMIT 1`,
      [preferred_start_date, preferred_start_time],
      (availabilityError, conflicts) => {
        if (availabilityError) return res.status(500).json({ success:false, message:availabilityError.message });
        if (conflicts.length) return res.status(409).json({ success:false, code:'SCHEDULE_CONFLICT', message:'That project date and time is already booked. Please choose another slot.' });

    db.beginTransaction((transactionError) => {
        if (transactionError) return res.status(500).json({ success: false, message: transactionError.message });
        db.query("INSERT INTO bookings(user_id, service_type, project_description) VALUES(?,?,?)", [user_id, service_type, project_description], (bookingError, result) => {
            if (bookingError) return db.rollback(() => res.status(500).json({ success: false, message: bookingError.message }));
            db.query("INSERT INTO schedules (booking_id, visit_date, date, time_start, status) VALUES (?, ?, ?, ?, 'Pending')", [result.insertId, preferred_start_date, preferred_start_date, preferred_start_time], (scheduleError) => {
                if (scheduleError) return db.rollback(() => res.status(500).json({ success: false, message: scheduleError.message }));
                db.commit((commitError) => {
                    if (commitError) return db.rollback(() => res.status(500).json({ success: false, message: commitError.message }));
                    res.status(201).json({ success: true, message: "Booking and preferred start schedule submitted successfully.", bookingId: result.insertId, booking: { id: result.insertId, user_id, service_type, project_description, preferred_start_date, preferred_start_time, status: "Pending" } });
                });
            });
        });
    });
      }
    );
};

// Get all bookings
const getBookings = (req, res) => {

    const userId = Number(req.query.user_id);
    const query = `SELECT bookings.*, users.fullname AS client_name, users.email AS client_email,
                          users.address AS client_address
                   FROM bookings
                   LEFT JOIN users ON users.id = bookings.user_id
                   ${userId ? "WHERE bookings.user_id = ?" : ""}
                   ORDER BY bookings.created_at DESC, bookings.id DESC`;
    db.query(
        query,
        userId ? [userId] : [],
        (err, result) => {

            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({ success: true, bookings: result });

        }
    );
};

// Get one booking
const getBookingById = (req, res) => {

    db.query(
        "SELECT * FROM bookings WHERE id=?",
        [req.params.id],
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(result);

        }
    );
};

// Update booking
const updateBooking = (req, res) => {

    const { service_type, project_description, status } = req.body;

    if (!status && (!service_type || !project_description)) {
        return res.status(400).json({ success: false, message: "Provide a status or the complete booking details." });
    }

    const updates = [];
    const values = [];
    if (service_type) { updates.push("service_type = ?"); values.push(service_type); }
    if (project_description) { updates.push("project_description = ?"); values.push(project_description); }
    if (status) {
        updates.push("status = ?"); values.push(status);
        if (status.toLowerCase() === "confirmed" || status.toLowerCase() === "approved") updates.push("accepted_at = COALESCE(accepted_at, NOW())");
        if (status.toLowerCase() === "rejected" || status.toLowerCase() === "cancelled") updates.push("accepted_at = NULL");
    }
    values.push(req.params.id);

    db.query(
        `UPDATE bookings SET ${updates.join(", ")} WHERE id = ?`,
        values,
        (err, result) => {

            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Booking not found." });

            res.json({
                success: true,
                message: "Booking updated."
            });

        }
    );
};

// Delete booking
const deleteBooking = (req, res) => {

    db.query(
        "DELETE FROM bookings WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                success: true,
                message: "Booking deleted."
            });

        }
    );
};

module.exports = {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking
};
