const db = require("../config/db");
const cache = require("../utils/cache");

const getUnavailableSlots = (req, res) => {
  const cached = cache.get("schedule:unavailable-slots");
  if (cached) return cache.sendCachedJson(res, cached);

  db.query(
    `SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS visit_date,
            TIME_FORMAT(time_start, '%H:%i') AS time_start
     FROM schedules
     WHERE visit_date IS NOT NULL AND time_start IS NOT NULL
       AND LOWER(status) NOT IN ('cancelled', 'rejected')
     ORDER BY visit_date, time_start`,
    (err, rows) => {
      if (err) return res.status(500).json({ success:false, message:err.message });
      cache.sendFreshJson(res, "schedule:unavailable-slots", { success:true, slots:rows }, cache.ttl.unavailableSlots);
    }
  );
};

// Create schedule
const scheduleVisit = (req, res) => {
  const { booking_id, visit_date } = req.body;

  if (!booking_id || !visit_date) {
    return res.status(400).json({ success: false, message: "booking_id and visit_date are required." });
  }

  db.query("SELECT id FROM schedules WHERE booking_id = ? ORDER BY id DESC LIMIT 1", [booking_id], (lookupError, rows) => {
    if (lookupError) return res.status(500).json({ success: false, message: lookupError.message });
    const existingId = rows[0]?.id;
    const sql = existingId
      ? "UPDATE schedules SET visit_date = ?, date = ?, status = 'Pending' WHERE id = ?"
      : "INSERT INTO schedules (booking_id, visit_date, date, status) VALUES (?, ?, ?, 'Pending')";
    const params = existingId ? [visit_date, visit_date, existingId] : [booking_id, visit_date, visit_date];
    db.query(sql, params, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
      }

      cache.clear("schedule:unavailable-slots");

      res.status(201).json({
        success: true,
        message: existingId ? "Schedule updated successfully" : "Schedule created successfully",
        id: existingId || result.insertId,
      });
    });
  });
};

// Get all schedules
const getSchedules = (req, res) => {
  const userId = Number(req.query.user_id);
  db.query(
    `SELECT schedules.*, bookings.service_type, bookings.project_description,
            bookings.status AS booking_status, bookings.accepted_at,
            users.fullname AS client_name, users.address AS client_address
     FROM schedules
     JOIN bookings ON bookings.id = schedules.booking_id
     JOIN users ON users.id = bookings.user_id
     WHERE ${userId ? "users.id = ?" : "bookings.accepted_at IS NOT NULL"}
     ORDER BY schedules.visit_date ASC, schedules.id ASC`,
    userId ? [userId] : [],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      res.json(result);
    }
  );
};

const reschedulePendingVisit = (req, res) => {
  const scheduleId = Number(req.params.id);
  const userId = Number(req.body.user_id);
  const visitDate = String(req.body.visit_date || "").trim();

  if (!scheduleId || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return res.status(400).json({ success: false, message: "A valid schedule, client, and date are required." });
  }

  db.query(
    `SELECT schedules.id, schedules.time_start, schedules.reschedule_count,
            DATE_FORMAT(schedules.visit_date, '%Y-%m-%d') AS current_visit_date,
            bookings.accepted_at, bookings.status AS booking_status
     FROM schedules
     JOIN bookings ON bookings.id = schedules.booking_id
     WHERE schedules.id = ? AND bookings.user_id = ?
     LIMIT 1`,
    [scheduleId, userId],
    (lookupError, rows) => {
      if (lookupError) return res.status(500).json({ success: false, message: lookupError.message });
      if (!rows.length) return res.status(404).json({ success: false, message: "Schedule not found for this account." });

      const schedule = rows[0];
      const bookingStatus = String(schedule.booking_status || "").toLowerCase();
      if (schedule.accepted_at || ["confirmed", "approved", "ongoing", "completed"].includes(bookingStatus)) {
        return res.status(409).json({ success: false, code: "BOOKING_ACCEPTED", message: "This project has already been accepted and its schedule is locked." });
      }
      if (Number(schedule.reschedule_count) >= 1) {
        return res.status(409).json({ success: false, code: "RESCHEDULE_LIMIT", message: "This booking has already used its one allowed reschedule." });
      }
      if (schedule.current_visit_date === visitDate) {
        return res.status(400).json({ success: false, message: "Choose a different date before confirming the reschedule." });
      }
      if (visitDate < new Date().toISOString().slice(0, 10)) {
        return res.status(400).json({ success: false, message: "Choose today or a future date." });
      }

      db.query(
        `SELECT id FROM schedules
         WHERE id <> ? AND visit_date = ? AND time_start = ?
           AND LOWER(status) NOT IN ('cancelled', 'rejected')
         LIMIT 1`,
        [scheduleId, visitDate, schedule.time_start],
        (conflictError, conflicts) => {
          if (conflictError) return res.status(500).json({ success: false, message: conflictError.message });
          if (conflicts.length) return res.status(409).json({ success: false, code: "SCHEDULE_CONFLICT", message: "That date and time are already booked." });

          db.query(
            `UPDATE schedules SET visit_date = ?, date = ?, reschedule_count = reschedule_count + 1
             WHERE id = ? AND reschedule_count = 0`,
            [visitDate, visitDate, scheduleId],
            (updateError, result) => {
              if (updateError) return res.status(500).json({ success: false, message: updateError.message });
              if (!result.affectedRows) return res.status(409).json({ success: false, message: "The reschedule allowance has already been used." });
              cache.clear("schedule:unavailable-slots");
              return res.json({ success: true, message: "Schedule rescheduled successfully.", visit_date: visitDate });
            },
          );
        },
      );
    },
  );
};
// Get one schedule
const getScheduleById = (req, res) => {
  db.query(
    "SELECT * FROM schedules WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      res.json(result[0]);
    }
  );
};

// Update schedule
const updateSchedule = (req, res) => {
  const { booking_id, visit_date, status = "Pending" } = req.body;

  const sql = `
    UPDATE schedules
    SET booking_id = ?, visit_date = ?, status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [booking_id, visit_date, status, req.params.id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      cache.clear("schedule:unavailable-slots");

      res.json({
        success: true,
        message: "Schedule updated successfully",
      });
    }
  );
};

// Delete schedule
const deleteSchedule = (req, res) => {
  db.query(
    "DELETE FROM schedules WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      cache.clear("schedule:unavailable-slots");

      res.json({
        success: true,
        message: "Schedule deleted successfully",
      });
    }
  );
};

module.exports = {
  getUnavailableSlots,
  scheduleVisit,
  getSchedules,
  getScheduleById,
  updateSchedule,
  reschedulePendingVisit,
  deleteSchedule,
};
