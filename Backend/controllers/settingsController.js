const db = require("../config/db");

// Get settings
const getSettings = (req, res) => {
    db.query("SELECT * FROM settings LIMIT 1", (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json(result[0]);
    });
};

// Update settings
const updateSettings = (req, res) => {

    const {
        app_name,
        system_mode,
        two_factor
    } = req.body;

    db.query(
        `UPDATE settings
        SET
        app_name=?,
        system_mode=?,
        two_factor=?
        WHERE id=1`,
        [
            app_name,
            system_mode,
            two_factor
        ],
        (err) => {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                success: true,
                message: "Settings updated successfully."
            });
        }
    );
};

module.exports = {
    getSettings,
    updateSettings
};