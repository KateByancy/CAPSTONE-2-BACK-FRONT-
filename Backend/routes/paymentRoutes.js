const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPayments,
  verifyPayment,
  declinePayment,
  deletePayment,
} = require("../controllers/paymentController");

router.post("/", createPayment);
router.get("/", getPayments);
router.put("/:id/verify", verifyPayment);
router.put("/:id/decline", declinePayment);
router.delete("/:id", deletePayment);

module.exports = router;
