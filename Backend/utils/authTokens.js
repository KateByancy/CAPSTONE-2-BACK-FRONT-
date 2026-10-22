const jwt = require("jsonwebtoken");
const { createHash } = require("node:crypto");

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }
    return process.env.JWT_SECRET;
};

const issueAccessToken = (user) => {
    const role = user.role || "client";
    // Limit the window in which a stolen access token can be used.
    const options = { expiresIn: role === 'admin' ? '8h' : '24h', algorithm: 'HS256' };

    return jwt.sign(
        { id: user.id, role, ...(role === 'admin' && user.password ? { passwordVersion: createHash('sha256').update(user.password).digest('hex') } : {}) },
        getJwtSecret(),
        options
    );
};

module.exports = { getJwtSecret, issueAccessToken };
