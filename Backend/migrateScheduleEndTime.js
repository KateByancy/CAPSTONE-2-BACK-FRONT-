require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./config/db');
const query = (sql) => new Promise((resolve, reject) => {
    db.query(sql, (error, rows) => error ? reject(error) : resolve(rows));
});

async function migrate() {
    try {
        await db.connectDatabase();
        // MySQL does not support ADD COLUMN IF NOT EXISTS.
        const columns = await query("SHOW COLUMNS FROM schedules LIKE 'time_end'");
        if (!columns.length) {
            await query('ALTER TABLE schedules ADD COLUMN time_end TIME NULL DEFAULT NULL');
        } else {
            await query('ALTER TABLE schedules MODIFY COLUMN time_end TIME NULL DEFAULT NULL');
        }
        const [column] = await query("SHOW COLUMNS FROM schedules LIKE 'time_end'");
        if (column.Null !== 'YES' || column.Default !== null) throw new Error('End-time schema verification failed.');
        console.log('Schedule end time is now optional. Existing end times are preserved.');
    } catch (error) {
        console.error('Schedule migration failed:', error.code || '', error.message || 'Unable to connect to the configured database.');
        if (error.code === 'ECONNREFUSED') {
            console.error('Start MySQL or update DB_HOST and DB_PORT in Backend/.env to match the running backend database.');
        }
        process.exitCode = 1;
    } finally {
        db.destroy();
    }
}

migrate();
