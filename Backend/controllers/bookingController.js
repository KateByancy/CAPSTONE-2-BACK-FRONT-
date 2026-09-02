const db = require("../config/db");
const cache = require("../utils/cache");

const fleetLocationCache = new Map();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getFleetLocations = async (_req, res) => {
    try {
        const bookings = await new Promise((resolve, reject) => {
            db.query(
                `SELECT bookings.id,
                        COALESCE(NULLIF(bookings.project_address, ''), users.address) AS address,
                        COALESCE(NULLIF(bookings.project_landmark, ''), users.landmark) AS landmark
                 FROM bookings
                 LEFT JOIN users ON users.id = bookings.user_id
                 WHERE bookings.accepted_at IS NOT NULL
                   AND LOWER(bookings.status) <> 'completed'
                   AND NOT EXISTS (
                     SELECT 1 FROM tracking
                     WHERE tracking.booking_id = bookings.id
                       AND (tracking.progress >= 100 OR LOWER(tracking.current_stage) = 'completed')
                   )`,
                (error, rows) => error ? reject(error) : resolve(rows)
            );
        });

        const locations = [];
        for (const booking of bookings) {
            if (!booking.address) continue;
            const cacheKey = `${booking.address}|${booking.landmark || ''}`.toLowerCase();
            let coordinates = fleetLocationCache.get(cacheKey);

            if (coordinates === undefined) {
                const addressParts = booking.address.split(',').map((part) => part.trim()).filter(Boolean);
                const candidates = Array.from(new Set([
                    booking.address,
                    booking.landmark ? `${booking.address}, near ${booking.landmark}` : '',
                    ...addressParts.map((_, index) => addressParts.slice(index).join(', ')),
                ].filter(Boolean)));

                coordinates = null;
                for (const candidate of candidates) {
                    const query = new URLSearchParams({ format: 'jsonv2', q: `${candidate}, Philippines`, countrycodes: 'ph', limit: '1' });
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
                        headers: { 'User-Agent': 'MARC-Interior-Design-Fleet/1.0' }
                    });
                    const results = response.ok ? await response.json() : [];
                    if (results[0]) {
                        coordinates = { lat: Number(results[0].lat), lng: Number(results[0].lon) };
                        break;
                    }
                    await wait(1100);
                }
                if (coordinates) fleetLocationCache.set(cacheKey, coordinates);
            }

            if (coordinates) locations.push({ booking_id: booking.id, ...coordinates });
        }

        return res.json({ success: true, locations });
    } catch (error) {
        return res.status(502).json({ success: false, message: "Unable to locate project addresses on the map." });
    }
};

// Create Booking
const createBooking = (req, res) => {

    const user_id = Number(req.body.user_id);
    const service_type = (req.body.service_type || "").trim();
    const project_description = (req.body.project_description || "").trim();
    const project_address = (req.body.project_address || "").trim();
    const project_landmark = (req.body.project_landmark || "").trim();
    const preferred_start_date = (req.body.preferred_start_date || "").trim();
    const preferred_start_time = (req.body.preferred_start_time || "").trim();

    if (!user_id || !service_type || !project_description || !project_address || !project_landmark || !/^\d{4}-\d{2}-\d{2}$/.test(preferred_start_date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferred_start_time)) {
        return res.status(400).json({
            success: false,
            message: "Booking details, project address, landmark, and a valid preferred start date and time are required."
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
        db.query("INSERT INTO bookings(user_id, service_type, project_description, project_address, project_landmark) VALUES(?,?,?,?,?)", [user_id, service_type, project_description, project_address, project_landmark], (bookingError, result) => {
            if (bookingError) return db.rollback(() => res.status(500).json({ success: false, message: bookingError.message }));
            db.query("INSERT INTO schedules (booking_id, visit_date, date, time_start, status) VALUES (?, ?, ?, ?, 'Pending')", [result.insertId, preferred_start_date, preferred_start_date, preferred_start_time], (scheduleError) => {
                if (scheduleError) return db.rollback(() => res.status(500).json({ success: false, message: scheduleError.message }));
                db.commit((commitError) => {
                    if (commitError) return db.rollback(() => res.status(500).json({ success: false, message: commitError.message }));
                    cache.clear("schedule:unavailable-slots");
                    res.status(201).json({ success: true, message: "Booking and preferred start schedule submitted successfully.", bookingId: result.insertId, booking: { id: result.insertId, user_id, service_type, project_description, project_address, project_landmark, preferred_start_date, preferred_start_time, status: "Pending" } });
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
                          COALESCE(NULLIF(bookings.project_address, ''), users.address) AS client_address,
                          COALESCE(NULLIF(bookings.project_landmark, ''), users.landmark) AS client_landmark
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

            cache.clear("schedule:unavailable-slots");

            const sendUpdatedResponse = () => res.json({
              success: true,
              message: "Booking updated."
            });

            if (status && status.toLowerCase() === "rejected") {
              db.query(
                `INSERT INTO notifications (user_id, title, message)
                 SELECT user_id, 'Booking Rejected',
                        CONCAT('Your ', service_type, ' booking request (#', id, ') was rejected by the admin.')
                 FROM bookings WHERE id = ?`,
                [req.params.id],
                (notificationError) => {
                  if (notificationError) console.error("Unable to create rejection notification:", notificationError.message);
                  sendUpdatedResponse();
                }
              );
              return;
            }

            sendUpdatedResponse();

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

            cache.clear("schedule:unavailable-slots");

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
    deleteBooking,
    getFleetLocations
};
