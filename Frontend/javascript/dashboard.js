document.addEventListener('DOMContentLoaded', async function () {
    const API = window.API_BASE_URL || 'http://localhost:3000/api';

    // ── Auth guard ─────────────────────────────────────────────────────────────
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'signin.html';
        return;
    }
    const user = JSON.parse(currentUser);

    // ── Profile picture ────────────────────────────────────────────────────────
    await loadProfilePicture(API);

    // ── Greeting ───────────────────────────────────────────────────────────────
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Good day';
        if (hour < 12)      greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        else                greeting = 'Good evening';
        greetingEl.textContent = `${greeting}, ${user.first_name || user.email?.split('@')[0]}`;
    }

    // ── Current date ───────────────────────────────────────────────────────────
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // ── Dashboard data ─────────────────────────────────────────────────────────
    await loadMoodStats(API);
    await loadUpcomingBookings(API);
    await loadNotificationCount(API);
    setupNotifications(API);
});

// ── Profile picture ────────────────────────────────────────────────────────────
async function loadProfilePicture(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';
    try {
        const res  = await fetch(`${API}/settings/profile`, { method: 'GET', credentials: 'include' });
        const data = await res.json();

        if (data.success && data.user) {
            const profileImage  = document.getElementById('profileImage');
            const defaultAvatar = document.getElementById('defaultAvatar');

            if (data.user.profile_picture && data.user.profile_picture !== 'null') {
                const baseUrl = API.replace('/api', '');
                if (profileImage) {
                    profileImage.src           = `${baseUrl}${data.user.profile_picture}?t=${Date.now()}`;
                    profileImage.style.display = 'block';
                }
                if (defaultAvatar) defaultAvatar.style.display = 'none';
            } else {
                if (profileImage)  profileImage.style.display  = 'none';
                if (defaultAvatar) defaultAvatar.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Error loading profile picture:', err);
    }
}

// ── Mood stats ─────────────────────────────────────────────────────────────────
async function loadMoodStats(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';
    try {
        const res  = await fetch(`${API}/mood/stats`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.stats) {
            const el = document.getElementById('moodScore');
            if (el) el.textContent = data.stats.average ? data.stats.average.toFixed(1) : '-';
        }
    } catch (err) {
        console.error('Error loading mood stats:', err);
    }
}

// ── Upcoming bookings ──────────────────────────────────────────────────────────
async function loadUpcomingBookings(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';
    try {
        const res  = await fetch(`${API}/bookings?status=pending`, { credentials: 'include' });
        const data = await res.json();

        // Stat card count
        const countEl = document.getElementById('upcomingCount');
        if (countEl) countEl.textContent = data.bookings?.length || 0;

        const area = document.getElementById('appointmentArea');
        if (!area) return;

        if (!data.success || !data.bookings || data.bookings.length === 0) {
            area.innerHTML = `<div class="appt-empty">No upcoming appointments.</div>`;
            return;
        }

        const next     = data.bookings[0];
        const apptDate = new Date(next.appointment_date);
        const month    = apptDate.toLocaleString('en', { month: 'short' }).toUpperCase();
        const day      = apptDate.getDate();

        area.innerHTML = `
            <div class="appointment-card">
                <div class="appt-date">
                    <div class="appt-month">${month}</div>
                    <div class="appt-day">${day}</div>
                </div>
                <div class="appt-info">
                    <div class="appt-name">${escapeHtml(next.counsellor_name || 'Counsellor')}</div>
                    <div class="appt-role">${next.campus ? next.campus.toUpperCase() + ' Campus' : 'Online'}</div>
                    <div class="appt-time">• ${next.appointment_time || ''}</div>
                </div>
                ${next.meeting_link
                    ? `<button class="appt-video" onclick="window.open('${next.meeting_link}','_blank')" title="Join session">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                       </button>`
                    : ''}
            </div>
            ${data.bookings.length > 1
                ? `<p style="font-size:0.75rem;color:#6b7280;margin-top:0.5rem;text-align:center;">
                       +${data.bookings.length - 1} more upcoming
                   </p>`
                : ''}
        `;
    } catch (err) {
        console.error('Error loading bookings:', err);
        const area = document.getElementById('appointmentArea');
        if (area) area.innerHTML = `<div class="appt-empty">Could not load appointments.</div>`;
    }
}

// ── Notifications ──────────────────────────────────────────────────────────────
async function loadNotificationCount(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';
    try {
        const res   = await fetch(`${API}/notifications/unread`, { credentials: 'include' });
        const data  = await res.json();
        const badge = document.querySelector('.notif-bubble');
        if (badge) {
            badge.textContent    = data.count;
            badge.style.display  = data.count > 0 ? 'flex' : 'none';
        }
    } catch (err) {
        console.error('Notification count error:', err);
    }
}

function setupNotifications(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';

    if (!document.getElementById('notifDropdown')) {
        const dropdown = document.createElement('div');
        dropdown.id = 'notifDropdown';
        dropdown.style.cssText = `
            display:none; position:fixed; top:70px; right:20px;
            width:340px; background:white; border-radius:12px;
            box-shadow:0 8px 32px rgba(0,0,0,0.15); z-index:9999;
            border:1px solid #e2e8f0; overflow:hidden;
        `;
        dropdown.innerHTML = `
            <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9;
                        display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:15px; color:#1e1b4b;">🔔 Notifications</span>
                <button id="markAllReadBtn" style="background:none;border:none;color:#5b3ec8;
                    font-size:12px;cursor:pointer;font-weight:600;">Mark all read</button>
            </div>
            <div id="notifList" style="max-height:320px;overflow-y:auto;padding:4px 0;">
                <p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">Loading...</p>
            </div>
        `;
        document.body.appendChild(dropdown);
    }

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('notifDropdown');
            const isOpen   = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) await loadNotifications(API);
        });
    }

    document.addEventListener('click', async (e) => {
        if (e.target.id === 'markAllReadBtn') {
            await fetch(`${API}/notifications/read-all`, { method: 'PUT', credentials: 'include' });
            await loadNotifications(API);
            await loadNotificationCount(API);
        }
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifDropdown');
        const btn      = document.getElementById('notifBtn');
        if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    setInterval(() => loadNotificationCount(API), 30000);
}

async function loadNotifications(API) {
    API = API || window.API_BASE_URL || 'http://localhost:3000/api';
    const list = document.getElementById('notifList');
    if (!list) return;

    try {
        const res  = await fetch(`${API}/notifications`, { credentials: 'include' });
        const data = await res.json();

        if (!data.success || data.notifications.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <div style="font-size:32px;margin-bottom:8px;">🔔</div>
                    <p style="color:#9ca3af;font-size:13px;">No notifications yet.</p>
                    <p style="color:#c4b5fd;font-size:12px;">Admin replies to your crisis alerts will appear here.</p>
                </div>`;
            return;
        }

        list.innerHTML = data.notifications.map(n => `
            <div onclick="markNotifRead(${n.id}, this)"
                 style="padding:14px 20px;border-bottom:1px solid #f8fafc;cursor:pointer;
                        transition:background 0.2s;background:${n.is_read ? 'white' : '#f5f3ff'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                    <span style="font-weight:${n.is_read ? '500' : '700'};font-size:13px;color:#1e1b4b;">
                        ${n.title}
                    </span>
                    ${!n.is_read ? '<span style="width:8px;height:8px;border-radius:50%;background:#5b3ec8;display:inline-block;margin-top:4px;flex-shrink:0;"></span>' : ''}
                </div>
                <div style="font-size:12px;color:#555;margin-bottom:6px;line-height:1.5;">${n.message}</div>
                <div style="font-size:11px;color:#9ca3af;">
                    ${new Date(n.created_at).toLocaleDateString('en-GB', {
                        day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
                    })}
                </div>
            </div>
        `).join('');

        await loadNotificationCount(API);
    } catch (err) {
        list.innerHTML = `<p style="text-align:center;color:#dc2626;padding:20px;font-size:13px;">Failed to load notifications.</p>`;
        console.error('Load notifications error:', err);
    }
}

async function markNotifRead(id, el) {
    const API = window.API_BASE_URL || 'http://localhost:3000/api';
    try {
        await fetch(`${API}/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
        el.style.background = 'white';
        const dot = el.querySelector('span[style*="border-radius:50%"]');
        if (dot) dot.remove();
        await loadNotificationCount(API);
    } catch (err) {
        console.error('Mark read error:', err);
    }
}

// ── Shared escape helper (used in inline script too) ──────────────────────────
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
