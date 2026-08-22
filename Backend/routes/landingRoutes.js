const express = require("express");
const router = express.Router();

const {
    getLanding
} = require("../controllers/landingController");

router.get("/", getLanding);

module.exports = router;