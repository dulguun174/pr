var ADMIN_EMAIL    = 'admin1@gmail.com';
var ADMIN_PASSWORD = 'admin123';


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
    console.log("Firebase connected ✅");
    return m2;
  } catch(e) {
    console.warn("Firebase failed, using localStorage:", e.message);
    return null;
  }
}

async function fm() {
  return await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
}

// ── Default projects ─────────────────────────────────────
var DEFAULT_PROJECTS = [
  { id:'food', title:'Food Delivery App', desc:'Хоол захиалгын платформ. Бодит цагийн захиалга хянах, рестораны жагсаалт, сагс болон төлбөр хийх боломжтой.', tags:['HTML','CSS','JavaScript','API'], emoji:'🍔', visualType:'food', color:'#f5a623', features:['Ресторан хайх & шүүх','Бодит цагийн хянах','Сагс & төлбөр','Захиалгын түүх'], demo:'#', code:'#', order:0 },
  { id:'movie', title:'Movie Website', desc:'TMDB API ашигласан кино үзэх платформ. Жанрын шүүлт, хайлт, үнэлгээ болон watchlist боломжтой.', tags:['HTML','CSS','JavaScript','TMDB API'], emoji:'🎬', visualType:'movie', color:'#e05a5a', features:['TMDB API холболт','Жанрын шүүлт & хайлт','Кино дэлгэрэнгүй','Watchlist'], demo:'#', code:'#', order:1 }
];

function getVisits()   { return JSON.parse(localStorage.getItem('portfolio_visits')   || '[]'); }
function getMessages() { return JSON.parse(localStorage.getItem('portfolio_messages') || '[]'); }
function getProjects() { var s=localStorage.getItem('portfolio_projects'); return s?JSON.parse(s):JSON.parse(JSON.stringify(DEFAULT_PROJECTS)); }
function saveProjects(arr) { localStorage.setItem('portfolio_projects',JSON.stringify(arr)); }

// Firestore helpers
async function fsGetVisits() {
  if (!_db) return getVisits();
  try {
    var f = await fm();
    var snap = await f.getDocs(f.query(f.collection(_db,'visits'), f.orderBy('time','desc'), f.limit(500)));
    var list = []; snap.forEach(function(d){ list.push(d.data()); });
    return list.length ? list : getVisits();
  } catch(e) { return getVisits(); }
}
async function fsGetMessages() {
  if (!_db) return getMessages();
  try {
    var f = await fm();
    var snap = await f.getDocs(f.query(f.collection(_db,'messages'), f.orderBy('time','desc')));
    var list = []; snap.forEach(function(d){ list.push(d.data()); });
    return list.length ? list : getMessages();
  } catch(e) { return getMessages(); }
}
async function fsGetProjects() {
  // Эхлээд localStorage-аас авна (үргэлж ажиллана)
  var local = getProjects();
  if (!_db) return local;
  try {
    var f = await fm();
    // orderBy ашиглахгүй — index шаардахгүй
    var snap = await f.getDocs(f.collection(_db,'projects'));
    if (!snap.empty) {
      var list = [];
      snap.forEach(function(d){ list.push(Object.assign({id:d.id},d.data())); });
      // order талбараар эрэмбэлнэ
      list.sort(function(a,b){ return (a.order||0)-(b.order||0); });
      // localStorage-д хадгална (sync)
      saveProjects(list);
      return list;
    }
    return local;
  } catch(e) {
    console.warn("Firestore projects fetch failed:", e.message);
    return local;
  }
}
async function fsSaveProject(editId, data) {
  // Always save to localStorage
  var projects = getProjects();
  if (editId) {
    var idx = projects.findIndex(function(p){return p.id===editId;});
    if (idx!==-1) projects[idx] = Object.assign({},projects[idx],data);
  } else {
    data.id = 'proj_'+Date.now();
    projects.push(data);
  }
  saveProjects(projects);
  // Also save to Firestore
  if (_db) {
    try {
      var f = await fm();
      if (editId) {
        await f.updateDoc(f.doc(_db,'projects',editId), Object.assign({},data,{updatedAt:f.serverTimestamp()}));
      } else {
        await f.addDoc(f.collection(_db,'projects'), Object.assign({},data,{createdAt:f.serverTimestamp()}));
      }
    } catch(e) { console.warn("Firestore save failed:", e.message); }
  }
  return data.id || editId;
}
async function fsDeleteProject(id) {
  var projects = getProjects().filter(function(p){return p.id!==id;});
  saveProjects(projects);
  if (_db) {
    try {
      var f = await fm();
      await f.deleteDoc(f.doc(_db,'projects',id));
    } catch(e) { console.warn("Firestore delete failed:", e.message); }
  }
}

function fmtDate(val) {
  if (!val) return '—';
  var d = (val && val.toDate) ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return '—';
  var p = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}
function fmtDay(d) {
  var p=function(n){return String(n).padStart(2,'0');};
  return p(d.getMonth()+1)+'/'+p(d.getDate());
}

// ════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════
var loginScreen = document.getElementById('loginScreen');
var adminPanel  = document.getElementById('adminPanel');
var loginError  = document.getElementById('loginError');
var emailInp    = document.getElementById('emailInput');
var passInp     = document.getElementById('passInput');

if (sessionStorage.getItem('admin_auth') === '1') {
  showAdmin();
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
[emailInp, passInp].forEach(function(el){
  if(el) el.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
});

function doLogin() {
  var email = (emailInp.value||'').trim().toLowerCase();
  var pass  = (passInp.value||'').trim();
  loginError.textContent = '';
  if (!email || !pass) { loginError.textContent = 'Имэйл болон нууц үгээ оруулна уу.'; return; }
  if (email !== ADMIN_EMAIL)    { loginError.textContent = 'Gmail хаяг буруу байна.'; return; }
  if (pass  !== ADMIN_PASSWORD) { loginError.textContent = 'Нууц үг буруу байна.'; return; }
  sessionStorage.setItem('admin_auth','1');
  showAdmin();
}

function showAdmin() {
  loginScreen.style.display = 'none';
  adminPanel.style.display  = 'flex';
  var badge = document.getElementById('adminEmailBadge');
  if(badge) badge.textContent = ADMIN_EMAIL;
  var h = new Date().getHours();
  var greet = h<12?'Өглөөний мэнд':h<18?'Үдийн мэнд':'Оройн мэнд';
  var dg = document.getElementById('dashGreet');
  if(dg) dg.textContent = greet+', '+ADMIN_EMAIL;
  // Init Firebase then load all data
  initFirebase().then(function(){
    loadDashboard();
    loadVisitors();
    loadDevices();
    loadProjects();
    loadMessages();
  });
}

document.getElementById('logoutBtn').addEventListener('click', function(){
  sessionStorage.removeItem('admin_auth');
  location.reload();
});

// ════════════════════════════════════════════════════
//  TAB NAV
// ════════════════════════════════════════════════════
document.querySelectorAll('.nav-item[data-tab]').forEach(function(item){
  item.addEventListener('click',function(e){
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
    document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
    item.classList.add('active');
    document.getElementById('tab-'+item.dataset.tab).classList.add('active');
  });
});

// ════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════
async function loadDashboard() {
  var visits   = await fsGetVisits();
  var projects = await fsGetProjects();
  var messages = await fsGetMessages();
  var today    = new Date().toDateString();
  var todayCt  = visits.filter(function(v){ return new Date(v.time?.toDate?.()||v.time).toDateString()===today; }).length;
  var desktop  = visits.filter(function(v){ return v.device==='Desktop'; }).length;
  var mobile   = visits.filter(function(v){ return v.device==='Mobile'; }).length;

  document.getElementById('statsRow').innerHTML =
    mkStat('👁', visits.length,   'Нийт үзэлт')+
    mkStat('📅', todayCt,         'Өнөөдөр')+
    mkStat('🖥', desktop,         'Desktop')+
    mkStat('📱', mobile,          'Mobile')+
    mkStat('🗂', projects.length, 'Төслүүд')+
    mkStat('✉️', messages.length, 'Мессежүүд');

  renderDailyChart(visits);
  renderHourlyChart(visits);
}

function mkStat(icon,val,label){
  return '<div class="stat-card"><div class="stat-icon">'+icon+'</div><div class="stat-value">'+val+'</div><div class="stat-label">'+label+'</div></div>';
}

function toDate(v) {
  if (!v) return new Date(0);
  return v.toDate ? v.toDate() : new Date(v);
}

function renderDailyChart(visits) {
  var days=[];
  for(var i=6;i>=0;i--){ var d=new Date(); d.setDate(d.getDate()-i); days.push({label:fmtDay(d),key:d.toDateString(),count:0}); }
  visits.forEach(function(v){
    var key=toDate(v.time).toDateString();
    for(var i=0;i<days.length;i++){if(days[i].key===key){days[i].count++;break;}}
  });
  var max=0; days.forEach(function(d){if(d.count>max)max=d.count;}); if(!max)max=1;
  document.getElementById('dailyChart').innerHTML=days.map(function(d){
    return '<div class="bar-col" title="'+d.label+': '+d.count+'">'+
      '<div class="bar-val">'+(d.count||'')+'</div>'+
      '<div class="bar-fill" style="height:'+Math.round(d.count/max*100)+'px"></div>'+
      '<div class="bar-label">'+d.label+'</div></div>';
  }).join('');
}

function renderHourlyChart(visits) {
  var today=new Date().toDateString();
  var hours=[]; for(var i=0;i<24;i++) hours.push({h:i,count:0});
  visits.forEach(function(v){
    if(toDate(v.time).toDateString()===today) hours[toDate(v.time).getHours()].count++;
  });
  var now=new Date().getHours();
  var rel=hours.filter(function(h){return h.count>0||Math.abs(h.h-now)<=1;});
  if(!rel.length){document.getElementById('hourlyChart').innerHTML='<div class="empty-msg" style="font-size:.75rem">Өнөөдөр үзэлт байхгүй</div>';return;}
  var max=0; rel.forEach(function(h){if(h.count>max)max=h.count;}); if(!max)max=1;
  document.getElementById('hourlyChart').innerHTML=rel.map(function(h){
    return '<div class="bar-col" title="'+h.h+':00 — '+h.count+'">'+
      '<div class="bar-val">'+(h.count||'')+'</div>'+
      '<div class="bar-fill blue" style="height:'+Math.round(h.count/max*100)+'px"></div>'+
      '<div class="bar-label">'+h.h+':00</div></div>';
  }).join('');
}

// ════════════════════════════════════════════════════
//  VISITORS
// ════════════════════════════════════════════════════
async function loadVisitors() {
  var visits = await fsGetVisits();
  visits = visits.slice().reverse();
  var list = document.getElementById('visitorsList');
  if(!visits.length){list.innerHTML='<div class="empty-msg">Одоогоор үзэлт бүртгэгдээгүй байна.</div>';return;}
  list.innerHTML = visits.map(function(v){
    var badge=v.device==='Mobile'?'badge-mobile':v.device==='Tablet'?'badge-tablet':'badge-desktop';
    var icon =v.device==='Mobile'?'📱':v.device==='Tablet'?'📟':'🖥';
    return '<div class="table-row">'+
      '<span class="time-cell">'+fmtDate(v.time)+'</span>'+
      '<span><span class="device-badge '+badge+'">'+icon+' '+(v.device||'Desktop')+'</span></span>'+
      '<span style="color:var(--muted);font-size:.66rem">'+(v.browser||'—')+'</span>'+
    '</div>';
  }).join('');
}

document.getElementById('clearVisits').addEventListener('click',function(){
  if(!confirm('Бүх үзэлтийн бүртгэлийг устгах уу?')) return;
  localStorage.removeItem('portfolio_visits');
  loadVisitors(); loadDashboard(); loadDevices();
});

// ════════════════════════════════════════════════════
//  DEVICES
// ════════════════════════════════════════════════════
async function loadDevices() {
  var visits = await fsGetVisits();
  var total  = visits.length || 1;
  var counts = {Desktop:0,Mobile:0,Tablet:0};
  visits.forEach(function(v){ if(counts[v.device]!==undefined) counts[v.device]++; });

  document.getElementById('deviceGrid').innerHTML = [
    {key:'Desktop',emoji:'🖥',label:'Desktop'},
    {key:'Mobile', emoji:'📱',label:'Mobile'},
    {key:'Tablet', emoji:'📟',label:'Tablet'}
  ].map(function(d){
    return '<div class="device-card">'+
      '<div class="device-emoji">'+d.emoji+'</div>'+
      '<div class="device-count">'+counts[d.key]+'</div>'+
      '<div class="device-name">'+d.label+'</div>'+
      '<div class="device-pct">'+Math.round(counts[d.key]/total*100)+'%</div>'+
    '</div>';
  }).join('');

  var colors={Desktop:'var(--accent3)',Mobile:'var(--accent)',Tablet:'#50c878'};
  document.getElementById('deviceBars').innerHTML = Object.keys(counts).map(function(k){
    var c=counts[k];
    return '<div class="device-bar-row">'+
      '<div class="device-bar-label">'+k+'</div>'+
      '<div class="device-bar-track"><div class="device-bar-fill" style="width:'+Math.round(c/total*100)+'%;background:'+colors[k]+'"></div></div>'+
      '<div class="device-bar-num">'+c+'</div>'+
    '</div>';
  }).join('');
}

// ════════════════════════════════════════════════════
//  PROJECTS
// ════════════════════════════════════════════════════
async function loadProjects() {
  var list = document.getElementById('projectsList');
  list.innerHTML = '<div class="empty-msg" style="font-size:.75rem">Ачааллаж байна...</div>';
  try {
    var projects = await fsGetProjects();
    renderProjectList(projects);
  } catch(e) {
    // localStorage fallback
    renderProjectList(getProjects());
  }
}

function renderProjectList(projects) {
  var list = document.getElementById('projectsList');
  if (!projects || !projects.length) {
    list.innerHTML = '<div class="empty-msg">Төсөл байхгүй. Дээрх товч дарж нэмнэ үү.</div>';
    return;
  }
  list.innerHTML = projects.map(function(p){
    return '<div class="proj-admin-card">'+
      '<div class="proj-admin-emoji">'+(p.emoji||'🚀')+'</div>'+
      '<div class="proj-admin-info">'+
        '<div class="proj-admin-title">'+p.title+'</div>'+
        '<div class="proj-admin-desc">'+(p.desc||'').substring(0,90)+((p.desc||'').length>90?'…':'')+'</div>'+
        '<div class="proj-admin-tags">'+(p.tags||[]).map(function(t){return '<span class="proj-admin-tag">'+t+'</span>';}).join('')+'</div>'+
      '</div>'+
      '<div class="proj-admin-actions">'+
        '<button class="btn-edit" onclick="openEditProject(\''+p.id+'\')">✏ Засах</button>'+
        '<button class="btn-del"  onclick="startDelete(\''+p.id+'\')">🗑</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

// Open add
document.getElementById('openAddProject').addEventListener('click',function(){
  document.getElementById('projectFormTitle').textContent='Шинэ төсөл нэмэх';
  document.getElementById('editProjectId').value='';
  ['pTitle','pDesc','pTags','pFeatures','pDemo','pCode'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('pEmoji').value='🚀';
  document.getElementById('pColor').value='#f5a623';
  document.getElementById('pOrder').value='0';
  document.getElementById('saveMsg').textContent='';
  resetImageUpload();
  document.getElementById('projectFormModal').style.display='flex';
});

// Open edit
window.openEditProject = async function(id) {
  var projects = await fsGetProjects();
  var p=null; for(var i=0;i<projects.length;i++){if(projects[i].id===id){p=projects[i];break;}}
  if(!p) return;
  document.getElementById('projectFormTitle').textContent='Төсөл засах';
  document.getElementById('editProjectId').value=id;
  document.getElementById('pTitle').value   =p.title||'';
  document.getElementById('pDesc').value    =p.desc||'';
  document.getElementById('pEmoji').value   =p.emoji||'🚀';
  document.getElementById('pColor').value   =p.color||'#f5a623';
  document.getElementById('pOrder').value   =p.order||0;
  document.getElementById('pTags').value    =(p.tags||[]).join(', ');
  document.getElementById('pFeatures').value=(p.features||[]).join('\n');
  document.getElementById('pDemo').value    =p.demo||'';
  document.getElementById('pCode').value    =p.code||'';
  document.getElementById('saveMsg').textContent='';
  _uploadedImages = (p.images && p.images.length) ? p.images.slice() : [];
  renderImagePreviews();
  document.getElementById('projectFormModal').style.display='flex';
};

// Save
document.getElementById('saveProjectBtn').addEventListener('click',function(){
  var title   =document.getElementById('pTitle').value.trim();
  var desc    =document.getElementById('pDesc').value.trim();
  var emoji   =document.getElementById('pEmoji').value.trim()||'🚀';
  var color   =document.getElementById('pColor').value;
  var order   =parseInt(document.getElementById('pOrder').value)||0;
  var tags    =document.getElementById('pTags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  var features=document.getElementById('pFeatures').value.split('\n').map(function(f){return f.trim();}).filter(Boolean);
  var demo    =document.getElementById('pDemo').value.trim()||'#';
  var code    =document.getElementById('pCode').value.trim()||'#';
  var editId  =document.getElementById('editProjectId').value;
  var images  =_uploadedImages.slice();
  var sm      =document.getElementById('saveMsg');
  if(!title||!desc){sm.textContent='Нэр болон тайлбар заавал бөглөнө үү.';return;}
  var btn=document.getElementById('saveProjectBtn');
  btn.disabled=true; btn.textContent='Хадгалж байна...';
  var data={title:title,desc:desc,emoji:emoji,color:color,order:order,tags:tags,features:features,demo:demo,code:code,visualType:'custom',images:images};
  fsSaveProject(editId||null, data).then(function(){
    sm.textContent='✅ Амжилттай хадгалагдлаа!';
    btn.disabled=false; btn.textContent='Хадгалах →';
    setTimeout(function(){
      document.getElementById('projectFormModal').style.display='none';
      loadProjects(); loadDashboard();
    },900);
  });
});

document.getElementById('closeProjectForm').addEventListener('click',function(){document.getElementById('projectFormModal').style.display='none';});
document.getElementById('projectFormModal').addEventListener('click',function(e){if(e.target===document.getElementById('projectFormModal'))document.getElementById('projectFormModal').style.display='none';});

// Delete
var _delId=null;
window.startDelete=function(id){_delId=id;document.getElementById('confirmModal').style.display='flex';};
document.getElementById('confirmDelete').addEventListener('click',function(){
  if(!_delId) return;
  fsDeleteProject(_delId).then(function(){
    _delId=null;
    document.getElementById('confirmModal').style.display='none';
    loadProjects(); loadDashboard();
  });
});
document.getElementById('cancelDelete').addEventListener('click',function(){_delId=null;document.getElementById('confirmModal').style.display='none';});
document.getElementById('confirmModal').addEventListener('click',function(e){if(e.target===document.getElementById('confirmModal')){_delId=null;document.getElementById('confirmModal').style.display='none';}});

// ════════════════════════════════════════════════════
//  MESSAGES
// ════════════════════════════════════════════════════
async function loadMessages() {
  var msgs = await fsGetMessages();
  var list = document.getElementById('messagesList');
  if(!msgs.length){list.innerHTML='<div class="empty-msg">Мессеж байхгүй байна.</div>';return;}
  list.innerHTML=msgs.map(function(m){
    return '<div class="msg-card">'+
      '<div class="msg-header">'+
        '<div><div class="msg-name">'+(m.name||'—')+'</div><div class="msg-email">'+(m.email||'—')+'</div></div>'+
        '<div class="msg-time">'+fmtDate(m.time)+'</div>'+
      '</div>'+
      '<div class="msg-body">'+(m.message||'')+'</div>'+
    '</div>';
  }).join('');
}

// ── ESC ───────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    document.getElementById('projectFormModal').style.display='none';
    document.getElementById('confirmModal').style.display='none';
  }
});

// ── Password toggle ───────────────────────────────────────
var toggleBtn = document.getElementById('togglePass');
if (toggleBtn) {
  toggleBtn.addEventListener('click', function() {
    var p = document.getElementById('passInput');
    if (p.type === 'password') { p.type = 'text'; toggleBtn.textContent = '🙈'; }
    else { p.type = 'password'; toggleBtn.textContent = '👁'; }
  });
}

// ════════════════════════════════════════════════════
//  IMAGE UPLOAD — Base64 хэлбэрт хөрвүүлж хадгална
// ════════════════════════════════════════════════════
var _uploadedImages = [];

function resetImageUpload() {
  _uploadedImages = [];
  var pr = document.getElementById('imgPreviewRow');
  if(pr) pr.innerHTML = '';
}

function renderImagePreviews() {
  var row = document.getElementById('imgPreviewRow');
  if(!row) return;
  row.innerHTML = _uploadedImages.map(function(src, i) {
    return '<div class="img-preview-item">'+
      '<img src="'+src+'" alt="зураг '+(i+1)+'"/>'+
      '<button class="img-preview-del" onclick="removeImg('+i+')" title="Устгах">✕</button>'+
    '</div>';
  }).join('');
}

window.removeImg = function(i) {
  _uploadedImages.splice(i, 1);
  renderImagePreviews();
};

function readFiles(files) {
  var remaining = 5 - _uploadedImages.length;
  files = files.slice(0, remaining);
  if(!files.length) return;
  var loaded = 0;
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      _uploadedImages.push(e.target.result);
      loaded++;
      if (loaded === files.length) renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

var fileInput = document.getElementById('imgFileInput');
if (fileInput) {
  fileInput.addEventListener('change', function() {
    readFiles(Array.from(this.files));
    fileInput.value = '';
  });
}

var uploadArea = document.getElementById('imgUploadArea');
if (uploadArea) {
  uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.style.borderColor='var(--accent)'; });
  uploadArea.addEventListener('dragleave', function() { uploadArea.style.borderColor=''; });
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault(); uploadArea.style.borderColor='';
    readFiles(Array.from(e.dataTransfer.files).filter(function(f){return f.type.startsWith('image/');}));
  });
}