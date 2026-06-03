const express = require('express');
const router  = express.Router();
const { promisePool }     = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const crisisResources = {
    hotlines: [
        { name: 'SADAG Suicide Crisis Line', number: '0800 567 567', available: '24/7', free: true },
        { name: 'Lifeline SA',               number: '0861 322 322', available: '24/7', free: true },
        { name: 'UJ Wellness Centre',        number: '011 559 3324', available: 'Mon-Fri 8am-5pm', free: true }
    ],
    emergency: { name: 'Emergency Services', number: '10111', available: '24/7' }
};

router.get('/resources', isAuthenticated, (req, res) => {
    res.json({ success: true, resources: crisisResources });
});

// POST /api/crisis
router.post('/', async (req, res) => {
    console.log('🚨 Crisis alert POST received');
    console.log('   Body:', req.body);
    console.log('   Session user_id:', req.session?.user_id);

    try {
        const { severity, share_details, location, message } = req.body;
        const userId       = share_details ? (req.session?.user_id || null) : null;
        const safeSeverity = ['low', 'medium', 'high'].includes(severity) ? severity : 'high';

        console.log('   Inserting → user_id:', userId, 'severity:', safeSeverity);

        const [result] = await promisePool.execute(
            `INSERT INTO crisis_alerts 
             (user_id, location, message, share_details, severity, status) 
             VALUES (?, ?, ?, ?, ?, 'open')`,
            [userId, location || null, message || null, share_details ? 1 : 0, safeSeverity]
        );

        console.log('   ✅ Alert inserted, id:', result.insertId);

        res.json({
            success: true,
            message: 'Alert sent. Help is on the way. A wellness counsellor will reach out shortly.',
            alert_id: result.insertId
        });

    } catch (error) {
        console.error('❌ Crisis alert DB error:', error.message);
        console.error('   Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// POST /api/crisis/chat
router.post('/chat', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const lower = (message || '').toLowerCase();

    const responses = {
        suicide:    'I\'m really concerned. Please call the Suicide Crisis Line immediately: 0800 567 567.',
        anxiety:    'Anxiety can be overwhelming. Try taking 3 deep breaths. Would you like a grounding exercise?',
        depression: 'It sounds like you\'ve been feeling down. Seeking help is a sign of strength.',
        distress:   'I hear that you\'re going through a difficult time. You\'re not alone.',
        greeting:   'Hi there. I\'m here to listen. How are you feeling right now?',
        default:    'Thank you for sharing. Would you like to tell me more?'
    };

    let response    = responses.default;
    let needsCrisis = false;

    if (lower.includes('suicide') || lower.includes('kill myself') || lower.includes('no point living')) {
        response = responses.suicide; needsCrisis = true;
    } else if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('panic')) {
        response = responses.anxiety;
    } else if (lower.includes('depress') || lower.includes('sad') || lower.includes('hopeless')) {
        response = responses.depression;
    } else if (lower.includes('help') || lower.includes('struggling')) {
        response = responses.distress;
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        response = responses.greeting;
    }

    try {
        await promisePool.execute(
            'INSERT INTO crisis_chats (user_id, message, response, needs_crisis) VALUES (?, ?, ?, ?)',
            [req.session.user_id, message, response, needsCrisis ? 1 : 0]
        );
    } catch (e) { console.error('crisis_chats insert:', e.message); }

    res.json({ success: true, response, needsCrisis,
        crisisMessage: needsCrisis ? 'Crisis detected. Please call 0800 567 567 immediately.' : null,
        resources: needsCrisis ? crisisResources.hotlines : null
    });
});

module.exports = router;