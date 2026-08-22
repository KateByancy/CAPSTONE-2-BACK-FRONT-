const db = require("../config/db");

// Get profile
const getProfile = (req, res) => {
    db.query("SELECT id, fullname, phone, address, email, role, created_at FROM users WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.length) return res.status(404).json({ success: false, message: "Profile not found." });
        res.json({ success: true, profile: result[0] });
    });
};

// Update profile
const updateProfile = (req, res) => {
    const fullname = req.body.fullname || req.body.fullName;
    const phone = req.body.phone || req.body.phoneNumber;
    const address = req.body.address || req.body.primaryAddress || req.body.projectAddress;

    if (!fullname || !phone || !address) {
        return res.status(400).json({ success: false, message: "fullname, phone, and address are required." });
    }

    db.query("UPDATE users SET fullname = ?, phone = ?, address = ? WHERE id = ?", [fullname, phone, address, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Profile not found." });
        res.json({ success: true, message: "Profile updated successfully." });
    });
};

module.exports = {
    getProfile,
    updateProfile
};