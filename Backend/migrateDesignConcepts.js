require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const db = require('./config/db');
const query = (sql) => new Promise((resolve, reject) => {
    db.query(sql, (error, rows) => error ? reject(error) : resolve(rows));
});
(async () => {
    try {
        await db.connectDatabase();
        await require('./migrations/designConcepts')(query);
        console.log('Design concept storage ready. Existing records and image URLs preserved.');
    } catch (error) {
        console.error('Design concept migration failed:', error.code || '', error.message);
        process.exitCode = 1;
    } finally {
        db.destroy();
    }
})();
