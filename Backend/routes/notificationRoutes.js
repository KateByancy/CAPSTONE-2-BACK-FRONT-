const express = require("express");
const router = express.Router();
router.use(...require("../middeware/projectAccess")("notifications"));

const {
    getNotifications,
    createNotification,
    markAsRead,
    deleteNotification
} = require("../controllers/notificationcontroller");

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;