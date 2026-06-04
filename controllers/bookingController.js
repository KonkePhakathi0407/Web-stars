const { promisePool } = require('../config/database');

// Create booking
const createBooking = async (req, res) => {
    try {
        const { counsellor_name, campus, appointment_date, appointment_time, reason, student_number } = req.body;
        const userId = req.session.user_id;

        if (!counsellor_name || !appointment_date || !appointment_time) {
            return res.json({ success: false, message: 'Counsellor, date and time are required' });
        }

        const [result] = await promisePool.execute(
            `INSERT INTO bookings (user_id, counsellor_name, campus, appointment_date, appointment_time, reason, student_number, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [userId, counsellor_name, campus || null, appointment_date, appointment_time, reason || null, student_number || null]
        );

        res.json({ success: true, message: 'Appointment booked successfully', id: result.insertId });
    } catch (error) {
        console.error('Create booking error:', error);
        res.json({ success: false, message: 'Failed to create booking' });
    }
};

// Get all bookings for the current user
const getBookings = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { status } = req.query;

        let query = 'SELECT * FROM bookings WHERE user_id = ?';
        const params = [userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY appointment_date ASC, appointment_time ASC';

        const [bookings] = await promisePool.execute(query, params);

        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.json({ success: false, bookings: [] });
    }
};

// Get single booking
const getBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [bookings] = await promisePool.execute(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (bookings.length === 0) {
            return res.json({ success: false, message: 'Booking not found' });
        }

        res.json({ success: true, booking: bookings[0] });
    } catch (error) {
        console.error('Get booking error:', error);
        res.json({ success: false, message: 'Failed to get booking' });
    }
};

// Update booking
const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { counsellor_name, campus, appointment_date, appointment_time, reason, status } = req.body;
        const userId = req.session.user_id;

        const [result] = await promisePool.execute(
            `UPDATE bookings 
             SET counsellor_name = ?, campus = ?, appointment_date = ?, appointment_time = ?, reason = ?, status = ? 
             WHERE id = ? AND user_id = ?`,
            [counsellor_name, campus, appointment_date, appointment_time, reason, status, id, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Booking updated successfully' });
        } else {
            res.json({ success: false, message: 'Booking not found or no changes made' });
        }
    } catch (error) {
        console.error('Update booking error:', error);
        res.json({ success: false, message: 'Failed to update booking' });
    }
};

// Cancel booking
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [result] = await promisePool.execute(
            "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Booking cancelled successfully' });
        } else {
            res.json({ success: false, message: 'Booking not found' });
        }
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.json({ success: false, message: 'Failed to cancel booking' });
    }
};

// Delete booking
const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [result] = await promisePool.execute(
            'DELETE FROM bookings WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Booking deleted successfully' });
        } else {
            res.json({ success: false, message: 'Booking not found' });
        }
    } catch (error) {
        console.error('Delete booking error:', error);
        res.json({ success: false, message: 'Failed to delete booking' });
    }
};

// Get upcoming appointments (for reminders)
const getUpcomingAppointments = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [bookings] = await promisePool.execute(
            `SELECT * FROM bookings 
             WHERE user_id = ? AND status = 'pending' AND appointment_date >= CURDATE()
             ORDER BY appointment_date ASC, appointment_time ASC
             LIMIT 5`,
            [userId]
        );

        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Get upcoming appointments error:', error);
        res.json({ success: false, bookings: [] });
    }
};

module.exports = {
    createBooking,
    getBookings,
    getBooking,
    updateBooking,
    cancelBooking,
    deleteBooking,
    getUpcomingAppointments
};