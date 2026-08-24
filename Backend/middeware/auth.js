const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../utils/authTokens");

const verifyToken = (req, res, next) => {

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
