const db = require("../config/db");
const cache = require("../utils/cache");

const getUnavailableSlots = (req, res) => {
  const cached = cache.get("schedule:unavailable-slots");
  if (cached) return cache.sendCachedJson(res, cached);

  db.query(
    `SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS visit_date,
            TIME_FORMAT(time_start, '%H:%i') AS time_start
     FROM schedules JOIN bookings ON bookings.id = schedules.booking_id
     WHERE visit_date IS NOT NULL
       AND LOWER(schedules.status) NOT IN ('cancelled', 'rejected')
       AND LOWER(bookings.status) NOT IN ('cancelled', 'rejected')
     ORDER BY visit_date, time_start`,
    (err, rows) => {
      if (err) return res.status(500).json({ success:false, message:err.message });
      cache.sendFreshJson(res, "schedule:unavailable-slots", { success:true, slots:rows }, cache.ttl.unavailableSlots);
    }
  );
};

// Use the same lock as booking creation so moving a schedule cannot race a new booking.
const scheduleError = (status, message, code) => Object.assign(new Error(message), { status, code });
const writeSchedule = async (res, operation, status = 200) => {
  let connection;
  let locked = false;
  try {
    const { host, port, user, password, database } = db.config;
    connection = await require('mysql2/promise').createConnection({ host, port, user, password, database, ssl: require('../config/dbSsl')() });
    const [locks] = await connection.query("SELECT GET_LOCK('mcidbms:create-booking', 10) AS acquired");
    locked = Number(locks[0].acquired) === 1;
    if (!locked) throw scheduleError(503, 'Booking is busy. Please try again.');
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    cache.clear('schedule:unavailable-slots');
    return res.status(status).json({ success: true, ...result });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.status || 500).json({ success: false, message: error.message, code: error.code });
  } finally {
    if (connection) {
      try { if (locked) await connection.query("SELECT RELEASE_LOCK('mcidbms:create-booking')"); }
      finally { await connection.end(); }
    }
  }
};
const ensureDayAvailable = async (connection, bookingId, visitDate) => {
  const [conflicts] = await connection.execute(
    "SELECT s.id FROM schedules s JOIN bookings b ON b.id = s.booking_id WHERE s.booking_id <> ? AND s.visit_date = ? AND LOWER(s.status) NOT IN ('cancelled', 'rejected') AND LOWER(b.status) NOT IN ('cancelled', 'rejected') LIMIT 1",
    [bookingId, visitDate]);
  if (conflicts.length) throw scheduleError(409, 'This day is already booked. Please choose another date.', 'SCHEDULE_CONFLICT');
};

// Create schedule
const scheduleVisit = (req, res) => {
  const bookingId = Number(req.body.booking_id);
  const visitDate = String(req.body.visit_date || '').trim();
  if (!Number.isInteger(bookingId) || bookingId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return res.status(400).json({ success: false, message: 'A valid booking and visit date are required.' });
  }
  return writeSchedule(res, async connection => {
    const [bookings] = await connection.execute('SELECT id, status FROM bookings WHERE id = ?', [bookingId]);
    if (!bookings.length) throw scheduleError(404, 'Booking not found.');
    if (!['cancelled', 'rejected'].includes(String(bookings[0].status).toLowerCase())) await ensureDayAvailable(connection, bookingId, visitDate);
    const [rows] = await connection.execute('SELECT id FROM schedules WHERE booking_id = ? ORDER BY id DESC LIMIT 1', [bookingId]);
    const existingId = rows[0]?.id;
    const [result] = existingId
      ? await connection.execute("UPDATE schedules SET visit_date = ?, date = ?, status = 'Pending' WHERE id = ?", [visitDate, visitDate, existingId])
      : await connection.execute("INSERT INTO schedules (booking_id, visit_date, date, status) VALUES (?, ?, ?, 'Pending')", [bookingId, visitDate, visitDate]);
    return { message: existingId ? 'Schedule updated successfully' : 'Schedule created successfully', id: existingId || result.insertId };
  }, 201);
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
  const visitDate = String(req.body.visit_date || '').trim();
  if (!scheduleId || !userId || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return res.status(400).json({ success: false, message: 'A valid schedule, client, and date are required.' });
  }
  return writeSchedule(res, async connection => {
    const [rows] = await connection.execute(
      "SELECT s.id, s.booking_id, s.reschedule_count, DATE_FORMAT(s.visit_date, '%Y-%m-%d') AS current_visit_date, b.accepted_at, b.status AS booking_status FROM schedules s JOIN bookings b ON b.id = s.booking_id WHERE s.id = ? AND b.user_id = ? LIMIT 1",
      [scheduleId, userId]);
    if (!rows.length) throw scheduleError(404, 'Schedule not found for this account.');
    const schedule = rows[0];
    const bookingStatus = String(schedule.booking_status || '').toLowerCase();
    if (schedule.accepted_at || ['confirmed', 'approved', 'ongoing', 'completed'].includes(bookingStatus)) throw scheduleError(409, 'This project has already been accepted and its schedule is locked.', 'BOOKING_ACCEPTED');
    if (['cancelled', 'rejected'].includes(bookingStatus)) throw scheduleError(409, 'This booking is no longer active.');
    if (Number(schedule.reschedule_count) >= 1) throw scheduleError(409, 'This booking has already used its one allowed reschedule.', 'RESCHEDULE_LIMIT');
    if (schedule.current_visit_date === visitDate) throw scheduleError(400, 'Choose a different date before confirming the reschedule.');
    if (visitDate < new Date().toISOString().slice(0, 10)) throw scheduleError(400, 'Choose today or a future date.');
    await ensureDayAvailable(connection, schedule.booking_id, visitDate);
    const [result] = await connection.execute('UPDATE schedules SET visit_date = ?, date = ?, reschedule_count = reschedule_count + 1 WHERE id = ? AND reschedule_count = 0', [visitDate, visitDate, scheduleId]);
    if (!result.affectedRows) throw scheduleError(409, 'The reschedule allowance has already been used.');
    return { message: 'Schedule rescheduled successfully.', visit_date: visitDate };
  });
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
  const bookingId = Number(req.body.booking_id);
  const visitDate = String(req.body.visit_date || '').trim();
  const status = req.body.status || 'Pending';
  if (!Number.isInteger(bookingId) || bookingId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || typeof status !== 'string') {
    return res.status(400).json({ success: false, message: 'A valid booking, visit date, and status are required.' });
  }
  return writeSchedule(res, async connection => {
    const [rows] = await connection.execute('SELECT id FROM schedules WHERE id = ?', [req.params.id]);
    if (!rows.length) throw scheduleError(404, 'Schedule not found');
    const [bookings] = await connection.execute('SELECT id, status FROM bookings WHERE id = ?', [bookingId]);
    if (!bookings.length) throw scheduleError(404, 'Booking not found.');
    if (!['cancelled', 'rejected'].includes(status.toLowerCase()) && !['cancelled', 'rejected'].includes(String(bookings[0].status).toLowerCase())) await ensureDayAvailable(connection, bookingId, visitDate);
    await connection.execute('UPDATE schedules SET booking_id = ?, visit_date = ?, date = ?, status = ? WHERE id = ?', [bookingId, visitDate, visitDate, status, req.params.id]);
    return { message: 'Schedule updated successfully' };
  });
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
