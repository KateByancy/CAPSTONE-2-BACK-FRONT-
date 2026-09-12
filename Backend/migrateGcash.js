require('dotenv').config({ quiet: true });
const db = require('./config/db');
(async () => {
    try {
        for (const sql of require('./migrations/gcash')) {
            await new Promise((resolve, reject) => db.query(sql, error => error ? reject(error) : resolve()));
        }
        console.log('GCash / PayMongo payment tables ready. Restart the backend to load the updated routes and environment.');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { db.destroy(); }
})();
