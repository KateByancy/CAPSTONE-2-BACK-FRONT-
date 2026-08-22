const db = require("../config/db");

// Create schedule
const scheduleVisit = (req, res) => {
  const { booking_id, visit_date } = req.body;

  if (!booking_id || !visit_date) {
    return res.status(400).json({ success: false, message: "booking_id and visit_date are required." });
  }

  const sql = `
    INSERT INTO schedules (booking_id, visit_date)
    VALUES (?, ?)
  `;

  db.query(
    sql,
    [booking_id, visit_date],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        id: result.insertId,
      });
    }
  );
};

// Get all schedules
const getSchedules = (req, res) => {
  db.query(
    "SELECT * FROM schedules ORDER BY visit_date ASC",
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
  scheduleVisit,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
