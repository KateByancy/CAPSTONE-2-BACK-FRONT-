const db = require("../config/db");
const cache = require("../utils/cache");

exports.getLanding = (req, res) => {
    const userId = req.params.userId;

    const userQuery =
        "SELECT fullname FROM users WHERE id=?";

    const projectQuery =
        "SELECT * FROM portfolio ORDER BY id DESC LIMIT 1";

    const sendResponse = (user) => {
        const cachedProject = cache.get("landing:latest-project");
        if (cachedProject !== undefined) {
            res.set("X-Cache", "HIT");
            return res.json({
                user,
                project: cachedProject
            });
        }

        db.query(projectQuery, (err2, projects) => {
            if (err2) return res.status(500).json(err2);

            const project = projects[0];
            cache.set("landing:latest-project", project, cache.ttl.landing);
            res.set("X-Cache", "MISS");
            res.json({
                user,
                project
            });
        });
    };

    db.query(userQuery, [userId], (err, users) => {
        if (err) return res.status(500).json(err);

        sendResponse(users[0]);
    });
};
