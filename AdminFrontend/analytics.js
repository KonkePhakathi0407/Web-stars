/* ══════════════════════════════════════
   MindCare Hub – Analytics (auth + search + notifications patch)
   ══════════════════════════════════════ */
const API = 'http://localhost:3000/api/admin';

// ── Apply dark mode ───────────────────────────────────────────────────────────
function applyStoredTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('mcTheme') || 'light');
}
applyStoredTheme();

// ── Auth + populate doctor name ───────────────────────────────────────────────
async function initAnalyticsPage() {
    try {
        const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) { window.location.href = 'signim.html'; return; }
        const admin = data.admin;

        // Topbar profile chip
        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = `Dr. ${admin.last_name || admin.first_name || admin.email}`;
        const profileSub = document.querySelector('.profile-sub');
        if (profileSub) profileSub.textContent = admin.role || 'Analytics Lead';
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            if (admin.profile_picture) {
                profileAvatar.innerHTML = `<img src="${admin.profile_picture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                profileAvatar.style.fontSize = '0';
            } else {
                profileAvatar.textContent = `${(admin.first_name||'')[0]||''}${(admin.last_name||'')[0]||''}`.toUpperCase() || 'A';
            }
        }

        // Sidebar
        const sidebarName = document.querySelector('.user-name');
        if (sidebarName) sidebarName.textContent = (admin.first_name||admin.last_name) ? `Dr. ${admin.first_name||''} ${admin.last_name||''}`.trim() : admin.email;
        const avatarEl = document.querySelector('.user-avatar');
        if (avatarEl) {
            if (admin.profile_picture) {
                avatarEl.innerHTML = `<img src="${admin.profile_picture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                avatarEl.style.fontSize = '0';
            } else {
                avatarEl.textContent = `${(admin.first_name||'')[0]||''}${(admin.last_name||'')[0]||''}`.toUpperCase() || 'A';
            }
        }

        await loadNotificationsAnalytics();
    } catch { window.location.href = 'signim.html'; }
}

// ── Notifications ─────────────────────────────────────────────────────────────
async function loadNotificationsAnalytics() {
    try {
        const res  = await fetch(`${API}/admins/me/notifications`, { credentials: 'include' });
        const data = await res.json();
        const dot  = document.querySelector('.notif-dot');
        if (!dot) return;
        if (data.success && data.count > 0) {
            dot.style.display = 'block';
            const notifBtn = document.querySelector('.topbar-icon-btn');
            if (notifBtn) notifBtn.addEventListener('click', () => toggleAnalyticsNotifPanel(data.notifications));
        } else {
            dot.style.display = 'none';
        }
    } catch {
        const dot = document.querySelector('.notif-dot');
        if (dot) dot.style.display = 'none';
    }
}

function toggleAnalyticsNotifPanel(notifications) {
    let panel = document.getElementById('notifPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'notifPanel';
    panel.style.cssText = 'position:fixed;top:64px;right:20px;width:320px;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;overflow:hidden;';
    const header = `<div style="padding:14px 16px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border);">Notifications <span style="background:var(--accent);color:#fff;border-radius:9px;padding:1px 7px;font-size:11px;margin-left:6px;">${notifications.length}</span></div>`;
    const items  = notifications.map(n => `<div style="padding:12px 16px;border-bottom:1px solid var(--border);"><div style="font-size:12px;font-weight:600;">${n.title}</div><div style="font-size:11px;color:var(--text-muted);">${n.message}</div></div>`).join('');
    const noItems = notifications.length === 0 ? `<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-muted);">No new notifications</div>` : '';
    panel.innerHTML = header + items + noItems;
    document.body.appendChild(panel);
    setTimeout(() => {
        document.addEventListener('click', function h(e) { if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', h); } });
    }, 100);
}

// ── Search bar ────────────────────────────────────────────────────────────────
// Searches across: KPI labels, signup faculty names, risk titles
function initAnalyticsSearch() {
    const searchInput = document.querySelector('.topbar-search input');
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        // Filter signup table rows
        document.querySelectorAll('#signupsTableBody tr').forEach(tr => {
            const text = tr.textContent.toLowerCase();
            tr.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
        // Filter risk items
        document.querySelectorAll('.risk-item').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
        // Filter scheduled report items
        document.querySelectorAll('.scheduled-item').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
    });
}

// ── Override logout to use real API ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const confirmLogout = document.getElementById('confirmLogout');
    if (confirmLogout) {
        confirmLogout.addEventListener('click', async () => {
            try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
            window.location.href = 'signim.html';
        }, { once: true });
    }
    initAnalyticsSearch();
});

initAnalyticsPage();

/* ═══════════════════ ORIGINAL ANALYTICS CODE BELOW ═══════════════════ */
/* ══════════════════════════════════════
   MindCare Hub – Analytics JS
   ══════════════════════════════════════ */

// ── DATA ──────────────────────────────────────────────────────
const MOOD_MONTH = [6.1, 5.9, 6.4, 6.8, 6.5, 6.3, 6.7, 6.9, 6.2, 6.8, 7.0, 6.6];
const MOOD_LABELS_MONTH = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
  "Week 7",
  "Week 8",
  "Week 9",
  "Week 10",
  "Week 11",
  "Week 12",
];
const MOOD_WEEK = [6.5, 6.2, 7.1, 6.8, 6.4, 5.9, 6.6];
const MOOD_LABELS_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ISSUES = [
  { name: "Exam Anxiety", pct: 42, color: "#7C3AED" },
  { name: "Social Isolation", pct: 28, color: "#A78BFA" },
  { name: "Depression", pct: 15, color: "#C4B5FD" },
  { name: "Financial Stress", pct: 10, color: "#2563EB" },
  { name: "Relationship", pct: 5, color: "#93C5FD" },
];

const FEATURES = [
  { label: "Journals", pct: 72, color: "#7C3AED" },
  { label: "Chat", pct: 18, color: "#2563EB" },
  { label: "Resources", pct: 10, color: "#D1D5DB" },
];

const SIGNUPS = [
  {
    faculty: "Faculty of Humanities",
    users: 412,
    reliability: "HIGH",
    trend: "up",
  },
  { faculty: "Health Sciences", users: 289, reliability: "HIGH", trend: "up" },
  {
    faculty: "Engineering & BE",
    users: 154,
    reliability: "MED",
    trend: "flat",
  },
  { faculty: "Law & Commerce", users: 203, reliability: "HIGH", trend: "up" },
  { faculty: "Education", users: 89, reliability: "MED", trend: "down" },
];

const RISKS = [
  {
    title: 'Keyword: "Self-Harm" Spike',
    meta: "3 new instances found in anonymous forum posts",
    icon: "red",
    badge: "now",
  },
  {
    title: "Sudden Inactivity Shift",
    meta: "32 previously active users went dark in 48 hrs",
    icon: "amber",
    badge: "yest",
  },
];

const SCHEDULED = [
  {
    title: "Weekly Performance Summary",
    freq: "Every Monday at 06:00",
    icon: "purple",
    on: true,
  },
  {
    title: "POPIA Compliance Audit",
    freq: "Monthly on the 1st",
    icon: "green",
    on: false,
  },
];

const PREV_REPORTS = [
  "LU_Analytics_Feb_2026.pdf",
  "LU_Analytics_Jan_2026.pdf",
  "Quarterly_Impact_Q4_2025.pdf",
];

const SPARKLINE_DATA = [190, 210, 225, 218, 234, 228, 234];

// ── HELPERS ──────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "") {
  clearTimeout(toastTimer);
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function animateCount(el, target, isFloat = false, duration = 1200) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = isFloat
      ? (ease * target).toFixed(1)
      : Math.floor(ease * target).toLocaleString();
    el.textContent = val;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── KPI COUNTERS ─────────────────────────────────────────────
window.addEventListener("load", () => {
  animateCount(document.getElementById("kpiUsers"), 1247);
  animateCount(document.getElementById("kpiMood"), 6.8, true);
  animateCount(document.getElementById("kpiJournals"), 3891);
  animateCount(document.getElementById("kpiHelp"), 234);

  // mood bar
  setTimeout(() => {
    document.getElementById("moodFill").style.width = "68%";
  }, 300);

  // sparkline
  drawSparkline();
  renderIssues();
  renderDonut();
  renderSignups();
  renderRiskList();
  renderScheduled();
  renderPrevReports();
  drawMoodChart("month");
});

// ── SPARKLINE ─────────────────────────────────────────────────
function drawSparkline() {
  const canvas = document.getElementById("sparkline");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const data = SPARKLINE_DATA;
  const min = Math.min(...data),
    max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min)) * (H - 6) - 3,
  }));
  ctx.clearRect(0, 0, W, H);
  // gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(124,58,237,0.25)");
  grad.addColorStop(1, "rgba(124,58,237,0)");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  // line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = "#7C3AED";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();
  // last dot
  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#7C3AED";
  ctx.fill();
}

// ── MOOD BAR CHART ────────────────────────────────────────────
let moodChartData = { labels: MOOD_LABELS_MONTH, values: MOOD_MONTH };
let moodAnim = null;

function drawMoodChart(period) {
  const canvas = document.getElementById("moodChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.offsetWidth || 500;
  canvas.width = W;
  const H = canvas.height;
  const data = period === "month" ? MOOD_MONTH : MOOD_WEEK;
  const labels = period === "month" ? MOOD_LABELS_MONTH : MOOD_LABELS_WEEK;
  const maxVal = 10;
  const padL = 36,
    padR = 16,
    padT = 14,
    padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = (chartW / data.length) * 0.55;
  const barGap = chartW / data.length;
  // today bar index
  const todayIdx = period === "month" ? 9 : 2;

  let progress = 0;
  if (moodAnim) cancelAnimationFrame(moodAnim);
  const start = performance.now();

  function draw(now) {
    progress = Math.min((now - start) / 700, 1);
    const ease = 1 - Math.pow(1 - progress, 2);

    ctx.clearRect(0, 0, W, H);

    // gridlines
    ctx.strokeStyle = "#F3F4F6";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padT + chartH - (i / 5) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "10px DM Sans";
      ctx.textAlign = "right";
      ctx.fillText((i * 2).toString(), padL - 6, y + 4);
    }

    // bars
    data.forEach((val, i) => {
      const bh = (val / maxVal) * chartH * ease;
      const x = padL + i * barGap + (barGap - barW) / 2;
      const y = padT + chartH - bh;
      const isToday = i === todayIdx;

      // bar gradient
      const grad = ctx.createLinearGradient(0, y, 0, padT + chartH);
      if (isToday) {
        grad.addColorStop(0, "#5B21B6");
        grad.addColorStop(1, "#7C3AED");
      } else {
        grad.addColorStop(0, "#C4B5FD");
        grad.addColorStop(1, "#DDD6FE");
      }
      ctx.fillStyle = grad;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, padT + chartH);
      ctx.lineTo(x, padT + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // tooltip box for today
      if (isToday && progress > 0.8) {
        const bx = x + barW / 2;
        const by = y - 8;
        ctx.fillStyle = "#1F2937";
        const tw = 32,
          th = 20,
          tr = 5;
        ctx.beginPath();
        ctx.roundRect(bx - tw / 2, by - th, tw, th, tr);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(val.toFixed(1), bx, by - 6);
      }

      // label
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "9px DM Sans";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x + barW / 2, padT + chartH + 14);
    });

    if (progress < 1) moodAnim = requestAnimationFrame(draw);
  }

  moodAnim = requestAnimationFrame(draw);
}

// Toggle month/week
document.getElementById("tglMonth").addEventListener("click", () => {
  document.getElementById("tglMonth").classList.add("active");
  document.getElementById("tglWeek").classList.remove("active");
  drawMoodChart("month");
});
document.getElementById("tglWeek").addEventListener("click", () => {
  document.getElementById("tglWeek").classList.add("active");
  document.getElementById("tglMonth").classList.remove("active");
  drawMoodChart("week");
});

// ── ISSUES LIST ───────────────────────────────────────────────
function renderIssues() {
  const el = document.getElementById("issuesList");
  el.innerHTML = ISSUES.map(
    (issue) => `
    <div class="issue-row">
      <div class="issue-meta">
        <span class="issue-name">${issue.name}</span>
        <span class="issue-pct">${issue.pct}%</span>
      </div>
      <div class="issue-bar-bg">
        <div class="issue-bar" style="width:0%;background:${issue.color}" data-width="${issue.pct}%"></div>
      </div>
    </div>
  `,
  ).join("");
  // animate bars
  setTimeout(() => {
    el.querySelectorAll(".issue-bar").forEach(
      (b) => (b.style.width = b.dataset.width),
    );
  }, 200);
}

// ── DONUT CHART ───────────────────────────────────────────────
function renderDonut() {
  const canvas = document.getElementById("donutChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const cx = W / 2,
    cy = H / 2,
    r = 48,
    inner = 30;
  const total = FEATURES.reduce((s, f) => s + f.pct, 0);

  let startAngle = -Math.PI / 2;
  let progress = 0;
  const startTime = performance.now();

  function draw(now) {
    progress = Math.min((now - startTime) / 800, 1);
    const ease = 1 - Math.pow(1 - progress, 2);
    ctx.clearRect(0, 0, W, H);

    let sa = startAngle;
    FEATURES.forEach((f) => {
      const slice = (f.pct / total) * 2 * Math.PI * ease;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sa, sa + slice);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();
      // inner white circle
      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff";
      ctx.fill();
      sa += slice;
    });

    if (progress < 1) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // legend
  const legend = document.getElementById("donutLegend");
  legend.innerHTML = FEATURES.map(
    (f) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${f.color}"></span>
      <span>${f.label}</span>
      <span class="legend-val">${f.pct}%</span>
    </div>
  `,
  ).join("");

  // hover updates center text
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - canvas.width / 2;
    const my = e.clientY - rect.top - canvas.height / 2;
    const dist = Math.sqrt(mx * mx + my * my);
    if (dist < 48 && dist > 30) {
      let angle = Math.atan2(my, mx) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;
      let sa = 0,
        hovered = null;
      FEATURES.forEach((f) => {
        const slice = (f.pct / 100) * 2 * Math.PI;
        if (angle >= sa && angle < sa + slice) hovered = f;
        sa += slice;
      });
      if (hovered) {
        document.getElementById("donutPct").textContent = hovered.pct + "%";
        document.getElementById("donutLbl").textContent = hovered.label;
      }
    } else {
      document.getElementById("donutPct").textContent = "72%";
      document.getElementById("donutLbl").textContent = "Journals";
    }
  });
}

// ── SIGNUPS TABLE ─────────────────────────────────────────────
function renderSignups() {
  const tbody = document.getElementById("signupsBody");
  tbody.innerHTML = SIGNUPS.map((s) => {
    const arrow = s.trend === "up" ? "↗" : s.trend === "down" ? "↘" : "→";
    const cls =
      s.trend === "up"
        ? "trend-up"
        : s.trend === "down"
          ? "trend-down"
          : "trend-flat";
    const relCls = s.reliability === "HIGH" ? "high" : "med";
    return `
      <tr>
        <td>${s.faculty}</td>
        <td><strong>${s.users}</strong></td>
        <td><span class="reliability-badge ${relCls}">${s.reliability}</span></td>
        <td><span class="trend-arrow ${cls}">${arrow}</span></td>
      </tr>
    `;
  }).join("");
}

// ── RISK LIST ─────────────────────────────────────────────────
function renderRiskList() {
  const el = document.getElementById("riskList");
  el.innerHTML = RISKS.map(
    (r) => `
    <div class="risk-item">
      <div class="risk-item-header">
        <div class="risk-icon ${r.icon}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${
              r.icon === "red"
                ? '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>'
                : '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
            }
          </svg>
        </div>
        <span class="risk-title">${r.title}</span>
        <span class="risk-badge ${r.badge}">${r.badge === "now" ? "3h ago" : "Yesterday"}</span>
      </div>
      <div class="risk-meta">${r.meta}</div>
    </div>
  `,
  ).join("");
}

// ── SCHEDULED REPORTS ─────────────────────────────────────────
function renderScheduled() {
  const el = document.getElementById("scheduledList");
  el.innerHTML = SCHEDULED.map(
    (s, i) => `
    <div class="scheduled-item">
      <div class="sched-icon ${s.icon}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${
            s.icon === "purple"
              ? '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
              : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
          }
        </svg>
      </div>
      <div class="sched-info">
        <div class="sched-title">${s.title}</div>
        <div class="sched-freq">${s.freq}</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${s.on ? "checked" : ""} data-idx="${i}" class="sched-toggle">
        <span class="toggle-slider"></span>
      </label>
    </div>
  `,
  ).join("");

  el.querySelectorAll(".sched-toggle").forEach((cb) => {
    cb.addEventListener("change", function () {
      const idx = parseInt(this.dataset.idx);
      SCHEDULED[idx].on = this.checked;
      showToast(
        `${SCHEDULED[idx].title} ${this.checked ? "enabled" : "disabled"}`,
        this.checked ? "purple" : "",
      );
    });
  });
}

// ── PREV REPORTS ──────────────────────────────────────────────
function renderPrevReports() {
  const el = document.getElementById("prevReportsList");
  el.innerHTML = PREV_REPORTS.map(
    (name) => `
    <div class="prev-report-item">
      <div class="prev-report-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <span class="prev-report-name">${name}</span>
      <button class="download-btn" data-name="${name}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    </div>
  `,
  ).join("");

  el.querySelectorAll(".download-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      showToast(`Downloading ${btn.dataset.name}…`, "purple"),
    );
  });
}

// ── MODALS ────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

document
  .getElementById("generateReportBtn")
  .addEventListener("click", () => openModal("reportModal"));
document
  .getElementById("closeReportModal")
  .addEventListener("click", () => closeModal("reportModal"));
document
  .getElementById("cancelReport")
  .addEventListener("click", () => closeModal("reportModal"));
document.getElementById("confirmReport").addEventListener("click", () => {
  closeModal("reportModal");
  showToast("Generating report… Download will start shortly.", "purple");
});

document
  .getElementById("mitigationBtn")
  .addEventListener("click", () => openModal("mitigationModal"));
document
  .getElementById("closeMitigationModal")
  .addEventListener("click", () => closeModal("mitigationModal"));
document
  .getElementById("cancelMitigation")
  .addEventListener("click", () => closeModal("mitigationModal"));

document
  .getElementById("addScheduleBtn")
  .addEventListener("click", () =>
    showToast("New schedule feature coming soon!", "purple"),
  );

document
  .getElementById("logoutTrigger")
  .addEventListener("click", () => openModal("logoutModal"));
document
  .getElementById("cancelLogout")
  .addEventListener("click", () => closeModal("logoutModal"));
document.getElementById("confirmLogout").addEventListener("click", () => {
  showToast("Logging out…", "red");
  setTimeout(() => { window.location.href = "Admin_Landing.html"; }, 1500);
});

// Close modals on overlay click
["reportModal", "mitigationModal", "logoutModal"].forEach((id) => {
  document.getElementById(id).addEventListener("click", function (e) {
    if (e.target === this) closeModal(id);
  });
});

// Redraw mood chart on resize
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const active = document
      .getElementById("tglMonth")
      .classList.contains("active")
      ? "month"
      : "week";
    drawMoodChart(active);
  }, 150);
});
