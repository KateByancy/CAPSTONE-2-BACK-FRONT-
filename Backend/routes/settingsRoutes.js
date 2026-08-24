const express = require("express");
const router = express.Router();
const verifyToken = require("../middeware/auth");
const { authorizeRoles } = require("../middeware/auth");

const {
    getSettings,
    updateSettings
} = require("../controllers/settingsController");

router.get("/", getSettings);
router.put("/", verifyToken, authorizeRoles("admin"), updateSettings);

module.exports = router;
