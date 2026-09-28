const fs = require("fs");
const path = require("path");

module.exports = function databaseSsl() {
    const certificatePath = process.env.DB_SSL_CA_PATH?.trim();
    if (!certificatePath) return undefined;

    return {
        ca: fs.readFileSync(path.resolve(__dirname, "..", certificatePath), "utf8"),
        rejectUnauthorized: true,
        verifyIdentity: true,
    };
};
