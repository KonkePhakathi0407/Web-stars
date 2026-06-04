/* ============================================================
   MindCare Hub Admin — Create Account  |  script.js
   ============================================================ */

const API = 'http://localhost:3000/api/admin';

document.addEventListener('DOMContentLoaded', function () {
    const form            = document.getElementById('adminForm');
    const firstName       = document.getElementById('firstName');
    const lastName        = document.getElementById('lastName');
    const email           = document.getElementById('email');
    const university      = document.getElementById('university');
    const adminRole       = document.getElementById('adminRole');
    const password        = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const createBtn       = document.getElementById('create-btn');
    const successOverlay  = document.getElementById('successOverlay');

    if (!form || !createBtn) return;

    // ── Password toggles ─────────────────────────────────────────────────────
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = document.getElementById(this.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
            this.style.opacity = input.type === 'text' ? '0.45' : '1';
        });
    });

    // ── Ripple ───────────────────────────────────────────────────────────────
    createBtn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });

    // ── Error helpers ────────────────────────────────────────────────────────
    function showError(hintId, el) {
        document.getElementById(hintId)?.classList.add('show');
        el?.classList.add('error');
    }
    function hideError(hintId, el) {
        document.getElementById(hintId)?.classList.remove('show');
        el?.classList.remove('error');
    }
    function showGlobalError(msg) {
        let el = document.getElementById('globalError');
        if (!el) {
            el = document.createElement('p');
            el.id = 'globalError';
            el.style.cssText = 'color:#c8002b;font-size:13px;margin-top:12px;text-align:center;';
            form.appendChild(el);
        }
        el.textContent = msg;
    }

    // ── Live clear ───────────────────────────────────────────────────────────
    [
        { el: firstName,       hint: 'hintFirst' },
        { el: lastName,        hint: 'hintLast' },
        { el: email,           hint: 'hintEmail' },
        { el: university,      hint: 'hintUniversity' },
        { el: adminRole,       hint: 'hintRole' },
        { el: password,        hint: 'hintPass' },
        { el: confirmPassword, hint: 'hintConfirm' },
    ].forEach(({ el, hint }) => {
        el?.addEventListener('input',  () => hideError(hint, el));
        el?.addEventListener('change', () => hideError(hint, el));
    });

    // ── Submit → calls backend ────────────────────────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let valid = true;

        if (!firstName?.value.trim())               { showError('hintFirst',      firstName);       valid = false; } else hideError('hintFirst',      firstName);
        if (!lastName?.value.trim())                { showError('hintLast',       lastName);        valid = false; } else hideError('hintLast',       lastName);
        if (!emailPattern.test(email?.value.trim())){ showError('hintEmail',      email);           valid = false; } else hideError('hintEmail',      email);
        if (!university?.value)                      { showError('hintUniversity', university);      valid = false; } else hideError('hintUniversity', university);
        if (!adminRole?.value)                       { showError('hintRole',       adminRole);       valid = false; } else hideError('hintRole',       adminRole);
        if ((password?.value.length || 0) < 8)      { showError('hintPass',       password);        valid = false; } else hideError('hintPass',       password);
        if (!confirmPassword?.value || confirmPassword.value !== password?.value) {
            showError('hintConfirm', confirmPassword); valid = false;
        } else hideError('hintConfirm', confirmPassword);

        if (!valid) {
            const firstErr = form.querySelector('.error');
            firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErr?.focus();
            return;
        }

        createBtn.disabled    = true;
        createBtn.textContent = 'CREATING...';

        try {
            const res  = await fetch(`${API}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email:      email.value.trim(),
                    password:   password.value,
                    first_name: firstName.value.trim(),
                    last_name:  lastName.value.trim(),
                    role:       adminRole.value
                })
            });
            const data = await res.json();

            if (data.success) {
                if (successOverlay) {
                    successOverlay.classList.add('show');
                    setTimeout(() => { window.location.href = 'signim.html'; }, 2000);
                } else {
                    window.location.href = 'signim.html';
                }
            } else {
                showGlobalError(data.message || 'Failed to create account');
                createBtn.disabled    = false;
                createBtn.textContent = 'CREATE ACCOUNT';
            }
        } catch (err) {
            console.error('Signup error:', err);
            showGlobalError('Connection error — make sure the backend is running on port 3001');
            createBtn.disabled    = false;
            createBtn.textContent = 'CREATE ACCOUNT';
            // Still redirect after a short delay so the button always navigates
            setTimeout(() => { window.location.href = 'signim.html'; }, 2000);
        }
    });
});