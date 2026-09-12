const db = require("../config/db");

// Get profile
const getProfile = (req, res) => {
    db.query("SELECT id, fullname, phone, address, landmark, email, role, created_at FROM users WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.length) return res.status(404).json({ success: false, message: "Profile not found." });
        res.json({ success: true, profile: result[0] });
    });
};

// Update profile
const updateProfile = (req, res) => {
    const body = req.body || {};
    const fields = {
        fullname: body.fullname ?? body.fullName,
        phone: body.phone ?? body.phoneNumber,
        address: body.address ?? body.primaryAddress ?? body.projectAddress,
        landmark: body.landmark
    };
    const updates = Object.entries(fields).filter(([, value]) => value !== undefined);
    const limits = { fullname: 150, phone: 30, address: 16383, landmark: 255 };
    if (!updates.length || updates.some(([field, value]) =>
        typeof value !== "string" || value.trim().length > limits[field] ||
        (field === "fullname" && !value.trim())
    )) {
        return res.status(400).json({ success: false, message: "Provide valid profile fields. Full name cannot be empty (150 characters maximum); phone allows 30 characters and landmark 255." });
    }

    // Only allow profile columns; omitted fields retain their stored values.
    db.query(`UPDATE users SET ${updates.map(([field]) => `${field} = ?`).join(", ")} WHERE id = ?`, [...updates.map(([, value]) => value.trim()), req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Profile not found." });
        return getProfile(req, res);
    });
};

module.exports = {
    getProfile,
    updateProfile
};
