// A requested start time does not imply a known project end time.
module.exports = [
    'ALTER TABLE schedules ADD COLUMN IF NOT EXISTS time_end TIME NULL DEFAULT NULL',
    'ALTER TABLE schedules MODIFY COLUMN time_end TIME NULL DEFAULT NULL',
];
