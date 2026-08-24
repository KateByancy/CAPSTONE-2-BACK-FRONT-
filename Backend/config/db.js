const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "design_booking_db"
});

let connectionPromise;

const connectDatabase = () => {
    if (!connectionPromise) {
        connectionPromise = new Promise((resolve, reject) => {
            db.connect((error) => {
                if (error) {
                    connectionPromise = undefined;
                    return reject(error);
                }

                console.log("MySQL connected.");
                resolve(db);
            });
        });
    }

    return connectionPromise;
};

module.exports = db;
module.exports.connectDatabase = connectDatabase;
