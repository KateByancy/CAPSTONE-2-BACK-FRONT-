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
        const rows = await query('SELECT id, user_id, title FROM designs WHERE project_id IS NULL');
        if (rows.length) {
            console.log(`${rows.length} legacy concept(s) have no unambiguous project assignment and need reconciliation:`);
            console.table(rows);
        }
    } catch (error) {
        console.error('Design concept migration failed:', error.code || '', error.message);
        process.exitCode = 1;
    } finally {
        db.destroy();
    }
})();
