const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection, promisePool } = require('./config/database');

// ============ USER ROUTES ============
const authRoutes = require('./routes/auth');
const moodRoutes = require('./routes/mood');
const journalRoutes = require('./routes/journal');
const bookingRoutes = require('./routes/bookings');
const forumRoutes = require('./routes/forum');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
let crisisRoutes;
try {
    crisisRoutes = require('./routes/crisis');
    console.log('Crisis routes loaded');
} catch(e) {
    console.error('Failed to load crisis routes:', e.message);
    const express = require('express');
    crisisRoutes = express.Router();
    crisisRoutes.post('/', async (req, res) => {
        try {
            const { promisePool } = require('./config/database');
            const { severity, share_details, location, message } = req.body;
            const userId = share_details ? (req.session?.user_id || null) : null;
            const safeSeverity = ['low','medium','high'].includes(severity) ? severity : 'high';
            await promisePool.execute(
                'INSERT INTO crisis_alerts (user_id, location, message, share_details, severity, status) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, location||null, message||null, share_details?1:0, safeSeverity, 'open']
            );
            res.json({ success: true, message: 'Alert sent successfully.' });
        } catch(err) {
            console.error('Inline crisis error:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    });
}
const notificationsRoutes = require('./routes/notifications');

// ============ ADMIN ROUTES ============
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminCrisisRoutes = require('./routes/admin/crisis');
const adminAppointmentRoutes = require('./routes/admin/appointment');
const adminUsersRoutes = require('./routes/admin/users');
const adminAdminsRoutes = require('./routes/admin/admins');
const adminAuditRoutes = require('./routes/admin/audit');
const adminSettingsRoutes = require('./routes/admin/settings');
const adminAnalyticsRoutes = require('./routes/admin/analytics');
const adminFlaggedRoutes = require('./routes/admin/flagged');
const adminForumRoutes = require('./routes/admin/forum');

// ============ MIDDLEWARE ============
const { protectUser } = require('./middleware/auth');
const { isAdminAuthenticated } = require('./middleware/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// ========== STANDARD MIDDLEWARE ==========
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== SESSION CONFIGURATION ==========
app.use(session({
    secret: process.env.SESSION_SECRET || 'mindcare_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// ========== LOGGING ==========
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ========== USER API ROUTES ==========
app.use('/api/auth', authRoutes);
app.use('/api/mood', protectUser, moodRoutes);
app.use('/api/journal', protectUser, journalRoutes);
app.use('/api/bookings', protectUser, bookingRoutes);
app.use('/api/forum', protectUser, forumRoutes);
app.use('/api/settings', protectUser, settingsRoutes);
app.use('/api/users', protectUser, userRoutes);
app.use('/api/crisis', crisisRoutes);

// DIRECT CRISIS FALLBACK (catches if router fails)
app.post('/api/crisis-direct', async (req, res) => {
    try {
        const { severity, share_details, location, message } = req.body;
        const userId = share_details ? (req.session?.user_id || null) : null;
        const safeSeverity = ['low','medium','high'].includes(severity) ? severity : 'high';
        const [result] = await promisePool.execute(
            'INSERT INTO crisis_alerts (user_id, location, message, share_details, severity, status) VALUES (?, ?, ?, ?, ?, \'open\')',
            [userId, location||null, message||null, share_details?1:0, safeSeverity]
        );
        console.log('Direct crisis alert saved, id:', result.insertId);
        res.json({ success: true, message: 'Alert sent. Help is on the way.' });
    } catch(err) {
        console.error('Direct crisis error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});
app.use('/api/notifications', protectUser, notificationsRoutes);

// ========== ADMIN API ROUTES ==========
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', isAdminAuthenticated, adminDashboardRoutes);
app.use('/api/admin/crisis', isAdminAuthenticated, adminCrisisRoutes);
app.use('/api/admin/appointments', isAdminAuthenticated, adminAppointmentRoutes);
app.use('/api/admin/users', isAdminAuthenticated, adminUsersRoutes);
app.use('/api/admin/admins', isAdminAuthenticated, adminAdminsRoutes);
app.use('/api/admin/audit', isAdminAuthenticated, adminAuditRoutes);
app.use('/api/admin/settings', isAdminAuthenticated, adminSettingsRoutes);
app.use('/api/admin/analytics', isAdminAuthenticated, adminAnalyticsRoutes);
app.use('/api/admin/flagged', isAdminAuthenticated, adminFlaggedRoutes);
app.use('/api/admin/forum', isAdminAuthenticated, adminForumRoutes);

// ========== GROQ AI CHAT ==========
const Groq = require('groq-sdk');
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post('/api/ai-chat', async (req, res) => {
    const { message, history = [] } = req.body;

    const messages = [
        {
            role: 'system',
            content: `You are a compassionate mental health support companion for university students in South Africa.

Your ONLY role is to provide emotional support, listen, validate feelings, and gently guide users toward professional mental health resources.

STRICT RULES:
1. If a user asks about non-mental health topics (sports, politics, entertainment, academics, general knowledge, calculations, etc.), politely decline and redirect to their wellbeing:
   - "I'm here to support your mental wellbeing. How are you feeling today?"
   - "I focus on emotional support. Would you like to talk about what's on your mind?"

2. Never provide information outside mental health support:
   - No answers to academic questions (math, science, history)
   - No sports scores or entertainment news
   - No political opinions or news
   - No general knowledge or trivia
   - No code writing or technical help
   - No date/time or weather information

3. Keep responses warm, brief (2-3 sentences), and non-clinical. Never diagnose.

4. If a user mentions keywords like "no point living", "suicide", or "take my life", provide mental health hotline numbers immediately.

5. Always remind users that real counsellors are available if they need more support.

6. If you cannot answer a non-mental health question, simply say: "I'm here to support your emotional wellbeing. Would you like to talk about how you're feeling instead?`
        },
        ...history.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        { role: 'user', content: message }
    ];

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            max_tokens: 300
        });

        const reply = completion.choices[0]?.message?.content 
            || "I'm here with you. Would you like to talk more about what you're feeling?";
        res.json({ reply });

    } catch (err) {
        console.error('Groq error:', err);
        res.status(500).json({ reply: null });
    }
});

app.post('/api/ai-insights', async (req, res) => {
    try {
        // 1. Pull the logged-in user's id from session / JWT however you do it
        //    Adjust the line below to match your auth middleware
        const userId = req.user?.id || req.session?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        // 2. Fetch last 5 journal entries (full content) from your DB
        //    Adjust the query/table name to match your schema
        let entries = [];
        try {
            // If you use a `db` / `pool` query helper:
            const result = await db.query(
                `SELECT content, mood_label, created_at
                 FROM journal_entries
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 5`,
                [userId]
            );
            entries = result.rows || result;
        } catch (dbErr) {
            console.error('DB error fetching journal entries:', dbErr);
            return res.status(500).json({ success: false, error: 'Could not load journal entries' });
        }

        if (!entries || entries.length === 0) {
            // No entries yet — return helpful placeholder insights
            return res.json({
                success: true,
                insights: [
                    { type: 'Getting Started', color: 'pink', text: 'Start writing journal entries and your personal AI insights will appear here.' },
                    { type: 'Daily Tip', color: 'yellow', text: 'Even a few sentences a day can help you track patterns in your mood and wellbeing.' },
                    { type: 'Did You Know?', color: 'green', text: 'Journalling for just 5 minutes can reduce stress and improve emotional clarity.' }
                ]
            });
        }

        // 3. Build a summary of entries to send to Groq
        const entrySummary = entries.map((e, i) => {
            const date = new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const mood = e.mood_label ? ` (mood: ${e.mood_label})` : '';
            return `Entry ${i + 1} [${date}]${mood}:\n${e.content}`;
        }).join('\n\n---\n\n');

        // 4. Ask Groq to analyse the entries and return exactly 3 insights as JSON
        const prompt = `You are a compassionate mental health support AI for university students.

Below are a student's recent journal entries. Analyse them carefully and return exactly 3 personalised insights as a JSON array.

Each insight must have:
- "type": a short label (e.g. "Stress Trigger", "Progress Note", "Daily Tip", "Mood Pattern", "Coping Strength", "Self-Care Reminder")
- "color": one of "pink", "yellow", or "green" (vary them, one of each)
- "text": 1–2 warm, supportive sentences specific to what this student actually wrote. Never be generic. Never diagnose. Be empathetic and encouraging.

Respond with ONLY the JSON array. No markdown, no explanation, no backticks.

Example format:
[
  {"type":"Stress Trigger","color":"pink","text":"Your entries mention upcoming exams several times — it seems academic pressure is weighing on you. Breaking study sessions into smaller chunks may help ease that tension."},
  {"type":"Progress Note","color":"yellow","text":"You noted feeling more settled after your walk on Tuesday — physical movement seems to lift your mood noticeably."},
  {"type":"Daily Tip","color":"green","text":"Try writing down one thing you are grateful for each morning; your entries suggest this small habit could anchor your day positively."}
]

Journal entries to analyse:
${entrySummary}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
        });

        const raw = completion.choices[0]?.message?.content || '[]';

        // 5. Safely parse the JSON response
        let insights = [];
        try {
            const cleaned = raw.replace(/```json|```/g, '').trim();
            insights = JSON.parse(cleaned);
            // Validate shape and limit to 3
            insights = insights
                .filter(i => i && typeof i.type === 'string' && typeof i.text === 'string')
                .slice(0, 3);
        } catch (parseErr) {
            console.error('Failed to parse Groq insight JSON:', parseErr, '\nRaw:', raw);
            insights = [
                { type: 'Reflection', color: 'pink', text: 'Keep journalling — patterns in your mood and thoughts will become clearer over time.' },
                { type: 'Encouragement', color: 'yellow', text: 'You are taking a positive step by tracking your wellbeing. That takes courage.' },
                { type: 'Daily Tip', color: 'green', text: 'Try a short breathing exercise before bed tonight to help process the day.' }
            ];
        }

        return res.json({ success: true, insights });

    } catch (err) {
        console.error('AI insights error:', err);
        return res.status(500).json({ success: false, error: 'AI insights unavailable' });
    }
});



// ========== SERVE STATIC FRONTEND FILES ==========
// User frontend (Frontend folder)
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use('/css', express.static(path.join(__dirname, 'Frontend/css')));
app.use('/javascript', express.static(path.join(__dirname, 'Frontend/javascript')));
app.use('/utils', express.static(path.join(__dirname, 'Frontend/utils')));

// Admin frontend (adminFrontend folder)
app.use('/admin', express.static(path.join(__dirname, 'AdminFrontend')));
app.use('/admin/css', express.static(path.join(__dirname, 'AdminFrontend/css')));
app.use('/admin/javascript', express.static(path.join(__dirname, 'AdminFrontend/javascript')));
app.use('/admin/utils', express.static(path.join(__dirname, 'AdminFrontend/utils')));

// ========== ROOT REDIRECT ==========
app.get('/', (req, res) => {
    if (req.session.adminId) {
        res.redirect('/admin/adashboard.html');
    } else if (req.session.user_id) {
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/signin.html');
    }
});

// ========== ADMIN LANDING PAGE ==========
app.get('/admin-landing', (req, res) => {
    res.sendFile(path.join(__dirname, 'AdminFrontend', 'index.html'));
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        message: 'MindCare Hub Unified API is running',
        session: {
            userId: req.session.user_id || null,
            adminId: req.session.adminId || null
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!', timestamp: new Date().toISOString() });
});

app.get('/api/info', (req, res) => {
    res.json({
        name: 'MindCare Hub API',
        version: '3.0.0',
        status: 'running',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        features: { 
            user: true, 
            admin: true, 
            crisis: true, 
            analytics: true,
            ai: true
        }
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
    if (req.url.startsWith('/admin/')) {
        res.status(404).sendFile(path.join(__dirname, 'AdminFrontend', 'index.html'));
    } else {
        res.status(404).json({ success: false, message: `Endpoint not found: ${req.method} ${req.url}` });
    }
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// ========== CREATE TABLES FUNCTION ==========
const createAllTables = async () => {
    console.log('\nCreating/Verifying database tables...\n');
    
    const tables = [
        // 1. USERS TABLE
        `CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            university VARCHAR(255),
            year_of_study VARCHAR(50),
            profile_picture VARCHAR(500) DEFAULT NULL,
            role ENUM('student', 'admin', 'counselor') DEFAULT 'student',
            is_anonymous TINYINT DEFAULT 0,
            is_active TINYINT DEFAULT 1,
            last_login TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role (role)
        )`,

        // 2. MOOD LOGS TABLE
        `CREATE TABLE IF NOT EXISTS mood_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            mood_score INT NOT NULL,
            mood_label VARCHAR(50),
            notes TEXT,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_logged_at (logged_at)
        )`,

        // 3. JOURNAL ENTRIES TABLE
        `CREATE TABLE IF NOT EXISTS journal_entries (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            mood VARCHAR(50),
            content TEXT NOT NULL,
            word_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        )`,

        // 4. JOURNAL SENTIMENT ANALYSIS TABLE
        `CREATE TABLE IF NOT EXISTS journal_sentiment (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            journal_id INT NOT NULL,
            sentiment_score INT,
            tone VARCHAR(50),
            distress_keywords TEXT,
            positive_keywords TEXT,
            needs_intervention TINYINT DEFAULT 0,
            analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
            UNIQUE KEY unique_journal (journal_id)
        )`,

        // 5. BOOKINGS TABLE
        `CREATE TABLE IF NOT EXISTS bookings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            counsellor_name VARCHAR(255) NOT NULL,
            campus VARCHAR(100),
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            reason TEXT,
            student_number VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_appointment_date (appointment_date),
            INDEX idx_status (status)
        )`,

        // 6. FORUM POSTS TABLE
        `CREATE TABLE IF NOT EXISTS forum_posts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            excerpt VARCHAR(255),
            category VARCHAR(100),
            likes INT DEFAULT 0,
            is_anon TINYINT DEFAULT 1,
            is_reported TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_category (category),
            INDEX idx_created_at (created_at),
            INDEX idx_is_reported (is_reported)
        )`,

        // 7. FORUM COMMENTS TABLE
        `CREATE TABLE IF NOT EXISTS forum_comments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            post_id INT NOT NULL,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            is_reported TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_post_id (post_id),
            INDEX idx_is_reported (is_reported)
        )`,

        // 8. FORUM LIKES TABLE
        `CREATE TABLE IF NOT EXISTS forum_likes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            post_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_like (post_id, user_id),
            FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // 9. USER SETTINGS TABLE
        `CREATE TABLE IF NOT EXISTS user_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL UNIQUE,
            theme VARCHAR(20) DEFAULT 'light',
            notif_email TINYINT DEFAULT 1,
            notif_push TINYINT DEFAULT 1,
            notif_forum TINYINT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // 10. PASSWORD OTP TABLE
        `CREATE TABLE IF NOT EXISTS password_otp (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            otp_code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_used TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_otp (otp_code),
            INDEX idx_user (user_id)
        )`,

        // 11. CRISIS CHATS TABLE
        `CREATE TABLE IF NOT EXISTS crisis_chats (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            message TEXT,
            response TEXT,
            needs_crisis TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // 12. CRISIS ALERTS TABLE
        `CREATE TABLE IF NOT EXISTS crisis_alerts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            location VARCHAR(255),
            message TEXT,
            share_details TINYINT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        )`,

        // 13. HELP REQUESTS TABLE
        `CREATE TABLE IF NOT EXISTS help_requests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            message TEXT,
            share_location TINYINT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        )`,

        // 14. REMINDERS TABLE
        `CREATE TABLE IF NOT EXISTS reminders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            booking_id INT,
            reminder_type VARCHAR(50),
            reminder_time TIMESTAMP,
            sent TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            INDEX idx_reminder_time (reminder_time),
            INDEX idx_sent (sent)
        )`,

        // 15. ADMIN ACTIVITY LOG
        `CREATE TABLE IF NOT EXISTS admin_activity_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            admin_id INT NOT NULL,
            action VARCHAR(255) NOT NULL,
            target_type VARCHAR(50),
            target_id INT,
            details TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_admin_id (admin_id),
            INDEX idx_created_at (created_at),
            INDEX idx_action (action)
        )`,

        // 16. REPORTED CONTENT TABLE
        `CREATE TABLE IF NOT EXISTS reported_content (
            id INT PRIMARY KEY AUTO_INCREMENT,
            reporter_id INT NOT NULL,
            content_type VARCHAR(50) NOT NULL,
            content_id INT NOT NULL,
            reason VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            reviewed_by INT,
            reviewed_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_content (content_type, content_id),
            INDEX idx_status (status)
        )`,

        // 17. COUNSELLORS TABLE
        `CREATE TABLE IF NOT EXISTS counsellors (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            specialization VARCHAR(255),
            bio TEXT,
            availability TEXT,
            rating DECIMAL(3,2) DEFAULT 0,
            total_reviews INT DEFAULT 0,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_is_active (is_active),
            INDEX idx_rating (rating)
        )`,

        // 18. CAMPUS LOCATIONS TABLE
        `CREATE TABLE IF NOT EXISTS campus_locations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            campus_code VARCHAR(10),
            address TEXT,
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            phone VARCHAR(20),
            email VARCHAR(255),
            hours TEXT,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // 19. MENTAL HEALTH FACILITIES TABLE
        `CREATE TABLE IF NOT EXISTS mental_health_facilities (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            type ENUM('on-campus', 'off-campus', 'online') DEFAULT 'off-campus',
            address TEXT,
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            phone VARCHAR(20),
            website VARCHAR(255),
            is_free TINYINT DEFAULT 0,
            is_online TINYINT DEFAULT 0,
            is_student_specific TINYINT DEFAULT 0,
            cost_range VARCHAR(100),
            hours TEXT,
            rating DECIMAL(3,2) DEFAULT 0,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_type (type),
            INDEX idx_is_free (is_free),
            INDEX idx_is_online (is_online)
        )`,

        // 20. NOTIFICATIONS TABLE
        `CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50),
            is_read TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_is_read (is_read),
            INDEX idx_created_at (created_at)
        )`,

        // 21. SYSTEM SETTINGS TABLE
        `CREATE TABLE IF NOT EXISTS system_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type VARCHAR(50) DEFAULT 'string',
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
    ];
    
    for (const query of tables) {
        try {
            await promisePool.execute(query);
            console.log('Table created/verified');
        } catch (error) {
            console.error('Error creating table:', error.message);
        }
    }
    
    console.log('\nAll 21 database tables are ready!\n');
};

// ========== START SERVER ==========
async function startServer() {
    console.log('\n========================================');
    console.log('   MINDCARE HUB - UNIFIED SERVER');
    console.log('========================================\n');
    
    await testConnection();
    
    // Create all tables automatically
    await createAllTables();
    
    // Create uploads folder if it doesn't exist
    if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads', { recursive: true });
        console.log('Created uploads folder');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\nUnified Server is running!`);
        console.log(`URL: http://localhost:${PORT}`);
        
        console.log('\nAI Endpoints:');
        console.log(`   POST   /api/ai-chat           - AI chat companion`);
        
        console.log('\nUser Endpoints:');
        console.log(`   POST   /api/auth/signup       - Create account`);
        console.log(`   POST   /api/auth/signin       - User login`);
        console.log(`   GET    /api/mood              - Get mood logs`);
        console.log(`   POST   /api/mood              - Create mood log`);
        console.log(`   GET    /api/journal           - Get journal entries`);
        console.log(`   POST   /api/journal           - Create journal entry`);
        console.log(`   GET    /api/bookings          - Get bookings`);
        console.log(`   POST   /api/bookings          - Create booking`);
        console.log(`   GET    /api/forum             - Get forum posts`);
        console.log(`   POST   /api/forum             - Create forum post`);
        console.log(`   POST   /api/crisis            - Submit crisis alert`);
        
        console.log('\nAdmin Endpoints:');
        console.log(`   POST   /api/admin/auth/login  - Admin login`);
        console.log(`   GET    /api/admin/auth/me     - Get current admin`);
        console.log(`   POST   /api/admin/auth/signup - Create admin account`);
        console.log(`   POST   /api/admin/auth/logout - Admin logout`);
        console.log(`   GET    /api/admin/dashboard/stats - Dashboard stats`);
        console.log(`   GET    /api/admin/crisis      - Manage crisis alerts`);
        console.log(`   GET    /api/admin/appointments - Manage appointments`);
        console.log(`   GET    /api/admin/users       - Manage users`);
        console.log(`   GET    /api/admin/admins      - Manage admins`);
        console.log(`   GET    /api/admin/audit       - View audit logs`);
        console.log(`   GET    /api/admin/settings    - Platform settings`);
        console.log(`   GET    /api/admin/analytics   - Analytics data`);
        
        console.log('\nFrontend URLs:');
        console.log(`   User Portal:     http://localhost:${PORT}/signin.html`);
        console.log(`   Admin Landing:   http://localhost:${PORT}/admin-landing`);
        console.log(`   Admin Sign In:   http://localhost:${PORT}/admin/signim.html`);
        console.log(`   Admin Dashboard: http://localhost:${PORT}/admin/adashboard.html`);
        console.log(`   Crisis Alerts:   http://localhost:${PORT}/admin/crisis_alert.html`);
        console.log(`   Appointments:    http://localhost:${PORT}/admin/appointments.html`);
        console.log(`   Analytics:       http://localhost:${PORT}/admin/analytics.html`);
        console.log(`   Admin Settings:  http://localhost:${PORT}/admin/settings.html`);
        
        console.log('\nReady for testing!');
        console.log('========================================\n');
    });
}

startServer();
