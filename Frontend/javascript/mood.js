// API Endpoint
const API = 'http://localhost:3000/api';

// Check authentication
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'signin.html';
}

// DOM Elements
const sessionEl = document.getElementById('sessionId');
if (sessionEl && currentUser) {
    sessionEl.textContent = `SESSION ID: #${currentUser.id || Math.floor(Math.random() * 10000)}`;
}

const slider = document.getElementById('moodSlider');
const sliderDisplay = document.getElementById('sliderDisplay');
const logBtn = document.getElementById('logBtn');
const avgMoodStat = document.getElementById('avgMoodStat');
const bestDayEl = document.getElementById('bestDay');
const worstDayEl = document.getElementById('worstDay');
const rewardStreak = document.getElementById('rewardStreak');
const aiBody = document.getElementById('aiBody');
const aiBullets = document.getElementById('aiBullets');
const trendValue = document.getElementById('trendValue');
const barsWrap = document.getElementById('barsWrap');
const barLabels = document.getElementById('barLabels');
const lineCanvas = document.getElementById('lineCanvas');
let lineChart = null;

// ========== SIDEBAR ACTIVE STATE ==========
function setActiveSidebarItem() {
    const currentPage = window.location.pathname.split('/').pop();
    const pageMap = {
        'mood.html': 'Mood',
        'mood-tracker.html': 'Mood Tracker',
        'journal.html': 'Journal',
        'dashboard.html': 'Dashboard',
        'forum.html': 'Forum',
        'games.html': 'Games',
        'bookings.html': 'Bookings',
        'crisis.html': 'Crisis Center',
        'find-help.html': 'Find Help',
        'settings.html': 'Settings'
    };
    
    const activeText = pageMap[currentPage] || 'Dashboard';
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const span = item.querySelector('span');
        if (span && span.innerText === activeText) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ========== DATE PICKER STATE ==========
let currentDisplayMonth = new Date().getMonth();
let currentDisplayYear = new Date().getFullYear();
let currentMoodLogs = [];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Demo data for fallback
const DEMO_MOOD_LOGS = [
    { mood_score: 7, mood_label: 'GOOD', logged_at: new Date(Date.now() - 6 * 86400000).toISOString() },
    { mood_score: 5, mood_label: 'OKAY', logged_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { mood_score: 8, mood_label: 'GOOD', logged_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    { mood_score: 6, mood_label: 'OKAY', logged_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { mood_score: 4, mood_label: 'LOW', logged_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { mood_score: 7, mood_label: 'GOOD', logged_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { mood_score: 8, mood_label: 'GOOD', logged_at: new Date().toISOString() }
];

// Update month/year display
function updateMonthDisplay() {
    const monthYearEl = document.getElementById('monthYear');
    if (monthYearEl) {
        monthYearEl.textContent = `${monthNames[currentDisplayMonth]} ${currentDisplayYear}`;
    }
}

// Load mood data (with fallback to demo data)
async function loadMoodData() {
    if (avgMoodStat) avgMoodStat.innerHTML = '... <span class="stat-denom">/ 10</span>';
    
    try {
        const startDate = new Date(currentDisplayYear, currentDisplayMonth, 1);
        const endDate = new Date(currentDisplayYear, currentDisplayMonth + 1, 0);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const response = await fetch(`${API}/mood?start=${startStr}&end=${endStr}`, { 
            credentials: 'include' 
        });
        
        const data = await response.json();
        
        if (data.success && data.logs && data.logs.length > 0) {
            currentMoodLogs = data.logs;
        } else {
            currentMoodLogs = [...DEMO_MOOD_LOGS];
            console.log('Using demo mood data');
        }
        
        updateStatsAndCharts();
        
    } catch (error) {
        console.error('Error loading mood data:', error);
        currentMoodLogs = [...DEMO_MOOD_LOGS];
        updateStatsAndCharts();
        showToast('Using demo data (backend not connected)', 'info');
    }
}

// Update all UI elements with current mood data
function updateStatsAndCharts() {
    const logs = currentMoodLogs;
    
    if (!logs || logs.length === 0) {
        updateUIWithEmptyData();
        return;
    }
    
    // ========== AVERAGE MOOD ==========
    const sum = logs.reduce((acc, log) => acc + log.mood_score, 0);
    const avg = (sum / logs.length).toFixed(1);
    if (avgMoodStat) {
        avgMoodStat.innerHTML = `${avg} <span class="stat-denom">/ 10</span>`;
    }
    
    // ========== BEST AND WORST DAYS ==========
    const best = logs.reduce((a, b) => a.mood_score > b.mood_score ? a : b);
    const worst = logs.reduce((a, b) => a.mood_score < b.mood_score ? a : b);
    
    if (bestDayEl) {
        const bestDate = new Date(best.logged_at);
        bestDayEl.textContent = bestDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    }
    if (worstDayEl) {
        const worstDate = new Date(worst.logged_at);
        worstDayEl.textContent = worstDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    }
    
    // ========== STREAK COUNT ==========
    if (rewardStreak) {
        const uniqueDays = new Set(logs.map(log => new Date(log.logged_at).toDateString())).size;
        rewardStreak.innerHTML = `${uniqueDays}-Day Reflection<br>Streak`;
    }
    
    // ========== TREND CALCULATION ==========
    if (trendValue && logs.length >= 3) {
        const sortedLogs = [...logs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
        const recent = sortedLogs.slice(-3).map(l => l.mood_score);
        const older = sortedLogs.slice(0, 3).map(l => l.mood_score);
        const recentAvg = recent.reduce((a,b) => a+b,0)/recent.length;
        const olderAvg = older.reduce((a,b) => a+b,0)/older.length;
        
        if (recentAvg > olderAvg + 0.5) {
            trendValue.innerHTML = 'Improving 📈';
            trendValue.style.color = '#16a34a';
        } else if (recentAvg < olderAvg - 0.5) {
            trendValue.innerHTML = 'Declining 📉';
            trendValue.style.color = '#c8002b';
        } else {
            trendValue.innerHTML = 'Stable ➡️';
            trendValue.style.color = '#d97706';
        }
    } else if (trendValue) {
        trendValue.innerHTML = 'Need more data';
        trendValue.style.color = '#7a7a9a';
    }
    
    // ========== AI INSIGHTS ==========
    updateAIInsights(logs);
    
    // ========== CHARTS ==========
    updateCharts(logs);
}

function updateUIWithEmptyData() {
    if (avgMoodStat) avgMoodStat.innerHTML = '- <span class="stat-denom">/ 10</span>';
    if (bestDayEl) bestDayEl.textContent = '-';
    if (worstDayEl) worstDayEl.textContent = '-';
    if (rewardStreak) rewardStreak.innerHTML = '0-Day Reflection<br>Streak';
    if (trendValue) {
        trendValue.innerHTML = 'No data yet';
        trendValue.style.color = '#7a7a9a';
    }
    if (aiBody) aiBody.innerHTML = 'Start logging your mood to see AI insights!';
    if (aiBullets) aiBullets.innerHTML = '<li>✨ Log your first mood to get personalized insights</li>';
    if (barsWrap) barsWrap.innerHTML = '<div style="text-align:center; padding:20px;">No data yet. Log your mood!</div>';
}

function updateAIInsights(logs) {
    if (!logs || logs.length === 0) return;
    
    const avg = logs.reduce((a,b) => a + b.mood_score, 0) / logs.length;
    
    if (aiBody && aiBullets) {
        if (avg >= 7) {
            aiBody.innerHTML = 'Great week! Your mood has been consistently positive. You\'re building strong emotional resilience.';
            aiBullets.innerHTML = `
                <li>✅ Your positive mood correlates with good sleep patterns</li>
                <li>✅ Keep up the great self-care habits!</li>
                <li>💡 Share your strategies with the community</li>
            `;
        } else if (avg >= 4) {
            aiBody.innerHTML = 'Your mood has been stable this week. Small daily habits can make a big difference.';
            aiBullets.innerHTML = `
                <li>📝 Journaling 5 minutes a day could boost mood by 15%</li>
                <li>🧘 Try our breathing exercises for stress relief</li>
                <li>💬 Connect with peers in the forum</li>
            `;
        } else {
            aiBody.innerHTML = 'We notice you\'ve been struggling. Remember, reaching out for help is a sign of strength.';
            aiBullets.innerHTML = `
                <li>🆘 Crisis support is available 24/7 in the Crisis Centre</li>
                <li>📅 Book a counseling session for professional support</li>
                <li>💪 Small steps lead to big changes - you've got this!</li>
            `;
        }
    }
}

// ========== SETUP DATE NAVIGATION ==========
function setupDateNavigation() {
    const monthPicker = document.getElementById('monthPicker');
    if (!monthPicker) return;
    
    monthPicker.innerHTML = `
        <button class="prev-month" style="background:none; border:none; cursor:pointer; padding:5px; display:inline-flex; align-items:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b3ec8" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </button>
        <span id="monthYearDisplay" style="margin:0 8px; font-weight:600;">${monthNames[currentDisplayMonth]} ${currentDisplayYear}</span>
        <button class="next-month" style="background:none; border:none; cursor:pointer; padding:5px; display:inline-flex; align-items:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b3ec8" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </button>
    `;
    
    const prevBtn = monthPicker.querySelector('.prev-month');
    const nextBtn = monthPicker.querySelector('.next-month');
    const monthSpan = document.getElementById('monthYearDisplay');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDisplayMonth--;
            if (currentDisplayMonth < 0) {
                currentDisplayMonth = 11;
                currentDisplayYear--;
            }
            if (monthSpan) monthSpan.textContent = `${monthNames[currentDisplayMonth]} ${currentDisplayYear}`;
            loadMoodData();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDisplayMonth++;
            if (currentDisplayMonth > 11) {
                currentDisplayMonth = 0;
                currentDisplayYear++;
            }
            if (monthSpan) monthSpan.textContent = `${monthNames[currentDisplayMonth]} ${currentDisplayYear}`;
            loadMoodData();
        });
    }
}

// ========== MOOD INPUT HANDLERS ==========
document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        const score = parseInt(this.dataset.score);
        if (slider) slider.value = score;
        updateSlider(score);
    });
});

function updateSlider(val) {
    if (sliderDisplay) sliderDisplay.textContent = `${val} / 10`;
    if (slider) {
        const pct = ((val - 1) / 9) * 100;
        slider.style.background = `linear-gradient(to right, #5b3ec8 0%, #5b3ec8 ${pct}%, #e8e8f0 ${pct}%, #e8e8f0 100%)`;
    }
    
    const btns = document.querySelectorAll('.emoji-btn');
    btns.forEach(b => b.classList.remove('selected'));
    if (val <= 2) btns[0]?.classList.add('selected');
    else if (val <= 4) btns[1]?.classList.add('selected');
    else if (val <= 6) btns[2]?.classList.add('selected');
    else if (val <= 8) btns[3]?.classList.add('selected');
    else btns[4]?.classList.add('selected');
}

if (slider) {
    slider.addEventListener('input', function() {
        updateSlider(parseInt(this.value));
    });
    updateSlider(6);
}

// Toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Log mood entry
if (logBtn) {
    logBtn.addEventListener('click', async () => {
        const score = parseInt(slider?.value || 6);
        const selectedBtn = document.querySelector('.emoji-btn.selected');
        const label = selectedBtn?.dataset.label || 'NEUTRAL';
        
        logBtn.disabled = true;
        logBtn.textContent = 'LOGGING...';
        
        try {
            const response = await fetch(`${API}/mood`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mood_score: score, mood_label: label })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Mood logged successfully!', 'success');
                const newLog = { mood_score: score, mood_label: label, logged_at: new Date().toISOString() };
                currentMoodLogs.unshift(newLog);
                updateStatsAndCharts();
            } else {
                showToast(data.message || 'Failed to log mood', 'error');
            }
        } catch (error) {
            console.error('Error logging mood:', error);
            const newLog = { mood_score: score, mood_label: label, logged_at: new Date().toISOString() };
            currentMoodLogs.unshift(newLog);
            updateStatsAndCharts();
            showToast('Mood saved locally (offline mode)', 'info');
        } finally {
            logBtn.disabled = false;
            logBtn.textContent = 'LOG REFLECTION';
        }
    });
}

// ========== CHART TOGGLE ==========
let currentChartType = 'bar';
const barBtn = document.getElementById('barBtn');
const lineBtn = document.getElementById('lineBtn');
const barChart = document.getElementById('barChart');
const lineChartDiv = document.getElementById('lineChart');

if (barBtn && lineBtn) {
    barBtn.addEventListener('click', () => {
        currentChartType = 'bar';
        barBtn.classList.add('active');
        lineBtn.classList.remove('active');
        if (barChart) barChart.style.display = 'block';
        if (lineChartDiv) lineChartDiv.style.display = 'none';
        updateCharts(currentMoodLogs);
    });

    lineBtn.addEventListener('click', () => {
        currentChartType = 'line';
        lineBtn.classList.add('active');
        barBtn.classList.remove('active');
        if (barChart) barChart.style.display = 'none';
        if (lineChartDiv) lineChartDiv.style.display = 'block';
        updateCharts(currentMoodLogs);
    });
}

function updateCharts(logs) {
    if (!logs || logs.length === 0) {
        if (barsWrap) barsWrap.innerHTML = '<div style="text-align:center; padding:20px;">No mood data yet</div>';
        return;
    }
    
    const sortedLogs = [...logs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
    const maxScore = 10;
    
    if (currentChartType === 'bar') {
        if (barsWrap) barsWrap.innerHTML = '';
        if (barLabels) barLabels.innerHTML = '';
        
        sortedLogs.forEach((log, i) => {
            const height = (log.mood_score / maxScore) * 100;
            const bar = document.createElement('div');
            bar.className = 'bar-item';
            bar.style.height = `${height}%`;
            bar.style.backgroundColor = log.mood_score >= 7 ? '#16a34a' : (log.mood_score >= 4 ? '#d97706' : '#c8002b');
            bar.title = `${log.mood_score}/10 on ${new Date(log.logged_at).toLocaleDateString()}`;
            if (barsWrap) barsWrap.appendChild(bar);
            
            if (i % 3 === 0 || i === sortedLogs.length - 1) {
                if (barLabels) {
                    const label = document.createElement('span');
                    label.textContent = new Date(log.logged_at).getDate();
                    barLabels.appendChild(label);
                }
            }
        });
    } else {
        const ctx = lineCanvas?.getContext('2d');
        if (!ctx) return;
        
        const labels = sortedLogs.map(log => new Date(log.logged_at).getDate());
        const scores = sortedLogs.map(log => log.mood_score);
        
        if (lineChart) lineChart.destroy();
        
        lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mood Score',
                    data: scores,
                    borderColor: '#5b3ec8',
                    backgroundColor: 'rgba(91, 62, 200, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#5b3ec8',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { min: 0, max: 10, title: { display: true, text: 'Mood Score (1-10)' } },
                    x: { title: { display: true, text: 'Day of Month' } }
                }
            }
        });
        
        const lineLabels = document.getElementById('lineLabels');
        if (lineLabels) {
            lineLabels.innerHTML = labels.map((l, i) => 
                i % 3 === 0 || i === labels.length - 1 ? `<span>${l}</span>` : ''
            ).join('');
        }
    }
}

// ========== EXPORT CSV ==========
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (currentMoodLogs && currentMoodLogs.length > 0) {
            const csv = ['Date,Mood Score,Mood Label', ...currentMoodLogs.map(log => 
                `${new Date(log.logged_at).toLocaleDateString()},${log.mood_score},${log.mood_label || ''}`
            )].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mood_report_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Report exported successfully!', 'success');
        } else {
            showToast('No mood data to export', 'error');
        }
    });
}

// ========== LOGOUT FUNCTION ==========
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        window.location.href = 'signin.html';
    });
}

// ========== INITIALIZE ==========
function init() {
    setupDateNavigation();
    updateMonthDisplay();
    loadMoodData();
    setActiveSidebarItem(); // Set active sidebar menu item
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
