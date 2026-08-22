const db = require("../config/db");

// Submit inquiry
const createInquiry = (req, res) => {
    const { fullname, email, subject, message } = req.body;

    db.query(
        "INSERT INTO inquiries (fullname, email, subject, message) VALUES (?, ?, ?, ?)",
        [fullname, email, subject, message],
        (err, result) => {
            if (err) return res.status(500).json(err);

            res.json({
                success: true,
                message: "Inquiry submitted successfully.",
                inquiryId: result.insertId
            });
        }
    );
};

// Get all inquiries
const getInquiries = (req, res) => {
    db.query("SELECT * FROM inquiries", (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
};

// Delete inquiry
const deleteInquiry = (req, res) => {
    db.query(
        "DELETE FROM inquiries WHERE id=?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({
                success: true,
                message: "Inquiry deleted."
            });
        }
    );
};

module.exports = {
    createInquiry,
    getInquiries,
    deleteInquiry
};