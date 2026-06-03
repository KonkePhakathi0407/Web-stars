document.addEventListener('DOMContentLoaded', function () {
    console.log('Signin page loaded');

    // ── Inline toast ──────────────────────────────────────────────────────────
    function showToast(message, type = 'error') {
        document.querySelectorAll('.signin-toast').forEach(t => t.remove());

        const colors = { error: '#c8002b', success: '#16a34a', info: '#5b3ec8' };
        const icons = {
            error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
            info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        };

        const toast = document.createElement('div');
        toast.className = 'signin-toast';
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

        if (!document.querySelector('#signin-toast-style')) {
            const s = document.createElement('style');
            s.id = 'signin-toast-style';
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

    // ── Sign in button ────────────────────────────────────────────────────────
    const signinBtn = document.getElementById('signin-btn');

    if (signinBtn) {
        signinBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const email    = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;

            if (!email)    return showToast('Please enter your email address');
            if (!password) return showToast('Please enter your password');

            signinBtn.disabled    = true;
            signinBtn.textContent = 'SIGNING IN...';

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    showToast('Welcome back, ' + (data.user.first_name || email) + '!', 'success');
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
                } else {
                    showToast(data.message || 'Incorrect email or password. Please try again.');
                    signinBtn.disabled    = false;
                    signinBtn.textContent = 'SIGN IN TO MINDCARE';
                }
            } catch (error) {
                console.error('Signin error:', error);
                showToast('Connection error. Make sure the backend is running on port 3000.');
                signinBtn.disabled    = false;
                signinBtn.textContent = 'SIGN IN TO MINDCARE';
            }
        });
    }

    // ── Password visibility toggle ────────────────────────────────────────────
    const togglePwBtn   = document.getElementById('toggle-pw');
    const passwordInput = document.getElementById('password');

    if (togglePwBtn && passwordInput) {
        togglePwBtn.addEventListener('click', () => {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        });
    }
});