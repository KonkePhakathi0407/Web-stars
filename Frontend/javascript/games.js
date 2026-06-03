const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    window.location.href = 'signin.html';
  }
document.addEventListener("DOMContentLoaded"), () => {
  // ── SEARCH FILTER ──────────────────────
  const searchInput = document.querySelector(".search-input");
}
// games.js


(function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .mc-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(26,26,46,0.6);
      z-index: 200;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .mc-modal-overlay.open { display: flex; }
    .mc-modal {
      background: #ffffff;
      border-radius: 18px;
      width: 100%;
      max-width: 560px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.2);
      animation: mcModalIn 0.25s ease;
      max-height: 90vh;
      overflow-y: auto;
    }
    @keyframes mcModalIn {
      from { opacity:0; transform: translateY(20px) scale(0.97); }
      to   { opacity:1; transform: none; }
    }
    .mc-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e8e8f0;
      position: sticky; top: 0; background: white; z-index: 1;
    }
    .mc-modal-title { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .mc-modal-close {
      background: none; border: none; cursor: pointer;
      color: #7a7a9a; padding: 6px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .mc-modal-close:hover { background: #f5f5fa; color: #1a1a2e; }
    .mc-modal-body { padding: 20px 24px 24px; }
  `;
  document.head.appendChild(style);
})();

// connecting all the buttons
document.addEventListener("DOMContentLoaded", function () {

  // Search filter
  var searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.toLowerCase();
      document.querySelectorAll(".game-card, .video-card").forEach(function (card) {
        card.style.display = card.innerText.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  // Game buttons
  document.querySelectorAll(".play-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var gameName = btn.closest(".game-card").querySelector(".game-name").textContent.trim();
      openGameModal(gameName);
    });
  });

  // Youtube videos
  var VIDEO_LINKS = {
    "5-Minute Anxiety Release":         "https://youtu.be/MR57rug8NsM?si=W4syIkKqNfYPnkcQ",
    "Grounding Techniques for Students":"https://youtu.be/30VMIEmA114?si=W9GVizAFXeRgF8qp",
    "Overcoming Exam Nerves":           "https://youtu.be/6Rg0mBkVAeo?si=ay1q6peP8Rg4MIFP",
    "Deep Breathing for Exam Success":  "https://youtu.be/DbDoBzGY3vo?si=RoQMumlPXG0f0DYR",
    "Overcoming Procrastination":       "https://youtu.be/irp5ghCVNAM?si=JwqQ3YGnFdsCkQVo",
    "Guided Mindfulness for Focus":     "https://youtu.be/ausxoXBrmWs?si=l6pe0fhB_ARCQYzW",
  };

  document.querySelectorAll(".video-card").forEach(function (card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function () {
      var url = card.getAttribute("data-url");
      if (!url) {
        var titleEl = card.querySelector(".video-title");
        if (titleEl) url = VIDEO_LINKS[titleEl.textContent.trim()];
      }
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  });
});


function openGameModal(gameName) {
  var existing = document.getElementById("gameModal");
  if (existing) existing.remove();

  var bodyHTML = "";
  if (gameName === "Memory Focus")        bodyHTML = buildMemoryGame();
  else if (gameName === "Puzzle Escape Game") bodyHTML = buildPuzzleGame();
  else if (gameName === "Breathing Rhythms")  bodyHTML = buildBreathingGame();

  var modal = document.createElement("div");
  modal.id = "gameModal";
  modal.className = "mc-modal-overlay";
  modal.innerHTML =
    '<div class="mc-modal">' +
      '<div class="mc-modal-header">' +
        '<h2 class="mc-modal-title">' + gameName + '</h2>' +
        '<button class="mc-modal-close" aria-label="Close">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<line x1="18" y1="6" x2="6" y2="18"/>' +
            '<line x1="6" y1="6" x2="18" y2="18"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="mc-modal-body">' + bodyHTML + '</div>' +
    '</div>';

  document.body.appendChild(modal);

  modal.querySelector(".mc-modal-close").addEventListener("click", function () {
    closeGameModal();
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeGameModal();
  });

  function onEsc(e) {
    if (e.key === "Escape") { closeGameModal(); document.removeEventListener("keydown", onEsc); }
  }
  document.addEventListener("keydown", onEsc);

  // Show
  requestAnimationFrame(function () { modal.classList.add("open"); });

  // Auto-shuffle puzzle after DOM settles
  if (gameName === "Puzzle Escape Game") setTimeout(shufflePuzzle, 80);
}

function closeGameModal() {
  stopBreathing();
  var modal = document.getElementById("gameModal");
  if (modal) {
    modal.classList.remove("open");
    setTimeout(function () { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 250);
  }
}


// MEMORY FOCUS

function buildMemoryGame() {
  var tiles = "";
  for (var i = 0; i < 9; i++) {
    tiles +=
      '<button onclick="memTileClick(' + i + ')" id="memTile' + i + '" ' +
      'style="height:80px;border-radius:12px;border:2px solid #e8e8f0;background:#f7f4ff;' +
      'cursor:pointer;transition:all 0.15s;font-size:22px"></button>';
  }
  return (
    '<p style="font-size:14px;color:#4a4a6a;margin-bottom:20px;line-height:1.6">' +
      'Memorise the pattern, then recreate it. Each round adds one more step.' +
    '</p>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<span style="font-size:13px;font-weight:600;color:#7a7a9a">ROUND <span id="memRound">1</span></span>' +
      '<span style="font-size:13px;font-weight:600;color:#7a7a9a">SCORE <span id="memScore">0</span></span>' +
    '</div>' +
    '<div id="memGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">' +
      tiles +
    '</div>' +
    '<div id="memStatus" style="text-align:center;font-size:14px;font-weight:600;color:#5b3ec8;margin-bottom:16px">Watch the pattern…</div>' +
    '<button onclick="startMemoryGame()" id="memStartBtn" ' +
    'style="width:100%;background:#5b3ec8;color:white;border:none;border-radius:12px;padding:14px;' +
    'font-size:14px;font-weight:700;font-family:\'DM Sans\',sans-serif;cursor:pointer">Start Game</button>'
  );
}

var memSequence = [], memPlayerSeq = [], memRound = 1, memScore = 0, memWaiting = false;
var EMOJIS = ["🌟","🎯","💜","🔥","🌊","🎵","🌿","⚡","🦋"];

function startMemoryGame() {
  memSequence = []; memPlayerSeq = []; memRound = 1; memScore = 0;
  document.getElementById("memScore").textContent = "0";
  document.getElementById("memStartBtn").style.display = "none";
  addMemStep();
}

function addMemStep() {
  memPlayerSeq = []; memWaiting = false;
  memSequence.push(Math.floor(Math.random() * 9));
  document.getElementById("memRound").textContent = memRound;
  document.getElementById("memStatus").textContent = "Watch the pattern…";
  playMemSequence(0);
}

function playMemSequence(idx) {
  if (idx >= memSequence.length) {
    memWaiting = true;
    document.getElementById("memStatus").textContent = "Your turn! Repeat the pattern.";
    return;
  }
  var tileId = "memTile" + memSequence[idx];
  var tile = document.getElementById(tileId);
  if (!tile) return;
  setTimeout(function () {
    tile.style.background = "#5b3ec8";
    tile.style.borderColor = "#5b3ec8";
    tile.textContent = EMOJIS[memSequence[idx]];
    setTimeout(function () {
      tile.style.background = "#f7f4ff";
      tile.style.borderColor = "#e8e8f0";
      tile.textContent = "";
      playMemSequence(idx + 1);
    }, 600);
  }, idx * 900);
}

function memTileClick(i) {
  if (!memWaiting) return;
  var tile = document.getElementById("memTile" + i);
  tile.style.background = "#eee9ff";
  tile.textContent = EMOJIS[i];
  setTimeout(function () { tile.style.background = "#f7f4ff"; tile.textContent = ""; }, 300);
  memPlayerSeq.push(i);
  var pos = memPlayerSeq.length - 1;
  if (memPlayerSeq[pos] !== memSequence[pos]) {
    document.getElementById("memStatus").textContent = "❌ Wrong! You scored " + memScore + ". Try again.";
    memWaiting = false;
    var btn = document.getElementById("memStartBtn");
    btn.style.display = "block";
    btn.textContent = "Play Again";
    return;
  }
  if (memPlayerSeq.length === memSequence.length) {
    memScore += memRound * 10;
    memRound++;
    document.getElementById("memScore").textContent = memScore;
    document.getElementById("memStatus").textContent = "✅ Correct! Next round…";
    memWaiting = false;
    setTimeout(addMemStep, 1000);
  }
}

// PUZZLE ESCAPE GAME
function buildPuzzleGame() {
  return (
    '<p style="font-size:14px;color:#4a4a6a;margin-bottom:20px;line-height:1.6">' +
      'Slide the tiles to restore the image. Click a tile next to the empty space to move it.' +
    '</p>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<span style="font-size:13px;font-weight:600;color:#7a7a9a">MOVES: <span id="puzzleMoves">0</span></span>' +
      '<button onclick="shufflePuzzle()" style="background:none;border:1px solid #e8e8f0;border-radius:8px;' +
      'padding:6px 14px;font-size:12px;font-weight:600;font-family:\'DM Sans\',sans-serif;cursor:pointer;color:#4a4a6a">Shuffle</button>' +
    '</div>' +
    '<div id="puzzleGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:300px;margin:0 auto 20px"></div>' +
    '<div id="puzzleStatus" style="text-align:center;font-size:14px;font-weight:600;color:#5b3ec8;min-height:22px"></div>'
  );
}

var PUZZLE_EMOJIS = ["🌸","🌊","🌿","🦋","⭐","🌙","🔮","🎯",""];
var puzzleState = [0,1,2,3,4,5,6,7,8];
var puzzleMoves = 0;

function renderPuzzle() {
  var grid = document.getElementById("puzzleGrid");
  if (!grid) return;
  grid.innerHTML = "";
  puzzleState.forEach(function (val, idx) {
    var btn = document.createElement("button");
    var isEmpty = (val === 8);
    btn.style.cssText =
      "height:90px;border-radius:10px;font-size:28px;" +
      "border:2px solid " + (isEmpty ? "transparent" : "#e8e8f0") + ";" +
      "background:" + (isEmpty ? "transparent" : "#f7f4ff") + ";" +
      "cursor:" + (isEmpty ? "default" : "pointer") + ";transition:all 0.15s;";
    btn.textContent = PUZZLE_EMOJIS[val];
    if (!isEmpty) {
      (function (index) {
        btn.onclick = function () { movePuzzleTile(index); };
      })(idx);
    }
    grid.appendChild(btn);
  });
}

function movePuzzleTile(idx) {
  var empty = puzzleState.indexOf(8);
  var sameRow = Math.floor(idx / 3) === Math.floor(empty / 3);
  var canMove =
    (idx === empty - 1 && sameRow) ||
    (idx === empty + 1 && sameRow) ||
    idx === empty - 3 ||
    idx === empty + 3;
  if (!canMove) return;
  var tmp = puzzleState[idx];
  puzzleState[idx] = puzzleState[empty];
  puzzleState[empty] = tmp;
  puzzleMoves++;
  var movesEl = document.getElementById("puzzleMoves");
  if (movesEl) movesEl.textContent = puzzleMoves;
  renderPuzzle();
  if (puzzleState.join("") === "012345678") {
    var statusEl = document.getElementById("puzzleStatus");
    if (statusEl) statusEl.textContent = "🎉 Solved in " + puzzleMoves + " moves!";
  }
}

function shufflePuzzle() {
  puzzleMoves = 0;
  puzzleState = [0,1,2,3,4,5,6,7,8];
  var movesEl  = document.getElementById("puzzleMoves");
  var statusEl = document.getElementById("puzzleStatus");
  if (movesEl)  movesEl.textContent  = "0";
  if (statusEl) statusEl.textContent = "";
  for (var i = 0; i < 100; i++) {
    var empty = puzzleState.indexOf(8);
    var moves = [];
    if (empty % 3 !== 0) moves.push(empty - 1);
    if (empty % 3 !== 2) moves.push(empty + 1);
    if (empty >= 3)      moves.push(empty - 3);
    if (empty <= 5)      moves.push(empty + 3);
    var pick = moves[Math.floor(Math.random() * moves.length)];
    var tmp2 = puzzleState[empty];
    puzzleState[empty] = puzzleState[pick];
    puzzleState[pick]  = tmp2;
  }
  renderPuzzle();
}

// BREATHING RHYTHMS
function buildBreathingGame() {
  return (
    '<p style="font-size:14px;color:#4a4a6a;margin-bottom:24px;line-height:1.6;text-align:center">' +
      'Follow the circle. Breathe in as it expands, hold, then breathe out as it shrinks.' +
    '</p>' +
    '<div style="display:flex;flex-direction:column;align-items:center;gap:20px">' +
      '<div id="breathCircle" style="width:140px;height:140px;border-radius:50%;' +
        'background:radial-gradient(circle,#7c4fd4,#5b3ec8);' +
        'box-shadow:0 0 0 20px rgba(91,62,200,0.1);transition:all 1s ease;' +
        'display:flex;align-items:center;justify-content:center;">' +
        '<span id="breathLabel" style="color:white;font-size:16px;font-weight:700;font-family:\'DM Sans\',sans-serif">Ready</span>' +
      '</div>' +
      '<div style="width:200px;height:6px;background:#e8e8f0;border-radius:99px;overflow:hidden">' +
        '<div id="breathBar" style="height:100%;width:0%;background:#5b3ec8;border-radius:99px;transition:width 0.1s linear"></div>' +
      '</div>' +
      '<div style="font-size:13px;color:#7a7a9a;font-weight:600">Cycles: <span id="breathCount">0</span></div>' +
      '<div style="display:flex;gap:12px">' +
        '<button onclick="startBreathing()" id="breathStartBtn" ' +
          'style="background:#5b3ec8;color:white;border:none;border-radius:12px;padding:12px 28px;' +
          'font-size:14px;font-weight:700;font-family:\'DM Sans\',sans-serif;cursor:pointer">Begin</button>' +
        '<button onclick="stopBreathing()" id="breathStopBtn" ' +
          'style="display:none;background:#e8e8f0;color:#4a4a6a;border:none;border-radius:12px;padding:12px 28px;' +
          'font-size:14px;font-weight:700;font-family:\'DM Sans\',sans-serif;cursor:pointer">Stop</button>' +
      '</div>' +
      '<div id="breathTip" style="font-size:13px;color:#7a7a9a;text-align:center;max-width:260px;line-height:1.6"></div>' +
    '</div>'
  );
}

var BREATH_PHASES = [
  { label: "Breathe In",  duration: 4000, size: "180px", opacity: 0.2  },
  { label: "Hold",        duration: 7000, size: "180px", opacity: 0.25 },
  { label: "Breathe Out", duration: 8000, size: "120px", opacity: 0.1  },
];
var BREATH_TIPS = [
  "Box breathing reduces cortisol by up to 30%.",
  "This technique is used by Navy SEALs to stay calm under pressure.",
  "Even 2 minutes of deep breathing improves focus significantly.",
  "Your heart rate is already slowing down. Keep going.",
];

var breathRunning = false, breathPhase = 0, breathCycles = 0;
var breathTimeout = null, breathBarInterval = null, breathBarStart = 0;

function startBreathing() {
  breathRunning = true; breathCycles = 0; breathPhase = 0;
  var s = document.getElementById("breathStartBtn");
  var e = document.getElementById("breathStopBtn");
  if (s) s.style.display = "none";
  if (e) e.style.display = "inline-block";
  runBreathPhase();
}

function stopBreathing() {
  breathRunning = false;
  clearTimeout(breathTimeout);
  clearInterval(breathBarInterval);
  var circle = document.getElementById("breathCircle");
  var label  = document.getElementById("breathLabel");
  var bar    = document.getElementById("breathBar");
  var sBtn   = document.getElementById("breathStartBtn");
  var eBtn   = document.getElementById("breathStopBtn");
  var tip    = document.getElementById("breathTip");
  if (circle) { circle.style.width = "140px"; circle.style.height = "140px"; circle.style.boxShadow = "0 0 0 20px rgba(91,62,200,0.1)"; }
  if (label)  label.textContent = "Done";
  if (bar)    bar.style.width = "0%";
  if (sBtn)   sBtn.style.display = "inline-block";
  if (eBtn)   eBtn.style.display = "none";
  if (tip)    tip.textContent = "Great session! You completed " + breathCycles + " full cycle" + (breathCycles !== 1 ? "s" : "") + ".";
}

function runBreathPhase() {
  if (!breathRunning) return;
  var phase  = BREATH_PHASES[breathPhase];
  var circle = document.getElementById("breathCircle");
  var label  = document.getElementById("breathLabel");
  var bar    = document.getElementById("breathBar");
  if (!circle || !label || !bar) return;

  circle.style.width     = phase.size;
  circle.style.height    = phase.size;
  circle.style.boxShadow = "0 0 0 20px rgba(91,62,200," + phase.opacity + ")";
  label.textContent      = phase.label;

  bar.style.width  = "0%";
  breathBarStart   = Date.now();
  clearInterval(breathBarInterval);
  breathBarInterval = setInterval(function () {
    var pct = Math.min(((Date.now() - breathBarStart) / phase.duration) * 100, 100);
    bar.style.width = pct + "%";
  }, 50);

  breathTimeout = setTimeout(function () {
    clearInterval(breathBarInterval);
    breathPhase = (breathPhase + 1) % BREATH_PHASES.length;
    if (breathPhase === 0) {
      breathCycles++;
      var countEl = document.getElementById("breathCount");
      var tipEl   = document.getElementById("breathTip");
      if (countEl) countEl.textContent = breathCycles;
      if (tipEl)   tipEl.textContent   = BREATH_TIPS[breathCycles % BREATH_TIPS.length];
    }
    runBreathPhase();
  }, phase.duration);
}