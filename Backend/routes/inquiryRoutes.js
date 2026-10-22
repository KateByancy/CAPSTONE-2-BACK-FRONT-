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
router.get("/", require("../middeware/auth"), require("../middeware/auth").authorizeRoles("admin"), getInquiries);
router.get("/:id", require("../middeware/auth"), require("../middeware/auth").authorizeRoles("admin"), getInquiries);
router.put("/:id", require("../middeware/auth"), require("../middeware/auth").authorizeRoles("admin"), (_req,res)=>res.status(405).json({message:"This action is not supported."}));
// Delete inquiry
router.delete("/:id", require("../middeware/auth"), require("../middeware/auth").authorizeRoles("admin"), deleteInquiry);

module.exports = router;