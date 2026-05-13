const firebaseConfig = {
  apiKey: "AIzaSyDEGwL4j5ZFyNi1mPA-lNnnAJLqd_hprzU",
  authDomain: "portfolio-fc0ab.firebaseapp.com",
  projectId: "portfolio-fc0ab",
  storageBucket: "portfolio-fc0ab.firebasestorage.app",
  messagingSenderId: "1049535893207",
  appId: "1:1049535893207:web:2a5338ee932341ed9d6a92",
  measurementId: "G-ETH2P8QHYZ"
};
const FB_READY = FB_CONFIG.apiKey && FB_CONFIG.apiKey !== "";

// ── Dynamic Firebase loader ──────────────────────────────
let db = null;
async function initFirebase() {
  if (!FB_READY) return false;
  try {
    const { initializeApp }  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore }   = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    db = getFirestore(initializeApp(FB_CONFIG));
    return true;
  } catch(e) { console.warn("Firebase init failed:", e.message); return false; }
}

// ════════════════════════════════════════════════════════
//  DEFAULT PROJECTS (Firebase байхгүй үед харуулна)
// ════════════════════════════════════════════════════════
const DEFAULT_PROJECTS = [
  {
    id: 'food',
    title: 'Food Delivery App',
    desc: 'Хоол захиалгын платформ. Бодит цагийн захиалга хянах, рестораны жагсаалт, сагс болон төлбөр хийх боломжтой.',
    tags: ['HTML','CSS','JavaScript','API'],
    emoji: '🍔', visualType: 'food', color: '#f5a623',
    features: ['Ресторан хайх & шүүх','Бодит цагийн хянах','Сагс & төлбөр','Захиалгын түүх'],
    demo: '#', code: '#', order: 0
  },
  {
    id: 'movie',
    title: 'Movie Website',
    desc: 'TMDB API ашигласан кино үзэх платформ. Жанрын шүүлт, хайлт, үнэлгээ болон watchlist боломжтой.',
    tags: ['HTML','CSS','JavaScript','TMDB API'],
    emoji: '🎬', visualType: 'movie', color: '#e05a5a',
    features: ['TMDB API холболт','Жанрын шүүлт & хайлт','Кино дэлгэрэнгүй','Watchlist'],
    demo: '#', code: '#', order: 1
  }
];

async function loadProjects() {
  if (db) {
    try {
      const { collection, getDocs, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await getDocs(query(collection(db,'projects'), orderBy('order','asc')));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        return list;
      }
    } catch(e) { console.warn("Firestore load failed:", e.message); }
  }
  // Fallback: localStorage (admin.js-аас хадгалсан)
  const stored = localStorage.getItem('portfolio_projects');
  return stored ? JSON.parse(stored) : DEFAULT_PROJECTS;
}

// ════════════════════════════════════════════════════════
//  VISITOR TRACKING
// ════════════════════════════════════════════════════════
async function trackVisit() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';
  else if (/iPad|Tablet/i.test(ua))    device = 'Tablet';

  let browser = 'Бусад';
  if      (/Edg/i.test(ua))          browser = 'Edge';
  else if (/OPR|Opera/i.test(ua))    browser = 'Opera';
  else if (/Chrome/i.test(ua))       browser = 'Chrome';
  else if (/Firefox/i.test(ua))      browser = 'Firefox';
  else if (/Safari/i.test(ua))       browser = 'Safari';

  // Always save to localStorage (admin fallback)
  const visits = JSON.parse(localStorage.getItem('portfolio_visits') || '[]');
  visits.push({ time: new Date().toISOString(), device, browser, ua: ua.substring(0,120) });
  if (visits.length > 1000) visits.splice(0, visits.length - 1000);
  localStorage.setItem('portfolio_visits', JSON.stringify(visits));

  // Also save to Firestore if available
  if (db) {
    try {
      const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await addDoc(collection(db,'visits'), { time: serverTimestamp(), device, browser, ua: ua.substring(0,120) });
    } catch(e) { /* silent */ }
  }
}

// ════════════════════════════════════════════════════════
//  CUSTOM CURSOR
// ════════════════════════════════════════════════════════
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
let mx=0, my=0, rx=0, ry=0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function animCursor() {
  if (cursor) { cursor.style.left = mx+'px'; cursor.style.top = my+'px'; }
  rx += (mx-rx)*.12; ry += (my-ry)*.12;
  if (ring)  { ring.style.left = rx+'px'; ring.style.top = ry+'px'; }
  requestAnimationFrame(animCursor);
})();

function attachCursorHover() {
  document.querySelectorAll('a, button, input, textarea').forEach(el => {
    if (el._cursorAttached) return;
    el._cursorAttached = true;
    el.addEventListener('mouseenter', () => {
      if (cursor) { cursor.style.width = cursor.style.height = '20px'; }
      if (ring)   { ring.style.width = ring.style.height = '52px'; }
    });
    el.addEventListener('mouseleave', () => {
      if (cursor) { cursor.style.width = cursor.style.height = '12px'; }
      if (ring)   { ring.style.width = ring.style.height = '36px'; }
    });
  });
}
attachCursorHover();

// ════════════════════════════════════════════════════════
//  SCROLL REVEAL
// ════════════════════════════════════════════════════════
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: .08 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// Skill bars
const skillObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.skill-fill').forEach(bar => {
        const w = bar.getAttribute('data-width') || bar.style.width;
        bar.style.width = '0';
        requestAnimationFrame(() => { bar.style.width = w; });
      });
      skillObs.unobserve(e.target);
    }
  });
}, { threshold: .2 });

const skillsSection = document.querySelector('.skills-section');
if (skillsSection) skillObs.observe(skillsSection);

// ════════════════════════════════════════════════════════
//  NAV — active highlight + smooth scroll
// ════════════════════════════════════════════════════════
const navLinks = document.querySelectorAll('.nav-links a:not(.nav-admin-btn)');

window.addEventListener('scroll', () => {
  let cur = '';
  document.querySelectorAll('section[id]').forEach(s => {
    if (window.scrollY >= s.offsetTop - 220) cur = s.id;
  });
  navLinks.forEach(a => {
    a.style.color = (a.getAttribute('href') === '#'+cur) ? 'var(--accent)' : '';
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const t = document.querySelector(link.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ════════════════════════════════════════════════════════
//  HERO BUTTONS
// ════════════════════════════════════════════════════════
document.querySelector('.btn-primary')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
});
document.querySelector('.btn-outline')?.addEventListener('click', e => {
  e.preventDefault();
  openContact();
});
document.getElementById('contactEmailLink')?.addEventListener('click', e => {
  e.preventDefault();
  openContact();
});

// ════════════════════════════════════════════════════════
//  CONTACT MODAL
// ════════════════════════════════════════════════════════
const contactModal = document.getElementById('contactModal');

function openContact() {
  if (!contactModal) return;
  contactModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  const fs = document.getElementById('formSuccess');
  const ff = document.getElementById('formFields');
  const fe = document.getElementById('formError');
  if (fs) fs.style.display = 'none';
  if (ff) ff.style.display = 'block';
  if (fe) fe.style.display = 'none';
  ['cName','cEmail','cMsg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sb = document.getElementById('sendBtn');
  if (sb) sb.textContent = 'Илгээх →';
  attachCursorHover();
}

function closeContact() {
  if (contactModal) contactModal.style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('closeContact')?.addEventListener('click', closeContact);
contactModal?.addEventListener('click', e => { if (e.target === contactModal) closeContact(); });

document.getElementById('sendBtn')?.addEventListener('click', async () => {
  const n  = document.getElementById('cName')?.value.trim();
  const em = document.getElementById('cEmail')?.value.trim();
  const m  = document.getElementById('cMsg')?.value.trim();
  const fe = document.getElementById('formError');
  const sb = document.getElementById('sendBtn');

  if (!n || !em || !m) { if (fe) fe.style.display = 'block'; return; }
  if (fe) fe.style.display = 'none';
  if (sb) sb.textContent = 'Илгээж байна...';

  // Save to localStorage
  const msgs = JSON.parse(localStorage.getItem('portfolio_messages') || '[]');
  msgs.unshift({ name:n, email:em, message:m, time: new Date().toISOString() });
  localStorage.setItem('portfolio_messages', JSON.stringify(msgs));

  // Also save to Firestore if available
  if (db) {
    try {
      const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await addDoc(collection(db,'messages'), { name:n, email:em, message:m, time: serverTimestamp() });
    } catch(e) { /* silent */ }
  }

  const ff = document.getElementById('formFields');
  const fs = document.getElementById('formSuccess');
  if (ff) ff.style.display = 'none';
  if (fs) fs.style.display = 'block';
  setTimeout(closeContact, 2500);
});

// ════════════════════════════════════════════════════════
//  PROJECT MODAL
// ════════════════════════════════════════════════════════
const projectModal = document.getElementById('projectModal');
const modalContent = document.getElementById('modalContent');
let _allProjects = [];

function openProject(id) {
  const p = _allProjects.find(x => x.id === id) || _allProjects[0];
  if (!p || !modalContent) return;
  const num = _allProjects.indexOf(p) + 1;
  modalContent.innerHTML = `
    <div style="font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:${p.color};margin-bottom:.5rem">Төсөл ${String(num).padStart(2,'0')}</div>
    <div style="font-size:3rem;margin-bottom:.8rem">${p.emoji}</div>
    <h3 style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.5rem;margin-bottom:1rem">${p.title}</h3>
    <p style="color:var(--muted);font-size:.8rem;line-height:1.9;margin-bottom:1.5rem">${p.desc}</p>
    <div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.8rem">Үндсэн боломжууд</div>
    ${(p.features||[]).map(f=>`<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;font-size:.78rem"><span style="color:${p.color}">▸</span>${f}</div>`).join('')}
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem;margin-bottom:1.5rem">
      ${(p.tags||[]).map(t=>`<span style="font-size:.62rem;padding:.25rem .7rem;background:rgba(245,166,35,.1);color:${p.color};border-radius:3px">${t}</span>`).join('')}
    </div>
    <div class="project-modal-actions">
      <button class="project-modal-btn" style="background:${p.color};color:#0a0a0f" onclick="window.open('${p.demo||'#'}')">Live Demo ↗</button>
      <button class="project-modal-btn project-modal-btn-outline" onclick="window.open('${p.code||'#'}')">Код үзэх</button>
    </div>`;
  projectModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  attachCursorHover();
}

function closeProjectModal() {
  if (projectModal) projectModal.style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('closeProject')?.addEventListener('click', closeProjectModal);
projectModal?.addEventListener('click', e => { if (e.target === projectModal) closeProjectModal(); });

function attachProjectLinks(projects) {
  _allProjects = projects;
  document.querySelectorAll('.project-link[data-id]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); openProject(link.dataset.id); });
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeContact(); closeProjectModal(); }
});

// ════════════════════════════════════════════════════════
//  RENDER PROJECTS
// ════════════════════════════════════════════════════════
function buildVisual(p, idx) {
  if (p.visualType === 'food') return `
    <div class="project-visual visual-food">
      <div class="visual-food-inner">
        <div class="food-icon">🍔</div>
        <div class="food-bars">
          <div class="food-bar" style="height:20px"></div>
          <div class="food-bar" style="height:30px"></div>
          <div class="food-bar" style="height:25px"></div>
          <div class="food-bar" style="height:38px"></div>
          <div class="food-bar" style="height:18px"></div>
        </div>
      </div>
    </div>`;
  if (p.visualType === 'movie') return `
    <div class="project-visual visual-movie">
      <div class="movie-stars" id="stars_${idx}"></div>
      <div class="movie-screen"><div class="movie-play"></div></div>
    </div>`;
  return `
    <div class="project-visual visual-custom" style="background:linear-gradient(135deg,${p.color}22,${p.color}0a)">
      <div class="custom-emoji" style="filter:drop-shadow(0 0 24px ${p.color}99)">${p.emoji}</div>
    </div>`;
}

async function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const projects = await loadProjects();
  grid.innerHTML = '';

  projects.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'project-card reveal' + (i > 0 ? ` reveal-delay-${Math.min(i,3)}` : '');
    card.innerHTML = `
      ${buildVisual(p, i)}
      <div class="project-meta">
        <div class="project-number">${String(i+1).padStart(2,'0')} / Төсөл</div>
        <h3 class="project-title">${p.title}</h3>
        <p class="project-desc">${p.desc}</p>
        <div class="project-tags">${(p.tags||[]).map(t=>`<span class="project-tag">${t}</span>`).join('')}</div>
        <a href="#" class="project-link" data-id="${p.id}">Төсөл үзэх <span class="arrow">→</span></a>
      </div>`;
    grid.appendChild(card);
    revealObs.observe(card);

    if (p.visualType === 'movie') {
      const sc = document.getElementById('stars_'+i);
      if (sc) {
        for (let s = 0; s < 40; s++) {
          const el = document.createElement('div');
          el.className = 'star';
          el.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*3}s;opacity:${Math.random()*.6+.1}`;
          sc.appendChild(el);
        }
      }
    }
  });

  attachProjectLinks(projects);
  attachCursorHover();
}

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
(async function init() {
  await initFirebase();
  trackVisit();
  renderProjects();
})();