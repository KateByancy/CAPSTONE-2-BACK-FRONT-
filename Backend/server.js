require("dotenv").config();

const express = require("express");
const cors = require("cors");

const db = require("./config/db");
const { connectDatabase } = db;
const { notFound, errorHandler } = require("./middeware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const homeRoutes = require("./routes/homeRoutes");
const landingRoutes = require("./routes/landingRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes"); // ✅ Correct path
const bookingRoutes = require("./routes/bookingRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const designRoutes = require("./routes/designRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const clientHomeRoutes = require("./routes/clientHomeRoutes");


const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
            return callback(null, true);
        }

        const error = new Error("Origin is not allowed by CORS.");
        error.statusCode = 403;
        return callback(error);
    },
    credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/portfolio", portfolioRoutes); // ✅ Correct path
app.use("/api/booking", bookingRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/client-home", clientHomeRoutes);

app.get("/api/health", (req, res) => {
    db.ping((error) => {
        if (error) {
            return res.status(503).json({
                success: false,
                status: "unhealthy",
                database: "disconnected"
            });
        }

        return res.json({
            success: true,
            status: "healthy",
            database: "connected"
        });
    });
});

app.get("/", (req, res) => {
    res.send("MARC Interior Design API is Running...");
});

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
    await connectDatabase();

    return new Promise((resolve, reject) => {
        const server = app.listen(PORT);

        server.once("listening", () => {
            console.log(`Server running on port ${PORT}`);
            resolve(server);
        });

        server.once("error", reject);
    });
};

if (require.main === module) {
    startServer()
        .then((server) => {
            const shutdown = (signal) => {
                console.log(`${signal} received. Shutting down.`);
                server.close(() => {
                    db.end(() => process.exit(0));
                });
            };

            process.once("SIGINT", () => shutdown("SIGINT"));
            process.once("SIGTERM", () => shutdown("SIGTERM"));
        })
        .catch((error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`Server startup failed: port ${PORT} is already in use by another backend instance. Keep only one backend terminal running.`);
            } else {
                console.error("Server startup failed:", error.message);
            }

            db.end();
            process.exitCode = 1;
        });
}

module.exports = app;
module.exports.startServer = startServer;
