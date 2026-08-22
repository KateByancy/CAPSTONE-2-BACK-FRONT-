const express = require("express");
const router = express.Router();

console.log("✅ homeRoutes.js loaded");

router.get("/", (req, res) => {
    console.log("✅ GET /api/home reached");
    res.json({
        success: true,
        message: "Home Route Works!"
    });
});

router.get("/test", (req, res) => {
    console.log("✅ GET /api/home/test reached");
    res.send("HOME TEST");
});

module.exports = router;