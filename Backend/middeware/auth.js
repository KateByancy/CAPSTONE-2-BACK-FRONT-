const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../utils/authTokens");

const db = require('../config/db');
const { createHash } = require('node:crypto');

const verifyToken = async (req, res, next) => {

    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Authentication is required."
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            getJwtSecret()
        );

        if (decoded.role === 'admin') {
            const users = await new Promise((resolve, reject) => db.query("SELECT password FROM users WHERE id = ? AND role = 'admin'", [decoded.id], (error, rows) => error ? reject(error) : resolve(rows)));
            const password = users[0]?.password;
            // Legacy sessions remain valid only until the bootstrap password is replaced.
            const valid = password && (decoded.passwordVersion
                ? decoded.passwordVersion === createHash('sha256').update(password).digest('hex')
                : password === 'ADMIN_ENV_AUTH');
            if (!valid) return res.status(401).json({ success: false, message: 'Please sign in again.' });
        }
        req.user = decoded;

        next();

    } catch (err) {

        return res.status(401).json({
            success: false,
            code: err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
            message: err.name === "TokenExpiredError" ? "Authentication token has expired." : "Authentication token is invalid."
        });

    }

};

module.exports = verifyToken;
module.exports.authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication is required." });
    }

    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
    }
    next();
};

module.exports.requireSelfOrAdmin = (parameter = "id") => (req, res, next) => {
    if (req.user.role === "admin" || Number(req.params[parameter]) === Number(req.user.id)) return next();
    return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
};
