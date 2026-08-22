const express = require("express");
const router = express.Router();

const {
    getPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio
} = require("../controllers/portfolioController");

router.get("/", getPortfolio);
router.get("/:id", getPortfolio);
router.post("/", addPortfolio);
router.put("/:id", updatePortfolio);
router.delete("/:id", deletePortfolio);

module.exports = router;