/* ============================================================
   darkmode.js  —  MindCare Hub Admin
   Add <script src="javascript/darkmode.js"></script> before
   the closing </body> tag in every HTML page.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'adminTheme';

  // ── Apply saved theme immediately (prevents flash) ───────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update all toggle buttons on the page
    document.querySelectorAll('.dark-toggle').forEach(btn => {
      const icon = btn.querySelector('.toggle-icon');
      const label = btn.querySelector('.toggle-label');
      if (icon)  icon.textContent  = theme === 'dark' ? '☀️' : '🌙';
      if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
  }

  // Apply on page load before paint
  const saved = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(saved);

  // ── Toggle ───────────────────────────────────────────────────
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // ── Inject toggle button into .topbar-right ──────────────────
  function injectToggleButton() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight) return;

    // Don't inject twice
    if (topbarRight.querySelector('.dark-toggle')) return;

    const btn = document.createElement('button');
    btn.className = 'dark-toggle';
    btn.setAttribute('title', 'Toggle dark mode');
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.innerHTML = `
      <span class="toggle-icon">🌙</span>
      <span class="toggle-label">Dark Mode</span>
    `;
    btn.addEventListener('click', toggleTheme);

    // Insert before the first child (left of existing buttons)
    topbarRight.insertBefore(btn, topbarRight.firstChild);

    // Sync icon with current theme
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggleButton);
  } else {
    injectToggleButton();
  }

  // Expose globally so other scripts can call it if needed
  window.toggleDarkMode = toggleTheme;
})();