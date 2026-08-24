const db = require("../config/db");

const getUnavailableSlots = (req, res) => {
  db.query(
    `SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS visit_date,
            TIME_FORMAT(time_start, '%H:%i') AS time_start
     FROM schedules
     WHERE visit_date IS NOT NULL AND time_start IS NOT NULL
       AND LOWER(status) NOT IN ('cancelled', 'rejected')
     ORDER BY visit_date, time_start`,
    (err, rows) => {
      if (err) return res.status(500).json({ success:false, message:err.message });
      res.json({ success:true, slots:rows });
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
            users.fullname AS client_name, users.address AS client_address
     FROM schedules
     JOIN bookings ON bookings.id = schedules.booking_id
     JOIN users ON users.id = bookings.user_id
     WHERE bookings.accepted_at IS NOT NULL
     ${userId ? "AND users.id = ?" : ""}
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
  deleteSchedule,
};
