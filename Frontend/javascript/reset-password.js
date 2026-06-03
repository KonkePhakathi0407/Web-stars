const API = 'http://localhost:3000/api';

function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

function showMessage(text, type) {
    const msgDiv = document.getElementById('message');
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = text;
    setTimeout(() => {
        msgDiv.className = 'message';
    }, 5000);
}

// Password strength meter
const newPasswordInput = document.getElementById('newPassword');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function() {
        const pw = this.value;
        if (!pw) {
            strengthFill.style.width = '0%';
            strengthText.textContent = '';
            return;
        }
        const score = getStrength(pw);
        const levels = [
            { pct: '20%', color: '#e53935', text: 'Very weak' },
            { pct: '40%', color: '#f57c00', text: 'Weak' },
            { pct: '60%', color: '#fdd835', text: 'Fair' },
            { pct: '80%', color: '#66bb6a', text: 'Strong' },
            { pct: '100%', color: '#2e7d32', text: 'Very strong' }
        ];
        const lvl = levels[Math.max(0, score - 1)];
        strengthFill.style.width = lvl.pct;
        strengthFill.style.background = lvl.color;
        strengthText.textContent = lvl.text;
        strengthText.style.color = lvl.color;
    });
}

// Reset password button
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!email) {
            showMessage('Please enter your email address', 'error');
            return;
        }
        
        if (!newPassword) {
            showMessage('Please enter a new password', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showMessage('Password must be at least 8 characters', 'error');
            return;
        }
        
        resetBtn.disabled = true;
        resetBtn.textContent = 'RESETTING...';
        
        try {
            const response = await fetch(`${API}/auth/simple-reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                })
            });
            
            const data = await response.json();
            console.log('Response:', data);
            
            if (data.success) {
                showMessage(data.message, 'success');
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 2000);
            } else {
                showMessage(data.message, 'error');
                resetBtn.disabled = false;
                resetBtn.textContent = 'Reset Password';
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Connection error. Make sure backend is running on port 3000', 'error');
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset Password';
        }
    });
}

// Enter key support
const emailInput = document.getElementById('email');
const confirmInput = document.getElementById('confirmPassword');

if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') resetBtn.click();
    });
}

if (confirmInput) {
    confirmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') resetBtn.click();
    });
}