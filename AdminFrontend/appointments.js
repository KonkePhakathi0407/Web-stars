/* ══════════════════════════════════════
   MindCare Hub – Appointments (auth + real data patch)
   ══════════════════════════════════════ */
const API = 'http://localhost:3000/api/admin';

// ── Apply dark mode ───────────────────────────────────────────────────────────
(function applyStoredTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('mcTheme') || 'light');
})();

// ── Auth + populate name ──────────────────────────────────────────────────────
async function initAppointmentsPage() {
    try {
        const res  = await fetch(`${API}/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) { window.location.href = 'signim.html'; return; }
        const admin = data.admin;

        const sidebarName = document.querySelector('.user-name');
        if (sidebarName) sidebarName.textContent = (admin.first_name||admin.last_name) ? `Dr. ${admin.first_name||''} ${admin.last_name||''}`.trim() : admin.email;

        const avatarEl = document.querySelector('.user-avatar');
        if (avatarEl && admin.profile_picture) {
            avatarEl.innerHTML = `<img src="${admin.profile_picture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            avatarEl.style.fontSize = '0';
        }

        // Load real appointments from DB
        await loadRealAppointments();
    } catch { window.location.href = 'signim.html'; }
}

// ── Load appointments from user database ─────────────────────────────────────
async function loadRealAppointments() {
    try {
        const res  = await fetch(`${API}/appointments?limit=100`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success || !data.appointments || data.appointments.length === 0) return;

        // Populate upcoming appointments list if element exists
        const listEl = document.getElementById('appointmentsList') || document.querySelector('.appointments-list');
        if (!listEl) {
            // Inject a live appointments panel below the calendar
            const content = document.querySelector('.content');
            if (!content) return;
            const panel = document.createElement('div');
            panel.id = 'liveAppointmentsPanel';
            panel.style.cssText = 'margin-top:24px;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;';
            panel.innerHTML = buildAppointmentsTable(data.appointments, data.stats);
            content.appendChild(panel);
        } else {
            listEl.innerHTML = buildAppointmentsTable(data.appointments, data.stats);
        }
    } catch (err) {
        console.warn('Could not load appointments from DB:', err.message);
    }
}

function buildAppointmentsTable(appointments, stats) {
    const statBar = stats ? `
        <div style="display:flex;gap:16px;padding:16px 20px;border-bottom:1px solid var(--border);font-size:12px;">
            <span>Total: <strong>${stats.total || 0}</strong></span>
            <span style="color:#d97706;">Pending: <strong>${stats.pending || 0}</strong></span>
            <span style="color:#2563eb;">Confirmed: <strong>${stats.confirmed || 0}</strong></span>
            <span style="color:#059669;">Completed: <strong>${stats.completed || 0}</strong></span>
            <span style="color:#dc2626;">Cancelled: <strong>${stats.cancelled || 0}</strong></span>
        </div>` : '';

    const rows = appointments.map(a => {
        const date = a.appointment_date ? new Date(a.appointment_date).toLocaleDateString('en-ZA') : 'N/A';
        const studentName = (a.first_name || a.last_name) ? `${a.first_name||''} ${a.last_name||''}`.trim() : (a.email || 'Anonymous');
        const statusColor = { pending:'#d97706', confirmed:'#2563eb', completed:'#059669', cancelled:'#dc2626' }[a.status] || '#6b7280';
        return `<tr>
            <td style="padding:10px 16px;font-size:12px;">${date}</td>
            <td style="padding:10px 16px;font-size:12px;">${studentName}</td>
            <td style="padding:10px 16px;font-size:12px;color:var(--text-muted);">${a.email || ''}</td>
            <td style="padding:10px 16px;font-size:12px;">${a.university || ''}</td>
            <td style="padding:10px 16px;"><span style="font-size:11px;background:${statusColor}22;color:${statusColor};border-radius:6px;padding:2px 8px;font-weight:600;">${a.status || 'N/A'}</span></td>
            <td style="padding:10px 16px;">
                <select onchange="updateApptStatus(${a.id}, this.value)" style="font-size:11px;padding:2px 6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text-primary);">
                    <option value="">Change…</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </td>
        </tr>`;
    }).join('');

    return `
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-weight:600;font-size:14px;">📋 User Appointments</div>
        ${statBar}
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:var(--bg);">
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">DATE</th>
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">STUDENT</th>
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">EMAIL</th>
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">UNIVERSITY</th>
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">STATUS</th>
                        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);">ACTION</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

async function updateApptStatus(id, status) {
    if (!status) return;
    try {
        const res  = await fetch(`${API}/appointments/${id}/status`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            // Reload
            await loadRealAppointments();
        }
    } catch {}
}

initAppointmentsPage();

/* ═══════════════════ ORIGINAL APPOINTMENTS CODE BELOW ═══════════════════ */
/* ══════════════════════════════════════
   MindCare Hub – Appointments JS
   ══════════════════════════════════════ */

// ── WEEK STATE ──────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

let weekOffset = 0; // 0 = current week

function getWeekDates(offset) {
  const now = new Date(2026, 2, 17); // base: Mon 17 Mar 2026
  const start = new Date(now);
  start.setDate(now.getDate() + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatWeekLabel(dates) {
  const s = dates[0],
    e = dates[6];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${months[s.getMonth()]} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]} ${s.getFullYear()}`;
}

// ── SESSION DATA ─────────────────────────────────────────────────
const sessions = [
  {
    id: 1,
    day: 0,
    startH: 9,
    startM: 0,
    endH: 9,
    endM: 50,
    title: "Anony... Intake",
    staff: "Dr. Dlamini",
    type: "Intake",
    color: "purple",
    fullTitle: "Anonymous Intake #42",
    location: "Main Hall",
    tags: ["intake", "priority"],
  },
  {
    id: 2,
    day: 1,
    startH: 9,
    startM: 0,
    endH: 10,
    endM: 0,
    title: "Anony... Follow-up",
    staff: "Counsellor Singh",
    type: "Follow-up",
    color: "blue",
    fullTitle: "Anonymous Follow-up #38",
    location: "Virtual Room 3",
    tags: ["recurring"],
  },
  {
    id: 3,
    day: 2,
    startH: 9,
    startM: 30,
    endH: 10,
    endM: 15,
    title: "Waitlist Slot",
    staff: "Open Allocation",
    type: "Open Slot",
    color: "open",
    fullTitle: "Waitlist Open Slot",
    location: "Room 4",
    tags: [],
  },
  {
    id: 4,
    day: 2,
    startH: 11,
    startM: 0,
    endH: 12,
    endM: 0,
    title: "Anony... CBT",
    staff: "Mazwai",
    type: "CBT Session",
    color: "teal",
    fullTitle: "Anonymous CBT #12",
    location: "Fri 09:00 Room 2",
    tags: ["cbt"],
  },
  {
    id: 5,
    day: 3,
    startH: 10,
    startM: 0,
    endH: 11,
    endM: 0,
    title: "Support Group A",
    staff: "Dr. Patel",
    type: "Group Therapy",
    color: "green",
    fullTitle: "Support Group A",
    location: "Virtual Room 6",
    tags: ["group", "recurring"],
  },
  {
    id: 6,
    day: 4,
    startH: 14,
    startM: 0,
    endH: 16,
    endM: 0,
    title: "Staff Workshop",
    staff: "Main Hall",
    type: "Workshop",
    color: "pink",
    fullTitle: "Staff Wellness Workshop",
    location: "Main Hall",
    tags: [],
  },
];

const upcoming = [
  {
    title: "Intake: Anonymous#42",
    when: "Today at 15:30",
    staff: "Dr. Sarah Jenkins",
    tags: ["intake", "priority"],
    initials: "SJ",
    color: "#7C3AED",
  },
  {
    title: "Support Group A",
    when: "Tomorrow at 10:00",
    staff: "Virtual Room 6",
    tags: ["group", "recurring"],
    initials: "GA",
    color: "#059669",
  },
  {
    title: "CBT Session#12",
    when: "Fri at 09:00",
    staff: "Dr. Mazwai",
    tags: ["cbt"],
    initials: "DM",
    color: "#0D9488",
  },
];

// ── RENDER DAY HEADERS ───────────────────────────────────────────
function renderDayHeaders() {
  const dates = getWeekDates(weekOffset);
  const container = document.getElementById("dayHeaders");
  const today = new Date(2026, 2, 19); // Wed 19 is "today"

  container.innerHTML = '<div class="day-header-spacer"></div>';
  dates.forEach((d, i) => {
    const isToday = d.toDateString() === today.toDateString();
    const isWeekend = i >= 5;
    const div = document.createElement("div");
    div.className = `day-header${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`;
    div.innerHTML = `<span class="day-name">${DAYS[i]}</span><span class="day-num">${d.getDate()}</span>`;
    container.appendChild(div);
  });

  document.getElementById("weekLabel").textContent = formatWeekLabel(dates);
}

// ── RENDER TIME LABELS ───────────────────────────────────────────
function renderTimeLabels() {
  const container = document.getElementById("timeLabels");
  container.innerHTML = "";
  HOURS.forEach((h) => {
    const div = document.createElement("div");
    div.className = "time-label";
    div.textContent = h < 12 ? `${h}:00` : h === 12 ? "12:00" : `${h - 12}:00`;
    container.appendChild(div);
  });
}

// ── RENDER EVENT GRID ─────────────────────────────────────────────
function renderEventGrid() {
  const grid = document.getElementById("eventGrid");
  grid.innerHTML = "";

  for (let col = 0; col < 7; col++) {
    const colDiv = document.createElement("div");
    colDiv.className = "grid-col";

    HOURS.forEach(() => {
      const line = document.createElement("div");
      line.className = "grid-hour-line";
      colDiv.appendChild(line);
    });

    // Add events for this day
    sessions.forEach((ev) => {
      if (ev.day !== col) return;

      const startMin = (ev.startH - HOURS[0]) * 60 + ev.startM;
      const endMin = (ev.endH - HOURS[0]) * 60 + ev.endM;
      const top = (startMin / 60) * 60;
      const height = ((endMin - startMin) / 60) * 60;

      const evDiv = document.createElement("div");
      evDiv.className = `cal-event ${ev.color}`;
      evDiv.style.top = `${top}px`;
      evDiv.style.height = `${Math.max(height - 4, 22)}px`;
      evDiv.innerHTML = `
        <span class="ev-time">${pad(ev.startH)}:${pad(ev.startM)}–${pad(ev.endH)}:${pad(ev.endM)}</span>
        <span class="ev-title">${ev.title}</span>
        <span class="ev-staff">${ev.staff}</span>
      `;
      evDiv.addEventListener("click", () => openEventModal(ev));
      colDiv.appendChild(evDiv);
    });

    grid.appendChild(colDiv);
  }
}

// ── RENDER UPCOMING ───────────────────────────────────────────────
function renderUpcoming() {
  const list = document.getElementById("upcomingList");
  list.innerHTML = "";
  upcoming.forEach((u) => {
    const div = document.createElement("div");
    div.className = "upcoming-item";
    const tagsHtml = u.tags
      .map((t) => `<span class="up-tag ${t}">${t}</span>`)
      .join("");
    div.innerHTML = `
      <div class="upcoming-avatar" style="background:${u.color}20;color:${u.color}">${u.initials}</div>
      <div class="upcoming-info">
        <div class="upcoming-title">${u.title}</div>
        <div class="upcoming-meta">${u.when} · ${u.staff}</div>
        <div class="upcoming-tags">${tagsHtml}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

// ── RENDER LIST VIEW ──────────────────────────────────────────────
function renderListView() {
  const body = document.getElementById("listBody");
  body.innerHTML = "";
  const colorMap = {
    purple: "#7C3AED",
    blue: "#2563EB",
    teal: "#0D9488",
    green: "#059669",
    pink: "#EC4899",
    open: "#9CA3AF",
    amber: "#D97706",
  };

  sessions.forEach((ev) => {
    const div = document.createElement("div");
    div.className = "list-item";
    const dates = getWeekDates(weekOffset);
    const d = dates[ev.day];
    const dateStr = `${DAYS[ev.day]} ${d.getDate()} Mar — ${pad(ev.startH)}:${pad(ev.startM)} to ${pad(ev.endH)}:${pad(ev.endM)}`;
    const tagColor = colorMap[ev.color] || "#9CA3AF";

    div.innerHTML = `
      <div class="list-color-bar" style="background:${tagColor}"></div>
      <div class="list-info">
        <div class="list-title">${ev.fullTitle}</div>
        <div class="list-meta">${dateStr} · ${ev.staff} · ${ev.location}</div>
      </div>
      <span class="list-badge" style="background:${tagColor}20;color:${tagColor}">${ev.type}</span>
    `;
    div.addEventListener("click", () => openEventModal(ev));
    body.appendChild(div);
  });
}

// ── EVENT MODAL ───────────────────────────────────────────────────
function openEventModal(ev) {
  document.getElementById("eventModalTitle").textContent = ev.fullTitle;
  const colorMap = {
    purple: "#7C3AED",
    blue: "#2563EB",
    teal: "#0D9488",
    green: "#059669",
    pink: "#EC4899",
    open: "#9CA3AF",
  };
  const c = colorMap[ev.color] || "#9CA3AF";
  document.getElementById("eventModalBody").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="ev-detail-row"><span class="ev-detail-label">Type</span><span style="color:${c};font-weight:700">${ev.type}</span></div>
      <div class="ev-detail-row"><span class="ev-detail-label">Time</span>${pad(ev.startH)}:${pad(ev.startM)} – ${pad(ev.endH)}:${pad(ev.endM)}</div>
      <div class="ev-detail-row"><span class="ev-detail-label">Staff</span>${ev.staff}</div>
      <div class="ev-detail-row"><span class="ev-detail-label">Location</span>${ev.location}</div>
      <div class="ev-detail-row"><span class="ev-detail-label">Day</span>${DAYS[ev.day]}</div>
    </div>
  `;
  document.getElementById("eventModal").classList.add("show");
}

// ── VIEW TOGGLE ───────────────────────────────────────────────────
let currentView = "calendar";

document.getElementById("calViewBtn").addEventListener("click", () => {
  currentView = "calendar";
  document.getElementById("calViewBtn").classList.add("active");
  document.getElementById("listViewBtn").classList.remove("active");
  document.getElementById("calendarSection").style.display = "flex";
  document.getElementById("listSection").style.display = "none";
});

document.getElementById("listViewBtn").addEventListener("click", () => {
  currentView = "list";
  document.getElementById("listViewBtn").classList.add("active");
  document.getElementById("calViewBtn").classList.remove("active");
  document.getElementById("calendarSection").style.display = "none";
  document.getElementById("listSection").style.display = "flex";
  renderListView();
});

// ── WEEK NAVIGATION ───────────────────────────────────────────────
document.getElementById("prevWeek").addEventListener("click", () => {
  weekOffset--;
  renderDayHeaders();
  renderEventGrid();
});

document.getElementById("nextWeek").addEventListener("click", () => {
  weekOffset++;
  renderDayHeaders();
  renderEventGrid();
});

// ── ADD SESSION MODAL ─────────────────────────────────────────────
const addModal = document.getElementById("addSessionModal");
document
  .getElementById("addSessionBtn")
  .addEventListener("click", () => addModal.classList.add("show"));
document
  .getElementById("closeAddModal")
  .addEventListener("click", () => addModal.classList.remove("show"));
document
  .getElementById("cancelAddSession")
  .addEventListener("click", () => addModal.classList.remove("show"));
addModal.addEventListener("click", (e) => {
  if (e.target === addModal) addModal.classList.remove("show");
});

document.getElementById("confirmAddSession").addEventListener("click", () => {
  addModal.classList.remove("show");
  showToast("Session slot added successfully!", "green");
});

// ── EVENT MODAL CONTROLS ──────────────────────────────────────────
const eventModal = document.getElementById("eventModal");
document
  .getElementById("closeEventModal")
  .addEventListener("click", () => eventModal.classList.remove("show"));
document
  .getElementById("closeEventModalBtn")
  .addEventListener("click", () => eventModal.classList.remove("show"));
document.getElementById("editEventBtn").addEventListener("click", () => {
  eventModal.classList.remove("show");
  showToast("Edit mode coming soon", "purple");
});
eventModal.addEventListener("click", (e) => {
  if (e.target === eventModal) eventModal.classList.remove("show");
});

// ── LOGOUT MODAL ──────────────────────────────────────────────────
const logoutModal = document.getElementById("logoutModal");
document
  .getElementById("logoutTrigger")
  .addEventListener("click", () => logoutModal.classList.add("show"));
document
  .getElementById("cancelLogout")
  .addEventListener("click", () => logoutModal.classList.remove("show"));
document
  .getElementById("confirmLogout")
  .addEventListener("click", () => {
    logoutModal.classList.remove("show");
    window.location.href = "Admin_Landing.html";
  });
logoutModal.addEventListener("click", (e) => {
  if (e.target === logoutModal) logoutModal.classList.remove("show");
});

// ── SYNC TOAST ────────────────────────────────────────────────────
document.getElementById("dismissToast").addEventListener("click", () => {
  const t = document.getElementById("syncToast");
  t.classList.add("hidden");
  setTimeout(() => t.remove(), 400);
});

// ── NOTIFY BUTTON ─────────────────────────────────────────────────
document.getElementById("notifyBtn").addEventListener("click", () => {
  showToast("23 students notified of available slot!", "green");
});

// ── VIEW ALL ──────────────────────────────────────────────────────
document.getElementById("viewAllBtn").addEventListener("click", () => {
  document.getElementById("listViewBtn").click();
});

// ── SEARCH ───────────────────────────────────────────────────────
document.getElementById("searchInput").addEventListener("input", function () {
  const q = this.value.toLowerCase();
  if (!q) {
    renderEventGrid();
    renderListView();
    return;
  }
  // filter list view
  if (currentView === "list") {
    document.querySelectorAll(".list-item").forEach((item) => {
      item.style.display = item.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  }
});

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "") {
  clearTimeout(toastTimer);
  const t = document.getElementById("actionToast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ── HELPERS ───────────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}

// ── INIT ─────────────────────────────────────────────────────────
renderDayHeaders();
renderTimeLabels();
renderEventGrid();
renderUpcoming();

// Default session date to today
const dateInput = document.getElementById("sessionDate");
if (dateInput) dateInput.value = "2026-03-17";

// Auto-dismiss sync toast after 5s
setTimeout(() => {
  const t = document.getElementById("syncToast");
  if (t) {
    t.classList.add("hidden");
    setTimeout(() => t && t.remove(), 400);
  }
}, 5000);
