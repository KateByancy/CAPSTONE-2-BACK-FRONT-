const db = require("../config/db");

// Get notifications
const getNotifications = (req, res) => {
    const userId = req.query.user_id;
    const sql = userId ? "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC" : "SELECT * FROM notifications ORDER BY created_at DESC";
    db.query(sql, userId ? [userId] : [], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, notifications: result });
    });
};

// Create notification
const createNotification = (req, res) => {
    const { user_id, title, message } = req.body;
    if (!user_id || !title || !message) return res.status(400).json({ success: false, message: "user_id, title, and message are required." });
    db.query("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)", [user_id, title, message], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.status(201).json({ success: true, notificationId: result.insertId });
    });
};

// Mark notification as read
const markAsRead = (req, res) => {
    db.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Notification not found." });
        res.json({ success: true, message: "Notification marked as read." });
    });
};

// Delete notification
const deleteNotification = (req, res) => {
    db.query("DELETE FROM notifications WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Notification not found." });
        res.json({ success: true, message: "Notification deleted." });
    });
};

module.exports = {
    getNotifications,
    createNotification,
    markAsRead,
    deleteNotification
};