const db = require("../config/db");

// Get tracking
const getTracking = (req, res) => {
    const query = req.params.id
        ? "SELECT * FROM tracking WHERE booking_id = ? ORDER BY updated_at DESC"
        : `SELECT tracking.*, bookings.service_type, bookings.project_description,
                  bookings.status AS booking_status, users.fullname AS client_name,
                  users.address AS client_address
           FROM tracking
           JOIN bookings ON bookings.id = tracking.booking_id
           JOIN users ON users.id = bookings.user_id
           ${req.user?.role === 'client' ? 'WHERE bookings.user_id = ?' : ''}
           ORDER BY tracking.updated_at DESC`;
    const params = req.params.id ? [req.params.id] : req.user?.role === 'client' ? [req.user.id] : [];
    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, tracking: result });
    });
};

const createTracking = (req, res) => {
    const { booking_id, progress = 0, current_stage, remarks } = req.body;
    if (!Number.isSafeInteger(Number(booking_id)) || Number(booking_id)<1 || typeof current_stage!=='string' || !current_stage.trim() || current_stage.length>100 || !Number.isFinite(Number(progress)) || Number(progress)<0 || Number(progress)>100) {
        return res.status(400).json({ success: false, message: "booking_id and current_stage are required." });
    }
    db.query("INSERT INTO tracking (booking_id, progress, current_stage, remarks) VALUES (?, ?, ?, ?)", [booking_id, progress, current_stage, remarks || null], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        // Notify client of initial project tracking milestone
        db.query("SELECT user_id, service_type FROM bookings WHERE id = ?", [booking_id], (bErr, bRows) => {
            if (!bErr && bRows.length) {
                const title = `Project Update: Stage "${current_stage}"`;
                const msg = `Your project "${bRows[0].service_type}" has started stage "${current_stage}" (${progress}%). ${remarks ? 'Note: ' + remarks : ''}`;
                db.query("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)", [bRows[0].user_id, title, msg], () => {});
            }
        });

        res.status(201).json({ success: true, trackingId: result.insertId });
    });
};

// Update tracking
const updateTracking = (req, res) => {
    const { progress, current_stage, remarks } = req.body;
    if (progress === undefined || typeof current_stage!=='string' || !current_stage.trim() || current_stage.length>100 || !Number.isFinite(Number(progress)) || Number(progress)<0 || Number(progress)>100) {
        return res.status(400).json({ success: false, message: "progress and current_stage are required." });
    }
    db.query("UPDATE tracking SET progress = ?, current_stage = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [progress, current_stage, remarks || null, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Tracking record not found." });

        // Notify client of milestone/progress update
        db.query(
            "SELECT t.booking_id, b.user_id, b.service_type FROM tracking t JOIN bookings b ON b.id = t.booking_id WHERE t.id = ?",
            [req.params.id],
            (bErr, bRows) => {
                if (!bErr && bRows.length) {
                    const title = Number(progress) >= 100
                        ? `Project 100% Completed: #${bRows[0].booking_id}`
                        : `Project Milestone: ${progress}% - ${current_stage}`;
                    const msg = Number(progress) >= 100
                        ? `Your project "${bRows[0].service_type}" is 100% completed! Handover is complete. You can now leave your verified client star rating and review.`
                        : `Project "${bRows[0].service_type}" progress updated to ${progress}% (${current_stage}). ${remarks ? 'Note: ' + remarks : ''}`;
                    db.query("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)", [bRows[0].user_id, title, msg], () => {});
                }
            }
        );

        res.json({ success: true, message: "Tracking updated successfully." });
    });
};

const deleteTracking = (req, res) => {
    db.query("DELETE FROM tracking WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Tracking record not found." });
        res.json({ success: true, message: "Tracking deleted successfully." });
    });
};

module.exports = {
    getTracking,
    createTracking,
    updateTracking,
    deleteTracking
};
