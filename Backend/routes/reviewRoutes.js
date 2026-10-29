const express = require('express');
const router = express.Router();
const auth = require('../middeware/auth');
const { getReviews, submitReview, getMyReviews } = require('../controllers/reviewController');

// Public: view verified client reviews
router.get('/', getReviews);

// Authenticated client only: submit genuine review for completed project & get my reviews
router.post('/', auth, auth.authorizeRoles('client'), submitReview);
router.get('/mine', auth, auth.authorizeRoles('client'), getMyReviews);

module.exports = router;

