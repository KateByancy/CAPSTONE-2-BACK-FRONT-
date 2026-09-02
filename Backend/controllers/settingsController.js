const db = require("../config/db");
const cache = require("../utils/cache");

// Get settings
const getSettings = (req, res) => {
    const cached = cache.get("settings:current");
    if (cached) return cache.sendCachedJson(res, cached);

    db.query("SELECT * FROM settings LIMIT 1", (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }

        cache.sendFreshJson(res, "settings:current", result[0], cache.ttl.settings);
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

            cache.clear("settings:current");

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
