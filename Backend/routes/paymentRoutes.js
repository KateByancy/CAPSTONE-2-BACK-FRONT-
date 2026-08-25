const express = require("express");
const router = express.Router();

const {
  createCheckoutSession,
  getPayments,
  verifyPayment,
  declinePayment,
  deletePayment,
} = require("../controllers/paymentController");

router.post("/checkout", createCheckoutSession);
router.get("/", getPayments);
router.put("/:id/verify", verifyPayment);
router.put("/:id/decline", declinePayment);
router.delete("/:id", deletePayment);

module.exports = router;
