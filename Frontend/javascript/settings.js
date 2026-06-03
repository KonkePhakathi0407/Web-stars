const API = 'http://localhost:3000/api';

// ========== GLOBAL THEME FUNCTION ==========
window.setTheme = function(theme) {
    if (theme === 'dark') {
        localStorage.setItem('theme', 'dark');
        document.body.classList.add('dark');
        document.documentElement.classList.add('dark');
    } else {
        localStorage.setItem('theme', 'light');
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
};

// Get current theme
function getCurrentTheme() {
    return localStorage.getItem('theme') || 'light';
}
// ==========================================

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch(`${API}/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = 'signin.html';
        }
        return data.user;
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = 'signin.html';
    }
}

// Load user profile
async function loadProfile() {
    try {
        const response = await fetch(`${API}/settings/profile`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            const firstNameInput = document.getElementById('firstNameInput');
            const lastNameInput = document.getElementById('lastNameInput');
            const emailInput = document.getElementById('emailInput');
            const universityInput = document.getElementById('universityInput');
            
            if (firstNameInput) firstNameInput.value = user.first_name || '';
            if (lastNameInput) lastNameInput.value = user.last_name || '';
            if (emailInput) emailInput.value = user.email || '';
            if (universityInput) universityInput.value = user.university || '';
            
            if (user.profile_picture) {
                const img = document.getElementById('profileImage');
                if (img) {
                    img.src = `http://localhost:3000${user.profile_picture}?t=${Date.now()}`;
                    img.style.display = 'block';
                    const placeholder = document.getElementById('avatarPlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Update profile
async function updateProfile() {
    const firstName = document.getElementById('firstNameInput')?.value.trim() || '';
    const lastName = document.getElementById('lastNameInput')?.value.trim() || '';
    const email = document.getElementById('emailInput')?.value.trim() || '';
    
    if (!firstName || !lastName || !email) {
        showToast('All fields are required', 'error');
        return;
    }
    
    const btn = document.getElementById('saveBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'SAVING...';
    
    try {
        const response = await fetch(`${API}/settings/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.first_name = firstName;
            currentUser.last_name = lastName;
            currentUser.email = email;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        showToast('Failed to update profile', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Upload profile picture
function setupProfilePictureUpload() {
    const uploadInput = document.getElementById('profilePictureUpload');
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
            showToast('Please select a valid image file (JPEG, PNG, or GIF)', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        showToast('Uploading...', 'info');
        
        try {
            const response = await fetch(`${API}/settings/profile-picture`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message, 'success');
                const img = document.getElementById('profileImage');
                if (img) {
                    img.src = `http://localhost:3000${data.picturePath}?t=${Date.now()}`;
                    img.style.display = 'block';
                    const placeholder = document.getElementById('avatarPlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to upload image', 'error');
        }
    });
}

// Change password
function setupChangePassword() {
    const changeBtn = document.getElementById('changePwBtn');
    if (!changeBtn) return;
    
    changeBtn.addEventListener('click', async () => {
        const currentPassword = prompt('Enter your current password:');
        if (!currentPassword) return;
        
        const newPassword = prompt('Enter your new password (min 8 characters):');
        if (!newPassword) return;
        
        const confirmPassword = prompt('Confirm your new password:');
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        
        const btn = changeBtn;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'CHANGING...';
        
        try {
            const response = await fetch(`${API}/settings/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message, 'success');
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Change password error:', error);
            showToast('Failed to change password', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

// Delete account
function setupDeleteAccount() {
    const deleteBtn = document.getElementById('deleteBtn');
    if (!deleteBtn) return;
    
    deleteBtn.addEventListener('click', () => {
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.add('open');
    });
    
    const closeModal = document.getElementById('deleteModalClose');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('deleteModal')?.classList.remove('open');
        });
    }
    
    const cancelBtn = document.getElementById('deleteCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('deleteModal')?.classList.remove('open');
        });
    }
    
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const confirmText = document.getElementById('deleteConfirmInput')?.value;
            const password = prompt('Enter your password to confirm account deletion:');
            
            if (confirmText !== 'DELETE') {
                showToast('Please type DELETE to confirm', 'error');
                return;
            }
            
            if (!password) {
                showToast('Password is required', 'error');
                return;
            }
            
            const btn = confirmBtn;
            btn.disabled = true;
            btn.textContent = 'DELETING...';
            
            try {
                const response = await fetch(`${API}/settings/account`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast(data.message, 'success');
                    localStorage.removeItem('currentUser');
                    setTimeout(() => {
                        window.location.href = 'signup.html';
                    }, 2000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (error) {
                console.error('Delete account error:', error);
                showToast('Failed to delete account', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Delete My Account';
                document.getElementById('deleteModal')?.classList.remove('open');
            }
        });
    }
}

// Setup theme toggles
function setupTheme() {
    const lightBtn = document.getElementById('lightModeBtn');
    const darkBtn = document.getElementById('darkModeBtn');
    
    // Update button states based on current theme
    const currentTheme = getCurrentTheme();
    
    if (currentTheme === 'dark') {
        if (lightBtn) lightBtn.classList.remove('active');
        if (darkBtn) darkBtn.classList.add('active');
        document.body.classList.add('dark');
    } else {
        if (lightBtn) lightBtn.classList.add('active');
        if (darkBtn) darkBtn.classList.remove('active');
        document.body.classList.remove('dark');
    }
    
    if (lightBtn) {
        lightBtn.addEventListener('click', () => {
            window.setTheme('light');
            lightBtn.classList.add('active');
            if (darkBtn) darkBtn.classList.remove('active');
            showToast('Light mode activated', 'success');
        });
    }
    
    if (darkBtn) {
        darkBtn.addEventListener('click', () => {
            window.setTheme('dark');
            darkBtn.classList.add('active');
            if (lightBtn) lightBtn.classList.remove('active');
            showToast('Dark mode activated', 'success');
        });
    }
}

// Setup privacy toggles
function setupPrivacyToggles() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('on');
            const isOn = this.classList.contains('on');
            this.setAttribute('aria-checked', String(isOn));
        });
    });
}

// Setup legal modals
function setupLegalModals() {
    const legalContent = {
        privacyBtn: { 
            title: 'Privacy Policy', 
            body: '<p>MindCare Hub is committed to protecting your privacy. Your data is encrypted and never shared with third parties.</p>' 
        },
        tosBtn: { 
            title: 'Terms of Service', 
            body: '<p>By using MindCare Hub, you agree to our terms of service. This platform is for educational and support purposes only.</p>' 
        },
        popiaBtn: { 
            title: 'POPIA Notice', 
            body: '<p>MindCare Hub complies with the Protection of Personal Information Act (POPIA). Your data is stored securely in South Africa.</p>' 
        }
    };
    
    Object.keys(legalContent).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                const titleEl = document.getElementById('legalModalTitle');
                const bodyEl = document.getElementById('legalModalBody');
                if (titleEl) titleEl.textContent = legalContent[id].title;
                if (bodyEl) bodyEl.innerHTML = legalContent[id].body;
                const modal = document.getElementById('legalModal');
                if (modal) modal.classList.add('open');
            });
        }
    });
    
    const closeModal = document.getElementById('legalModalClose');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('legalModal')?.classList.remove('open');
        });
    }
}

// Save button
function setupSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', updateProfile);
    }
}

// Export button
function setupExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showToast('Export feature coming soon', 'info');
        });
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Settings page loaded');
    
    const user = await checkAuth();
    
    if (user) {
        await loadProfile();
        setupProfilePictureUpload();
        setupChangePassword();
        setupDeleteAccount();
        setupTheme();
        setupPrivacyToggles();
        setupLegalModals();
        setupSaveButton();
        setupExportButton();
        
        console.log('Settings page initialized');
    }
});