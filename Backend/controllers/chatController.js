const db = require("../config/db");

// Send Message
const sendMessage = (req, res) => {
    const { user_id, message } = req.body;
    const sender = String(req.body.sender || "").trim().toLowerCase();

    if (!user_id || !["admin", "client"].includes(sender) || !String(message || "").trim()) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    db.query(
        "INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)",
        [user_id, sender, message],
        (err) => {
            if (err) {
                return res.status(500).json(err);
            }

            // The AI responder only takes over when no administrator is online.
            if (sender === "client") {
                return db.query(
                    `SELECT id FROM users
                     WHERE role = 'admin' AND last_seen IS NOT NULL
                       AND last_seen >= DATE_SUB(NOW(), INTERVAL 45 SECOND)
                     LIMIT 1`,
                    (presenceError, onlineAdmins) => {
                        if (presenceError) return res.status(500).json({ success: false, message: presenceError.message });
                        if (onlineAdmins.length) return res.status(201).json({ success: true, message: "Message sent successfully.", responder: "admin" });

                let botReply =
                    "Our admin is currently offline, so I’m here to help. Your message has been saved for the admin to review.";

                const text = message.toLowerCase();

                if (text.includes("price") || text.includes("cost")) {
                    botReply =
                        "Our prices depend on the project size. Please submit a booking for an official quotation.";
                } else if (
                    text.includes("schedule") ||
                    text.includes("appointment")
                ) {
                    botReply =
                        "You can schedule your appointment in the Booking page.";
                } else if (
                    text.includes("payment") ||
                    text.includes("gcash")
                ) {
                    botReply =
                        "GCash payments are processed securely through PayMongo from the Payments & Billing page.";
                } else if (
                    text.includes("hello") ||
                    text.includes("hi")
                ) {
                    botReply =
                        "Hello! Welcome to MARC Interior Design. How can I help you today?";
                }

                return db.query(
                    "INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)",
                    [user_id, "bot", botReply],
                    (botError) => {
                        if (botError) return res.status(500).json({ success: false, message: botError.message });
                        return res.status(201).json({ success: true, message: "Message sent successfully.", responder: "ai" });
                    }
                );
                    }
                );
            }

            return res.status(201).json({
                success: true,
                message: "Message sent successfully."
            });
        }
    );
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
const getMessages = (req, res) => {
    const { userId } = req.params;

    db.query(
        "SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC",
        [userId],
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.json(result);
        }
    );
};

module.exports = {
    sendMessage,
    getMessages,
    getAdminStatus
};
