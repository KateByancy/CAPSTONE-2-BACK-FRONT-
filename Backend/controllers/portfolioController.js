const db = require("../config/db");
const cache = require("../utils/cache");

// Get all portfolio items
const getPortfolio = (req, res) => {
    const cacheKey = req.params.id ? `portfolio:${req.params.id}` : "portfolio:all";
    const cached = cache.get(cacheKey);
    if (cached) return cache.sendCachedJson(res, cached);

    db.query(
        req.params.id ? "SELECT * FROM portfolio WHERE id = ?" : "SELECT * FROM portfolio ORDER BY id DESC",
        req.params.id ? [req.params.id] : [],
        (err, result) => {

            if (err)
                return res.status(500).json(err);

            cache.sendFreshJson(res, cacheKey, result, cache.ttl.portfolio);

        }
    );

};

// Add portfolio item
const addPortfolio = (req, res) => {

    const { title, description, image, category } = req.body;

    if (!validPortfolio(req.body)) return res.status(400).json({ success: false, message: "Provide a title, description, image and valid category." });

    db.query(
        "INSERT INTO portfolio(title, description, image, category) VALUES(?,?,?,?)",
        [title, description, image, category || null],
        (err, result) => {

            if (err)
                return res.status(500).json(err);

            cache.clearByPrefix("portfolio:");
            cache.clearByPrefix("landing:");

            res.json({
                success: true,
                message: "Portfolio added successfully."
            });

        }
    );

};

// Update portfolio item
const updatePortfolio = (req, res) => {

    const { id } = req.params;
    const { title, description, image, category } = req.body;

    if (!validPortfolio(req.body)) return res.status(400).json({ success: false, message: "Provide a title, description, image and valid category." });

    db.query(
        "UPDATE portfolio SET title=?, description=?, image=?, category=COALESCE(?, category) WHERE id=?",
        [title, description, image, category ?? null, id],
        (err, result) => {

            if (err)
                return res.status(500).json(err);

            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Portfolio item not found." });

            cache.clearByPrefix("portfolio:");
            cache.clearByPrefix("landing:");

            res.json({
                success: true,
                message: "Portfolio updated successfully."
            });

        }
    );

};

// Delete portfolio item
const deletePortfolio = (req, res) => {

    const { id } = req.params;

    db.query(
        "DELETE FROM portfolio WHERE id=?",
        [id],
        (err, result) => {

            if (err)
                return res.status(500).json(err);

            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Portfolio item not found." });

            cache.clearByPrefix("portfolio:");
            cache.clearByPrefix("landing:");

            res.json({
                success: true,
                message: "Portfolio deleted successfully."
            });

        }
    );

};

function validPortfolio({ title, description, image, category }) {
    return typeof title === 'string' && title.trim().length > 0 && title.length <= 150
        && typeof description === 'string' && description.trim().length > 0
        && typeof image === 'string' && image.length > 0 && image.length <= 255
        && (category == null || (typeof category === 'string' && category.length <= 100));
}

module.exports = {
    getPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio
};
