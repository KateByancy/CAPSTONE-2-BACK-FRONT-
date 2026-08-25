const express = require("express");
const router = express.Router();

const {
  scheduleVisit,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getUnavailableSlots,
  reschedulePendingVisit,
} = require("../controllers/scheduleController");

// Create schedule
router.post("/", scheduleVisit);

// Get all schedules
router.get("/", getSchedules);
router.get("/unavailable", getUnavailableSlots);
 
//grt schedule by id
router.get("/:id", getScheduleById);

router.put("/:id/reschedule", reschedulePendingVisit);


// Update schedule
router.put("/:id", updateSchedule);

// Delete schedule
router.delete("/:id", deleteSchedule);

module.exports = router;
