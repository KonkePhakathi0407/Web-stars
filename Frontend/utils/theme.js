// Theme manager - applies saved theme on every page
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    }
})();

// Function to change theme
function setTheme(theme) {
    if (theme === 'dark') {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else {
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    }
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
}

// Function to get current theme
function getCurrentTheme() {
    return localStorage.getItem('theme') || 'light';
}

// Toggle theme function
function toggleTheme() {
    const currentTheme = getCurrentTheme();
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}