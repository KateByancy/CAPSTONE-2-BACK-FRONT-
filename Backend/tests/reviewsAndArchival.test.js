const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'reviews-test-secret';

// Mock DB
const dbPath = require.resolve('../config/db');
const mockReviews = [];
const mockBookings = [
  { id: 101, user_id: 1, service_type: 'Living Room', status: 'Ongoing', progress: 40, current_stage: 'Execution' },
  { id: 102, user_id: 1, service_type: 'Kitchen', status: 'Completed', progress: 100, current_stage: 'Final Handover' },
  { id: 103, user_id: 2, service_type: 'Office', status: 'Completed', progress: 100, current_stage: 'Final Handover' },
];

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query(sql, values, callback) {
      if (typeof values === 'function') {
        callback = values;
        values = [];
      }
      // Check booking ownership & completion for review
      if (sql.includes('FROM bookings b') && sql.includes('LEFT JOIN tracking t')) {
        const [bookingId, userId] = values;
        const b = mockBookings.find(x => x.id === bookingId && x.user_id === userId);
        return callback(null, b ? [{
          id: b.id,
          user_id: b.user_id,
          service_type: b.service_type,
          status: b.status,
          design_snapshot: null,
          progress: b.progress,
          current_stage: b.current_stage
        }] : []);
      }
      // Upsert project_reviews
      if (sql.includes('INSERT INTO project_reviews')) {
        const [booking_id, user_id, design_id, rating, comment] = values;
        const existing = mockReviews.find(r => r.booking_id === booking_id);
        if (existing) {
          existing.rating = rating;
          existing.comment = comment;
          existing.updated_at = new Date();
        } else {
          mockReviews.push({ id: mockReviews.length + 1, booking_id, user_id, design_id, rating, comment, created_at: new Date() });
        }
        return callback(null, { affectedRows: 1 });
      }
      // Select project_reviews
      if (sql.includes('FROM project_reviews r')) {
        return callback(null, mockReviews.map(r => ({
          ...r,
          client_name: 'Jane Doe',
          service_type: 'Kitchen',
          project_description: 'Modern kitchen renovation',
          booking_status: 'Completed'
        })));
      }
      // Resolve design id
      if (sql.includes('SELECT id FROM design_catalog')) {
        return callback(null, [{ id: 'standard-kitchen' }]);
      }
      return callback(null, []);
    }
  }
};

const reviewController = require('../controllers/reviewController');

function createReqRes({ body = {}, query = {}, user = { id: 1, role: 'client' } } = {}) {
  const req = { body, query, user };
  let statusCode = 200;
  let responseData = null;
  const res = {
    set() { return res; },
    status(code) { statusCode = code; return res; },
    json(data) { responseData = data; return res; },
    get statusCode() { return statusCode; },
    get data() { return responseData; }
  };
  return { req, res };
}

test('submitReview rejects invalid booking ID with 400', async () => {
  const { req, res } = createReqRes({ body: { booking_id: 'invalid', rating: 5, comment: 'Great job!' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.data.success, false);
});

test('submitReview rejects invalid ratings (not between 1 and 5)', async () => {
  const { req, res } = createReqRes({ body: { booking_id: 102, rating: 6, comment: 'Great job!' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.data.success, false);
});

test('submitReview rejects short comments (< 5 chars)', async () => {
  const { req, res } = createReqRes({ body: { booking_id: 102, rating: 5, comment: 'Ok' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.data.success, false);
});

test('submitReview rejects review for project not belonging to client with 404', async () => {
  // Booking 103 belongs to user 2, user 1 tries to review
  const { req, res } = createReqRes({ body: { booking_id: 103, rating: 5, comment: 'Loved it!' }, user: { id: 1, role: 'client' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.data.success, false);
});

test('submitReview rejects review for non-completed project with 403', async () => {
  // Booking 101 is Ongoing (40%)
  const { req, res } = createReqRes({ body: { booking_id: 101, rating: 5, comment: 'Still in progress!' }, user: { id: 1, role: 'client' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.data.success, false);
  assert.match(res.data.message, /completed projects/i);
});

test('submitReview records verified rating for completed project with 201', async () => {
  // Booking 102 is Completed (100%)
  const { req, res } = createReqRes({ body: { booking_id: 102, rating: 5, comment: 'Flawless execution and timeless cabinetry craftsmanship!' }, user: { id: 1, role: 'client' } });
  await reviewController.submitReview(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.review.rating, 5);
  assert.equal(mockReviews.length, 1);
});

test('getReviews returns reviews list, average score, and count', async () => {
  const { req, res } = createReqRes({ query: { design_id: 'standard-kitchen' } });
  await reviewController.getReviews(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.average, 5.0);
  assert.equal(res.data.reviews[0].comment, 'Flawless execution and timeless cabinetry craftsmanship!');
});

