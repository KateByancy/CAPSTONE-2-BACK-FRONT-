const db = require("../config/db");

// Create Booking
const createBooking = (req, res) => {

    const user_id = Number(req.body.user_id);
    const service_type = (req.body.service_type || "").trim();
    const project_description = (req.body.project_description || "").trim();

    if (!user_id || !service_type || !project_description) {
        return res.status(400).json({
            success: false,
            message: "user_id, service_type, and project_description are required."
        });
    }

    db.query(
        "INSERT INTO bookings(user_id, service_type, project_description) VALUES(?,?,?)",
        [user_id, service_type, project_description],
        (err, result) => {

            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            res.status(201).json({
                success: true,
                message: "Booking created successfully.",
                bookingId: result.insertId,
                booking: { id: result.insertId, user_id, service_type, project_description, status: "Pending" }
            });

        }
    );
};

// Get all bookings
const getBookings = (req, res) => {

    const userId = Number(req.query.user_id);
    const query = `SELECT bookings.*, users.fullname AS client_name, users.email AS client_email
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
    if (status) { updates.push("status = ?"); values.push(status); }
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
