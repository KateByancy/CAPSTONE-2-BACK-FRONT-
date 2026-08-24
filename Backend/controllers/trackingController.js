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
           ORDER BY tracking.updated_at DESC`;
    const params = req.params.id ? [req.params.id] : [];
    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, tracking: result });
    });
};

const createTracking = (req, res) => {
    const { booking_id, progress = 0, current_stage, remarks } = req.body;
    if (!booking_id || !current_stage) {
        return res.status(400).json({ success: false, message: "booking_id and current_stage are required." });
    }
    db.query("INSERT INTO tracking (booking_id, progress, current_stage, remarks) VALUES (?, ?, ?, ?)", [booking_id, progress, current_stage, remarks || null], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({ success: true, trackingId: result.insertId });
    });
};

// Update tracking
const updateTracking = (req, res) => {
    const { progress, current_stage, remarks } = req.body;
    if (progress === undefined || !current_stage) {
        return res.status(400).json({ success: false, message: "progress and current_stage are required." });
    }
    db.query("UPDATE tracking SET progress = ?, current_stage = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [progress, current_stage, remarks || null, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Tracking record not found." });
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
