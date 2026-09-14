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
    const options = role === "admin"
        ? {}
        : { expiresIn: process.env.JWT_EXPIRES_IN || "1h" };

    return jwt.sign(
        { id: user.id, role, ...(role === 'admin' && user.password ? { passwordVersion: createHash('sha256').update(user.password).digest('hex') } : {}) },
        getJwtSecret(),
        options
    );
};

module.exports = { getJwtSecret, issueAccessToken };
