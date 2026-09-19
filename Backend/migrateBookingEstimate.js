require('dotenv').config();
const db = require('./config/db');
db.query(require('./migrations/bookingEstimate'), error => {
    if (error) { console.error('Booking estimate migration failed:', error.message); process.exitCode = 1; }
    else console.log('Booking estimate column is ready.');
    db.destroy();
});
