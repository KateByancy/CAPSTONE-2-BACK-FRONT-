const db = require("../config/db");
const cache = require("../utils/cache");

const fleetGeocoder = require('../services/fleetGeocoder').createFleetGeocoder();

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

        return res.json({ success: true, ...fleetGeocoder.read(bookings) });
    } catch (error) {
        return res.status(502).json({ success: false, message: "Unable to locate project addresses on the map." });
    }
};

// Create Booking
const createBooking = async (req, res) => {
    const user_id = Number(req.body.user_id);
    const read = (key) => typeof req.body[key] === 'string' ? req.body[key].trim() : '';
    let designDetails;
    try {
        let catalog;
        if (req.body.design_id !== undefined) {
            catalog = await new Promise((resolve,reject)=>db.query('SELECT *,title AS name FROM design_catalog WHERE id=? AND published=TRUE AND deleted=FALSE',[req.body.design_id],(error,rows)=>error?reject(error):resolve(rows)));
        }
        designDetails = require('../utils/bookingDesign')(req.body, catalog);
    }
    catch (error) { return res.status(error.status || 400).json({ success: false, message: error.message }); }
    const selectedService = req.body.estimate != null ? (typeof req.body.estimate.service === 'string' ? req.body.estimate.service.trim() : '') : read('service_type');
    const service_type = designDetails?.service_type || (selectedService === 'Other' ? read('other_service') : selectedService);
    const project_description = designDetails?.project_description || read('project_description');
    const project_address = read('project_address');
    const project_landmark = read('project_landmark');
    const preferred_start_date = read('preferred_start_date');
    const preferred_start_time = read('preferred_start_time');
    if (!Number.isInteger(user_id) || user_id <= 0 || !service_type || service_type.length > 100 || !project_description || !project_address || !project_landmark || !require('../utils/projectDate')(preferred_start_date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferred_start_time)) {
        return res.status(400).json({ success: false, message: 'Complete all booking details. For Other, specify your desired design/service (up to 100 characters).' });
    }
    // Isolate the transaction and database lock from other requests on the shared connection.
    const mysql = require('mysql2/promise');
    let connection;
    let locked = false;
    try {
        const { host, port, user, password, database } = db.config;
        connection = await mysql.createConnection({ host, port, user, password, database, ssl: require('../config/dbSsl')() });
        const [locks] = await connection.query("SELECT GET_LOCK('mcidbms:create-booking', 10) AS acquired");
        locked = Number(locks[0].acquired) === 1;
        if (!locked) return res.status(503).json({ success: false, message: 'Booking is busy. Please try again.' });
        await connection.beginTransaction();
        const [conflicts] = await connection.execute(
            "SELECT b.user_id FROM schedules s JOIN bookings b ON b.id = s.booking_id WHERE s.visit_date = ? AND LOWER(s.status) NOT IN ('cancelled', 'rejected') AND LOWER(b.status) NOT IN ('cancelled', 'rejected')",
            [preferred_start_date]);
        if (conflicts.length) {
            await connection.rollback();
            const duplicate = conflicts.some(row => Number(row.user_id) === user_id);
            return res.status(409).json({ success: false, code: duplicate ? 'DUPLICATE_BOOKING' : 'SCHEDULE_CONFLICT', message: duplicate ? 'You already have a booking for this day. Only one booking per day is allowed.' : 'This day is already booked. Please choose another date.' });
        }
        let estimate = null;
        if (req.body.estimate != null) {
            const [pricing] = await connection.query('SELECT option_type, name, value FROM pricing_options WHERE is_active = TRUE');
            estimate = require('../utils/bookingEstimate').calculateEstimate(req.body.estimate, pricing);
        }
        // Older installations also require preferred_date, preferred_time and location.
        const [columns] = await connection.query('SHOW COLUMNS FROM bookings');
        const record = { user_id, service_type, project_description, project_address, project_landmark, estimate: estimate ? JSON.stringify(estimate) : null };
        if(columns.some(column=>column.Field==='design_snapshot'))record.design_snapshot=designDetails?.design_snapshot?JSON.stringify(designDetails.design_snapshot):null;
        for (const [name, value] of Object.entries({ preferred_date: preferred_start_date, preferred_time: preferred_start_time, location: project_address })) {
            if (columns.some(column => column.Field === name)) record[name] = value;
        }
        const [result] = await connection.query('INSERT INTO bookings SET ?', record);
        await connection.execute("INSERT INTO schedules (booking_id, visit_date, date, time_start, status) VALUES (?, ?, ?, ?, 'Pending')", [result.insertId, preferred_start_date, preferred_start_date, preferred_start_time]);
        await connection.commit();
        cache.clear('schedule:unavailable-slots');
        return res.status(201).json({ success: true, message: 'Booking and preferred start schedule submitted successfully.', bookingId: result.insertId, booking: { ...record, estimate, id: result.insertId, preferred_start_date, preferred_start_time, status: 'Pending' } });
    } catch (error) {
        if (connection) await connection.rollback();
        return res.status(error.status || 500).json({ success: false, message: error.message });
    } finally {
        if (connection) {
            try { if (locked) await connection.query("SELECT RELEASE_LOCK('mcidbms:create-booking')"); }
            finally { await connection.end(); }
        }
    }
};

// Get all bookings
const getBookings = (req, res) => {
    const userId = Number(req.query.user_id);
    const includeArchived = req.query.include_archived === 'true' || Boolean(userId);
    const whereClauses = [];
    const params = [];

    if (userId) {
        whereClauses.push("bookings.user_id = ?");
        params.push(userId);
    } else if (!includeArchived) {
        whereClauses.push("(bookings.is_archived IS NULL OR bookings.is_archived = 0)");
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `SELECT bookings.*, users.fullname AS client_name, users.email AS client_email,
                          COALESCE(NULLIF(bookings.project_address, ''), users.address) AS client_address,
                          COALESCE(NULLIF(bookings.project_landmark, ''), users.landmark) AS client_landmark
                   FROM bookings
                   LEFT JOIN users ON users.id = bookings.user_id
                   ${whereSql}
                   ORDER BY bookings.created_at DESC, bookings.id DESC`;
    db.query(
        query,
        params,
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

    if (status && (typeof status !== 'string' || !['Pending','Confirmed','Approved','Ongoing','Completed','Rejected','Cancelled'].some(value => value.toLowerCase() === status.toLowerCase()))) {
        return res.status(400).json({ success: false, message: 'Choose a valid booking status.' });
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
        `UPDATE bookings SET ${updates.join(", ")} WHERE id = ? ${status && ['rejected','cancelled'].includes(status.toLowerCase()) ? "AND NOT EXISTS (SELECT 1 FROM gcash_requests p WHERE p.booking_id=bookings.id AND p.status <> 'Cancelled') AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id=bookings.id) AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.booking_id=bookings.id)" : ''}`,
        values,
        (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            if (!result.affectedRows) return res.status(409).json({ success: false, message: "Booking could not be changed. Resolve associated payment records before cancelling or rejecting a booking." });

            cache.clear("schedule:unavailable-slots");

            const sendUpdatedResponse = () => res.json({
                success: true,
                message: "Booking updated."
            });

            if (status && ["confirmed", "approved", "rejected", "completed"].includes(status.toLowerCase())) {
                const normStatus = status.toLowerCase();
                let title = "Booking Updated";
                let msg = `Your booking #${req.params.id} status is now ${status}.`;

                if (normStatus === "confirmed" || normStatus === "approved") {
                    title = "Booking Accepted";
                    msg = `Your booking request (#${req.params.id}) has been accepted by the admin.`;
                } else if (normStatus === "rejected") {
                    title = "Booking Rejected";
                    msg = `Your booking request (#${req.params.id}) was rejected by the admin.`;
                } else if (normStatus === "completed") {
                    title = "Project Completed";
                    msg = `Your interior project (#${req.params.id}) is marked as Completed! You can now view your completed project updates and submit your verified star rating & review.`;
                }

                db.query(
                    `INSERT INTO notifications (user_id, title, message)
                     SELECT user_id, ?, ?
                     FROM bookings WHERE id = ?`,
                    [title, msg, req.params.id],
                    (notificationError) => {
                        if (notificationError) console.error("Unable to create notification:", notificationError.message);
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
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    // Check if the booking exists and whether it is completed
    const checkSql = `
        SELECT b.id, b.status, b.is_archived,
               EXISTS(
                 SELECT 1 FROM tracking t 
                 WHERE t.booking_id = b.id AND (t.progress >= 100 OR LOWER(t.current_stage) = 'completed')
               ) AS is_completed_track
        FROM bookings b
        WHERE b.id = ?
    `;

    db.query(checkSql, [id], (lookupErr, rows) => {
        if (lookupErr) {
            return res.status(500).json({ success: false, message: lookupErr.message || "Database error verifying booking status." });
        }
        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const booking = rows[0];
        const isCompleted = booking.status?.toLowerCase() === 'completed' || Boolean(booking.is_completed_track);

        if (isCompleted) {
            // Archive instead of permanently deleting
            db.query(
                "UPDATE bookings SET is_archived = 1, archived_at = NOW() WHERE id = ?",
                [id],
                (archiveErr) => {
                    if (archiveErr) return res.status(500).json({ success: false, message: archiveErr.message });
                    cache.clear("schedule:unavailable-slots");
                    return res.json({
                        success: true,
                        archived: true,
                        message: "Completed project archived successfully. Client access, concept photos, ratings, and reviews are preserved."
                    });
                }
            );
            return;
        }

        // For non-completed projects, perform safe deletion if no financial or design history exists
        db.query(
            "DELETE FROM bookings WHERE id=? AND NOT EXISTS (SELECT 1 FROM gcash_requests p WHERE p.booking_id=bookings.id) AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id=bookings.id) AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.booking_id=bookings.id) AND NOT EXISTS (SELECT 1 FROM project_messages m WHERE m.booking_id=bookings.id) AND NOT EXISTS (SELECT 1 FROM designs d WHERE d.project_id=bookings.id)",
            [id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: err.message || "Unable to delete booking." });
                }

                if (!result.affectedRows) {
                    return res.status(409).json({
                        success: false,
                        message: "Bookings with payment, quotation, project-chat, or design records cannot be deleted. Keep them for history."
                    });
                }

                cache.clear("schedule:unavailable-slots");

                res.json({
                    success: true,
                    archived: false,
                    message: "Booking deleted."
                });
            }
        );
    });
};

module.exports = {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
    getFleetLocations
};
