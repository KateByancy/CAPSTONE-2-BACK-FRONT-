const db = require("../config/db");

// Create a design request
const createDesign = (req, res) => {
    const { user_id, title, description, image } = req.body;

    db.query(
        "INSERT INTO designs (user_id, title, description, image) VALUES (?, ?, ?, ?)",
        [user_id, title, description, image || null],
        (err, result) => {
            if (err) return res.status(500).json(err);

            res.json({
                success: true,
                message: "Design request submitted successfully.",
                designId: result.insertId
            });
        }
    );
};

// Get all design requests
const getDesigns = (req, res) => {
    db.query(`SELECT designs.*, users.fullname AS client_name
              FROM designs LEFT JOIN users ON users.id = designs.user_id
              ORDER BY designs.created_at DESC`, (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
};

// Get one design request
const getDesignById = (req, res) => {
    db.query(
        "SELECT * FROM designs WHERE id=?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);

            res.json(result);
        }
    );
};

// Update a design request
const updateDesign = (req, res) => {
    const { title, description, image } = req.body;

    db.query(
        "UPDATE designs SET title=?, description=?, image=COALESCE(?, image) WHERE id=?",
        [title, description, image ?? null, req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({
                success: true,
                message: "Design updated successfully."
            });
        }
    );
};

// Delete a design request
const deleteDesign = (req, res) => {
    db.query(
        "DELETE FROM designs WHERE id=?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({
                success: true,
                message: "Design deleted successfully."
            });
        }
    );
};

module.exports = {
    createDesign,
    getDesigns,
    getDesignById,
    updateDesign,
    deleteDesign
};
