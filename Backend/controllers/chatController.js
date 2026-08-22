const db = require("../config/db");

// Send Message
const sendMessage = (req, res) => {
    const { user_id, sender, message } = req.body;

    if (!user_id || !sender || !message) {
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

            // Chatbot replies only when client sends a message
            if (sender === "client") {
                let botReply =
                    "Thank you for contacting MARC Interior Design. Our admin is currently offline. We will respond as soon as possible.";

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
                        "Payments can be sent through GCash. Please upload your reference number after payment.";
                } else if (
                    text.includes("hello") ||
                    text.includes("hi")
                ) {
                    botReply =
                        "Hello! Welcome to MARC Interior Design. How can I help you today?";
                }

                db.query(
                    "INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)",
                    [user_id, "bot", botReply]
                );
            }

            res.json({
                success: true,
                message: "Message sent successfully."
            });
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
    getMessages
};