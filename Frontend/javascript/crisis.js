// Force API to use localhost
const API = 'http://localhost:3000/api';

// Also add this for debugging
console.log('API URL:', API);

// ─── NOTIFICATION PANEL ───────────────────────────────────────────────────────

const notifBtn    = document.getElementById('notifBtn');
const notifBubble = document.querySelector('.notif-bubble');

const notifPanel = document.createElement('div');
notifPanel.id = 'notifPanel';
notifPanel.style.cssText = `
    display: none;
    position: absolute;
    top: 52px;
    right: 16px;
    width: 320px;
    background: var(--white, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.13);
    z-index: 1000;
    overflow: hidden;
`;
notifPanel.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;
                padding:14px 16px; border-bottom:1px solid var(--border,#e5e7eb);">
        <span style="font-weight:700; font-size:14px;">Notifications</span>
        <button id="markAllReadBtn" style="font-size:12px; color:#5b3ec8;
                background:none; border:none; cursor:pointer; font-weight:600;">
            Mark all read
        </button>
    </div>
    <div id="notifList" style="max-height:320px; overflow-y:auto; padding:8px 0;">
        <div style="text-align:center; padding:32px 16px; color:#aaa; font-size:13px;">
            Loading…
        </div>
    </div>
`;

const topbarRight = document.querySelector('.topbar-right');
if (topbarRight) {
    topbarRight.style.position = 'relative';
    topbarRight.appendChild(notifPanel);
}

if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifPanel.style.display === 'block';
        notifPanel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) loadNotifications();
    });
}

document.addEventListener('click', (e) => {
    if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.style.display = 'none';
    }
});

const markAllReadBtn = document.getElementById('markAllReadBtn');
if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
        await fetch(`${API}/notifications/read-all`, {
            method: 'PUT',
            credentials: 'include'
        }).catch(() => {});
        loadNotifications();
        loadUnreadCount();
    });
}

async function loadNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    try {
        const res  = await fetch(`${API}/notifications`, { credentials: 'include' });
        const data = await res.json();

        if (!data.success || !data.notifications.length) {
            list.innerHTML = `
                <div style="text-align:center; padding:32px 16px; color:#aaa; font-size:13px;">
                    No notifications yet
                </div>`;
            return;
        }

        list.innerHTML = data.notifications.map(n => `
            <div class="notif-item" data-id="${n.id}" style="
                display:flex; gap:10px; align-items:flex-start;
                padding:12px 16px; cursor:pointer;
                background:${n.is_read ? 'transparent' : 'rgba(91,62,200,0.05)'};
                border-bottom:1px solid var(--border,#f0f0f0);
                transition: background 0.15s;
            ">
                <div style="
                    width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px;
                    background:${n.is_read ? 'transparent' : '#5b3ec8'};
                "></div>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:${n.is_read ? '400' : '600'};
                                color:var(--text-dark,#1a1a2e); margin-bottom:2px;">
                        ${escapeHtml(n.title || 'Notification')}
                    </div>
                    <div style="font-size:12px; color:#666; line-height:1.4;">
                        ${escapeHtml(n.message || '')}
                    </div>
                    <div style="font-size:11px; color:#aaa; margin-top:4px;">
                        ${timeAgo(n.created_at)}
                    </div>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                await fetch(`${API}/notifications/${id}/read`, {
                    method: 'PUT',
                    credentials: 'include'
                }).catch(() => {});
                item.style.background = 'transparent';
                const dot = item.querySelector('div');
                if (dot) dot.style.background = 'transparent';
                loadUnreadCount();
            });
        });

    } catch {
        list.innerHTML = `
            <div style="text-align:center; padding:32px 16px; color:#aaa; font-size:13px;">
                Could not load notifications
            </div>`;
    }
}

async function loadUnreadCount() {
    try {
        const res  = await fetch(`${API}/notifications/unread`, { credentials: 'include' });
        const data = await res.json();
        const count = data.count || 0;
        if (notifBubble) {
            notifBubble.textContent = count;
            notifBubble.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch {
        if (notifBubble) notifBubble.style.display = 'none';
    }
}

// ─── AI CRISIS DETECTION (NEW) ────────────────────────────────────────────────

async function detectCrisis(message) {
    try {
        const res = await fetch(`${API}/ai/crisis-detect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        return data.success ? data.analysis : null;
    } catch (err) {
        console.error('Crisis detection error:', err);
        return null;
    }
}

// ─── AI RECOMMENDATIONS (NEW) ─────────────────────────────────────────────────

async function getAIRecommendations(moodScore, recentJournals = []) {
    try {
        const res = await fetch(`${API}/ai/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                mood_score: moodScore, 
                recent_journals: recentJournals 
            })
        });
        const data = await res.json();
        return data.success ? data.recommendations : null;
    } catch (err) {
        console.error('Recommendations error:', err);
        return null;
    }
}

// ─── ANONYMOUS ALERT ─────────────────────────────────────────────────────────

// ─── ANONYMOUS ALERT ─────────────────────────────────────────────────────────

const shareToggle = document.getElementById('shareToggle');
const sendAlertBtn = document.getElementById('sendAlertBtn');
const identityLabel = document.querySelector('.identity-label');
let shareDetails = false;

// Make sure the toggle button exists
if (shareToggle) {
    console.log('✅ Toggle button found');
    
    // Update toggle visual state based on shareDetails
    function updateToggleVisual() {
        if (shareDetails) {
            shareToggle.classList.add('on');
            shareToggle.setAttribute('aria-checked', 'true');
        } else {
            shareToggle.classList.remove('on');
            shareToggle.setAttribute('aria-checked', 'false');
        }
    }
    
    // Initial visual state
    updateToggleVisual();
    
    // Toggle click handler
    shareToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        shareDetails = !shareDetails;
        
        // Update visual
        updateToggleVisual();
        
        // Update labels
        if (identityLabel) {
            identityLabel.textContent = shareDetails
                ? '⚠️ YOUR DETAILS WILL BE SHARED'
                : '🔒 IDENTITY PROTECTION ACTIVE';
        }
        
        if (sendAlertBtn) {
            sendAlertBtn.textContent = shareDetails
                ? 'SEND ALERT WITH MY DETAILS'
                : 'SEND ANONYMOUS ALERT';
        }
        
        console.log('Toggle clicked, shareDetails:', shareDetails);
    });
} else {
    console.error('❌ Toggle button not found! Check ID: shareToggle');
}

// Send alert button handler
if (sendAlertBtn) {
    sendAlertBtn.addEventListener('click', async () => {
        sendAlertBtn.disabled = true;
        const originalText = sendAlertBtn.textContent;
        sendAlertBtn.textContent = 'SENDING...';
        
        try {
            const response = await fetch(`${API}/crisis/anonymous-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    severity: 'high', 
                    share_details: shareDetails 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('⚠️ Alert sent. The Wellness Centre has been notified.', 'success');
                // Optional: Reset toggle after successful send
                if (shareDetails) {
                    shareDetails = false;
                    updateToggleVisual();
                    if (identityLabel) identityLabel.textContent = '🔒 IDENTITY PROTECTION ACTIVE';
                    sendAlertBtn.textContent = '🕊️ SEND ANONYMOUS ALERT';
                }
            } else {
                showToast(data.message || 'Failed to send alert. Please call directly.', 'error');
            }
        } catch (error) {
            console.error('Alert error:', error);
            showToast('Network error. Please call the crisis line directly.', 'error');
        } finally {
            sendAlertBtn.disabled = false;
            sendAlertBtn.textContent = originalText;
        }
    });
}

// ─── NEED IMMEDIATE HELP FAB ─────────────────────────────────────────────────

const needHelpFab = document.getElementById('needHelpFab');
if (needHelpFab) {
    needHelpFab.addEventListener('click', () => {
        window.location.href = 'tel:0800567567';
    });
}

// ─── BREATHING EXERCISE ──────────────────────────────────────────────────────

const breathingBtn = document.querySelector('.breathing-btn');
if (breathingBtn) {
    breathingBtn.addEventListener('click', () => {
        showBreathingModal();
    });
}

function showBreathingModal() {
    const existing = document.getElementById('breathingModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'breathingModal';
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6);
        display:flex; align-items:center; justify-content:center;
        z-index:9999; padding:20px;
    `;
    modal.innerHTML = `
        <div style="background:#fff; border-radius:20px; padding:40px 32px;
                    max-width:380px; width:100%; text-align:center; position:relative;">
            <button id="closeBreathingBtn" style="position:absolute; top:14px; right:18px;
                background:none; border:none; font-size:22px; cursor:pointer; color:#888;">&times;</button>
            <h3 style="font-size:18px; font-weight:700; margin-bottom:8px; color:#1a1a2e;">
                Box Breathing
            </h3>
            <p style="font-size:13px; color:#888; margin-bottom:28px;">
                Inhale · Hold · Exhale · Hold — 4 seconds each
            </p>
            <div id="breathCircle" style="
                width:120px; height:120px; border-radius:50%;
                background:rgba(91,62,200,0.12); border:3px solid #5b3ec8;
                margin:0 auto 20px; display:flex; align-items:center; justify-content:center;
                font-size:15px; font-weight:600; color:#5b3ec8;
                transition: transform 4s ease-in-out;
            ">Inhale</div>
            <div id="breathPhase" style="font-size:20px; font-weight:700; color:#5b3ec8; margin-bottom:6px;">
                Inhale
            </div>
            <div id="breathCount" style="font-size:36px; font-weight:800; color:#1a1a2e;">4</div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('closeBreathingBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearInterval(timer);
            modal.remove();
        });
    }
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { clearInterval(timer); modal.remove(); }
    });

    const phases = [
        { label: 'Inhale',  scale: '1.35', seconds: 4 },
        { label: 'Hold',    scale: '1.35', seconds: 4 },
        { label: 'Exhale',  scale: '1',    seconds: 4 },
        { label: 'Hold',    scale: '1',    seconds: 4 },
    ];
    let phaseIdx = 0, remaining = 4;
    const circle  = document.getElementById('breathCircle');
    const phaseEl = document.getElementById('breathPhase');
    const countEl = document.getElementById('breathCount');

    function applyPhase() {
        const p = phases[phaseIdx];
        if (circle) circle.style.transform = `scale(${p.scale})`;
        if (circle) circle.textContent = p.label;
        if (phaseEl) phaseEl.textContent = p.label;
        remaining = p.seconds;
        if (countEl) countEl.textContent = remaining;
    }
    applyPhase();

    const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            phaseIdx = (phaseIdx + 1) % phases.length;
            applyPhase();
        } else {
            if (countEl) countEl.textContent = remaining;
        }
    }, 1000);
}

// ─── AI CHAT (FIXED - Uses your backend server) ───────────────────────────────

const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSendBtn  = document.getElementById('chatSendBtn');
const typingRow    = document.getElementById('typingRow');

const chatHistory = [];

if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendChatMessage);
}
if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendChatMessage(); 
        }
    });
}

async function sendChatMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    if (chatSendBtn) chatSendBtn.disabled = true;

    appendMessage(text, 'user');
    chatHistory.push({ role: 'user', content: text });

    // Check for crisis keywords using AI
    const crisisAnalysis = await detectCrisis(text);
    if (crisisAnalysis && crisisAnalysis.is_crisis && crisisAnalysis.severity === 'high') {
        appendMessage("I notice you're going through a very difficult time. Please reach out for immediate support:\n\n🇿🇦 South Africa Crisis Line: 0800 567 567\nSuicide Crisis Helpline: 0800 567 567\n\nWould you like me to help you find additional resources?", 'ai');
        if (typingRow) typingRow.style.display = 'none';
        if (chatSendBtn) chatSendBtn.disabled = false;
        return;
    }

    if (typingRow) typingRow.style.display = 'flex';
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const res = await fetch(`${API}/ai-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                message: text,
                history: chatHistory.slice(-10)
            })
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        const reply = data.reply || "I'm here with you. Would you like to talk more about what you're feeling?";

        chatHistory.push({ role: 'assistant', content: reply });
        if (typingRow) typingRow.style.display = 'none';
        appendMessage(reply, 'ai');

    } catch (err) {
        console.error('Chat error:', err);
        if (typingRow) typingRow.style.display = 'none';
        appendMessage("Something went wrong connecting to the AI. Please try again in a moment.", 'ai');
    }

    if (chatSendBtn) chatSendBtn.disabled = false;
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendMessage(text, role) {
    const isAi = role === 'ai';
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    row.innerHTML = isAi ? `
        <div class="msg-avatar ai-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
        </div>
        <div class="msg-bubble ai-bubble">${escapeHtml(text)}</div>
    ` : `
        <div class="msg-bubble user-bubble">${escapeHtml(text)}</div>
        <div class="msg-avatar user-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
        </div>
    `;
    if (chatMessages) {
        chatMessages.insertBefore(row, typingRow);
    }
}

// ─── LOAD MOOD FOR RECOMMENDATIONS (OPTIONAL) ─────────────────────────────────

async function loadRecentMood() {
    try {
        const res = await fetch(`${API}/mood?limit=1`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.logs && data.logs.length > 0) {
            const recentMood = data.logs[0].mood_score;
            const recommendations = await getAIRecommendations(recentMood);
            if (recommendations && recommendations.activities) {
                displayRecommendations(recommendations);
            }
        }
    } catch (err) {
        console.error('Could not load mood:', err);
    }
}

function displayRecommendations(recommendations) {
    const recContainer = document.getElementById('recommendationsContainer');
    if (!recContainer) return;
    
    if (recommendations.activities && recommendations.activities.length > 0) {
        recContainer.innerHTML = `
            <div style="margin-top: 16px; padding: 12px; background: var(--purple-xlight, #f7f4ff); border-radius: 12px;">
                <p style="font-size: 12px; font-weight: 600; color: var(--purple-sidebar-active, #5b3ec8); margin-bottom: 8px;">
                    ✨ Recommended for you
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${recommendations.activities.slice(0, 2).map(activity => `
                        <div style="font-size: 13px; color: var(--text-dark, #1a1a2e);">
                            <strong>${escapeHtml(activity.title)}</strong><br>
                            <span style="font-size: 12px; color: var(--text-mid, #666);">${escapeHtml(activity.description)}</span>
                        </div>
                    `).join('')}
                </div>
                ${recommendations.affirmation ? `
                    <p style="font-size: 13px; font-style: italic; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border, #e5e7eb);">
                        💭 ${escapeHtml(recommendations.affirmation)}
                    </p>
                ` : ''}
            </div>
        `;
    }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
        position:fixed; bottom:24px; right:24px; z-index:9999;
        background:${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#5b3ec8'};
        color:#fff; padding:12px 20px; border-radius:10px;
        font-size:14px; font-weight:500; box-shadow:0 4px 16px rgba(0,0,0,0.18);
        animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ─── INIT ────────────────────────────────────────────────────────────────────

if (typingRow) typingRow.style.display = 'none';
loadUnreadCount();
loadRecentMood(); // Load AI recommendations based on recent mood