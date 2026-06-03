const API = "http://localhost:3000/api";
const POSTS_PER_PAGE = 8;

const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) window.location.href = "signin.html";

document.getElementById("peersOnline").textContent =
  Math.floor(Math.random() * 500 + 500) + " Peers Online";

// ── State ──
let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
let currentFilter = "all";
let currentSort = "recent";
let savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
let reportTargetId = null;
let selectedReportReason = null;

// ── Helpers ──
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById("shareToast");
  t.innerHTML = `<i class="ti ti-link" aria-hidden="true"></i> ${escapeHtml(msg)}`;
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), 2500);
}

// ── Reactions stored in localStorage ──
function getReactions(postId) {
  const all = JSON.parse(localStorage.getItem("reactions") || "{}");
  return all[postId] || { relate: 0, strong: 0, thanks: 0, mine: null };
}
function saveReaction(postId, type) {
  const all = JSON.parse(localStorage.getItem("reactions") || "{}");
  const r = all[postId] || { relate: 0, strong: 0, thanks: 0, mine: null };
  if (r.mine === type) {
    r[type] = Math.max(0, r[type] - 1);
    r.mine = null;
  } else {
    if (r.mine) r[r.mine] = Math.max(0, r[r.mine] - 1);
    r[type]++;
    r.mine = type;
  }
  all[postId] = r;
  localStorage.setItem("reactions", JSON.stringify(all));
  return r;
}

// ── Revealed TW posts ──
const revealedTW = new Set();

// ── Render posts ──
function renderPosts() {
  const feed = document.getElementById("postsFeed");
  if (filteredPosts.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="ti ti-messages" aria-hidden="true"></i></div>
        <h3>No posts here yet</h3>
        <p>Be the first to share something in this category.</p>
      </div>`;
    document.getElementById("paginationRow").style.display = "none";
    return;
  }
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(start, start + POSTS_PER_PAGE);

  feed.innerHTML = pagePosts
    .map((post) => {
      const isSaved = savedPosts.includes(post.id);
      const reactions = getReactions(post.id);
      const isTW =
        post.has_tw ||
        (post.title && post.title.toLowerCase().includes("[tw]")) ||
        (post.content && post.content.toLowerCase().includes("[tw]"));
      const isRevealed = revealedTW.has(post.id);
      const bodyText =
        escapeHtml(post.content ? post.content.substring(0, 300) : "") +
        (post.content && post.content.length > 300 ? "…" : "");

      return `<article class="post-card" data-category="${post.category}" data-id="${post.id}">
            <div class="post-header">
                <div class="post-author-wrap">
                    <div class="post-avatar ${post.is_anon ? "anon-avatar" : "question-avatar"}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div>
                        <div class="post-author">${post.is_anon ? "Anonymous Student" : escapeHtml(post.author || currentUser.name || "Student")}</div>
                        <div class="post-meta">Posted ${new Date(post.created_at).toLocaleDateString()} in <span class="post-category">${post.category}</span></div>
                    </div>
                </div>
            </div>
            ${isTW ? `<div class="tw-badge"><i class="ti ti-alert-triangle" aria-hidden="true"></i> TRIGGER WARNING — sensitive content</div>` : ""}
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            ${
              isTW && !isRevealed
                ? `<div class="tw-reveal-wrap" onclick="revealTW(${post.id}, this)">
                       <p class="post-body tw-blurred">${bodyText}</p>
                       <div class="tw-reveal-overlay">Click to reveal content</div>
                   </div>`
                : `<p class="post-body">${bodyText}</p>`
            }
            <div class="reactions-row">
                <button class="reaction-btn ${reactions.mine === "relate" ? "reacted" : ""}" onclick="handleReaction(${post.id}, 'relate', this)" title="I relate to this">
                    <i class="ti ti-heart reaction-icon" aria-hidden="true"></i> <span class="reaction-count">${reactions.relate}</span> Relate
                </button>
                <button class="reaction-btn ${reactions.mine === "strong" ? "reacted" : ""}" onclick="handleReaction(${post.id}, 'strong', this)" title="Stay strong">
                    <i class="ti ti-flame reaction-icon" aria-hidden="true"></i> <span class="reaction-count">${reactions.strong}</span> Strong
                </button>
                <button class="reaction-btn ${reactions.mine === "thanks" ? "reacted" : ""}" onclick="handleReaction(${post.id}, 'thanks', this)" title="Thank you for sharing">
                    <i class="ti ti-hand-stop reaction-icon" aria-hidden="true"></i> <span class="reaction-count">${reactions.thanks}</span> Thanks
                </button>
            </div>
            <div class="post-footer">
                <div class="post-actions">
                    <button class="action-btn like-btn" onclick="likePost(${post.id}, this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        ${post.likes || 0} Helpful
                    </button>
                    <button class="action-btn comment-btn" onclick="toggleComments(${post.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        ${post.comment_count || 0} Comments
                    </button>
                </div>
                <div class="post-secondary-actions">
                    <button class="share-btn" onclick="sharePost(${post.id})" title="Copy link">
                        <i class="ti ti-share" aria-hidden="true"></i>
                        Share
                    </button>
                    <button class="report-btn" onclick="openReportModal(${post.id})" title="Report this post">
                        <i class="ti ti-flag" aria-hidden="true"></i>
                        Report
                    </button>
                    <button class="delete-btn" onclick="deletePost(${post.id}, this)" title="Delete post">
                        <i class="ti ti-trash" aria-hidden="true"></i>
                        Delete
                    </button>
                    <button class="bookmark-btn ${isSaved ? "saved" : ""}" onclick="toggleBookmark(${post.id}, this)" title="${isSaved ? "Unsave" : "Save post"}" aria-label="${isSaved ? "Unsave post" : "Save post"}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? "#5b3ec8" : "none"}" stroke="${isSaved ? "#5b3ec8" : "currentColor"}" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="comments-${post.id}" class="comments-section" style="display:none;">
                <div class="comment-input-area">
                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..."/>
                    <button onclick="addComment(${post.id})">Post</button>
                </div>
                <div id="comments-list-${post.id}" class="comments-list"></div>
            </div>
        </article>`;
    })
    .join("");

  renderPagination(totalPages);
  renderSavedWidget();
}

function revealTW(postId, wrapEl) {
  revealedTW.add(postId);
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;
  const bodyText =
    escapeHtml(post.content ? post.content.substring(0, 300) : "") +
    (post.content && post.content.length > 300 ? "…" : "");
  wrapEl.outerHTML = `<p class="post-body">${bodyText}</p>`;
}
window.revealTW = revealTW;

// ── Pagination ──
function renderPagination(totalPages) {
  const row = document.getElementById("paginationRow");
  if (totalPages <= 1) {
    row.style.display = "none";
    return;
  }
  row.style.display = "flex";
  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>&lsaquo; Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (
      totalPages > 7 &&
      i > 2 &&
      i < totalPages - 1 &&
      Math.abs(i - currentPage) > 1
    ) {
      if (i === 3 || i === totalPages - 2)
        html += `<span class="page-info">&hellip;</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>Next &rsaquo;</button>`;
  row.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderPosts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.goToPage = goToPage;

// ── Load posts ──
async function loadPosts() {
  const feed = document.getElementById("postsFeed");
  feed.innerHTML = '<div class="loading-posts">Loading posts...</div>';
  try {
    const response = await fetch(`${API}/forum`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    if (!data.success || !data.posts || data.posts.length === 0) {
      allPosts = [];
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="ti ti-messages" aria-hidden="true"></i></div>
          <h3>No posts yet</h3>
          <p>Be the first to share something!</p>
        </div>`;
      return;
    }
    allPosts = data.posts;
    applyFiltersAndSort();
  } catch (error) {
    console.error("Error loading posts:", error);
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="ti ti-wifi-off" aria-hidden="true"></i></div>
        <h3>Could not load posts</h3>
        <p>Check your connection or refresh the page.</p>
      </div>`;
  }
}

function applyFiltersAndSort() {
  let posts = [...allPosts];
  if (currentFilter !== "all")
    posts = posts.filter((p) => p.category === currentFilter);
  const q = (document.getElementById("searchInput")?.value || "")
    .toLowerCase()
    .trim();
  if (q)
    posts = posts.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q),
    );
  switch (currentSort) {
    case "helpful":
      posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    case "commented":
      posts.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
      break;
    case "trending":
      posts.sort(
        (a, b) =>
          (b.likes || 0) +
          (b.comment_count || 0) -
          ((a.likes || 0) + (a.comment_count || 0)),
      );
      break;
    default:
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  filteredPosts = posts;
  currentPage = 1;
  renderPosts();
}

// ── Reactions ──
function handleReaction(postId, type, btn) {
  const r = saveReaction(postId, type);
  const card = btn.closest(".post-card");
  card
    .querySelectorAll(".reaction-btn")
    .forEach((b) => b.classList.remove("reacted"));
  if (r.mine) {
    const active = card.querySelector(`.reaction-btn[onclick*="'${r.mine}'"]`);
    if (active) active.classList.add("reacted");
  }
  ["relate", "strong", "thanks"].forEach((t) => {
    const b = card.querySelector(`.reaction-btn[onclick*="'${t}'"]`);
    if (b) b.querySelector(".reaction-count").textContent = r[t];
  });
}
window.handleReaction = handleReaction;

// ── Like ──
async function likePost(id, btn) {
  try {
    const response = await fetch(`${API}/forum/${id}/like`, {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    if (data.success) {
      const match = btn.textContent.match(/\d+/);
      const current = match ? parseInt(match[0]) : 0;
      const newCount = data.liked ? current + 1 : current - 1;
      btn.innerHTML = btn.innerHTML.replace(/\d+/, newCount);
      btn.classList.toggle("liked", data.liked);
    }
  } catch (e) {
    console.error(e);
  }
}
window.likePost = likePost;

// ── Bookmark / Save ──
function toggleBookmark(postId, btn) {
  const idx = savedPosts.indexOf(postId);
  if (idx > -1) {
    savedPosts.splice(idx, 1);
    btn.classList.remove("saved");
    btn.querySelector("svg").setAttribute("fill", "none");
    btn.querySelector("svg").setAttribute("stroke", "currentColor");
  } else {
    savedPosts.push(postId);
    btn.classList.add("saved");
    btn.querySelector("svg").setAttribute("fill", "#5b3ec8");
    btn.querySelector("svg").setAttribute("stroke", "#5b3ec8");
  }
  localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
  renderSavedWidget();
}
window.toggleBookmark = toggleBookmark;

function renderSavedWidget() {
  const widget = document.getElementById("savedWidget");
  const list = document.getElementById("savedPostsList");
  const saved = allPosts.filter((p) => savedPosts.includes(p.id));
  if (saved.length === 0) {
    widget.style.display = "none";
    return;
  }
  widget.style.display = "";
  list.innerHTML = saved
    .map(
      (p) => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border);">
            <div style="font-size:13px;font-weight:600;color:var(--text-dark);margin-bottom:2px;">${escapeHtml(p.title)}</div>
            <div style="font-size:11px;color:var(--text-light);">${p.category}</div>
        </div>`,
    )
    .join("");
}

// ── Share ──
function sharePost(postId) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  navigator.clipboard
    .writeText(url)
    .then(() => showToast("Link copied to clipboard!"))
    .catch(() => {
      const tmp = document.createElement("input");
      tmp.value = url;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      showToast("Link copied!");
    });
}
window.sharePost = sharePost;

// ── Report ──
function openReportModal(postId) {
  reportTargetId = postId;
  selectedReportReason = null;
  document
    .querySelectorAll(".report-option")
    .forEach((o) => o.classList.remove("selected"));
  document.getElementById("reportModalOverlay").classList.add("open");
}
function closeReportModal() {
  document.getElementById("reportModalOverlay").classList.remove("open");
  reportTargetId = null;
  selectedReportReason = null;
}
window.openReportModal = openReportModal;

document
  .getElementById("reportModalClose")
  .addEventListener("click", closeReportModal);
document
  .getElementById("reportCancelBtn")
  .addEventListener("click", closeReportModal);
document.getElementById("reportModalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("reportModalOverlay"))
    closeReportModal();
});
document.querySelectorAll(".report-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    document
      .querySelectorAll(".report-option")
      .forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");
    selectedReportReason = opt.dataset.reason;
  });
});
document
  .getElementById("reportSubmitBtn")
  .addEventListener("click", async () => {
    if (!selectedReportReason) {
      showToast("Please select a reason");
      return;
    }
    try {
      await fetch(`${API}/forum/${reportTargetId}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: selectedReportReason }),
      });
    } catch (e) {}
    closeReportModal();
    showToast("Report submitted. Thank you.");
  });

// ── Delete ──
async function deletePost(id, btn) {
  if (!confirm("Are you sure you want to delete this post?")) return;
  try {
    const response = await fetch(`${API}/forum/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json();
    if (data.success) {
      allPosts = allPosts.filter((p) => p.id !== id);
      applyFiltersAndSort();
    } else {
      alert("Failed to delete post");
    }
  } catch (e) {
    alert("Failed to delete post");
  }
}
window.deletePost = deletePost;

// ── Comments ──
async function toggleComments(postId) {
  const sec = document.getElementById(`comments-${postId}`);
  if (sec.style.display === "none") {
    sec.style.display = "block";
    await loadComments(postId);
  } else sec.style.display = "none";
}
window.toggleComments = toggleComments;

async function loadComments(postId) {
  const list = document.getElementById(`comments-list-${postId}`);
  list.innerHTML =
    '<div style="text-align:center;padding:10px;color:var(--text-light);">Loading comments...</div>';
  try {
    const response = await fetch(`${API}/forum/${postId}/comments`, {
      credentials: "include",
    });
    const data = await response.json();
    if (data.success && data.comments?.length > 0) {
      list.innerHTML = data.comments
        .map(
          (c) => `
                <div class="comment">
                    <div class="comment-author">${escapeHtml(c.author)}</div>
                    <div class="comment-content">${escapeHtml(c.content)}</div>
                    <div class="comment-date">${new Date(c.created_at).toLocaleDateString()}</div>
                </div>`,
        )
        .join("");
    } else {
      list.innerHTML =
        '<div style="text-align:center;padding:10px;color:var(--text-light);">No comments yet.</div>';
    }
  } catch (e) {
    list.innerHTML =
      '<div style="text-align:center;padding:10px;">Error loading comments.</div>';
  }
}

async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) {
    alert("Please enter a comment");
    return;
  }
  try {
    const response = await fetch(`${API}/forum/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    if (data.success) {
      input.value = "";
      await loadComments(postId);
      const cb = document.querySelector(
        `.post-card[data-id="${postId}"] .comment-btn`,
      );
      if (cb) {
        const n = parseInt(cb.textContent) || 0;
        cb.innerHTML = cb.innerHTML.replace(/\d+/, n + 1);
      }
    } else {
      alert("Failed to add comment");
    }
  } catch (e) {
    alert("Failed to add comment");
  }
}
window.addComment = addComment;

// ── Create post ──
async function createPost() {
  const title = document.getElementById("postTitle")?.value.trim();
  const content = document.getElementById("postBody")?.value.trim();
  const category = document.getElementById("postCategory")?.value;
  const anonToggle = document.getElementById("anonToggle");
  const twToggle = document.getElementById("twToggle");
  const is_anon = anonToggle?.checked ? 1 : 0;
  const has_tw = twToggle?.checked ? 1 : 0;
  if (!title || !content || !category) {
    alert("Please fill in all fields");
    return;
  }
  const submitBtn = document.getElementById("modalSubmit");
  const submitBtnText = document.getElementById("submitBtnText");
  submitBtn.disabled = true;
  submitBtnText.textContent = "Posting...";
  try {
    const response = await fetch(`${API}/forum`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, is_anon, has_tw }),
    });
    const data = await response.json();
    if (data.success) {
      document.getElementById("postTitle").value = "";
      document.getElementById("postBody").value = "";
      document.getElementById("postCategory").value = "";
      if (twToggle) twToggle.checked = false;
      if (anonToggle) {
        anonToggle.checked = true;
        anonToggle.dispatchEvent(new Event("change"));
      }
      closeModal();
      await loadPosts();
    } else {
      alert("Failed to create post: " + data.message);
    }
  } catch (e) {
    alert("Failed to create post");
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = anonToggle?.checked
      ? "Post Anonymously"
      : "Post as Yourself";
  }
}
window.createPost = createPost;

// ── Modal ──
function openModal() {
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}
window.openModal = openModal;
window.closeModal = closeModal;

// ── Filter / search / sort ──
function filterPosts(category) {
  currentFilter = category;
  applyFiltersAndSort();
}
function searchPosts() {
  applyFiltersAndSort();
}
window.filterPosts = filterPosts;
window.searchPosts = searchPosts;

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  loadPosts();

  document.querySelectorAll(".pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll(".pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      filterPosts(pill.dataset.filter);
    });
  });

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sort-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      applyFiltersAndSort();
    });
  });

  document.querySelectorAll(".tag-pill").forEach((tag) => {
    tag.addEventListener("click", () => {
      const f = tag.dataset.filter;
      const target = Array.from(document.querySelectorAll(".pill")).find(
        (p) => p.dataset.filter === f,
      );
      if (target) target.click();
    });
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", searchPosts);

  const overlay = document.getElementById("modalOverlay");
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  document.getElementById("modalClose")?.addEventListener("click", closeModal);
  document.getElementById("modalCancel")?.addEventListener("click", closeModal);
  document.getElementById("newPostBtn")?.addEventListener("click", openModal);
  document.getElementById("modalSubmit")?.addEventListener("click", createPost);
});