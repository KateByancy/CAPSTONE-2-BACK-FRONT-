const express = require("express");
const { getClientHome } = require("../controllers/clientHomeController");

const router = express.Router();
router.get("/", getClientHome);

module.exports = router;
