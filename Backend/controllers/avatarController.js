const fs = require("node:fs/promises");
const path = require("node:path");
const db = require('../config/db');
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const directory = path.join(__dirname, "../uploads/avatars");
function imageType(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
    if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
    if (buffer.length >= 12 && buffer.toString("ascii",0,4) === "RIFF" && buffer.toString("ascii",8,12) === "WEBP") return "image/webp";
    return null;
}
async function loadAvatar(id) {
    const rows = await query('SELECT image, content_type FROM profile_avatars WHERE user_id=?', [id]);
    if (rows[0]) return { data: rows[0].image, type: rows[0].content_type };
    // Preserve pictures saved before database-backed storage was introduced.
    const data = await fs.readFile(path.join(directory, `${Number(id)}.image`));
    return { data, type: imageType(data) || 'application/octet-stream' };
}
exports.uploadAvatar = async (req, res) => {
    if (!req.file || !imageType(req.file.buffer)) return res.status(400).json({ message: "Choose a JPEG, PNG or WebP image." });
    try {
        await query('INSERT INTO profile_avatars (user_id, image, content_type) VALUES (?,?,?) ON DUPLICATE KEY UPDATE image=VALUES(image), content_type=VALUES(content_type)', [req.user.id, req.file.buffer, imageType(req.file.buffer)]);
        res.json({ success: true });
    } catch {
        res.status(500).json({ message: "Unable to save profile picture." });
    }
};
exports.getAvatar = async (req, res) => {
    try {
        const { data, type } = await loadAvatar(req.user.id);
        res.set({ "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(data);
    } catch (error) {
        res.status(error.code === "ENOENT" ? 404 : 500).json({ message: "Profile picture unavailable." });
    }
};

// Older chat messages record only the admin role, not an individual admin ID.
// Show a photo only when that role identifies a single account unambiguously.
exports.getChatAdminAvatar = (req, res) => {
    require("../config/db").query("SELECT id FROM users WHERE role='admin' LIMIT 2", async (error, rows) => {
        if (error) return res.status(500).json({ message: "Profile picture unavailable." });
        if (rows.length !== 1) return res.status(404).json({ message: "No unique admin picture available." });
        try {
            const { data, type } = await loadAvatar(rows[0].id);
            return res.set({ "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(data);
        } catch {
            return res.status(404).json({ message: "Profile picture unavailable." });
        }
    });
};
