// Reconcile the imported legacy designs table with the existing API contract.
module.exports = async function migrateDesignConcepts(query) {
    const columns = await query('SHOW COLUMNS FROM designs');
    const names = new Set(columns.map(column => column.Field));
    if (!names.has('user_id')) {
        await query('ALTER TABLE designs ADD COLUMN user_id INT NULL');
    }
    if (!names.has('title')) {
        if (names.has('design_name')) {
            await query('ALTER TABLE designs CHANGE COLUMN design_name title VARCHAR(150) NOT NULL');
        } else {
            await query('ALTER TABLE designs ADD COLUMN title VARCHAR(150) NULL');
        }
    } else if (names.has('design_name')) {
        // A partially migrated table must not require the old field on inserts.
        await query('UPDATE designs SET title = design_name WHERE title IS NULL');
        await query('ALTER TABLE designs MODIFY COLUMN design_name VARCHAR(150) NULL');
    }
};
