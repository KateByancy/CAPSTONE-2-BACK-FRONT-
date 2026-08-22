const db = require("../config/db");

exports.getLanding = (req, res) => {
    const userId = req.params.userId;

    const userQuery =
        "SELECT fullname FROM users WHERE id=?";

    const projectQuery =
        "SELECT * FROM portfolio ORDER BY id DESC LIMIT 1";

    db.query(userQuery, [userId], (err, users) => {
        if (err) return res.status(500).json(err);

        db.query(projectQuery, (err2, projects) => {
            if (err2) return res.status(500).json(err2);

            res.json({
                user: users[0],
                project: projects[0]
            });
        });
    });
};