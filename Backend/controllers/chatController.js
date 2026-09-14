const db = require("../config/db");
const { generateReply } = require("../services/geminiChat");
const query = (sql, values = []) => new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows));
});
const { isPortfolioRequest, encodePortfolio, decodePortfolio, safeImage } = require("../services/portfolioChat");
const { getMarcProfileReply } = require("../services/marcProfileReply");
const pending = new Set();
const adminIsOnline = async () => (await query(
    "SELECT id FROM users WHERE role='admin' AND last_seen >= DATE_SUB(NOW(), INTERVAL 45 SECOND) LIMIT 1"
)).length > 0;

const sendMessage = async (req, res) => {
    const userId = Number(req.body.user_id);
    const sender = req.user.role === "admin" ? "admin" : "client";
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!Number.isSafeInteger(userId) || userId < 1 || !message || message.length > 2000) {
        return res.status(400).json({ success: false, message: "Choose a client and enter a message of 1 to 2000 characters." });
    }
    if (sender === "client" && userId !== Number(req.user.id)) {
        return res.status(403).json({ success: false, message: "You can only send messages in your own conversation." });
    }
    if (sender === "client" && pending.has(userId)) {
        return res.status(429).json({ success: false, message: "Please wait for the current reply." });
    }
    if (sender === "client") pending.add(userId);
    try {
        await query("INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)", [userId, sender, message]);
        const profileReply = sender === 'client' ? getMarcProfileReply(message) : null;
        if (profileReply) {
            await query("INSERT INTO messages (user_id, sender, message) VALUES (?, 'bot', ?)", [userId, profileReply]);
            return res.status(201).json({ success: true, responder: 'knowledge' });
        }
        if (sender === "admin" || await adminIsOnline()) {
            return res.status(201).json({ success: true, responder: "admin" });
        }
        if (isPortfolioRequest(message)) {
            const items = (await query("SELECT id, title, image FROM portfolio WHERE image IS NOT NULL AND image <> '' ORDER BY id DESC LIMIT 20"))
                .filter(item => safeImage(item.image)).slice(0, 6);
            const text = items.length ? "Here are some of MARC's portfolio projects. Select an image to view it in full." : "There are no portfolio images available yet. Your request is saved here for the admin to review.";
            if (await adminIsOnline()) return res.status(201).json({ success: true, responder: "admin" });
            await query("INSERT INTO messages (user_id, sender, message) VALUES (?, 'bot', ?)", [userId, encodePortfolio(text, items.map(item => item.id))]);
            return res.status(201).json({ success: true, responder: "portfolio" });
        }
        const history = await query("SELECT sender, message FROM messages WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 12", [userId]);
        let reply;
        let responder = "ai";
        try {
            reply = await generateReply(history.reverse().map(row => ({ ...row, message: decodePortfolio(row)?.text || row.message })));
        } catch (error) {
            console.error("AI reply unavailable:", /^GEMINI_[A-Z0-9_]+$/.test(error.message) ? error.message : "CONNECTION_OR_TIMEOUT");
            responder = "fallback";
            reply = "The AI assistant is temporarily unavailable. Your message has been saved for the administrator to review. Please try again later.";
        }
        if (await adminIsOnline()) return res.status(201).json({ success: true, responder: "admin" });
        await query("INSERT INTO messages (user_id, sender, message) VALUES (?, 'bot', ?)", [userId, reply]);
        return res.status(201).json({ success: true, responder });
    } catch {
        return res.status(500).json({ success: false, message: "Unable to process the conversation. Refresh your messages before trying again." });
    } finally {
        if (sender === "client") pending.delete(userId);
    }
};

const getAdminStatus = (req, res) => {
    db.query(
        `SELECT EXISTS(
           SELECT 1 FROM users
           WHERE role = 'admin' AND last_seen IS NOT NULL
             AND last_seen >= DATE_SUB(NOW(), INTERVAL 45 SECOND)
         ) AS is_online`,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            const adminOnline = Boolean(rows[0]?.is_online);
            return res.json({ success: true, adminOnline, responder: adminOnline ? "admin" : "ai" });
        }
    );
};

// Get Messages
const getMessages = async (req, res) => {
    try {
        const rows = await query("SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC, id ASC", [req.params.userId]);
        const ids = [...new Set(rows.flatMap(row => decodePortfolio(row)?.ids || []))];
        const items = ids.length ? await query("SELECT id, title, image FROM portfolio WHERE id IN (" + ids.map(() => "?").join(",") + ")", ids) : [];
        const byId = new Map(items.filter(item => safeImage(item.image)).map(item => [Number(item.id), item]));
        return res.json(rows.map(row => {
            const attachment = decodePortfolio(row);
            if (!attachment) return row;
            const portfolio = attachment.ids.map(id => byId.get(id)).filter(Boolean);
            return { ...row, message: attachment.ids.length && !portfolio.length ? "These portfolio images are no longer available." : attachment.text, portfolio };
        }));
    } catch {
        return res.status(500).json({ success: false, message: "Unable to load messages." });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getAdminStatus
};
