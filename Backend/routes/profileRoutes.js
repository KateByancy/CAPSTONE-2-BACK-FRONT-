const express = require("express");
const router = express.Router();
const verifyToken = require("../middeware/auth");
const { authorizeRoles, requireSelfOrAdmin } = require("../middeware/auth");
const multer = require("multer");
const { uploadAvatar, getAvatar, getChatAdminAvatar } = require("../controllers/avatarController");
router.get("/chat/admin-avatar", verifyToken, authorizeRoles("client", "admin"), getChatAdminAvatar);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single("avatar");
router.get("/me/avatar", verifyToken, authorizeRoles("client", "admin"), getAvatar);
router.put("/me/avatar", verifyToken, authorizeRoles("client", "admin"), (req, res) => {
    upload(req, res, error => {
        if (error) return res.status(400).json({ message: "Choose one image no larger than 5 MB." });
        return uploadAvatar(req, res);
    });
});

const {
    getProfile,
    updateProfile
} = require("../controllers/profileController");

router.get("/:id", verifyToken, authorizeRoles("client", "admin"), requireSelfOrAdmin("id"), getProfile);
router.put("/:id", verifyToken, authorizeRoles("client", "admin"), requireSelfOrAdmin("id"), updateProfile);

module.exports = router;
