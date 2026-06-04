/* ══════════════════════════════════════════════════════════════
   MindCare Hub – Crisis Alerts  |  crisis_alert.js
   Loads REAL alerts from the database
   ══════════════════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api/admin';

// ── Live alerts from DB ───────────────────────────────────────────────────────
let alerts = [];
let selectedId    = null;
let activeFilter  = 'all';
let severityFilter = 'all';
let searchQuery   = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tbody         = document.getElementById('alertsTableBody');
const detailEmpty   = document.getElementById('detailEmpty');
const detailContent = document.getElementById('detailContent');
const detailHeader  = document.getElementById('detailHeader');
const detailRef     = document.getElementById('detailRef');
const detailSevBadge = document.getElementById('detailSeverityBadge');
const keywordTags   = document.getElementById('keywordTags');
const contextText   = document.getElementById('contextText');
const staffNotes    = document.getElementById('staffNotes');
const detailAssign  = document.getElementById('detailAssign');
const assignName    = document.getElementById('assignName');
const toastEl       = document.getElementById('toast');

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyStoredTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('mcTheme') || 'light');
}

// ── Auth + init ───────────────────────────────────────────────────────────────
async function initPage() {
    try {
        const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) { window.location.href = 'signim.html'; return; }
        const admin = data.admin;

        // Sidebar name / avatar
        const sidebarName = document.querySelector('.user-name');
        if (sidebarName) sidebarName.textContent = (admin.first_name || admin.last_name)
            ? `Dr. ${(admin.first_name || '')} ${(admin.last_name || '')}`.trim()
            : admin.email;

        const avatarEl = document.querySelector('.user-avatar');
        if (avatarEl) {
            avatarEl.textContent = `${(admin.first_name || '')[0] || ''}${(admin.last_name || '')[0] || ''}`.toUpperCase() || 'A';
        }

        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = `Dr. ${admin.last_name || admin.first_name || admin.email}`;

        await loadNotifications();
        await loadAlerts();

        // Auto-refresh every 30 s
        setInterval(loadAlerts, 30000);

    } catch (err) {
        console.error('Init error:', err);
        window.location.href = 'signim.html';
    }
}

// ── Load alerts from API ──────────────────────────────────────────────────────
async function loadAlerts() {
    try {
        showTableLoading();
        const res  = await fetch(`${API}/crisis`, { credentials: 'include' });
        const data = await res.json();

        if (!data.success) {
            showTableError('Failed to load alerts');
            return;
        }

        // Map DB rows → display objects
        alerts = (data.alerts || []).map(a => ({
            id:          a.id,
            ref:         `MC-${a.id}`,
            severity:    a.severity || 'high',
            received:    formatTime(a.received_at),
            university:  a.university || (a.share_details ? 'Shared' : 'Anonymous'),
            type:        a.message ? a.message.substring(0, 40) + '…' : 'Crisis Alert',
            status:      a.status || 'open',
            context:     a.message || 'No message provided.',
            location:    a.location || 'Not specified',
            shareDetails: a.share_details,
            userName:    a.share_details && a.first_name ? `${a.first_name} ${a.last_name || ''}`.trim() : 'Anonymous',
            userEmail:   a.share_details ? a.email : null,
            adminResponse: a.admin_response || '',
            respondedAt: a.responded_at,
            _raw:        a
        }));

        updateCounts(data.counts);
        renderTable();

        if (alerts.length > 0 && !selectedId) {
            setTimeout(() => selectAlert(alerts[0].id), 100);
        }

    } catch (err) {
        console.error('Load alerts error:', err);
        showTableError('Network error loading alerts');
    }
}

function showTableLoading() {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);font-size:12px;">Loading alerts…</td></tr>`;
}

function showTableError(msg) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#e53e3e;font-size:12px;">${msg}</td></tr>`;
}

function updateCounts(counts) {
    if (!counts) return;
    const openTab = document.querySelector('[data-filter="open"]');
    if (openTab) openTab.textContent = `Open (${counts.open_count || 0})`;
    const resolvedTab = document.querySelector('[data-filter="resolved"]');
    if (resolvedTab) resolvedTab.textContent = `Resolved (${counts.resolved_count || 0})`;
}

// ── Render table ──────────────────────────────────────────────────────────────
function getFilteredAlerts() {
    return alerts.filter(a => {
        const tabOk  = activeFilter === 'all' || a.status === activeFilter;
        const sevOk  = severityFilter === 'all' || a.severity === severityFilter;
        const srchOk = !searchQuery
            || a.university.toLowerCase().includes(searchQuery)
            || a.type.toLowerCase().includes(searchQuery)
            || String(a.ref).toLowerCase().includes(searchQuery)
            || a.context.toLowerCase().includes(searchQuery);
        return tabOk && sevOk && srchOk;
    });
}

function renderTable() {
    if (!tbody) return;
    const filtered = getFilteredAlerts();
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);font-size:12px;">
            ${alerts.length === 0 ? 'No crisis alerts yet. Alerts from users will appear here.' : 'No alerts match the current filters.'}
        </td>`;
        tbody.appendChild(tr);
        return;
    }

    filtered.forEach((alert, i) => {
        const tr = document.createElement('tr');
        tr.dataset.id = alert.id;
        tr.style.animationDelay = `${i * 40}ms`;
        if (alert.id === selectedId) tr.classList.add('selected');

        tr.innerHTML = `
            <td><div class="severity-cell">
                <span class="sev-dot ${alert.severity}"></span>
                <span class="sev-label ${alert.severity}">${cap(alert.severity)}</span>
            </div></td>
            <td class="time-cell">${alert.received}</td>
            <td class="uni-cell">${escapeHtml(alert.university)}</td>
            <td class="type-cell">${escapeHtml(alert.type)}</td>
            <td><span class="kw-tag">${alert.shareDetails ? 'identified' : 'anonymous'}</span></td>
            <td><span class="status-badge ${alert.status}">${statusLabel(alert.status)}</span></td>
        `;
        tr.addEventListener('click', () => selectAlert(alert.id));
        tbody.appendChild(tr);
    });
}

// ── Select alert → show detail panel ─────────────────────────────────────────
function selectAlert(id) {
    selectedId = id;
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    document.querySelectorAll('.alerts-table tbody tr').forEach(tr =>
        tr.classList.toggle('selected', Number(tr.dataset.id) === id)
    );

    if (detailEmpty)   detailEmpty.style.display   = 'none';
    if (detailContent) detailContent.style.display = 'flex';
    if (detailHeader)  detailHeader.className = `detail-header sev-${alert.severity}`;
    if (detailSevBadge) detailSevBadge.textContent = `${cap(alert.severity)} Severity`;
    if (detailRef)     detailRef.textContent = `REF: ${alert.ref} · ${alert.received}`;

    // Keywords / tags
    if (keywordTags) {
        const tags = [];
        if (alert.severity === 'high') tags.push({ label: 'High Priority', cls: 'red' });
        if (!alert.shareDetails)       tags.push({ label: 'Anonymous', cls: 'purple' });
        if (alert.shareDetails)        tags.push({ label: 'Identified Student', cls: 'amber' });
        if (alert.location && alert.location !== 'Not specified') tags.push({ label: alert.location, cls: '' });
        keywordTags.innerHTML = tags.map(t => `<span class="kw-detail-tag ${t.cls}">${t.label}</span>`).join('');
    }

    // Context / message
    if (contextText) {
        let html = `<strong>Message:</strong> ${escapeHtml(alert.context)}`;
        if (alert.shareDetails && alert.userName !== 'Anonymous') {
            html += `<br><br><strong>Student:</strong> ${escapeHtml(alert.userName)}`;
            if (alert.userEmail) html += ` (${escapeHtml(alert.userEmail)})`;
        }
        if (alert.adminResponse) {
            html += `<br><br><strong>Previous Response:</strong> ${escapeHtml(alert.adminResponse)}`;
        }
        contextText.innerHTML = html;
    }

    if (staffNotes) staffNotes.value = alert.adminResponse || '';
    if (assignName) assignName.textContent = 'Wellness Team';
    const assignAvatar = document.querySelector('.assign-avatar');
    if (assignAvatar) assignAvatar.textContent = 'W';
}

// ── Action buttons ────────────────────────────────────────────────────────────
async function updateAlert(status, showMsg) {
    if (!selectedId) return;
    const notes = staffNotes ? staffNotes.value.trim() : '';

    try {
        const res = await fetch(`${API}/crisis/${selectedId}`, {
            method: 'POST',   // server.js routes PUT under isAdminAuthenticated
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status, admin_response: notes || undefined })
        });

        // Try PUT if POST 404s
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            const res2 = await fetch(`${API}/crisis/${selectedId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status, admin_response: notes || undefined })
            });
            const data2 = await res2.json().catch(() => ({}));
            if (!data2.success) throw new Error(data2.message || 'Update failed');
        }

        showToast(showMsg, status === 'resolved' ? 'green' : 'purple');
        await loadAlerts();

        if (status === 'resolved') {
            if (detailEmpty)   detailEmpty.style.display   = 'flex';
            if (detailContent) detailContent.style.display = 'none';
            selectedId = null;
        }
    } catch (err) {
        console.error('Update error:', err);
        showToast('Failed to update alert: ' + err.message, 'red');
    }
}

const markProgressBtn = document.getElementById('markProgressBtn');
const resolveBtn      = document.getElementById('resolveBtn');
const escalateBtn     = document.getElementById('escalateBtn');

if (markProgressBtn) markProgressBtn.addEventListener('click', () => updateAlert('in_progress', 'Marked In Progress'));
if (resolveBtn)      resolveBtn.addEventListener('click',      () => updateAlert('resolved',    'Alert Resolved ✓'));
if (escalateBtn)     escalateBtn.addEventListener('click', async () => {
    if (!selectedId) return;
    await updateAlert('open', 'Escalated to Senior Responder');
    showToast('Escalated to Senior Responder', 'red');
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        activeFilter = this.dataset.filter;
        renderTable();
    });
});

// ── Filters ───────────────────────────────────────────────────────────────────
const sevFilterEl = document.getElementById('severityFilter');
const uniFilterEl = document.getElementById('universityFilter');
if (sevFilterEl) sevFilterEl.addEventListener('change', function () { severityFilter = this.value; renderTable(); });
if (uniFilterEl) uniFilterEl.addEventListener('change', function () { renderTable(); });

// ── Search ────────────────────────────────────────────────────────────────────
const searchInput = document.querySelector('.topbar-search input');
if (searchInput) {
    searchInput.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
        renderTable();
    });
}

// ── Notifications ─────────────────────────────────────────────────────────────
async function loadNotifications() {
    try {
        const res  = await fetch(`${API}/admins/me/notifications`, { credentials: 'include' });
        const data = await res.json();
        const dot  = document.querySelector('.notif-dot');
        if (!dot) return;
        if (data.success && data.count > 0) {
            dot.style.display = 'block';
        } else {
            dot.style.display = 'none';
        }
    } catch {
        const dot = document.querySelector('.notif-dot');
        if (dot) dot.style.display = 'none';
    }
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSendBtn  = document.getElementById('chatSendBtn');
const typingRow    = document.getElementById('typingRow');
const chatHistory  = [];

if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
if (chatInput)   chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

async function sendChatMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    if (chatSendBtn) chatSendBtn.disabled = true;
    appendMessage(text, 'user');
    chatHistory.push({ role: 'user', content: text });
    if (typingRow) { typingRow.style.display = 'flex'; chatMessages.scrollTop = chatMessages.scrollHeight; }

    try {
        const res  = await fetch('http://localhost:3000/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message: text, history: chatHistory.slice(-10) })
        });
        const data = await res.json();
        const reply = data.reply || "I'm here with you. Would you like to talk more?";
        chatHistory.push({ role: 'assistant', content: reply });
        if (typingRow) typingRow.style.display = 'none';
        appendMessage(reply, 'ai');
    } catch {
        if (typingRow) typingRow.style.display = 'none';
        appendMessage('Something went wrong. Please try again.', 'ai');
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(text, role) {
    if (!chatMessages) return;
    const isAi = role === 'ai';
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    row.innerHTML = isAi
        ? `<div class="msg-avatar ai-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><div class="msg-bubble ai-bubble">${escapeHtml(text)}</div>`
        : `<div class="msg-bubble user-bubble">${escapeHtml(text)}</div><div class="msg-avatar user-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`;
    chatMessages.insertBefore(row, typingRow);
}

// ── Logout ────────────────────────────────────────────────────────────────────
const logoutModal   = document.getElementById('logoutModal');
const logoutTrigger = document.getElementById('logoutTrigger');
const cancelLogout  = document.getElementById('cancelLogout');
if (logoutTrigger) logoutTrigger.addEventListener('click', () => logoutModal?.classList.add('show'));
if (cancelLogout)  cancelLogout.addEventListener('click',  () => logoutModal?.classList.remove('show'));
if (logoutModal)   logoutModal.addEventListener('click', e => { if (e.target === logoutModal) logoutModal.classList.remove('show'); });
const logoutConfirm = document.querySelector('.btn-logout-confirm');
if (logoutConfirm) logoutConfirm.addEventListener('click', async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    showToast('Logging out…', 'red');
    setTimeout(() => window.location.href = 'signim.html', 1500);
});

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className   = `toast show ${type}`;
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cap(str)        { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statusLabel(s)  {
    return ({ open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', open_count: 'Open' }[s] || cap(s));
}
function formatTime(ts) {
    if (!ts) return '—';
    const d    = new Date(ts);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
applyStoredTheme();
initPage();

