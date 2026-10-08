require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const db = require('./config/db');
(async () => {
    try {
        await require('./migrations/paymentStorage')(sql => new Promise((resolve, reject) =>
            db.query(sql, (error, rows) => error ? reject(error) : resolve(rows))));
        console.log('GCash / PayMongo payment tables ready. Restart the backend to load the updated routes and environment.');
    } catch (error) { console.error('Payment storage migration failed:', error.code || 'UNKNOWN', error.message); process.exitCode = 1; }
    finally { db.destroy(); }
})();
