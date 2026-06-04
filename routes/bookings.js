const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// All booking routes require authentication
router.use(isAuthenticated);

// Create booking
router.post('/', bookingController.createBooking);

// Get all bookings (with optional status filter)
router.get('/', bookingController.getBookings);

// Get single booking
router.get('/:id', bookingController.getBooking);

// Update booking
router.put('/:id', bookingController.updateBooking);

// Cancel booking
router.delete('/:id/cancel', bookingController.cancelBooking);

module.exports = router;