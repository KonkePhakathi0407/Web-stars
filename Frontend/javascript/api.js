// API Configuration - Central API base URL for all frontend scripts
// Change this one value if your backend runs on a different host/port
const API_BASE_URL = 'http://localhost:3000/api';

// Make available globally for scripts that reference it
window.API_BASE_URL = API_BASE_URL;

console.log('API module loaded. Backend:', API_BASE_URL);
