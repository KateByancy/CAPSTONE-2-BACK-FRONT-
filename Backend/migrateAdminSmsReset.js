require('dotenv').config();
const db = require('./config/db');
(async () => {
    try {
        for (const sql of require('./migrations/adminSmsReset')) {
            await new Promise((resolve, reject) => db.query(sql, error => error ? reject(error) : resolve()));
        }
        console.log('Admin SMS recovery tables ready.');
    } catch (error) {
        console.error('Admin SMS recovery migration failed:', error.code || 'DATABASE_ERROR');
        process.exitCode = 1;
    } finally { db.end(); }
})();
