const express = require("express");
const router = express.Router();

const {
  scheduleVisit,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} = require("../controllers/scheduleController");

// Create schedule
router.post("/", scheduleVisit);

// Get all schedules
router.get("/", getSchedules);
 
//grt schedule by id
router.get("/:id", getScheduleById);


// Update schedule
router.put("/:id", updateSchedule);

// Delete schedule
router.delete("/:id", deleteSchedule);

module.exports = router;