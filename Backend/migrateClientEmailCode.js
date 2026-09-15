require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const db = require('./config/db');
(async () => {
    try {
        for (const sql of require('./migrations/clientEmailCode')) {
            await new Promise((resolve, reject) => db.query(sql, error => error ? reject(error) : resolve()));
        }
        console.log('Client email code recovery tables ready.');
    } catch (error) {
        console.error('Client email recovery migration failed:', error.code || 'DATABASE_ERROR');
        process.exitCode = 1;
    } finally { db.end(); }
})();
