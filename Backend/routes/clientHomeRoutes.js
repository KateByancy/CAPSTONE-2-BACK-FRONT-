const express = require("express");
const { getClientHome } = require("../controllers/clientHomeController");

const router = express.Router();
router.use(...require("../middeware/projectAccess")("client-home"));
router.get("/", getClientHome);

module.exports = router;
