const API = 'http://localhost:3000/api/admin';

// ── Auth guard ────────────────────────────────────────────────────────────────
async function checkAdminAuth() {
    try {
        const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            window.location.href = 'signim.html';
            return null;
        }
        return data.admin;
    } catch {
        window.location.href = 'signim.html';
        return null;
    }
}

// ── Dynamic greeting based on time ───────────────────────────────────────────
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

// ── Load dashboard stats ──────────────────────────────────────────────────────
async function loadStats() {
    try {
        const res  = await fetch(`${API}/dashboard/stats`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;
        const s = data.stats;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '-'; };
        set('stat-students',     s.totalStudents);
        set('stat-crisis',       s.crisisToday);
        set('stat-appointments', s.weeklyAppointments);
        set('stat-mood',         s.averageMood || '-');
        set('stat-flagged',      s.flaggedPending);
        set('stat-admins',       s.totalAdmins);
    } catch (err) {
        console.warn('Stats load failed:', err.message);
    }
}

// ── Load notifications ────────────────────────────────────────────────────────
async function loadNotifications() {
    try {
        const res  = await fetch(`${API}/admins/me/notifications`, { credentials: 'include' });
        const data = await res.json();
        const dot  = document.querySelector('.notif-dot');
        if (!dot) return;
        if (data.success && data.count > 0) {
            dot.style.display = 'block';
            const notifBtn = document.querySelector('.topbar-icon-btn[title="Notifications"]');
            if (notifBtn) notifBtn.addEventListener('click', () => toggleNotifPanel(data.notifications));
        } else {
            dot.style.display = 'none';
        }
    } catch {
        const dot = document.querySelector('.notif-dot');
        if (dot) dot.style.display = 'none';
    }
}

// ── Notification panel ────────────────────────────────────────────────────────
function toggleNotifPanel(notifications) {
    let panel = document.getElementById('notifPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'notifPanel';
    panel.style.cssText = 'position:fixed;top:64px;right:20px;width:320px;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;overflow:hidden;';
    const header = `<div style="padding:14px 16px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border);">Notifications <span style="background:var(--accent);color:#fff;border-radius:9px;padding:1px 7px;font-size:11px;margin-left:6px;">${notifications.length}</span></div>`;
    const items = notifications.map(n => `<div style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="window.location.href='crisis_alert.html'"><div style="font-size:12px;font-weight:600;color:var(--text)">${n.title}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${n.message}</div></div>`).join('');
    const footer = `<div style="padding:10px 16px;text-align:center;"><a href="crisis_alert.html" style="font-size:12px;color:var(--accent);text-decoration:none;">View all alerts →</a></div>`;
    panel.innerHTML = header + items + footer;
    document.body.appendChild(panel);
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', handler); }
        });
    }, 100);
}

// ── Apply dark mode from localStorage ────────────────────────────────────────
function applyStoredTheme() {
    const theme = localStorage.getItem('mcTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutModal')?.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
});
document.getElementById('confirmLogoutBtn')?.addEventListener('click', async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    localStorage.removeItem('adminUser');
    window.location.href = 'signim.html';
});

// ── Nav active state ──────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// ── Review button feedback ────────────────────────────────────────────────────
document.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const orig = this.textContent;
        this.textContent = '✓ Opened';
        this.style.borderColor = 'var(--green)';
        this.style.color = 'var(--green)';
        setTimeout(() => { this.textContent = orig; this.style.borderColor = ''; this.style.color = ''; }, 1500);
    });
});

// ── Live clock ────────────────────────────────────────────────────────────────
function updateDate() {
    const el = document.querySelector('.topbar-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
updateDate();

// ── Init ──────────────────────────────────────────────────────────────────────
applyStoredTheme();

(async () => {
    const admin = await checkAdminAuth();
    if (!admin) return;

    // Dynamic greeting with doctor's real name
    const greetingEl = document.querySelector('.topbar-greeting');
    if (greetingEl) {
        const lastName  = admin.last_name  || '';
        const firstName = admin.first_name || '';
        const displayName = lastName ? `Dr. ${lastName}` : (firstName || admin.email);
        greetingEl.textContent = `${getGreeting()}, ${displayName} 👋`;
    }

    // Sidebar user name
    const nameEl = document.getElementById('admin-name');
    if (nameEl) nameEl.textContent = `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email;

    // Sidebar avatar — show profile picture if available
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) {
        if (admin.profile_picture) {
            avatarEl.innerHTML = `<img src="${admin.profile_picture}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            avatarEl.style.fontSize = '0';
        } else {
            const initials = `${(admin.first_name || '')[0] || ''}${(admin.last_name || '')[0] || ''}`.toUpperCase();
            avatarEl.textContent = initials || 'A';
        }
    }

    // Sidebar doctor display name
    const sidebarName = document.querySelector('.user-name');
    if (sidebarName) {
        const fn = admin.first_name || '';
        const ln = admin.last_name  || '';
        sidebarName.textContent = (fn || ln) ? `Dr. ${fn} ${ln}`.trim() : admin.email;
    }

    await loadStats();
    await loadNotifications();
})();
