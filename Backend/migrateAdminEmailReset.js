require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const db = require('./config/db');
(async () => {
    try {
        for (const sql of require('./migrations/adminEmailReset')) {
            await new Promise((resolve, reject) => db.query(sql, error => error ? reject(error) : resolve()));
        }
        console.log('Admin email recovery tables ready.');
    } catch (error) {
        console.error('Admin email recovery migration failed:', error.code || 'DATABASE_ERROR');
        process.exitCode = 1;
    } finally { db.end(); }
})();
