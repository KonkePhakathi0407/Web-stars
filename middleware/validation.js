const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }
    next();
};

const validateSignup = [
    body('first_name').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('last_name').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('university').optional().trim(),
    handleValidationErrors
];

const validateSignin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

const validateMoodLog = [
    body('mood_score').isInt({ min: 1, max: 10 }).withMessage('Mood score must be between 1 and 10'),
    body('mood_label').optional().trim(),
    body('notes').optional().trim(),
    handleValidationErrors
];

const validateJournalEntry = [
    body('content').notEmpty().withMessage('Journal content cannot be empty'),
    body('mood').optional().trim(),
    handleValidationErrors
];

const validateBooking = [
    body('counsellor_name').notEmpty().withMessage('Counsellor name is required'),
    body('appointment_date').notEmpty().withMessage('Appointment date is required'),
    body('appointment_time').notEmpty().withMessage('Appointment time is required'),
    body('campus').optional().trim(),
    body('reason').optional().trim(),
    handleValidationErrors
];

const validateForumPost = [
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('category').notEmpty().withMessage('Category is required'),
    handleValidationErrors
];

module.exports = {
    validateSignup,
    validateSignin,
    validateMoodLog,
    validateJournalEntry,
    validateBooking,
    validateForumPost
};