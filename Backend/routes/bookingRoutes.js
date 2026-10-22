const express = require("express");
const router = express.Router();
router.use(...require("../middeware/projectAccess")("booking"));

const {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
    getFleetLocations
} = require("../controllers/bookingController");

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/fleet-locations", getFleetLocations);
router.get("/:id", getBookingById);
router.put("/:id", updateBooking);
router.delete("/:id", deleteBooking);

module.exports = router;
