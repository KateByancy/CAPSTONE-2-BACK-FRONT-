const express = require("express");
const router = express.Router();

const {
    sendMessage,
    getMessages,
    getAdminStatus
} = require("../controllers/chatController");

const verifyToken = require("../middeware/auth");
const { requireSelfOrAdmin } = require("../middeware/auth");
router.use(verifyToken);
router.post("/", sendMessage);
router.get("/admin-status", getAdminStatus);
router.get("/:userId", requireSelfOrAdmin("userId"), getMessages);

module.exports = router;
