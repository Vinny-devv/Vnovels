// ===== VNovels — Main App =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, deleteDoc,
  query, orderBy, limit, where, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ─── Firebase Config ──────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD68gyOBwVdzjtNr5qi5NCuns9EdF_fRmY",
  authDomain: "vinny-web.firebaseapp.com",
  projectId: "vinny-web",
  storageBucket: "vinny-web.firebasestorage.app",
  messagingSenderId: "379297579267",
  appId: "1:379297579267:web:12e0de554c41d6ad5ba936",
  measurementId: "G-MMTCWKC75L"
};
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ─── Admin UID — ضع هنا UID حسابك بعد أول تسجيل دخول ────
// بعد تسجيل دخولك بـ Google، افتح console وستظهر UID، انسخها هنا
const ADMIN_UID = "REPLACE_WITH_YOUR_UID";

// ─── Categories ───────────────────────────────────────────
export const CATEGORIES = [
  { id:"fantasy",  name:"خيال",      icon:"🧙‍♂️", color:"#7C3AED" },
  { id:"romance",  name:"رومانسية",   icon:"💕", color:"#EC4899" },
  { id:"thriller", name:"غموض/إثارة",icon:"🔪", color:"#EF4444" },
  { id:"horror",   name:"رعب",        icon:"👻", color:"#6B21A8" },
  { id:"action",   name:"أكشن",       icon:"⚔️", color:"#F59E0B" },
  { id:"sci-fi",   name:"خيال علمي", icon:"🚀", color:"#06B6D4" },
  { id:"drama",    name:"دراما",      icon:"🎭", color:"#8B5CF6" },
  { id:"comedy",   name:"كوميدية",    icon:"😂", color:"#10B981" },
];

// ─── Global State ─────────────────────────────────────────
let currentUser = null;
let isAdmin     = false;
let allNovels   = [];
let activeFilter = "all";

// ─── DOM Refs ─────────────────────────────────────────────
const loginBtn       = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const loginModal     = document.getElementById("loginModal");
const modalClose     = document.getElementById("modalClose");
const authArea       = document.getElementById("authArea");
const menuToggle     = document.getElementById("menuToggle");
const menuDrawer     = document.getElementById("menuDrawer");
const menuOverlay    = document.getElementById("menuOverlay");
const drawerClose    = document.getElementById("drawerClose");
const drawerLoginBtn = document.getElementById("drawerLoginBtn");
const drawerLogoutBtn= document.getElementById("drawerLogoutBtn");
const drawerAdmin    = document.getElementById("drawerAdmin");
const drawerUserName = document.getElementById("drawerUserName");
const drawerAvatar   = document.getElementById("drawerAvatar");
const searchToggle   = document.getElementById("searchToggle");
const searchBar      = document.getElementById("searchBar");
const searchInput    = document.getElementById("searchInput");
const searchClose    = document.getElementById("searchClose");
const searchResults  = document.getElementById("searchResults");
const novelsGrid     = document.getElementById("novelsGrid");
const filterBar      = document.getElementById("filterBar");
const categoriesGrid = document.getElementById("categoriesGrid");
const topRatedList   = document.getElementById("topRatedList");
const featuredNovel  = document.getElementById("featuredNovel");
const totalNovelsEl  = document.getElementById("totalNovels");
const navbar         = document.getElementById("navbar");
const footerCats     = document.getElementById("footerCats");

// ─── Toast ────────────────────────────────────────────────
function toast(msg, type="success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success:"✅", error:"❌", info:"ℹ️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||"ℹ️"}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─── Auth ─────────────────────────────────────────────────
const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, user => {
  currentUser = user;
  isAdmin = user && user.uid === ADMIN_UID;

  if (user) {
    // Show UID in console for admin setup
    if (ADMIN_UID === "REPLACE_WITH_YOUR_UID") {
      console.log("🔑 Your UID:", user.uid, "— copy this to app.js ADMIN_UID");
    }
    // NavBar: replace login btn with user avatar
    authArea.innerHTML = `
      <button class="user-btn" id="userMenuBtn">
        <img class="user-avatar" src="${user.photoURL||''}" onerror="this.style.display='none'" alt="${user.displayName}" />
        <span class="user-name">${user.displayName?.split(" ")[0] || "مستخدم"}</span>
      </button>`;
    document.getElementById("userMenuBtn")?.addEventListener("click", openMenu);

    // Drawer
    drawerAvatar.innerHTML = `<img src="${user.photoURL||''}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    drawerUserName.textContent = user.displayName || "مستخدم";
    drawerLoginBtn.style.display = "none";
    drawerLogoutBtn.style.display = "block";
    if (isAdmin) drawerAdmin.style.display = "block";
    else drawerAdmin.style.display = "none";
  } else {
    authArea.innerHTML = `<button class="btn-login" id="loginBtn">تسجيل الدخول</button>`;
    document.getElementById("loginBtn")?.addEventListener("click", openLoginModal);
    drawerAvatar.textContent = "👤";
    drawerUserName.textContent = "زائر";
    drawerLoginBtn.style.display = "block";
    drawerLogoutBtn.style.display = "none";
    drawerAdmin.style.display = "none";
  }
});

async function signInGoogle() {
  try {
    await signInWithPopup(auth, provider);
    closeLoginModal();
    toast("أهلاً بك! تم تسجيل الدخول بنجاح.");
  } catch(e) {
    toast("فشل تسجيل الدخول: " + e.message, "error");
  }
}

async function signOutUser() {
  await signOut(auth);
  closeMenu();
  toast("تم تسجيل الخروج.", "info");
}

// ─── Modal ────────────────────────────────────────────────
function openLoginModal() { loginModal.classList.add("open"); }
function closeLoginModal() { loginModal.classList.remove("open"); }
loginBtn?.addEventListener("click", openLoginModal);
modalClose?.addEventListener("click", closeLoginModal);
loginModal?.addEventListener("click", e => { if(e.target===loginModal) closeLoginModal(); });
googleLoginBtn?.addEventListener("click", signInGoogle);

// ─── Menu Drawer ──────────────────────────────────────────
function openMenu() { menuDrawer.classList.add("open"); menuOverlay.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeMenu() { menuDrawer.classList.remove("open"); menuOverlay.classList.remove("open"); document.body.style.overflow = ""; }
menuToggle?.addEventListener("click", openMenu);
drawerClose?.addEventListener("click", closeMenu);
menuOverlay?.addEventListener("click", closeMenu);
drawerLoginBtn?.addEventListener("click", () => { closeMenu(); openLoginModal(); });
drawerLogoutBtn?.addEventListener("click", signOutUser);

// Close drawer on link click
document.querySelectorAll(".drawer-link").forEach(link => {
  link.addEventListener("click", () => closeMenu());
});

// ─── Search ───────────────────────────────────────────────
searchToggle?.addEventListener("click", () => {
  searchBar.classList.toggle("open");
  if (searchBar.classList.contains("open")) searchInput.focus();
});
searchClose?.addEventListener("click", () => {
  searchBar.classList.remove("open");
  searchInput.value = "";
  searchResults.innerHTML = "";
});
searchInput?.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.innerHTML = ""; return; }
  const hits = allNovels.filter(n => n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q));
  if (!hits.length) { searchResults.innerHTML = `<p style="color:var(--text-muted);font-size:.88rem">لا توجد نتائج</p>`; return; }
  searchResults.innerHTML = hits.slice(0,6).map(n => `
    <div class="search-result-item" onclick="window.location='novel.html?id=${n.id}'">
      ${n.coverUrl ? `<img src="${n.coverUrl}" alt="${n.title}" loading="lazy"/>` : `<div style="width:36px;height:50px;background:var(--bg3);border-radius:5px;display:flex;align-items:center;justify-content:center">📖</div>`}
      <div class="search-result-text">
        <div class="search-result-title">${n.title}</div>
        <div class="search-result-cat">${CATEGORIES.find(c=>c.id===n.category)?.name||n.category}</div>
      </div>
    </div>`).join("");
});

// ─── Navbar Scroll ────────────────────────────────────────
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
});

// ─── Hero Particles ───────────────────────────────────────
function createParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --d:${5+Math.random()*8}s;
      --delay:${Math.random()*6}s;
    `;
    container.appendChild(p);
  }
}

// ─── Render Categories ────────────────────────────────────
function renderCategories(novels) {
  const counts = {};
  CATEGORIES.forEach(c => counts[c.id] = 0);
  novels.forEach(n => { if(counts[n.category]!==undefined) counts[n.category]++; });

  categoriesGrid.innerHTML = CATEGORIES.map(cat => `
    <div class="cat-card fade-in" style="--cat-color:${cat.color}" onclick="filterByCategory('${cat.id}')">
      <span class="cat-icon">${cat.icon}</span>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${counts[cat.id]} رواية</div>
    </div>`).join("");

  // Footer cats
  footerCats.innerHTML = CATEGORIES.map(c => `<a href="#latest" onclick="filterByCategory('${c.id}')">${c.icon} ${c.name}</a>`).join("");

  // Filter buttons
  filterBar.innerHTML = `<button class="filter-btn ${activeFilter==='all'?'active':''}" data-cat="all" onclick="filterByCategory('all')">الكل</button>`;
  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = `filter-btn ${activeFilter===cat.id?'active':''}`;
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    btn.onclick = () => filterByCategory(cat.id);
    filterBar.appendChild(btn);
  });
}

// ─── Render Novels Grid ───────────────────────────────────
function renderNovels(novels) {
  if (!novels.length) {
    novelsGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">📖</div><p>لا توجد روايات في هذا التصنيف بعد.</p></div>`;
    return;
  }
  novelsGrid.innerHTML = novels.map(n => novelCard(n)).join("");
}

function novelCard(n) {
  const cat = CATEGORIES.find(c => c.id === n.category);
  const cover = n.coverUrl
    ? `<img class="novel-cover" src="${n.coverUrl}" alt="${n.title}" loading="lazy"/>`
    : `<div class="novel-cover-placeholder">📖</div>`;
  return `
    <div class="novel-card fade-in" onclick="window.location='novel.html?id=${n.id}'">
      <div class="novel-cover-wrap">
        ${cover}
        ${n.featured ? `<span class="novel-badge">مميز</span>` : ""}
        <div class="novel-overlay">
          <button class="btn-read" onclick="event.stopPropagation();window.location='novel.html?id=${n.id}'">اقرأ الآن</button>
        </div>
      </div>
      <div class="novel-info">
        <div class="novel-title">${n.title}</div>
        <div class="novel-meta">
          <span class="novel-cat">${cat?.name||n.category}</span>
          <span class="novel-rating">⭐ ${n.rating?.toFixed(1)||"—"}</span>
        </div>
      </div>
    </div>`;
}

// ─── Filter ───────────────────────────────────────────────
window.filterByCategory = function(catId) {
  activeFilter = catId;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.cat===catId));
  const filtered = catId === "all" ? allNovels : allNovels.filter(n => n.category === catId);
  renderNovels(filtered);
  document.getElementById("latest")?.scrollIntoView({ behavior:"smooth" });
};

// ─── Featured Novel ───────────────────────────────────────
function renderFeatured(novels) {
  const featured = novels.find(n => n.featured);
  if (!featured) { featuredNovel.innerHTML = `<p class="empty-msg">لا توجد رواية مميزة بعد.</p>`; return; }
  const cat = CATEGORIES.find(c => c.id === featured.category);
  featuredNovel.innerHTML = `
    <div class="novel-cover-wrap">
      ${featured.coverUrl ? `<img class="novel-cover" src="${featured.coverUrl}" alt="${featured.title}" style="max-height:400px"/>` : `<div class="novel-cover-placeholder" style="height:350px">📖</div>`}
    </div>
    <div class="featured-novel-content">
      <div class="featured-label">✦ رواية مميزة</div>
      <div class="featured-title">${featured.title}</div>
      <p class="featured-desc">${featured.description||""}</p>
      <div class="featured-tags">
        <span class="tag">${cat?.name||featured.category}</span>
        ${(featured.tags||[]).map(t=>`<span class="tag">${t}</span>`).join("")}
      </div>
      <a href="novel.html?id=${featured.id}" class="btn-primary" style="display:inline-block;text-align:center">اقرأ الآن ←</a>
    </div>`;
}

// ─── Top Rated ────────────────────────────────────────────
function renderTopRated(novels) {
  const sorted = [...novels].filter(n=>n.rating).sort((a,b)=>b.rating-a.rating).slice(0,5);
  if (!sorted.length) {
    topRatedList.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>لا توجد تقييمات بعد.</p></div>`;
    return;
  }
  topRatedList.innerHTML = sorted.map((n,i) => {
    const cover = n.coverUrl ? `<img class="top-cover" src="${n.coverUrl}" alt="${n.title}" loading="lazy"/>` : `<div class="top-cover" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;border-radius:8px">📖</div>`;
    const cat = CATEGORIES.find(c=>c.id===n.category);
    return `
      <div class="top-item" onclick="window.location='novel.html?id=${n.id}'">
        <div class="top-rank">${["🥇","🥈","🥉","4","5"][i]}</div>
        ${cover}
        <div class="top-info">
          <div class="top-title">${n.title}</div>
          <div class="top-sub">${cat?.name||n.category}</div>
        </div>
        <div class="top-rating">⭐ ${n.rating.toFixed(1)}</div>
      </div>`;
  }).join("");
}

// ─── Load Novels from Firestore ───────────────────────────
async function loadNovels() {
  try {
    const q = query(collection(db,"novels"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    allNovels = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    totalNovelsEl.textContent = allNovels.length;
    renderCategories(allNovels);
    renderNovels(allNovels);
    renderFeatured(allNovels);
    renderTopRated(allNovels);
  } catch(e) {
    console.error("Error loading novels:", e);
  }
}

// ─── Exports for other pages ──────────────────────────────
export { auth, db, storage, isAdmin, currentUser, ADMIN_UID, toast, CATEGORIES };

// ─── Init ─────────────────────────────────────────────────
createParticles();
loadNovels();
