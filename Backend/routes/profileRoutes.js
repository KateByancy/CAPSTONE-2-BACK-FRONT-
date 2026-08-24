const express = require("express");
const router = express.Router();
const verifyToken = require("../middeware/auth");
const { authorizeRoles, requireSelfOrAdmin } = require("../middeware/auth");

const {
    getProfile,
    updateProfile
} = require("../controllers/profileController");

router.get("/:id", verifyToken, authorizeRoles("client", "admin"), requireSelfOrAdmin("id"), getProfile);
router.put("/:id", verifyToken, authorizeRoles("client", "admin"), requireSelfOrAdmin("id"), updateProfile);

module.exports = router;
