const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const directory = path.join(__dirname, "../uploads/avatars");
function imageType(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
    if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
    if (buffer.length >= 12 && buffer.toString("ascii",0,4) === "RIFF" && buffer.toString("ascii",8,12) === "WEBP") return "image/webp";
    return null;
}
const avatarPath = req => path.join(directory, `${Number(req.user.id)}.image`);
exports.uploadAvatar = async (req, res) => {
    if (!req.file || !imageType(req.file.buffer)) return res.status(400).json({ message: "Choose a JPEG, PNG or WebP image." });
    const temporary = path.join(directory, `${crypto.randomUUID()}.tmp`);
    try {
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(temporary, req.file.buffer);
        await fs.rename(temporary, avatarPath(req));
        res.json({ success: true });
    } catch {
        await fs.unlink(temporary).catch(() => {});
        res.status(500).json({ message: "Unable to save profile picture." });
    }
};
exports.getAvatar = async (req, res) => {
    try {
        const data = await fs.readFile(avatarPath(req));
        res.set({ "Content-Type": imageType(data) || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(data);
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
            const data = await fs.readFile(path.join(directory, `${Number(rows[0].id)}.image`));
            return res.set({ "Content-Type": imageType(data) || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(data);
        } catch {
            return res.status(404).json({ message: "Profile picture unavailable." });
        }
    });
};
