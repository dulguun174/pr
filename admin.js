// ════════════════════════════════════════════════════════
//  ADMIN.JS — Gmail Email Link Auth + Firestore
//  Firebase config тохируулаагүй үед localStorage ашиглана
// ════════════════════════════════════════════════════════

// ── 🔥 FIREBASE CONFIG (өөрийнхөөрөө солино уу) ─────────
const FB_CONFIG = {
  apiKey:            "",   // ← YOUR_API_KEY
  authDomain:        "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

// ── ✉️  ЗӨВШӨӨРӨГДСӨН GMAIL ──────────────────────────────
const ALLOWED_EMAIL = "munkhdulgoon@gmail.com";   // ← ЭНД

// ── Firebase ready flag ───────────────────────────────────
const FB_READY = FB_CONFIG.apiKey.length > 0;
let auth = null, db = null;

// ════════════════════════════════════════════════════════
//  DEFAULT PROJECTS
// ════════════════════════════════════════════════════════
const DEFAULT_PROJECTS = [
  {
    id: 'food', title: 'Food Delivery App',
    desc: 'Хоол захиалгын платформ. Бодит цагийн захиалга хянах, рестораны жагсаалт, сагс болон төлбөр хийх боломжтой.',
    tags: ['HTML','CSS','JavaScript','API'], emoji: '🍔', visualType: 'food',
    color: '#f5a623', features: ['Ресторан хайх','Бодит цагийн хянах','Сагс & төлбөр','Захиалгын түүх'],
    demo: '#', code: '#', order: 0
  },
  {
    id: 'movie', title: 'Movie Website',
    desc: 'TMDB API ашигласан кино үзэх платформ. Жанрын шүүлт, хайлт, үнэлгээ болон watchlist боломжтой.',
    tags: ['HTML','CSS','JavaScript','TMDB API'], emoji: '🎬', visualType: 'movie',
    color: '#e05a5a', features: ['TMDB API холболт','Жанрын шүүлт','Кино дэлгэрэнгүй','Watchlist'],
    demo: '#', code: '#', order: 1
  }
];

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════
function getLocalVisits()   { return JSON.parse(localStorage.getItem('portfolio_visits')   || '[]'); }
function getLocalMessages() { return JSON.parse(localStorage.getItem('portfolio_messages') || '[]'); }
function getLocalProjects() {
  const s = localStorage.getItem('portfolio_projects');
  return s ? JSON.parse(s) : [...DEFAULT_PROJECTS];
}
function saveLocalProjects(arr) { localStorage.setItem('portfolio_projects', JSON.stringify(arr)); }

function fmtDate(val) {
  if (!val) return '—';
  const d = (typeof val === 'string') ? new Date(val) : (val.toDate ? val.toDate() : new Date(val));
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtDay(d) {
  const p = n => String(n).padStart(2,'0');
  return `${p(d.getMonth()+1)}/${p(d.getDate())}`;
}

// ════════════════════════════════════════════════════════
//  DOM REFS
// ════════════════════════════════════════════════════════
const loginScreen  = document.getElementById('loginScreen');
const adminPanel   = document.getElementById('adminPanel');
const step1        = document.getElementById('step1');
const step2        = document.getElementById('step2');
const loginLoading = document.getElementById('loginLoading');
const gmailInput   = document.getElementById('gmailInput');
const gmailError   = document.getElementById('gmailError');
const codeError    = document.getElementById('codeError');
const codeSentMsg  = document.getElementById('codeSentMsg');
const codeBoxes    = document.querySelectorAll('.code-box');

// ════════════════════════════════════════════════════════
//  INIT — Firebase or localStorage mode
// ════════════════════════════════════════════════════════
async function initApp() {
  if (FB_READY) {
    try {
      const { initializeApp }  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      const { getAuth, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged }
        = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      const { getFirestore }   = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

      const fbApp = initializeApp(FB_CONFIG);
      auth = getAuth(fbApp);
      db   = getFirestore(fbApp);

      // Returning from email link?
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLoading(true);
        let email = localStorage.getItem('adminEmailForSignIn') || ALLOWED_EMAIL;
        try {
          const result = await signInWithEmailLink(auth, email, window.location.href);
          localStorage.removeItem('adminEmailForSignIn');
          window.history.replaceState(null,'',window.location.pathname);
          if (result.user.email === ALLOWED_EMAIL) {
            showAdminPanel(result.user.email);
          } else {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
            await signOut(auth);
            setLoading(false);
            gmailError.textContent = 'Зөвшөөрөгдөөгүй Gmail хаяг.';
          }
        } catch(e) {
          setLoading(false);
          gmailError.textContent = 'Холбоос хүчингүй болсон. Дахин оролдоно уу.';
        }
        return;
      }

      onAuthStateChanged(auth, user => {
        if (user && user.email === ALLOWED_EMAIL) showAdminPanel(user.email);
      });

    } catch(e) {
      console.warn('Firebase failed, using localStorage mode:', e.message);
      checkLocalAuth();
    }
  } else {
    // localStorage mode
    checkLocalAuth();
  }
}

function checkLocalAuth() {
  if (sessionStorage.getItem('admin_local_auth') === '1') {
    showAdminPanel(ALLOWED_EMAIL);
  }
}

// ════════════════════════════════════════════════════════
//  STEP 1 — Gmail input
// ════════════════════════════════════════════════════════
document.getElementById('sendCodeBtn').addEventListener('click', sendLink);
gmailInput.addEventListener('keydown', e => { if(e.key==='Enter') sendLink(); });

async function sendLink() {
  const email = gmailInput.value.trim().toLowerCase();
  gmailError.textContent = '';

  if (!email)                         { gmailError.textContent = 'Gmail хаягаа оруулна уу.'; return; }
  if (!email.endsWith('@gmail.com'))  { gmailError.textContent = 'Зөвхөн Gmail хаяг зөвшөөрөгддөг.'; return; }
  if (email !== ALLOWED_EMAIL)        { gmailError.textContent = 'Энэ Gmail хаяг зөвшөөрөгдөөгүй.'; return; }

  if (!FB_READY || !auth) {
    // localStorage mode: simple password-free local login
    sessionStorage.setItem('admin_local_auth','1');
    showAdminPanel(email);
    return;
  }

  setLoading(true);
  try {
    const { sendSignInLinkToEmail } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.href,
      handleCodeInApp: true
    });
    localStorage.setItem('adminEmailForSignIn', email);
    setLoading(false);
    showStep2(email);
  } catch(e) {
    setLoading(false);
    if (e.code === 'auth/operation-not-allowed') {
      gmailError.textContent = 'Firebase Authentication → Email Link идэвхжүүлнэ үү.';
    } else {
      gmailError.textContent = 'Алдаа: ' + e.message;
    }
  }
}

function showStep2(email) {
  step1.style.display = 'none';
  step2.style.display = 'block';
  codeSentMsg.textContent = `"${email}" хаягт нэвтрэх холбоос илгээлээ. Имэйлийн холбоосыг дарна уу.`;
  codeBoxes[0]?.focus();
}

function setLoading(on) {
  step1.style.display        = on ? 'none' : 'block';
  step2.style.display        = 'none';
  loginLoading.style.display = on ? 'block' : 'none';
}

// Code boxes keyboard nav (visual only)
codeBoxes.forEach((box, i) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\D/g,'');
    if (box.value && i < codeBoxes.length-1) codeBoxes[i+1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key==='Backspace' && !box.value && i>0) codeBoxes[i-1].focus();
  });
});

document.getElementById('verifyCodeBtn').addEventListener('click', () => {
  codeError.textContent = 'Gmail-д ирсэн холбоосыг дарж нэвтэрнэ үү.';
});
document.getElementById('backToStep1').addEventListener('click', () => {
  step2.style.display='none'; step1.style.display='block'; codeError.textContent='';
});
document.getElementById('resendBtn').addEventListener('click', () => {
  step2.style.display='none'; step1.style.display='block'; sendLink();
});

// ════════════════════════════════════════════════════════
//  SHOW ADMIN PANEL
// ════════════════════════════════════════════════════════
function showAdminPanel(email) {
  loginScreen.style.display = 'none';
  adminPanel.style.display  = 'flex';
  const badge = document.getElementById('adminEmailBadge');
  if (badge) badge.textContent = email;
  const h = new Date().getHours();
  const greet = h<12 ? 'Өглөөний мэнд' : h<18 ? 'Үдийн мэнд' : 'Оройн мэнд';
  const dg = document.getElementById('dashGreet');
  if (dg) dg.textContent = `${greet}, ${email}`;

  loadDashboard();
  loadVisitors();
  loadDevices();
  loadProjects();
  loadMessages();
}

// ── Logout ────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  sessionStorage.removeItem('admin_local_auth');
  if (auth) {
    try {
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      await signOut(auth);
    } catch(e) {}
  }
  location.reload();
});

// ════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ════════════════════════════════════════════════════════
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('tab-'+item.dataset.tab).classList.add('active');
  });
});

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════
async function loadDashboard() {
  let visits=[], projCount=0, msgCount=0;

  if (db) {
    try {
      const { collection, getDocs, orderBy, query, limit } =
        await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const [vs, ps, ms] = await Promise.all([
        getDocs(query(collection(db,'visits'), orderBy('time','desc'), limit(500))),
        getDocs(collection(db,'projects')),
        getDocs(collection(db,'messages'))
      ]);
      vs.forEach(d=>visits.push(d.data()));
      projCount=ps.size; msgCount=ms.size;
    } catch(e) { console.warn(e); }
  }

  if (!visits.length) {
    visits    = getLocalVisits();
    projCount = getLocalProjects().length;
    msgCount  = getLocalMessages().length;
  }

  const today   = new Date().toDateString();
  const todayCt = visits.filter(v => new Date(v.time?.toDate?.()||v.time).toDateString()===today).length;
  const desktop = visits.filter(v=>v.device==='Desktop').length;
  const mobile  = visits.filter(v=>v.device==='Mobile').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon">👁</div><div class="stat-value">${visits.length}</div><div class="stat-label">Нийт үзэлт</div></div>
    <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">${todayCt}</div><div class="stat-label">Өнөөдөр</div></div>
    <div class="stat-card"><div class="stat-icon">🖥</div><div class="stat-value">${desktop}</div><div class="stat-label">Desktop</div></div>
    <div class="stat-card"><div class="stat-icon">📱</div><div class="stat-value">${mobile}</div><div class="stat-label">Mobile</div></div>
    <div class="stat-card"><div class="stat-icon">🗂</div><div class="stat-value">${projCount}</div><div class="stat-label">Төслүүд</div></div>
    <div class="stat-card"><div class="stat-icon">✉️</div><div class="stat-value">${msgCount}</div><div class="stat-label">Мессежүүд</div></div>`;

  renderDailyChart(visits);
  renderHourlyChart(visits);
}

function toDate(v) { return v?.toDate ? v.toDate() : new Date(v); }

function renderDailyChart(visits) {
  const days=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push({label:fmtDay(d),key:d.toDateString(),count:0}); }
  visits.forEach(v=>{ const key=toDate(v.time).toDateString(); const d=days.find(x=>x.key===key); if(d)d.count++; });
  const max=Math.max(...days.map(d=>d.count),1);
  document.getElementById('dailyChart').innerHTML=days.map(d=>`
    <div class="bar-col" title="${d.label}: ${d.count}">
      <div class="bar-val">${d.count||''}</div>
      <div class="bar-fill" style="height:${Math.round(d.count/max*100)}px"></div>
      <div class="bar-label">${d.label}</div>
    </div>`).join('');
}

function renderHourlyChart(visits) {
  const today=new Date().toDateString();
  const hours=Array.from({length:24},(_,i)=>({h:i,count:0}));
  visits.filter(v=>toDate(v.time).toDateString()===today).forEach(v=>hours[toDate(v.time).getHours()].count++);
  const now=new Date().getHours();
  const rel=hours.filter(h=>h.count>0||Math.abs(h.h-now)<=1);
  if(!rel.length){document.getElementById('hourlyChart').innerHTML='<div class="empty-msg" style="padding:1rem;font-size:.75rem">Өнөөдөр үзэлт байхгүй</div>';return;}
  const max=Math.max(...rel.map(h=>h.count),1);
  document.getElementById('hourlyChart').innerHTML=rel.map(h=>`
    <div class="bar-col" title="${h.h}:00 — ${h.count}">
      <div class="bar-val">${h.count||''}</div>
      <div class="bar-fill blue" style="height:${Math.round(h.count/max*100)}px"></div>
      <div class="bar-label">${h.h}:00</div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════
//  VISITORS
// ════════════════════════════════════════════════════════
async function loadVisitors() {
  const list=document.getElementById('visitorsList');
  let visits=[];

  if (db) {
    try {
      const {collection,getDocs,orderBy,query,limit}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDocs(query(collection(db,'visits'),orderBy('time','desc'),limit(200)));
      snap.forEach(d=>visits.push(d.data()));
    } catch(e){}
  }
  if(!visits.length) visits=[...getLocalVisits()].reverse();

  if(!visits.length){list.innerHTML='<div class="empty-msg">Одоогоор үзэлт бүртгэгдээгүй байна.</div>';return;}
  list.innerHTML=visits.map(v=>{
    const badge=v.device==='Mobile'?'badge-mobile':v.device==='Tablet'?'badge-tablet':'badge-desktop';
    const icon=v.device==='Mobile'?'📱':v.device==='Tablet'?'📟':'🖥';
    return `<div class="table-row">
      <span class="time-cell">${fmtDate(v.time)}</span>
      <span><span class="device-badge ${badge}">${icon} ${v.device||'—'}</span></span>
      <span style="color:var(--muted);font-size:.66rem">${v.browser||'—'}</span>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════
//  DEVICES
// ════════════════════════════════════════════════════════
async function loadDevices() {
  let visits=[];
  if(db){
    try{
      const {collection,getDocs,limit,query}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDocs(query(collection(db,'visits'),limit(500)));
      snap.forEach(d=>visits.push(d.data()));
    }catch(e){}
  }
  if(!visits.length) visits=getLocalVisits();

  const total=visits.length||1;
  const counts={Desktop:0,Mobile:0,Tablet:0};
  visits.forEach(v=>{if(counts[v.device]!==undefined)counts[v.device]++;});

  document.getElementById('deviceGrid').innerHTML=[
    {key:'Desktop',emoji:'🖥',label:'Desktop'},
    {key:'Mobile',emoji:'📱',label:'Mobile'},
    {key:'Tablet',emoji:'📟',label:'Tablet'}
  ].map(d=>`<div class="device-card">
    <div class="device-emoji">${d.emoji}</div>
    <div class="device-count">${counts[d.key]}</div>
    <div class="device-name">${d.label}</div>
    <div class="device-pct">${Math.round(counts[d.key]/total*100)}%</div>
  </div>`).join('');

  const colors={Desktop:'var(--accent3)',Mobile:'var(--accent)',Tablet:'#50c878'};
  document.getElementById('deviceBars').innerHTML=Object.entries(counts).map(([k,c])=>`
    <div class="device-bar-row">
      <div class="device-bar-label">${k}</div>
      <div class="device-bar-track"><div class="device-bar-fill" style="width:${Math.round(c/total*100)}%;background:${colors[k]}"></div></div>
      <div class="device-bar-num">${c}</div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════
//  PROJECTS
// ════════════════════════════════════════════════════════
async function loadProjects() {
  let projects=[];
  if(db){
    try{
      const {collection,getDocs,orderBy,query}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDocs(query(collection(db,'projects'),orderBy('order','asc')));
      if(!snap.empty){snap.forEach(d=>projects.push({id:d.id,...d.data()}));}
    }catch(e){
      try{
        const {collection,getDocs}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const snap=await getDocs(collection(db,'projects'));
        snap.forEach(d=>projects.push({id:d.id,...d.data()}));
      }catch(e2){}
    }
  }
  if(!projects.length) projects=getLocalProjects();
  renderProjectList(projects);
}

function renderProjectList(projects) {
  const list=document.getElementById('projectsList');
  if(!projects.length){list.innerHTML='<div class="empty-msg">Төсөл байхгүй. Дээрх товч дарж нэмнэ үү.</div>';return;}
  list.innerHTML=projects.map(p=>`
    <div class="proj-admin-card">
      <div class="proj-admin-emoji">${p.emoji||'🚀'}</div>
      <div class="proj-admin-info">
        <div class="proj-admin-title">${p.title}</div>
        <div class="proj-admin-desc">${(p.desc||'').substring(0,90)}${(p.desc||'').length>90?'…':''}</div>
        <div class="proj-admin-tags">${(p.tags||[]).map(t=>`<span class="proj-admin-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="proj-admin-actions">
        <button class="btn-edit" onclick="openEditProject('${p.id}')">✏ Засах</button>
        <button class="btn-del"  onclick="startDelete('${p.id}')">🗑</button>
      </div>
    </div>`).join('');
}

// Open add
document.getElementById('openAddProject').addEventListener('click',()=>{
  document.getElementById('projectFormTitle').textContent='Шинэ төсөл нэмэх';
  document.getElementById('editProjectId').value='';
  ['pTitle','pDesc','pTags','pFeatures','pDemo','pCode'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pEmoji').value='🚀';
  document.getElementById('pColor').value='#f5a623';
  document.getElementById('pOrder').value='0';
  document.getElementById('saveMsg').textContent='';
  document.getElementById('projectFormModal').style.display='flex';
});

// Open edit
window.openEditProject = async function(id) {
  let p=null;
  if(db){
    try{
      const {collection,getDocs}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDocs(collection(db,'projects'));
      snap.forEach(d=>{if(d.id===id)p={id:d.id,...d.data()};});
    }catch(e){}
  }
  if(!p) p=getLocalProjects().find(x=>x.id===id);
  if(!p)return;
  document.getElementById('projectFormTitle').textContent='Төсөл засах';
  document.getElementById('editProjectId').value=id;
  document.getElementById('pTitle').value   =p.title||'';
  document.getElementById('pDesc').value    =p.desc||'';
  document.getElementById('pEmoji').value   =p.emoji||'🚀';
  document.getElementById('pColor').value   =p.color||'#f5a623';
  document.getElementById('pOrder').value   =p.order??0;
  document.getElementById('pTags').value    =(p.tags||[]).join(', ');
  document.getElementById('pFeatures').value=(p.features||[]).join('\n');
  document.getElementById('pDemo').value    =p.demo||'';
  document.getElementById('pCode').value    =p.code||'';
  document.getElementById('saveMsg').textContent='';
  document.getElementById('projectFormModal').style.display='flex';
};

// Save
document.getElementById('saveProjectBtn').addEventListener('click', async()=>{
  const title   =document.getElementById('pTitle').value.trim();
  const desc    =document.getElementById('pDesc').value.trim();
  const emoji   =document.getElementById('pEmoji').value.trim()||'🚀';
  const color   =document.getElementById('pColor').value;
  const order   =parseInt(document.getElementById('pOrder').value)||0;
  const tags    =document.getElementById('pTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const features=document.getElementById('pFeatures').value.split('\n').map(f=>f.trim()).filter(Boolean);
  const demo    =document.getElementById('pDemo').value.trim()||'#';
  const code    =document.getElementById('pCode').value.trim()||'#';
  const editId  =document.getElementById('editProjectId').value;

  if(!title||!desc){document.getElementById('saveMsg').textContent='Нэр болон тайлбар заавал бөглөнө үү.';return;}

  const btn=document.getElementById('saveProjectBtn');
  btn.disabled=true; btn.textContent='Хадгалж байна...';

  const data={title,desc,emoji,color,order,tags,features,demo,code,visualType:'custom'};

  if(db){
    try{
      const {collection,addDoc,updateDoc,doc,serverTimestamp}=
        await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      if(editId){
        await updateDoc(doc(db,'projects',editId),{...data,updatedAt:serverTimestamp()});
      } else {
        await addDoc(collection(db,'projects'),{...data,createdAt:serverTimestamp()});
      }
    }catch(e){
      // fallback to localStorage
      saveToLocal(editId,data);
    }
  } else {
    saveToLocal(editId,data);
  }

  document.getElementById('saveMsg').textContent='✅ Амжилттай хадгалагдлаа!';
  btn.disabled=false; btn.textContent='Хадгалах →';
  setTimeout(()=>{
    document.getElementById('projectFormModal').style.display='none';
    loadProjects(); loadDashboard();
  },900);
});

function saveToLocal(editId, data) {
  const projects=getLocalProjects();
  if(editId){
    const idx=projects.findIndex(p=>p.id===editId);
    if(idx!==-1) projects[idx]={...projects[idx],...data};
  } else {
    projects.push({...data,id:'proj_'+Date.now()});
  }
  saveLocalProjects(projects);
}

document.getElementById('closeProjectForm').addEventListener('click',()=>document.getElementById('projectFormModal').style.display='none');
document.getElementById('projectFormModal').addEventListener('click',e=>{if(e.target===document.getElementById('projectFormModal'))document.getElementById('projectFormModal').style.display='none';});

// Delete
let _deleteId=null;
window.startDelete=function(id){_deleteId=id;document.getElementById('confirmModal').style.display='flex';};
document.getElementById('confirmDelete').addEventListener('click',async()=>{
  if(!_deleteId)return;
  if(db){
    try{
      const {doc,deleteDoc}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await deleteDoc(doc(db,'projects',_deleteId));
    }catch(e){
      const ps=getLocalProjects().filter(p=>p.id!==_deleteId);
      saveLocalProjects(ps);
    }
  } else {
    const ps=getLocalProjects().filter(p=>p.id!==_deleteId);
    saveLocalProjects(ps);
  }
  _deleteId=null;
  document.getElementById('confirmModal').style.display='none';
  loadProjects(); loadDashboard();
});
document.getElementById('cancelDelete').addEventListener('click',()=>{_deleteId=null;document.getElementById('confirmModal').style.display='none';});
document.getElementById('confirmModal').addEventListener('click',e=>{if(e.target===document.getElementById('confirmModal')){_deleteId=null;document.getElementById('confirmModal').style.display='none';}});

// ════════════════════════════════════════════════════════
//  MESSAGES
// ════════════════════════════════════════════════════════
async function loadMessages() {
  const list=document.getElementById('messagesList');
  let msgs=[];
  if(db){
    try{
      const {collection,getDocs,orderBy,query}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDocs(query(collection(db,'messages'),orderBy('time','desc')));
      snap.forEach(d=>msgs.push(d.data()));
    }catch(e){}
  }
  if(!msgs.length) msgs=getLocalMessages();
  if(!msgs.length){list.innerHTML='<div class="empty-msg">Мессеж байхгүй байна.</div>';return;}
  list.innerHTML=msgs.map(m=>`
    <div class="msg-card">
      <div class="msg-header">
        <div><div class="msg-name">${m.name||'—'}</div><div class="msg-email">${m.email||'—'}</div></div>
        <div class="msg-time">${fmtDate(m.time)}</div>
      </div>
      <div class="msg-body">${m.message||''}</div>
    </div>`).join('');
}

// ── Escape modals ─────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.getElementById('projectFormModal').style.display='none';
    document.getElementById('confirmModal').style.display='none';
  }
});

// ── Start ─────────────────────────────────────────────────
initApp();