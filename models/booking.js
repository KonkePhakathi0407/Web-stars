const { promisePool } = require('../config/database');

class Booking {
    // Create a new booking
    static async create(userId, bookingData) {
        const { counsellor_name, campus, appointment_date, appointment_time, reason, student_number } = bookingData;
        
        const [result] = await promisePool.execute(
            `INSERT INTO bookings (user_id, counsellor_name, campus, appointment_date, appointment_time, reason, student_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, counsellor_name, campus || null, appointment_date, appointment_time, reason || null, student_number || null]
        );
        
        return result.insertId;
    }

    // Get all bookings for a user
    static async findByUserId(userId, status = null) {
        let query = 'SELECT * FROM bookings WHERE user_id = ?';
        const params = [userId];
        
        if (status) {
            query += ' AND status = ? ORDER BY appointment_date ASC';
            params.push(status);
        } else {
            query += ' ORDER BY appointment_date ASC';
        }
        
        const [rows] = await promisePool.execute(query, params);
        return rows;
    }

    // Get single booking
    static async findById(id, userId) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return rows[0] || null;
    }

    // Update booking
    static async update(id, userId, bookingData) {
        const { counsellor_name, campus, appointment_date, appointment_time, reason, status } = bookingData;
        
        const [result] = await promisePool.execute(
            `UPDATE bookings 
             SET counsellor_name = ?, campus = ?, appointment_date = ?, appointment_time = ?, reason = ?, status = ? 
             WHERE id = ? AND user_id = ?`,
            [counsellor_name, campus, appointment_date, appointment_time, reason, status, id, userId]
        );
        
        return result.affectedRows > 0;
    }

    // Cancel booking
    static async cancel(id, userId) {
        const [result] = await promisePool.execute(
            "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    // Delete booking
    static async delete(id, userId) {
        const [result] = await promisePool.execute(
            'DELETE FROM bookings WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    // Get upcoming bookings count
    static async getUpcomingCount(userId) {
        const [rows] = await promisePool.execute(
            "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status = 'pending' AND appointment_date >= CURDATE()",
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Booking;