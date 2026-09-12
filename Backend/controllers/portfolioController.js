const db = require("../config/db");
const cache = require("../utils/cache");

// Get all portfolio items
const getPortfolio = (req, res) => {
    const cacheKey = req.params.id ? `portfolio:${req.params.id}` : "portfolio:all";
    const cached = cache.get(cacheKey);
    if (cached) return cache.sendCachedJson(res, cached);

    db.query(
        "SELECT * FROM portfolio",
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

    db.query(
        "UPDATE portfolio SET title=?, description=?, image=?, category=COALESCE(?, category) WHERE id=?",
        [title, description, image, category ?? null, id],
        (err) => {

            if (err)
                return res.status(500).json(err);

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
        (err) => {

            if (err)
                return res.status(500).json(err);

            cache.clearByPrefix("portfolio:");
            cache.clearByPrefix("landing:");

            res.json({
                success: true,
                message: "Portfolio deleted successfully."
            });

        }
    );

};

module.exports = {
    getPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio
};
