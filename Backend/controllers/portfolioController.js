const db = require("../config/db");

// Get all portfolio items
const getPortfolio = (req, res) => {

    db.query(
        "SELECT * FROM portfolio",
        (err, result) => {

            if (err)
                return res.status(500).json(err);

            res.json(result);

        }
    );

};

// Add portfolio item
const addPortfolio = (req, res) => {

    const { title, description, image } = req.body;

    db.query(
        "INSERT INTO portfolio(title, description, image) VALUES(?,?,?)",
        [title, description, image],
        (err, result) => {

            if (err)
                return res.status(500).json(err);

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
    const { title, description, image } = req.body;

    db.query(
        "UPDATE portfolio SET title=?, description=?, image=? WHERE id=?",
        [title, description, image, id],
        (err) => {

            if (err)
                return res.status(500).json(err);

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