const db = require("../config/db");
const query = (sql, values = []) => new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});
const projectId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const fail = (res, error) => error.code === 'ER_DUP_ENTRY'
    ? res.status(409).json({ message: 'This design concept already exists in this project.' })
    : res.status(500).json({ message: 'Unable to access design concepts.' });

// Active Builds uses accepted bookings as projects, not portfolio entries or clients.
const createDesign = async (req, res) => {
    const id = projectId(req.body.project_id);
    const { title, description, image } = req.body;
    if (!id || typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'A project ID and title are required.' });
    try {
        const [project] = await query('SELECT user_id FROM bookings WHERE id = ? AND accepted_at IS NOT NULL', [id]);
        if (!project) return res.status(404).json({ message: 'Project not found.' });
        if (req.body.user_id != null && Number(req.body.user_id) !== project.user_id) return res.status(400).json({ message: 'Client does not match the selected project.' });
        const result = await query('INSERT INTO designs (project_id, user_id, title, description, image) VALUES (?, ?, ?, ?, ?)', [id, project.user_id, title.trim(), description || '', image || null]);
        res.json({ success: true, message: 'Design request submitted successfully.', designId: result.insertId });
    } catch (error) { fail(res, error); }
};

const getDesigns = async (req, res) => {
    const id = projectId(req.query.project_id);
    if (!id) return res.status(400).json({ message: 'A project ID is required.' });
    try {
        const rows = await query(`SELECT designs.*, users.fullname AS client_name FROM designs
            LEFT JOIN users ON users.id = designs.user_id WHERE designs.project_id = ? ORDER BY designs.created_at DESC, designs.id DESC`, [id]);
        res.json(rows);
    } catch (error) { fail(res, error); }
};

const getDesignById = async (req, res) => {
    const id = projectId(req.query.project_id);
    if (!id) return res.status(400).json({ message: 'A project ID is required.' });
    try {
        const rows = await query('SELECT * FROM designs WHERE id = ? AND project_id = ?', [req.params.id, id]);
        if (!rows.length) return res.status(404).json({ message: 'Design concept not found in this project.' });
        res.json(rows);
    } catch (error) { fail(res, error); }
};

const updateDesign = async (req, res) => {
    const id = projectId(req.body.project_id);
    const { title, description, image } = req.body;
    if (!id || typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'A project ID and title are required.' });
    try {
        // Scope the update; never move a concept to another project.
        const [record] = await query('SELECT id, user_id FROM designs WHERE id = ? AND project_id = ?', [req.params.id, id]);
        if (!record) return res.status(404).json({ message: 'Design concept not found in this project.' });
        if (req.body.user_id != null && Number(req.body.user_id) !== record.user_id) return res.status(400).json({ message: 'Client does not match the selected project.' });
        await query('UPDATE designs SET title = ?, description = ?, image = COALESCE(?, image) WHERE id = ? AND project_id = ?', [title.trim(), description || '', image ?? null, req.params.id, id]);
        res.json({ success: true, message: 'Design updated successfully.' });
    } catch (error) { fail(res, error); }
};

const deleteDesign = async (req, res) => {
    const id = projectId(req.query.project_id);
    if (!id) return res.status(400).json({ message: 'A project ID is required.' });
    try {
        const result = await query('DELETE FROM designs WHERE id = ? AND project_id = ?', [req.params.id, id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Design concept not found in this project.' });
        res.json({ success: true, message: 'Design deleted successfully.' });
    } catch (error) { fail(res, error); }
};

module.exports = { createDesign, getDesigns, getDesignById, updateDesign, deleteDesign };
