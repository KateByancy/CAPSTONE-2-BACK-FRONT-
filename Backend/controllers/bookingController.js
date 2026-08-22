const db = require("../config/db");

// Create Booking
const createBooking = (req, res) => {

    const {
        user_id,
        service_type,
        project_description
    } = req.body;

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
                return res.status(500).json(err);
            }

            res.status(201).json({
                success: true,
                message: "Booking created successfully.",
                bookingId: result.insertId
            });

        }
    );
};

// Get all bookings
const getBookings = (req, res) => {

    db.query(
        "SELECT * FROM bookings",
        (err, result) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json(result);

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

    const {
        service_type,
        project_description,
        status
    } = req.body;

    db.query(
        "UPDATE bookings SET service_type=?, project_description=?, status=? WHERE id=?",
        [
            service_type,
            project_description,
            status,
            req.params.id
        ],
        (err) => {

            if (err) {
                return res.status(500).json(err);
            }

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
