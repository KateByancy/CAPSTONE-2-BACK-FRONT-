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
    if (!names.has('project_id')) {
        await query('ALTER TABLE designs ADD COLUMN project_id INT NULL, ADD CONSTRAINT designs_project_fk FOREIGN KEY (project_id) REFERENCES bookings(id) ON DELETE RESTRICT');
    }
    if (!names.has('concept_fingerprint')) {
        // A unique key also protects against concurrent/retried identical submissions.
        // Unassigned legacy rows remain intact because their project_id is NULL.
        await query(`ALTER TABLE designs ADD COLUMN concept_fingerprint CHAR(64)
            GENERATED ALWAYS AS (SHA2(JSON_ARRAY(TRIM(title), COALESCE(image, ''), COALESCE(description, '')), 256)) STORED,
            ADD UNIQUE KEY designs_project_concept_unique (project_id, concept_fingerprint)`);
    }
    // Client ownership alone cannot distinguish multiple projects. Never guess.
    // Keep duplicate legacy records intact and unassigned for explicit reconciliation.
    await query(`UPDATE designs d JOIN (
        SELECT user_id, MIN(id) AS project_id FROM bookings
        WHERE accepted_at IS NOT NULL GROUP BY user_id HAVING COUNT(*) = 1
    ) b ON b.user_id = d.user_id JOIN (
        SELECT user_id FROM designs GROUP BY user_id
        HAVING COUNT(*) = COUNT(DISTINCT concept_fingerprint)
    ) unique_concepts ON unique_concepts.user_id = d.user_id
    SET d.project_id = b.project_id WHERE d.project_id IS NULL`);
};
