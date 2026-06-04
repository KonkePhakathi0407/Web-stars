/* ══════════════════════════════════════
   MindCare Hub – Settings JS (fully wired)
   ══════════════════════════════════════ */
const API = 'http://localhost:3000/api/admin';

// ── Apply dark mode immediately ───────────────────────────────────────────────
function applyStoredTheme() {
    const theme = localStorage.getItem('mcTheme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    // Sync radio buttons
    const radio = document.querySelector(`.theme-card input[value="${theme}"]`);
    if (radio) radio.checked = true;
}
applyStoredTheme();

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "") {
    clearTimeout(toastTimer);
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = `toast show ${type}`;
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add("show");    }
function closeModal(id) { document.getElementById(id).classList.remove("show"); }
["saveModal","resetPwModal","revokeModal","deactivateModal","logoutModal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", e => { if (e.target === el) closeModal(id); });
});

// ── AUTH + POPULATE PROFILE ───────────────────────────────────────────────────
async function initSettingsPage() {
    try {
        const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) { window.location.href = 'signim.html'; return; }
        const admin = data.admin;

        // Populate form fields
        const fn = document.getElementById('firstNameInput');
        const ln = document.getElementById('lastNameInput');
        const em = document.getElementById('emailAddr');
        if (fn) fn.value = admin.first_name || '';
        if (ln) ln.value = admin.last_name  || '';
        if (em) em.value = admin.email      || '';

        // Profile name display
        const profileNameEl = document.querySelector('.profile-name');
        if (profileNameEl) profileNameEl.textContent = `Dr. ${admin.first_name||''} ${admin.last_name||''}`.trim() || admin.email;

        // Sidebar
        const sidebarName = document.querySelector('.user-name');
        if (sidebarName) sidebarName.textContent = (admin.first_name||admin.last_name) ? `Dr. ${admin.first_name||''} ${admin.last_name||''}`.trim() : admin.email;

        // Profile picture
        if (admin.profile_picture) {
            setProfilePicture(admin.profile_picture);
        }

        // 2FA toggle
        const twoFAToggle = document.getElementById('twoFAToggle');
        if (twoFAToggle && admin.two_factor_enabled !== undefined) {
            twoFAToggle.checked = !!admin.two_factor_enabled;
        }

        // Load sessions
        await loadSessions();

    } catch { window.location.href = 'signim.html'; }
}

// ── THEME SELECTION (persists across ALL pages) ───────────────────────────────
document.querySelectorAll('.theme-card input[type="radio"]').forEach(radio => {
    radio.addEventListener("change", function () {
        const theme = this.value;
        localStorage.setItem('mcTheme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        const labels = { light: "Light Mode", dark: "Dark Mode", system: "System Default" };
        showToast(`Theme set to ${labels[theme]}`, "purple");
    });
});

// ── PROFILE PHOTO UPLOAD ──────────────────────────────────────────────────────
function setProfilePicture(dataUri) {
    const pic = document.getElementById("profilePic");
    if (!pic) return;
    pic.style.fontSize = "0";
    pic.innerHTML = `<img src="${dataUri}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    // Also update sidebar avatar
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) {
        avatarEl.innerHTML = `<img src="${dataUri}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        avatarEl.style.fontSize = '0';
    }
}

document.getElementById("changePhotoBtn").addEventListener("click", () => {
    document.getElementById("photoInput").click();
});
document.getElementById("photoInput").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUri = e.target.result;
        setProfilePicture(dataUri);
        try {
            const res  = await fetch(`${API}/admins/me/profile-picture`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: dataUri })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Profile photo saved ✓", "green");
            } else {
                showToast(data.message || "Failed to save photo", "red");
            }
        } catch {
            showToast("Network error — photo not saved", "red");
        }
    };
    reader.readAsDataURL(file);
});

// ── SAVE PROFILE (name + email) ───────────────────────────────────────────────
document.getElementById("saveChangesBtn").addEventListener("click", () => openModal("saveModal"));
document.getElementById("cancelSave").addEventListener("click",    () => closeModal("saveModal"));
document.getElementById("confirmSave").addEventListener("click", async () => {
    closeModal("saveModal");
    const fn = document.getElementById('firstNameInput')?.value.trim();
    const ln = document.getElementById('lastNameInput')?.value.trim();
    const em = document.getElementById('emailAddr')?.value.trim();
    if (!fn || !ln || !em) { showToast("Please fill in all required fields.", "red"); return; }
    try {
        const res  = await fetch(`${API}/admins/me/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: fn, last_name: ln, email: em })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Settings saved successfully ✓", "green");
            // Update displayed name
            const pn = document.querySelector('.profile-name');
            if (pn) pn.textContent = `Dr. ${fn} ${ln}`;
            const sn = document.querySelector('.user-name');
            if (sn) sn.textContent = `Dr. ${fn} ${ln}`;
        } else {
            showToast(data.message || "Failed to save", "red");
        }
    } catch {
        showToast("Network error — changes not saved", "red");
    }
});

// ── LOGO UPLOAD (local preview only) ─────────────────────────────────────────
document.getElementById("uploadLogoBtn").addEventListener("click", () => {
    document.getElementById("logoFileInput").click();
});
document.getElementById("logoFileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("logoPreview");
        preview.innerHTML = `<img src="${e.target.result}" alt="Logo" />`;
        showToast("Logo uploaded — click Save Changes to apply.", "purple");
    };
    reader.readAsDataURL(file);
});

// ── RESET PASSWORD (current + new) ───────────────────────────────────────────
document.getElementById("resetPwBtn").addEventListener("click",    () => openModal("resetPwModal"));
document.getElementById("closeResetPw").addEventListener("click",  () => closeModal("resetPwModal"));
document.getElementById("cancelResetPw").addEventListener("click", () => closeModal("resetPwModal"));

document.getElementById("newPwInput").addEventListener("input", function () {
    const val = this.value;
    let strength = 0;
    if (val.length >= 8)              strength++;
    if (/[A-Z]/.test(val))           strength++;
    if (/[0-9]/.test(val))           strength++;
    if (/[^A-Za-z0-9]/.test(val))   strength++;
    const pct    = [0, 25, 50, 75, 100][strength];
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#DC2626", "#D97706", "#2563EB", "#059669"];
    const bar = document.getElementById("pwStrengthBar");
    bar.style.setProperty("--strength", pct + "%");
    bar.style.setProperty("--strength-color", colors[strength]);
    document.getElementById("pwStrengthLabel").textContent = labels[strength];
    document.getElementById("pwStrengthLabel").style.color  = colors[strength];
});

document.getElementById("confirmResetPw").addEventListener("click", async () => {
    const cp = document.getElementById("currentPwInput")?.value  || '';
    const np = document.getElementById("newPwInput").value;
    const rp = document.getElementById("confirmPwInput").value;
    if (!cp) { showToast("Please enter your current password.", "red"); return; }
    if (!np)  { showToast("Please enter a new password.", "red"); return; }
    if (np !== rp) { showToast("Passwords do not match.", "red"); return; }
    if (np.length < 8) { showToast("Password must be at least 8 characters.", "red"); return; }
    try {
        const res  = await fetch(`${API}/admins/me/change-password`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: cp, new_password: np })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("resetPwModal");
            showToast("Password updated successfully ✓", "green");
            document.getElementById("currentPwInput") && (document.getElementById("currentPwInput").value = '');
            document.getElementById("newPwInput").value     = '';
            document.getElementById("confirmPwInput").value = '';
        } else {
            showToast(data.message || "Failed to update password", "red");
        }
    } catch {
        showToast("Network error — password not changed", "red");
    }
});

// ── 2FA TOGGLE ────────────────────────────────────────────────────────────────
document.getElementById("twoFAToggle").addEventListener("change", async function () {
    const enabled = this.checked;
    try {
        const res  = await fetch(`${API}/admins/me/two-factor`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Two-Factor Authentication ${enabled ? "enabled" : "disabled"}`, enabled ? "green" : "red");
        } else {
            this.checked = !enabled; // revert
            showToast(data.message || "Failed to update 2FA", "red");
        }
    } catch {
        this.checked = !enabled;
        showToast("Network error — 2FA not updated", "red");
    }
});

// ── SESSIONS ─────────────────────────────────────────────────────────────────
async function loadSessions() {
    try {
        const res  = await fetch(`${API}/admins/me/sessions`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;
        const container = document.querySelector('.sessions-block');
        if (!container) return;

        const label = container.querySelector('.sessions-label');
        // Remove existing session items
        container.querySelectorAll('.session-item').forEach(el => el.remove());

        data.sessions.forEach(session => {
            const div = document.createElement('div');
            div.className = 'session-item';
            div.dataset.sessionId = session.id;
            const deviceIcon = session.device_type === 'Web'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
            const isCurrent = session.is_current;
            div.innerHTML = `
                <div class="session-device-icon">${deviceIcon}</div>
                <div class="session-info">
                    <div class="session-name">${session.browser || 'Unknown Device'} • ${session.device_type || 'Web'} ${isCurrent ? '<span style="font-size:10px;background:var(--green);color:#fff;border-radius:6px;padding:1px 6px;margin-left:4px;">Current</span>' : ''}</div>
                    <div class="session-meta">IP: ${session.ip_address || 'Unknown'}</div>
                </div>
                ${!isCurrent ? `<button class="revoke-btn" data-id="${session.id}">Revoke</button>` : ''}
            `;
            container.appendChild(div);
        });

        // Attach revoke handlers
        container.querySelectorAll('.revoke-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pendingRevokeId = btn.dataset.id;
                openModal('revokeModal');
            });
        });

    } catch { /* sessions table may not exist yet */ }
}

let pendingRevokeId = null;

document.getElementById("cancelRevoke").addEventListener("click", () => {
    pendingRevokeId = null;
    closeModal("revokeModal");
});
document.getElementById("confirmRevoke").addEventListener("click", async () => {
    if (!pendingRevokeId) { closeModal("revokeModal"); return; }
    try {
        const res  = await fetch(`${API}/admins/me/sessions/${pendingRevokeId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();
        closeModal("revokeModal");
        if (data.success) {
            const item = document.querySelector(`.session-item[data-session-id="${pendingRevokeId}"]`);
            if (item) { item.style.transition = 'all 0.3s'; item.style.opacity = '0'; setTimeout(() => item.remove(), 300); }
            showToast("Session revoked successfully.", "red");
        } else {
            showToast(data.message || "Failed to revoke session", "red");
        }
    } catch {
        closeModal("revokeModal");
        showToast("Network error — session not revoked", "red");
    }
    pendingRevokeId = null;
});

// ── NOTIFICATION TOGGLES (local only) ────────────────────────────────────────
["notifEmailCrisis","notifSMS","notifDailySummary","notifAppt"].forEach(id => {
    const labels = { notifEmailCrisis: "Email Crisis Alerts", notifSMS: "SMS Critical Updates", notifDailySummary: "Daily Clinical Summary", notifAppt: "Appointment Reminders" };
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", function () {
        showToast(`${labels[id]} ${this.checked ? "enabled" : "disabled"}`, this.checked ? "green" : "");
    });
});

// ── EXPORT BUTTONS ────────────────────────────────────────────────────────────
document.getElementById("exportPdfBtn").addEventListener("click", () => {
    showToast("Generating PDF Audit Report…", "purple");
    setTimeout(() => {
        const fn = document.querySelector('.profile-name')?.textContent || 'Admin';
        document.getElementById("lastExportNote").textContent = `Last export: ${new Date().toLocaleDateString("en-ZA")} by ${fn}`;
    }, 1500);
});
document.getElementById("exportCsvBtn").addEventListener("click", () => {
    showToast("Exporting CSV Audit Log…", "purple");
    setTimeout(() => {
        const fn = document.querySelector('.profile-name')?.textContent || 'Admin';
        document.getElementById("lastExportNote").textContent = `Last export: ${new Date().toLocaleDateString("en-ZA")} by ${fn}`;
    }, 1500);
});

// ── ANONYMOUS DATA TOGGLE ─────────────────────────────────────────────────────
document.getElementById("anonData").addEventListener("change", function () {
    showToast(`Anonymous data sharing ${this.checked ? "enabled" : "disabled"}`, this.checked ? "green" : "");
});

// ── DELETE ACCOUNT ────────────────────────────────────────────────────────────
document.getElementById("deactivateBtn").addEventListener("click", () => openModal("deactivateModal"));
document.getElementById("cancelDeactivate").addEventListener("click", () => {
    document.getElementById("deactivateConfirm").value = "";
    document.getElementById("confirmDeactivate").disabled = true;
    closeModal("deactivateModal");
});
document.getElementById("deactivateConfirm").addEventListener("input", function () {
    document.getElementById("confirmDeactivate").disabled = (this.value !== "DEACTIVATE");
});
document.getElementById("confirmDeactivate").addEventListener("click", async () => {
    // Prompt for password in same modal or use a simple prompt
    const password = window.prompt("Enter your password to permanently delete your account:");
    if (!password) return;
    try {
        const res  = await fetch(`${API}/admins/me`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success) {
            closeModal("deactivateModal");
            showToast("Account deleted. Redirecting…", "red");
            setTimeout(() => window.location.href = 'signim.html', 2000);
        } else {
            showToast(data.message || "Failed to delete account", "red");
        }
    } catch {
        showToast("Network error — account not deleted", "red");
    }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
document.getElementById("logoutTrigger").addEventListener("click", () => openModal("logoutModal"));
document.getElementById("cancelLogout").addEventListener("click",  () => closeModal("logoutModal"));
document.getElementById("confirmLogout").addEventListener("click", async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    showToast("Logging out…", "red");
    setTimeout(() => window.location.href = "signim.html", 1500);
});

// ── LIVE CLOCK ────────────────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    document.getElementById("serverTime").textContent = `${h}:${m} GMT+2`;
}
updateClock();
setInterval(updateClock, 60000);

// ── UNSAVED CHANGES INDICATOR ─────────────────────────────────────────────────
let hasChanges = false;
const trackableInputs = document.querySelectorAll(".form-control, .toggle-switch input, .theme-card input");
trackableInputs.forEach(input => {
    input.addEventListener("change", () => {
        if (!hasChanges) {
            hasChanges = true;
            const saveBtn = document.getElementById("saveChangesBtn");
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes';
        }
    });
});

// ── INIT ─────────────────────────────────────────────────────────────────────
initSettingsPage();
