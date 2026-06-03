// Bookings JavaScript - Additional functionality
const API = 'http://localhost:3000/api';

// Load user's existing bookings
async function loadUserBookings() {
    try {
        const response = await fetch(`${API}/bookings`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.bookings && data.bookings.length > 0) {
            console.log('Existing bookings:', data.bookings);
            // You can display existing bookings here if you add a container
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Load bookings on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'signin.html';
    }
    
    loadUserBookings();
});