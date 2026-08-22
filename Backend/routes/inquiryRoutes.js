const express = require("express");
const router = express.Router();

const {
    createInquiry,
    getInquiries,
    deleteInquiry
} = require("../controllers/inquiryController");

// Submit inquiry
router.post("/", createInquiry);
// Get all inquiries
router.get("/", getInquiries);
router.get("/:id", getInquiries);
router.put("/:id", getInquiries);
// Delete inquiry
router.delete("/:id", deleteInquiry);

module.exports = router;