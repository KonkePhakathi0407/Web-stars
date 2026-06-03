document.addEventListener("DOMContentLoaded", () => {
    const API = 'http://localhost:3000/api';
    
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'signin.html';
        return;
    }
    
    // Display user name in heading
    const heading = document.querySelector('.logout-heading');
    if (heading && currentUser) {
        heading.textContent = `Leaving so soon, ${currentUser.first_name || 'User'}?`;
    }

    // Session timer
    const sessionStart = Date.now() - 42 * 60 * 1000;
    const sessionInfoEl = document.getElementById("sessionInfo");

    function updateSessionTime() {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        if (sessionInfoEl) {
            sessionInfoEl.textContent = mins > 0
                ? `Session started ${mins} minute${mins !== 1 ? "s" : ""} ago`
                : `Session started ${secs} second${secs !== 1 ? "s" : ""} ago`;
        }
    }

    updateSessionTime();
    setInterval(updateSessionTime, 30000);

    // LOGOUT BUTTON - Go to SIGN IN page
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API}/auth/signout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                localStorage.removeItem('currentUser');
                window.location.href = 'signin.html';
            }
        });
    }

    // STAY LOGGED IN BUTTON - Go to DASHBOARD
    const stayBtn = document.getElementById('stayBtn');
    if (stayBtn) {
        stayBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
});