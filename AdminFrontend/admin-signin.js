/* ============================================================
   MindCare Hub Admin — Sign In  |  admin-signin.js
   ============================================================ */

const API = 'http://localhost:3000/api/admin';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('adminSigninForm');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('signin-btn');
    const togglePwBtn = document.getElementById('toggle-pw');

    if (!form) {
        console.error('Form not found!');
        return;
    }

    // Password visibility toggle
    if (togglePwBtn) {
        togglePwBtn.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
        });
    }

    // Form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showFormError('Please enter both email and password');
        }
        
        // Disable button during request
        submitBtn.disabled = true;
        submitBtn.textContent = 'SIGNING IN...';
        
        try {
            console.log('Sending login request for:', email);
            
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email: email, password: password })
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.success) {
                // Store admin info
                localStorage.setItem('adminUser', JSON.stringify(data.admin));
                console.log('Login successful, redirecting to dashboard...');
                // Redirect to dashboard
                window.location.href = 'adashboard.html';
            } else {
               showFormError(data.message || 'Invalid credentials');
                submitBtn.disabled = false;
                submitBtn.textContent = 'SIGN IN';
            }
        } catch (error) {
            console.error('Login error:', error);
           showFormError('Connection error. Make sure the server is running.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'SIGN IN';
        }
    });
});

function showFormError(msg) {
    let el = document.getElementById('adminSigninError');
    if (!el) {
        el = document.createElement('p');
        el.id = 'adminSigninError';
        el.style.cssText = 'color:#c8002b;font-size:13px;margin-top:10px;text-align:center;';
        form.appendChild(el);
    }
    el.textContent = msg;
}