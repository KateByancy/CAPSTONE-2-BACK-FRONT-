const express = require("express");
const router = express.Router();
router.use(...require("../middeware/projectAccess")("notifications"));

const {
    getNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationcontroller");

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
