const express = require("express");
const router = express.Router();

const {
    createDesign,
    getDesigns,
    getDesignById,
    updateDesign,
    deleteDesign
} = require("../controllers/designController");

// Create a design request
router.post("/", createDesign);

// Get all design requests
router.get("/", getDesigns);

// Get one design request
router.get("/:id", getDesignById);

// Update design request
router.put("/:id", updateDesign);

// Delete design request
router.delete("/:id", deleteDesign);

module.exports = router;