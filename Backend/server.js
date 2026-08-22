require("dotenv").config();

const express = require("express");
const cors = require("cors");

const db = require("./config/db"); // ✅ Correct path

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


const app = express();

app.use(cors());
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

app.get("/", (req, res) => {
    res.send("MARC Interior Design API is Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});