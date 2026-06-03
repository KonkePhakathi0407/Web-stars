console.log('Signup page loaded');

// ── Resolve API base from environment or fall back gracefully ─────────────────
const API = window.API_BASE_URL || 'https://web-stars-production.up.railway.app/api';

// ── University → allowed email domains ───────────────────────────────────────
const UNIVERSITY_DOMAINS = {
    'University of Johannesburg': ['student.uj.ac.za', 'uj.ac.za'],
    'University of Pretoria':     ['tuks.co.za', 'up.ac.za', 'cs.up.ac.za'],
    'Wits University':            ['students.wits.ac.za', 'wits.ac.za'],
    'UNISA':                      ['mylife.unisa.ac.za', 'unisa.ac.za'],
    'Rhodes University':          ['ru.ac.za', 'students.ru.ac.za'],
    'University of Cape Town':    ['myuct.ac.za', 'uct.ac.za', 'cs.uct.ac.za'],
    'Stellenbosch University':    ['sun.ac.za', 'stud.sun.ac.za'],
    'University of KwaZulu-Natal': ['stu.ukzn.ac.za', 'ukzn.ac.za'],
    'North-West University':      ['student.nwu.ac.za', 'nwu.ac.za'],
};

// ── Inline toast (no dependency on dashboard toast) ──────────────────────────
function showToast(message, type = 'error') {
    document.querySelectorAll('.signup-toast').forEach(t => t.remove());

    const colors = { error: '#c8002b', success: '#16a34a', info: '#5b3ec8' };
    const icons = {
        error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = 'signup-toast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        background: ${colors[type] || colors.error};
        color: white; padding: 12px 18px; border-radius: 10px;
        font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.18);
        animation: toastIn 0.3s ease;
        max-width: 340px;
    `;
    toast.innerHTML = `${icons[type] || icons.error}<span>${message}</span>`;
    document.body.appendChild(toast);

    if (!document.querySelector('#signup-toast-style')) {
        const s = document.createElement('style');
        s.id = 'signup-toast-style';
        s.textContent = `
            @keyframes toastIn  { from { transform: translateX(110%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
            @keyframes toastOut { from { transform: translateX(0);    opacity: 1 } to { transform: translateX(110%); opacity: 0 } }
        `;
        document.head.appendChild(s);
    }

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 320);
    }, 4000);
}

// ── Eye button toggle ─────────────────────────────────────────────────────────
document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const input = document.getElementById(this.dataset.target);
        const icon  = this.querySelector('.eye-icon');
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            `;
        } else {
            input.type = 'password';
            icon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    });
});

// ── Password strength checker ─────────────────────────────────────────────────
document.getElementById('password')?.addEventListener('input', function () {
    const val    = this.value;
    const fill   = document.getElementById('strength-fill');
    const label  = document.getElementById('strength-label');
    if (!fill || !label) return;

    const checks = [
        val.length >= 8,
        /[A-Z]/.test(val),
        /[0-9]/.test(val),
        /[^A-Za-z0-9]/.test(val),
    ];
    const score = checks.filter(Boolean).length;

    const levels = {
        0: { width: '0%',   color: 'transparent', text: '' },
        1: { width: '25%',  color: '#ef4444',     text: 'Too weak' },
        2: { width: '50%',  color: '#f97316',     text: 'Weak' },
        3: { width: '75%',  color: '#eab308',     text: 'Almost there' },
        4: { width: '100%', color: '#22c55e',     text: 'Strong ✓' },
    };

    fill.style.width      = levels[score].width;
    fill.style.background = levels[score].color;
    label.textContent     = levels[score].text;
    label.style.color     = levels[score].color;
});

// ── Anonymous toggle — hide/show name fields ──────────────────────────────────
const anonCheck = document.getElementById('anon-check');
const nameRow   = document.querySelector('.name-row');

anonCheck?.addEventListener('change', function () {
    if (nameRow) {
        nameRow.style.display = this.checked ? 'none' : '';
        nameRow.querySelectorAll('input').forEach(i => {
            i.required = !this.checked;
        });
    }
});

// ── Live email domain hint (on blur) ─────────────────────────────────────────
document.getElementById('email')?.addEventListener('blur', function () {
    const university = document.getElementById('university')?.value;
    if (!university || !this.value.includes('@')) return;

    const emailDomain    = this.value.split('@')[1]?.toLowerCase();
    const allowedDomains = UNIVERSITY_DOMAINS[university];

    if (allowedDomains && emailDomain && !allowedDomains.includes(emailDomain)) {
        showToast(
            `Heads up: @${emailDomain} doesn't look like a ${university} student email.`,
            'info'
        );
    }
});

// ── Signup button ─────────────────────────────────────────────────────────────
document.getElementById('signup-btn')?.addEventListener('click', async function (e) {
    e.preventDefault();

    const firstName       = document.getElementById('first-name')?.value.trim();
    const lastName        = document.getElementById('last-name')?.value.trim();
    const email           = document.getElementById('email')?.value.trim();
    const university      = document.getElementById('university')?.value;
    const password        = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    const isAnonymous     = document.getElementById('anon-check')?.checked || false;

    // ── Validation ──
    if (!email)                              return showToast('Please enter your email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email address');
    if (!password)                           return showToast('Please enter a password');
    if (password.length < 8)                 return showToast('Password must be at least 8 characters');
    if (/123/.test(password))                return showToast('Password cannot contain "123" — please choose something stronger');
    if (!/[A-Z]/.test(password))             return showToast('Password must include at least one uppercase letter');
    if (!/[0-9]/.test(password))             return showToast('Password must include at least one number');
    if (!/[^A-Za-z0-9]/.test(password))      return showToast('Password must include at least one special character (e.g. @, !, #)');
    if (password !== confirmPassword)         return showToast('Passwords do not match');
    if (!isAnonymous && (!firstName || !lastName)) return showToast('Please enter your first and last name');
    if (!university)                          return showToast('Please select your university');

    // ── University ↔ email domain check ──
    const emailDomain    = email.split('@')[1]?.toLowerCase();
    const allowedDomains = UNIVERSITY_DOMAINS[university];
    if (allowedDomains && emailDomain && !allowedDomains.includes(emailDomain)) {
        return showToast(
            `Your email (@${emailDomain}) doesn't match ${university}. Please use your official student email.`
        );
    }

    const btn = this;
    btn.disabled    = true;
    btn.textContent = 'CREATING ACCOUNT...';

    try {
        const response = await fetch(`${API}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email,
                password,
                first_name:   isAnonymous ? null : firstName,
                last_name:    isAnonymous ? null : lastName,
                university:   university || null,
                is_anonymous: isAnonymous ? 1 : 0
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store only non-sensitive display info
            localStorage.setItem('currentUser', JSON.stringify({
                first_name: isAnonymous ? null : firstName,
                last_name:  isAnonymous ? null : lastName,
                email,
                university
            }));

            // Send verification code — show user a toast if it fails
            const codeRes  = await fetch(`${API}/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const codeData = await codeRes.json();

            if (!codeData.success) {
                showToast('Account created but we could not send the verification email. Try resending from the modal.', 'info');
            }

            btn.disabled    = false;
            btn.textContent = 'CREATE MY ACCOUNT';
            showVerifyModal(email);

        } else {
            showToast(data.message || 'Signup failed. Please try again.');
            btn.disabled    = false;
            btn.textContent = 'CREATE MY ACCOUNT';
        }

    } catch (error) {
        console.error('Signup error:', error);
        showToast('Connection error. Make sure the backend is running.');
        btn.disabled    = false;
        btn.textContent = 'CREATE MY ACCOUNT';
    }
});

// ── Verification modal ────────────────────────────────────────────────────────
function showVerifyModal(email) {
    // Detect dark mode so the modal matches the page theme
    const isDark  = document.body.classList.contains('dark');
    const bg      = isDark ? '#1a1030' : '#ffffff';
    const textMain= isDark ? '#f0eeff' : '#1a1a2e';
    const textSub = isDark ? '#b0a0d0' : '#6b7280';
    const inputBg = isDark ? '#0f0a1e' : '#ffffff';
    const border  = isDark ? '#2e2050' : '#e5e7eb';
    const overlay = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)';

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; inset: 0; background: ${overlay};
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; font-family: 'DM Sans', sans-serif;
    `;

    modal.innerHTML = `
        <div style="background:${bg}; border-radius:16px; padding:36px;
                    position:relative; width:100%; max-width:400px;
                    text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.25);">

            <button id="close-modal-btn" style="
                position:absolute; top:14px; right:16px;
                background:none; border:none; cursor:pointer;
                font-size:20px; color:${textSub}; line-height:1;">&#x2715;</button>

            <div style="width:52px; height:52px; background:${isDark ? 'rgba(91,62,200,0.25)' : '#f3e8ff'};
                        border-radius:50%; display:flex; align-items:center;
                        justify-content:center; margin:0 auto 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="${isDark ? '#a78bfa' : '#6b21a8'}" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
            </div>

            <h2 style="margin:0 0 8px; font-size:20px; color:${textMain};">Check your email</h2>
            <p style="color:${textSub}; font-size:14px; margin:0 0 24px;">
                We sent a 6-digit code to<br><strong>${email}</strong><br>It expires in 2 minutes.
            </p>

            <input id="verify-input" maxlength="6" placeholder="_ _ _ _ _ _"
                style="width:100%; text-align:center; font-size:28px; letter-spacing:10px;
                       border:2px solid ${border}; border-radius:10px; padding:14px;
                       outline:none; box-sizing:border-box;
                       color:${textMain}; background:${inputBg};" />

            <p id="verify-error" style="color:#ef4444; font-size:13px; min-height:20px; margin:8px 0 0;"></p>
            <p id="verify-timer" style="color:${textSub}; font-size:13px; margin:4px 0 20px;">
                Code expires in <strong>2:00</strong>
            </p>

            <button id="verify-btn" style="
                width:100%; background:#6b21a8; color:white; border:none;
                border-radius:10px; padding:14px; font-size:15px; font-weight:600;
                cursor:pointer; margin-bottom:12px;">
                VERIFY &amp; CONTINUE
            </button>

            <p style="font-size:13px; color:${textSub};">
                Didn't get it?
                <span id="resend-btn" style="color:#6b21a8; cursor:pointer; font-weight:600;">
                    Resend code
                </span>
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    // ── Timer ──
    let seconds = 120;
    const timerEl = modal.querySelector('#verify-timer');

    const countdown = setInterval(() => {
        seconds--;
        const m = String(Math.floor(seconds / 60));
        const s = String(seconds % 60).padStart(2, '0');
        timerEl.innerHTML = `Code expires in <strong>${m}:${s}</strong>`;

        if (seconds <= 0) {
            clearInterval(countdown);
            timerEl.innerHTML = '<span style="color:#ef4444">Code expired. Please resend.</span>';
            const vBtn = modal.querySelector('#verify-btn');
            vBtn.disabled = true;
            vBtn.style.opacity = '0.5';
        }
    }, 1000);

    // ── Verify ──
    modal.querySelector('#verify-btn').addEventListener('click', async () => {
        const code    = modal.querySelector('#verify-input').value.trim();
        const errorEl = modal.querySelector('#verify-error');

        if (!/^\d{6}$/.test(code)) {
            errorEl.textContent = 'Please enter the full 6-digit code (numbers only).';
            return;
        }

        const btn = modal.querySelector('#verify-btn');
        btn.textContent = 'VERIFYING...';
        btn.disabled = true;

        try {
            const res    = await fetch(`${API}/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const result = await res.json();

            if (result.success) {
                clearInterval(countdown);
                document.body.removeChild(modal);
                window.location.href = 'dashboard.html';
            } else {
                errorEl.textContent  = result.message || 'Incorrect code. Please try again.';
                btn.textContent = 'VERIFY & CONTINUE';
                btn.disabled = false;
            }
        } catch {
            errorEl.textContent  = 'Connection error. Try again.';
            btn.textContent = 'VERIFY & CONTINUE';
            btn.disabled = false;
        }
    });

    // ── Resend ──
    modal.querySelector('#resend-btn').addEventListener('click', async () => {
        const resendBtn = modal.querySelector('#resend-btn');
        resendBtn.textContent = 'Sending...';
        resendBtn.style.pointerEvents = 'none';

        try {
            const res  = await fetch(`${API}/auth/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.success) {
                seconds = 120;
                modal.querySelector('#verify-btn').disabled = false;
                modal.querySelector('#verify-btn').style.opacity = '1';
                modal.querySelector('#verify-btn').textContent  = 'VERIFY & CONTINUE';
                modal.querySelector('#verify-error').textContent = '';
                timerEl.innerHTML = `Code expires in <strong>2:00</strong>`;
                showToast('A new code has been sent to your email.', 'success');
            } else {
                showToast(data.message || 'Failed to resend. Please try again.', 'error');
            }
        } catch {
            showToast('Connection error. Please try again.', 'error');
        } finally {
            resendBtn.textContent = 'Resend code';
            resendBtn.style.pointerEvents = '';
        }
    });

    // ── Numbers only input ──
    modal.querySelector('#verify-input').addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // ── Auto-submit when 6 digits entered ──
    modal.querySelector('#verify-input').addEventListener('input', function () {
        if (this.value.length === 6) {
            modal.querySelector('#verify-btn').click();
        }
    });

    // ── Close / cancel ──
    modal.querySelector('#close-modal-btn').addEventListener('click', async () => {
        clearInterval(countdown);

        try {
            await fetch(`${API}/auth/cancel-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
        } catch { /* ignore — just clean up locally */ }

        localStorage.removeItem('currentUser');
        document.body.removeChild(modal);
        window.location.href = 'signup.html';
    });
}