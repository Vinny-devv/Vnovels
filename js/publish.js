// ===== Publish Page =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD68gyOBwVdzjtNr5qi5NCuns9EdF_fRmY",
  authDomain: "vinny-web.firebaseapp.com",
  projectId: "vinny-web",
  storageBucket: "vinny-web.firebasestorage.app",
  messagingSenderId: "379297579267",
  appId: "1:379297579267:web:12e0de554c41d6ad5ba936"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

const ADMIN_UID = "REPLACE_WITH_YOUR_UID"; // ← نفس الـ UID في app.js
const CATEGORIES = [
  { id:"fantasy",  name:"خيال" },
  { id:"romance",  name:"رومانسية" },
  { id:"thriller", name:"غموض/إثارة" },
  { id:"horror",   name:"رعب" },
  { id:"action",   name:"أكشن" },
  { id:"sci-fi",   name:"خيال علمي" },
  { id:"drama",    name:"دراما" },
  { id:"comedy",   name:"كوميدية" },
];

// ─── Refs
let coverFile = null;
let tags = [];

const publishFormEl = document.getElementById("publishForm");
const accessDenied  = document.getElementById("accessDenied");
const authArea      = document.getElementById("authArea");
const coverInput    = document.getElementById("coverInput");
const coverPreview  = document.getElementById("coverPreview");
const removeCover   = document.getElementById("removeCover");
const descInput     = document.getElementById("description");
const descCount     = document.getElementById("descCount");
const tagsInput     = document.getElementById("tagsInput");
const tagsList      = document.getElementById("tagsList");
const categorySelect= document.getElementById("category");

// ─── Fill categories
CATEGORIES.forEach(c => {
  const opt = document.createElement("option");
  opt.value = c.id; opt.textContent = c.name;
  categorySelect.appendChild(opt);
});

// ─── Auth
onAuthStateChanged(auth, user => {
  if (!user) {
    publishFormEl.style.display = "none";
    accessDenied.style.display  = "block";
    authArea.innerHTML = `<button class="btn-login" onclick="signInGoogle()">تسجيل الدخول</button>`;
    return;
  }
  console.log("UID:", user.uid); // Copy this to ADMIN_UID
  if (user.uid !== ADMIN_UID && ADMIN_UID !== "REPLACE_WITH_YOUR_UID") {
    publishFormEl.style.display = "none";
    accessDenied.style.display  = "block";
  } else {
    publishFormEl.style.display = "block";
    accessDenied.style.display  = "none";
    authArea.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${user.photoURL||''}" width="32" height="32" style="border-radius:50%" onerror="this.style.display='none'"/>
        <span style="font-size:.88rem;color:var(--text-muted)">${user.displayName?.split(" ")[0]||"مشرف"}</span>
        <a href="index.html" class="btn-ghost" style="padding:7px 16px;font-size:.85rem">الرئيسية</a>
      </div>`;
  }
});

window.signInGoogle = async function() {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e) { toast("فشل تسجيل الدخول", "error"); }
};

// ─── Cover Upload
coverInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { toast("الصورة أكبر من 5MB", "error"); return; }
  coverFile = file;
  const url = URL.createObjectURL(file);
  coverPreview.innerHTML = `<img src="${url}" alt="غلاف" style="width:100%;height:100%;object-fit:cover;border-radius:10px"/>`;
  removeCover.style.display = "block";
});
document.getElementById("coverUpload").addEventListener("click", e => {
  if (e.target === document.getElementById("coverUpload") || e.target === coverPreview) {
    coverInput.click();
  }
});
removeCover.addEventListener("click", e => {
  e.stopPropagation();
  coverFile = null;
  coverInput.value = "";
  coverPreview.innerHTML = `<div class="upload-placeholder"><span class="upload-icon">🖼️</span><span>اضغط لاختيار صورة من هاتفك</span><small>PNG, JPG, WEBP — حتى 5MB</small></div>`;
  removeCover.style.display = "none";
});

// ─── Description counter
descInput.addEventListener("input", () => {
  descCount.textContent = descInput.value.length;
});

// ─── Tags
tagsInput.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = tagsInput.value.trim().replace(",","");
    if (val && !tags.includes(val) && tags.length < 8) {
      tags.push(val);
      renderTags();
    }
    tagsInput.value = "";
  }
});
function renderTags() {
  tagsList.innerHTML = tags.map((t,i) => `
    <span class="tag-item">${t} <span class="tag-remove" onclick="removeTag(${i})">✕</span></span>
  `).join("");
}
window.removeTag = i => { tags.splice(i,1); renderTags(); };

// ─── Toast
function toast(msg, type="success") {
  let c = document.querySelector(".toast-container");
  if (!c) { c = document.createElement("div"); c.className = "toast-container"; document.body.appendChild(c); }
  const icons = { success:"✅", error:"❌", info:"ℹ️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||"ℹ️"}</span> ${msg}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─── Publish Novel
window.publishNovel = async function() {
  const title       = document.getElementById("title").value.trim();
  const category    = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const status      = document.getElementById("status").value;
  const featured    = document.getElementById("featured").checked;
  const firstChapter= document.getElementById("firstChapter").value.trim();

  if (!title) { toast("أدخل عنوان الرواية", "error"); return; }
  if (!category) { toast("اختر تصنيفاً", "error"); return; }

  const user = auth.currentUser;
  if (!user || (user.uid !== ADMIN_UID && ADMIN_UID !== "REPLACE_WITH_YOUR_UID")) {
    toast("غير مصرح لك بالنشر", "error"); return;
  }

  const submitBtn  = document.getElementById("submitBtn");
  const submitText = document.getElementById("submitText");
  const spinner    = document.getElementById("spinner");
  submitBtn.disabled = true;
  submitText.style.display = "none";
  spinner.style.display = "block";

  try {
    // Upload cover
    let coverUrl = "";
    if (coverFile) {
      const storageRef = ref(storage, `covers/${Date.now()}_${coverFile.name}`);
      await uploadBytes(storageRef, coverFile);
      coverUrl = await getDownloadURL(storageRef);
    }

    // If featured, unfeatured previous
    if (featured) {
      const q = query(collection(db,"novels"), where("featured","==",true));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db,"novels",d.id), { featured: false });
      }
    }

    // Add novel
    const novelRef = await addDoc(collection(db,"novels"), {
      title, category, description, status, featured, tags,
      coverUrl, rating: 0, ratingCount: 0,
      authorId: user.uid, authorName: user.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Add first chapter if provided
    if (firstChapter) {
      await addDoc(collection(db, "novels", novelRef.id, "chapters"), {
        title: "الفصل الأول",
        content: firstChapter,
        chapterNumber: 1,
        createdAt: serverTimestamp(),
      });
    }

    toast("✅ تم نشر الرواية بنجاح!");
    setTimeout(() => { window.location.href = `novel.html?id=${novelRef.id}`; }, 1500);
  } catch(e) {
    console.error(e);
    toast("خطأ في النشر: " + e.message, "error");
    submitBtn.disabled = false;
    submitText.style.display = "block";
    spinner.style.display = "none";
  }
};
