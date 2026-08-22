const express = require("express");
const router = express.Router();

const {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking
} = require("../controllers/bookingController");

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:id", getBookingById);
router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);

module.exports = router;