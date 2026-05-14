var FB_CONFIG = {
  apiKey:            "AIzaSyDEGwL4j5ZFyNi1mPA-lNnnAJLqd_hprzU",
  authDomain:        "portfolio-fc0ab.firebaseapp.com",
  projectId:         "portfolio-fc0ab",
  storageBucket:     "portfolio-fc0ab.firebasestorage.app",
  messagingSenderId: "1049535893207",
  appId:             "1:1049535893207:web:2a5338ee932341ed9d6a92",
  measurementId:     "G-ETH2P8QHYZ"
};
var _db = null;

async function initFirebase() {
  try {
    var m1 = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    var m2 = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    var app = m1.initializeApp(FB_CONFIG);
    _db = m2.getFirestore(app);
    return m2;
  } catch(e) { console.warn("Firebase init failed:", e.message); return null; }
}

// ── Visitor бүртгэх ──────────────────────────────────────
async function trackVisit() {
  var ua = navigator.userAgent;
  var device = 'Desktop';
  if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';
  else if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
  var browser = 'Бусад';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  var visits = JSON.parse(localStorage.getItem('portfolio_visits') || '[]');
  visits.push({ time: new Date().toISOString(), device: device, browser: browser });
  if (visits.length > 2000) visits = visits.slice(-2000);
  localStorage.setItem('portfolio_visits', JSON.stringify(visits));

  if (_db) {
    try {
      var fm = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await fm.addDoc(fm.collection(_db,'visits'), {
        time: fm.serverTimestamp(), device: device, browser: browser
      });
    } catch(e) { /* silent */ }
  }
}

// ── Load projects ─────────────────────────────────────────

// ── Default projects ─────────────────────────────────────
var DEFAULT_PROJECTS = [
  { id:'food', title:'Food Delivery App', desc:'Хоол захиалгын платформ. Бодит цагийн захиалга хянах, рестораны жагсаалт, сагс болон төлбөр хийх боломжтой.', tags:['HTML','CSS','JavaScript','API'], emoji:'🍔', visualType:'food', color:'#f5a623', features:['Ресторан хайх & шүүх','Бодит цагийн хянах','Сагс & төлбөр','Захиалгын түүх'], demo:'#', code:'#', order:0 },
  { id:'movie', title:'Movie Website', desc:'TMDB API ашигласан кино үзэх платформ. Жанрын шүүлт, хайлт, үнэлгээ болон watchlist боломжтой.', tags:['HTML','CSS','JavaScript','TMDB API'], emoji:'🎬', visualType:'movie', color:'#e05a5a', features:['TMDB API холболт','Жанрын шүүлт & хайлт','Кино дэлгэрэнгүй','Watchlist'], demo:'#', code:'#', order:1 }
];

async function getProjects() {
  if (_db) {
    try {
      var fm = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      var snap = await fm.getDocs(fm.query(fm.collection(_db,'projects'), fm.orderBy('order','asc')));
      if (!snap.empty) {
        var list = [];
        snap.forEach(function(d){ list.push(Object.assign({id:d.id},d.data())); });
        return list;
      }
    } catch(e) { console.warn("Firestore projects:", e.message); }
  }
  var s = localStorage.getItem('portfolio_projects');
  return s ? JSON.parse(s) : DEFAULT_PROJECTS;
}

// ── Cursor ────────────────────────────────────────────────
var cursorEl = document.getElementById('cursor');
var ringEl   = document.getElementById('cursorRing');
var mx=0, my=0, rx=0, ry=0;
document.addEventListener('mousemove', function(e){ mx=e.clientX; my=e.clientY; });
(function loop(){
  if(cursorEl){ cursorEl.style.left=mx+'px'; cursorEl.style.top=my+'px'; }
  rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
  if(ringEl){ ringEl.style.left=rx+'px'; ringEl.style.top=ry+'px'; }
  requestAnimationFrame(loop);
})();

function attachHover(){
  document.querySelectorAll('a,button,input,textarea').forEach(function(el){
    if(el._hov) return; el._hov=true;
    el.addEventListener('mouseenter',function(){ if(cursorEl){cursorEl.style.width=cursorEl.style.height='20px';} if(ringEl){ringEl.style.width=ringEl.style.height='52px';} });
    el.addEventListener('mouseleave',function(){ if(cursorEl){cursorEl.style.width=cursorEl.style.height='12px';} if(ringEl){ringEl.style.width=ringEl.style.height='36px';} });
  });
}
attachHover();

// ── Scroll reveal ─────────────────────────────────────────
var revObs = new IntersectionObserver(function(entries){
  entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.08});
document.querySelectorAll('.reveal').forEach(function(el){ revObs.observe(el); });

// ── Skill bars ────────────────────────────────────────────
var skillObs = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(!e.isIntersecting) return;
    e.target.querySelectorAll('.skill-fill').forEach(function(bar){
      var w=bar.getAttribute('data-width')||'0%';
      bar.style.width='0%';
      setTimeout(function(){ bar.style.width=w; },100);
    });
    skillObs.unobserve(e.target);
  });
},{threshold:0.2});
var ss=document.querySelector('.skills-section');
if(ss) skillObs.observe(ss);

// ── Nav highlight ─────────────────────────────────────────
var navAs=document.querySelectorAll('.nav-links a:not(.nav-admin-btn)');
window.addEventListener('scroll',function(){
  var cur='';
  document.querySelectorAll('section[id]').forEach(function(s){ if(window.scrollY>=s.offsetTop-220) cur=s.id; });
  navAs.forEach(function(a){ a.style.color=(a.getAttribute('href')==='#'+cur)?'var(--accent)':''; });
});

// ── Smooth scroll ─────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    var t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault(); t.scrollIntoView({behavior:'smooth'});}
  });
});

// ── Hero buttons ──────────────────────────────────────────
var btnP=document.querySelector('.btn-primary');
var btnO=document.querySelector('.btn-outline');
var elLink=document.getElementById('contactEmailLink');
if(btnP) btnP.addEventListener('click',function(e){e.preventDefault();var p=document.getElementById('projects');if(p)p.scrollIntoView({behavior:'smooth'});});
if(btnO) btnO.addEventListener('click',function(e){e.preventDefault();openContact();});
if(elLink) elLink.addEventListener('click',function(e){e.preventDefault();openContact();});

// ── Contact modal ─────────────────────────────────────────
var cModal=document.getElementById('contactModal');
function openContact(){
  if(!cModal) return;
  cModal.style.display='flex'; document.body.style.overflow='hidden';
  var fs=document.getElementById('formSuccess');
  var ff=document.getElementById('formFields');
  var fe=document.getElementById('formError');
  var sb=document.getElementById('sendBtn');
  if(fs) fs.style.display='none';
  if(ff) ff.style.display='block';
  if(fe) fe.style.display='none';
  ['cName','cEmail','cMsg'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  if(sb) sb.textContent='Илгээх →';
  attachHover();
}
function closeContact(){ if(cModal) cModal.style.display='none'; document.body.style.overflow=''; }
var ccBtn=document.getElementById('closeContact');
if(ccBtn) ccBtn.addEventListener('click',closeContact);
if(cModal) cModal.addEventListener('click',function(e){if(e.target===cModal)closeContact();});

var sbBtn=document.getElementById('sendBtn');
if(sbBtn) sbBtn.addEventListener('click',function(){
  var n=(document.getElementById('cName')||{}).value||'';
  var em=(document.getElementById('cEmail')||{}).value||'';
  var m=(document.getElementById('cMsg')||{}).value||'';
  var fe=document.getElementById('formError');
  if(!n.trim()||!em.trim()||!m.trim()){if(fe)fe.style.display='block';return;}
  if(fe) fe.style.display='none';
  sbBtn.textContent='Илгээж байна...';
  var msgs=JSON.parse(localStorage.getItem('portfolio_messages')||'[]');
  msgs.unshift({name:n,email:em,message:m,time:new Date().toISOString()});
  localStorage.setItem('portfolio_messages',JSON.stringify(msgs));
  if(_db){
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(function(f){
      f.addDoc(f.collection(_db,'messages'),{name:n,email:em,message:m,time:f.serverTimestamp()}).catch(function(){});
    });
  }
  setTimeout(function(){
    var ff=document.getElementById('formFields');
    var fs=document.getElementById('formSuccess');
    if(ff) ff.style.display='none';
    if(fs) fs.style.display='block';
    setTimeout(closeContact,2000);
  },800);
});

// ── Project modal ─────────────────────────────────────────
var pModal=document.getElementById('projectModal');
var mContent=document.getElementById('modalContent');
var _prjs=[];

function openProject(id){
  var p=null;
  for(var i=0;i<_prjs.length;i++){ if(_prjs[i].id===id){ p=_prjs[i]; break; } }
  if(!p||!mContent) return;
  var num=_prjs.indexOf(p)+1;
  var imgs=p.images||[];

  var galleryHtml='';
  if(imgs.length>0){
    galleryHtml=
      '<div class="gallery-main" id="galMain" title="Дарж томруулна">'+
        '<img id="mainImg" src="'+imgs[0]+'" class="gallery-main-img" alt="'+p.title+'"/>'+
        '<div class="gallery-zoom-hint">🔍 Дарж томруулна</div>'+
      '</div>'+
      (imgs.length>1?
        '<div class="gallery-thumbs">'+
          imgs.map(function(src,ti){
            return '<img src="'+src+'" class="gallery-thumb'+(ti===0?' active':'')+'" data-src="'+src+'" alt="'+(ti+1)+'"/>';
          }).join('')+
        '</div>':'');
  } else {
    galleryHtml='<div class="gallery-no-img"><div style="font-size:3.5rem">'+p.emoji+'</div><div style="font-size:.72rem;color:var(--muted);margin-top:.6rem">Зураг байхгүй</div></div>';
  }

  mContent.innerHTML=
    '<div style="font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:'+p.color+';margin-bottom:.4rem">Төсөл '+String(num).padStart(2,'0')+'</div>'+
    '<h3 style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:1.4rem;margin-bottom:1rem">'+p.title+'</h3>'+
    '<div class="modal-gallery">'+galleryHtml+'</div>'+
    '<p style="color:var(--muted);font-size:.78rem;line-height:1.9;margin:1rem 0">'+p.desc+'</p>'+
    '<div style="font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.7rem">Үндсэн боломжууд</div>'+
    (p.features||[]).map(function(f){return '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem;font-size:.76rem"><span style="color:'+p.color+'">▸</span>'+f+'</div>';}).join('')+
    '<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem">'+
    (p.tags||[]).map(function(t){return '<span style="font-size:.6rem;padding:.22rem .65rem;background:rgba(245,166,35,.1);color:'+p.color+';border-radius:3px">'+t+'</span>';}).join('')+
    '</div>';

  // ── Gallery event listeners ───────────────────────────
  var currentSrc = imgs[0];
  var gm = document.getElementById('galMain');
  var mi = document.getElementById('mainImg');

  if(gm){
    gm.addEventListener('click', function(){ openFullImg(currentSrc); });
  }

  mContent.querySelectorAll('.gallery-thumb').forEach(function(thumb){
    thumb.addEventListener('click', function(){
      var src = thumb.getAttribute('data-src');
      if(!src) return;
      currentSrc = src;
      if(mi) mi.src = src;
      mContent.querySelectorAll('.gallery-thumb').forEach(function(t){ t.classList.remove('active'); });
      thumb.classList.add('active');
    });
  });

  pModal.style.display='flex'; document.body.style.overflow='hidden'; attachHover();
}

// ── Fullscreen image viewer ───────────────────────────────
window.openFullImg=function(src){
  var overlay=document.createElement('div');
  overlay.id='fullImgOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:fadeIn .2s ease';
  overlay.innerHTML=
    '<img src="'+src+'" style="max-width:95vw;max-height:92vh;object-fit:contain;border-radius:6px;box-shadow:0 0 60px rgba(0,0,0,.8)"/>'+
    '<button style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:white;font-size:2rem;cursor:pointer;line-height:1;opacity:.7" onclick="document.getElementById(\'fullImgOverlay\').remove()">✕</button>';
  overlay.addEventListener('click',function(e){ if(e.target===overlay||e.target.tagName==='IMG') overlay.remove(); });
  document.body.appendChild(overlay);
  if(!document.getElementById('fadeInStyle')){
    var s=document.createElement('style');
    s.id='fadeInStyle'; s.textContent='@keyframes fadeIn{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(s);
  }
};

function closeProject(){ if(pModal) pModal.style.display='none'; document.body.style.overflow=''; }
var cpBtn=document.getElementById('closeProject');
if(cpBtn) cpBtn.addEventListener('click',closeProject);
if(pModal) pModal.addEventListener('click',function(e){if(e.target===pModal)closeProject();});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var fi=document.getElementById('fullImgOverlay');
    if(fi){fi.remove();return;}
    closeContact(); closeProject();
  }
});

// ── Render projects ───────────────────────────────────────
function buildVis(p,i){
  if(p.images && p.images.length>0){
    return '<div class="project-visual proj-img-wrap" id="imgWrap_'+i+'">'+
      '<img src="'+p.images[0]+'" alt="'+p.title+'" class="proj-thumb" onerror="this.parentNode.innerHTML=getFallback(\''+p.id+'\','+i+')"/>'+
      (p.images.length>1?'<div class="img-count">📷 '+p.images.length+'</div>':'')+
    '</div>';
  }
  if(p.visualType==='food') return '<div class="project-visual visual-food"><div class="visual-food-inner"><div class="food-icon">🍔</div><div class="food-bars"><div class="food-bar" style="height:20px"></div><div class="food-bar" style="height:30px"></div><div class="food-bar" style="height:25px"></div><div class="food-bar" style="height:38px"></div><div class="food-bar" style="height:18px"></div></div></div></div>';
  if(p.visualType==='movie') return '<div class="project-visual visual-movie"><div class="movie-stars" id="ms_'+i+'"></div><div class="movie-screen"><div class="movie-play"></div></div></div>';
  return '<div class="project-visual visual-custom" style="background:linear-gradient(135deg,'+p.color+'22,'+p.color+'0a)"><div class="custom-emoji" style="filter:drop-shadow(0 0 24px '+p.color+'99)">'+p.emoji+'</div></div>';
}

function getFallback(id,i){
  if(id==='food') return '<div class="project-visual visual-food"><div class="visual-food-inner"><div class="food-icon">🍔</div><div class="food-bars"><div class="food-bar" style="height:20px"></div><div class="food-bar" style="height:30px"></div><div class="food-bar" style="height:25px"></div><div class="food-bar" style="height:38px"></div><div class="food-bar" style="height:18px"></div></div></div></div>';
  return '<div class="project-visual visual-custom"><div class="custom-emoji">🖼️</div></div>';
}

async function renderProjects(){
  var grid=document.getElementById('projectsGrid'); if(!grid) return;
  grid.innerHTML='<div class="projects-loading">Ачааллаж байна...</div>';
  var projects = await getProjects();
  _prjs=projects; grid.innerHTML='';
  projects.forEach(function(p,i){
    var card=document.createElement('div');
    card.className='project-card reveal'+(i>0?' reveal-delay-'+Math.min(i,3):'');
    card.innerHTML=buildVis(p,i)+
      '<div class="project-meta">'+
        '<div class="project-number">'+String(i+1).padStart(2,'0')+' / Төсөл</div>'+
        '<h3 class="project-title">'+p.title+'</h3>'+
        '<p class="project-desc">'+p.desc+'</p>'+
        '<div class="project-tags">'+(p.tags||[]).map(function(t){return '<span class="project-tag">'+t+'</span>';}).join('')+'</div>'+
        '<a href="#" class="project-link" data-id="'+p.id+'">Төсөл үзэх <span class="arrow">→</span></a>'+
      '</div>';
    grid.appendChild(card); revObs.observe(card);
    if(p.visualType==='movie'&&!p.images){
      var sc=document.getElementById('ms_'+i);
      if(sc){ for(var s=0;s<40;s++){var el=document.createElement('div');el.className='star';el.style.cssText='left:'+(Math.random()*100)+'%;top:'+(Math.random()*100)+'%;animation-delay:'+(Math.random()*3)+'s;opacity:'+(Math.random()*.6+.1);sc.appendChild(el);} }
    }
  });
  grid.querySelectorAll('.project-link[data-id]').forEach(function(a){
    a.addEventListener('click',function(e){e.preventDefault();openProject(a.dataset.id);});
  });
  attachHover();
}

// ── Init ─────────────────────────────────────────────────
(async function(){
  await initFirebase();
  trackVisit();
  renderProjects();
})();