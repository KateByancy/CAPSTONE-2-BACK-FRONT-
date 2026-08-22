const express = require("express");
const router = express.Router();

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