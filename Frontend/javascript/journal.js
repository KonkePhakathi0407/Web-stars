const API = 'http://localhost:3000/api';

// ✅ CORRECT: Verify with backend
async function checkAuthentication() {
    try {
        const response = await fetch(`${API}/auth/me`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'  // Sends the session cookie
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
            // Update localStorage to match server state
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return true;
        } else {
            // Not authenticated - clear localStorage and redirect
            localStorage.removeItem('currentUser');
            window.location.href = 'signin.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'signin.html';
        return false;
    }
}

// Call this at the start of your page
checkAuthentication();

// ─── SVG Icon helpers ────────────────────────────────────────────────────────

const MOOD_ICONS = {
    excellent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Excellent"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    good:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Good"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    okay:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Okay"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    low:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Low"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    struggling:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Struggling"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-3-4-3-4 3-4 3"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="12" y1="5" x2="12" y2="7"/></svg>`,
    happy:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Happy"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    sad:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Sad"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    anxious:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Anxious"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-1 4-1 4 1 4 1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M12 5v2"/></svg>`,
    calm:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Calm"><circle cx="12" cy="12" r="10"/><path d="M9 12h6"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
};

const TOAST_ICONS = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#c8002b' : '#5b3ec8'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'DM Sans', sans-serif;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3000);
}

// Add animation styles once
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0);    opacity: 1; }
            to   { transform: translateX(100%); opacity: 0; }
        }
        .toast-content { display: flex; align-items: center; gap: 8px; }
        .toast-icon    { display: flex; align-items: center; flex-shrink: 0; }
    `;
    document.head.appendChild(style);
}

// ─── Journal entries ─────────────────────────────────────────────────────────

async function loadJournalEntries() {
    const container = document.getElementById('journalHistory');
    container.innerHTML = '<div class="loading">Loading your entries...</div>';

    try {
        const response = await fetch(`${API}/journal`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success && data.entries && data.entries.length > 0) {
            displayEntries(data.entries);
        } else {
            container.innerHTML = '<div class="empty-state">No journal entries yet.<br>Write your first entry above!</div>';
        }
    } catch (error) {
        console.error('Error loading entries:', error);
        container.innerHTML = '<div class="empty-state">Error loading entries. Make sure backend is running.</div>';
        showToast('Failed to load journal entries', 'error');
    }
}

function getMoodIcon(mood) {
    return MOOD_ICONS[mood] || MOOD_ICONS.okay;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayEntries(entries) {
    const container = document.getElementById('journalHistory');

    if (!entries || entries.length === 0) {
        container.innerHTML = '<div class="empty-state">No journal entries yet.<br>Write your first entry above!</div>';
        return;
    }

    container.innerHTML = entries.map(entry => `
        <div class="journal-entry-item" onclick="viewEntry(${entry.id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="entry-date">${new Date(entry.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
                <div class="entry-mood">${getMoodIcon(entry.mood)}</div>
            </div>
            <div class="entry-preview">${escapeHtml(entry.excerpt || entry.content?.substring(0, 150) || 'No content')}${(entry.excerpt?.length >= 200 || entry.content?.length >= 150) ? '...' : ''}</div>
            <div class="entry-word-count">${entry.word_count || 0} words</div>
        </div>
    `).join('');
}

// ─── Save entry ──────────────────────────────────────────────────────────────

const saveBtn = document.getElementById('saveEntryBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const content = document.getElementById('journalContent').value.trim();
        const selectedMoodBtn = document.querySelector('.mood-emoji-btn.selected');
        const mood = selectedMoodBtn ? selectedMoodBtn.dataset.mood : 'okay';

        if (!content) {
            showToast('Please write something before saving.', 'error');
            return;
        }

        const btn = document.getElementById('saveEntryBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'SAVING...';

        try {
            const response = await fetch(`${API}/journal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mood, content })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Journal entry saved successfully!', 'success');
                document.getElementById('journalContent').value = '';
                document.getElementById('wordCount').textContent = '0 words';
                await loadJournalEntries();
                await loadStreak();
            } else {
                showToast(data.message || 'Failed to save journal entry', 'error');
            }
        } catch (error) {
            console.error('Error saving:', error);
            showToast('Connection error. Make sure backend is running on port 3000', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// ─── Word count ──────────────────────────────────────────────────────────────

const journalContent = document.getElementById('journalContent');
if (journalContent) {
    journalContent.addEventListener('input', function () {
        const words = this.value.trim().length > 0
            ? this.value.trim().split(/\s+/).filter(Boolean).length
            : 0;
        const wordCountEl = document.getElementById('wordCount');
        if (wordCountEl) {
            wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        }
    });
}

// ─── Mood selector ───────────────────────────────────────────────────────────

document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
    });
});

// Select default mood
const defaultMood = document.querySelector('.mood-emoji-btn[data-mood="okay"]');
if (defaultMood) defaultMood.classList.add('selected');

// ─── Streak ──────────────────────────────────────────────────────────────────

async function loadStreak() {
    try {
        const response = await fetch(`${API}/journal/streak`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await response.json();

        const streakNumber = document.getElementById('streakNumber');
        if (streakNumber) {
            streakNumber.textContent = (data.success && data.streak) ? data.streak : '0';
        }
    } catch (error) {
        console.error('Error loading streak:', error);
        const streakNumber = document.getElementById('streakNumber');
        if (streakNumber) streakNumber.textContent = '0';
    }
}

// ─── View entry ──────────────────────────────────────────────────────────────

function viewEntry(id) {
    showToast(`View entry #${id} — Full entry view coming soon!`, 'info');
}
window.viewEntry = viewEntry;

// ─── Backend health check ─────────────────────────────────────────────────────

async function checkBackend() {
    try {
        const response = await fetch(`${API}/health`);
        await response.json();
        return true;
    } catch {
        return false;
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
    const backendRunning = await checkBackend();
    if (!backendRunning) {
        const historyContainer = document.getElementById('journalHistory');
        if (historyContainer) {
            historyContainer.innerHTML = '<div class="empty-state">Backend not running. Please start the server on port 3000.</div>';
        }
        showToast('Backend not running. Please start the server.', 'error');
        return;
    }

    await loadJournalEntries();
    await loadStreak();
}

init();