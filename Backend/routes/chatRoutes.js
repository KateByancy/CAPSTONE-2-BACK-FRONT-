const express = require("express");
const router = express.Router();

const {
    sendMessage,
    getMessages,
    getAdminStatus
} = require("../controllers/chatController");

router.post("/", sendMessage);
router.get("/admin-status", getAdminStatus);
router.get("/:userId", getMessages);

module.exports = router;
