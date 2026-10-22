const express = require("express");
const router = express.Router();
router.use(...require("../middeware/projectAccess")("tracking"));

const {
    getTracking,
    createTracking,
    updateTracking,
    deleteTracking
} = require("../controllers/trackingController");

router.get("/", getTracking);
router.get("/:id", getTracking);
router.post("/", createTracking);
router.delete("/:id", deleteTracking);
router.put("/:id", updateTracking);

module.exports = router;