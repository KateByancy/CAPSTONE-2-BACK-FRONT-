// Inspect columns before adding them: MySQL does not support MariaDB's
// ADD COLUMN IF NOT EXISTS syntax. Never reset existing billing records.
module.exports = async function migratePaymentStorage(query) {
    const statements = [...require('./gcash'), require('./bookingEstimate'),
        'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL'];
    for (const sql of statements) {
        const addition = sql.match(/^ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+) (.+)$/);
        if (!addition) { await query(sql); continue; }
        const [, table, name, definition] = addition;
        const columns = await query(`SHOW COLUMNS FROM \`${table}\``);
        if (columns.some(column => column.Field === name)) continue;
        try { await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${definition}`); }
        catch (error) {
            // A second instance may have added the same column concurrently.
            if (error.code !== 'ER_DUP_FIELDNAME') throw error;
        }
    }
};
