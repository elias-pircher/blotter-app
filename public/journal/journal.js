/* Blotter journal — generated from the design source, do not edit by hand. */
(function(){
'use strict';

/* ---------- helpers ---------- */
const LOC = 'de-AT';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseYmd = s => { const p = String(s).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
const todayStr = () => ymd(new Date());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newId = () => { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); };
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

const nf2 = new Intl.NumberFormat(LOC, {minimumFractionDigits: 2, maximumFractionDigits: 2});
const nf1 = new Intl.NumberFormat(LOC, {maximumFractionDigits: 1});
const nfR = new Intl.NumberFormat(LOC, {minimumFractionDigits: 1, maximumFractionDigits: 2});
const fMonth = new Intl.DateTimeFormat(LOC, {month: 'long', year: 'numeric'});
const fLong = new Intl.DateTimeFormat(LOC, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const fShort = new Intl.DateTimeFormat(LOC, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'});
const fDM = new Intl.DateTimeFormat(LOC, {day: '2-digit', month: '2-digit'});
const fDayMonth = new Intl.DateTimeFormat(LOC, {day: 'numeric', month: 'short'});
const dShort = s => { try { return fShort.format(parseYmd(s)); } catch (e) { return s || ''; } };

const pc = x => x > 0 ? 'up' : (x < 0 ? 'down' : '');
function parseDec(s){
  s = String(s == null ? '' : s).trim().replace(/[\s €$£]|CHF/g, '').replace(/^−/, '-').replace(/^\+/, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(',', '.');
  const v = Number(s);
  return isFinite(v) ? v : NaN;
}
function isoWeek(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
function group(list, key){ const m = new Map(); for (const x of list){ const k = x[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; }

const ICON = {
  prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  tp: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  be: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 10h8M8 14h8"/></svg>',
  sl: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/></svg>',
  img: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/></svg>'
};

/* ---------- state ---------- */
const now0 = new Date();
const S = {
  view: 'kalender', mounted: null, mountN: 0,
  month: new Date(now0.getFullYear(), now0.getMonth(), 1),
  acct: lsGet('blotter.acct') || 'all',
  lastAccount: lsGet('blotter.lastAccount') || 'main',
  trades: [], learnings: [], outlooks: [],
  settings: {theme: 'navy', name: '', modules: {learnings: true, outlooks: true}, accounts: [{id: 'main', name: 'Main-Konto', color: 'gold'}, {id: 'neben', name: 'Neben-Konto', color: 'silver'}], setupDone: false},
  settingsLoaded: false, mountSig: '',
  mode: 'connecting', loaded: {trades: false, learnings: false, outlooks: false},
  lq: '', lcat: '', oq: '', obias: 'all'
};
const KINDS = ['trades', 'learnings', 'outlooks'];

/* ---------- storage ---------- */
const LS_DATA = 'blotter.v1.data', LS_IMG = 'blotter.v1.img.';
const OK_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

async function toJpeg(file, maxDim, q){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej({code: 'unsupported_type'}); i.src = url; });
    let w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(1, maxDim / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej({code: 'unsupported_type'}), 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej({code: 'unsupported_type'}); r.readAsDataURL(b); });

async function retryOnce(fn){
  try { return await fn(); }
  catch (e) {
    if (e && (e.code === 'unavailable' || e.code === 'store_unavailable')) { await sleep(400 + Math.random() * 800); return await fn(); }
    throw e;
  }
}
function errText(e){
  const c = e && e.code;
  if (c === 'invalid_argument' || c === 'not_granted') return 'Speichern nicht möglich: Dir fehlen für dieses Journal die Schreibrechte.';
  if (c === 'quota_exceeded' || c === 'quota_or_state') return 'Der Speicher dieses Journals ist voll. Lösche alte Screenshots oder Einträge.';
  if (c === 'too_large') return 'Der Screenshot ist größer als 20 MB.';
  if (c === 'unsupported_type') return 'Dieses Bildformat wird nicht unterstützt. Verwende PNG, JPG, GIF oder WebP.';
  if (c === 'rate_limited' || c === 'resource_exhausted') return 'Zu viele Anfragen in kurzer Zeit. Warte einen Moment und versuch es erneut.';
  if (c === 'local_full') return 'Der Browser-Speicher ist voll. Lösche alte Screenshots, um Platz zu schaffen.';
  if (c === 'no_assets') return 'Screenshots können in dieser Ansicht nicht hochgeladen werden.';
  if (c === 'revoked') return 'Der Zugriff auf dieses Journal wurde entzogen.';
  if (c === 'no_sub') return 'Dein Abo ist nicht aktiv. Öffne die Einstellungen, um es zu verwalten.';
  if (c === 'not_logged_in') return 'Du bist nicht mehr angemeldet. Lade die Seite neu und melde dich an.';
  return 'Speichern hat nicht geklappt. Prüfe deine Verbindung und versuch es erneut.';
}

const Store = {
  db: null, assets: null, localOk: true,
  async init(){
    const c = window.BlotterBackend || window.claude;
    if (c && typeof c.use === 'function') {
      try {
        const [db, assets] = await Promise.all([c.use('db'), c.use('assets')]);
        if (db) { this.db = db; this.assets = assets; S.mode = 'cloud'; this.subscribe(); schedule(); return; }
      } catch (e) {}
    }
    this.initLocal();
  },
  subscribe(){
    const waiting = new Set(KINDS);
    const timer = setTimeout(() => {
      if (waiting.size) setBanner('Deine gespeicherten Einträge sind gerade nicht erreichbar. Die Seite lädt sie automatisch nach, sobald die Verbindung steht.');
    }, 10000);
    const done = k => { waiting.delete(k); if (!waiting.size) { clearTimeout(timer); setBanner(''); } };
    for (const k of KINDS) {
      this.db.collection(k).onSnapshot(snap => {
        S[k] = snap.docs.map(d => Object.assign({}, d.data(), {id: d.id}));
        S.loaded[k] = true;
        if (!snap.metadata.fromCache) done(k);
        schedule();
      }, err => {
        done(k); S.loaded[k] = true;
        if (err && err.code === 'revoked') { S.mode = 'error'; setBanner('Der Zugriff auf dieses Journal wurde entzogen.'); }
        else setBanner('Die Einträge konnten nicht geladen werden. Lade die Seite neu, um es nochmal zu versuchen.');
        schedule();
      });
    }
    this.db.doc('settings/app').onSnapshot(snap => {
      if (snap.exists) S.settings = normSettings(snap.data());
      if (snap.exists || !snap.metadata.fromCache) S.settingsLoaded = true;
      applySettings(); Setup.maybe();
    }, () => { S.settingsLoaded = true; Setup.maybe(); });
  },
  initLocal(){
    S.mode = 'local';
    const raw = lsGet(LS_DATA);
    if (raw == null && !lsSet('blotter.v1.probe', '1')) this.localOk = false; else lsDel('blotter.v1.probe');
    if (raw) { try { const d = JSON.parse(raw); for (const k of KINDS) S[k] = Array.isArray(d[k]) ? d[k] : []; if (d.settings) S.settings = normSettings(d.settings); } catch (e) {} }
    for (const k of KINDS) S.loaded[k] = true;
    S.settingsLoaded = true; applySettings(); Setup.maybe();
    setBanner(this.localOk
      ? 'Die Verbindung zu deinem Konto ist gerade nicht möglich. Einträge werden vorerst nur in diesem Browser gespeichert.'
      : 'In diesem Browser kann gerade nichts gespeichert werden. Lade die Seite neu.');
    schedule();
  },
  persistLocal(){
    const ok = lsSet(LS_DATA, JSON.stringify({trades: S.trades, learnings: S.learnings, outlooks: S.outlooks, settings: S.settings}));
    if (!ok) throw {code: 'local_full'};
  },
  async save(kind, obj){
    const body = JSON.parse(JSON.stringify(obj));
    if (this.db) { await retryOnce(() => this.db.collection(kind).doc(obj.id).set(body)); return; }
    const list = S[kind].slice(); const i = list.findIndex(x => x.id === obj.id);
    if (i >= 0) list[i] = body; else list.push(body);
    const prev = S[kind]; S[kind] = list;
    try { this.persistLocal(); } catch (e) { S[kind] = prev; throw e; }
    schedule();
  },
  async remove(kind, id){
    if (this.db) { await retryOnce(() => this.db.collection(kind).doc(id).delete()); return; }
    S[kind] = S[kind].filter(x => x.id !== id); this.persistLocal(); schedule();
  },
  async saveSettings(){
    if (this.db) { await retryOnce(() => this.db.doc('settings/app').set(JSON.parse(JSON.stringify(S.settings)))); return; }
    this.persistLocal();
  },
  canUpload(){ return this.db ? !!this.assets : this.localOk; },
  async uploadImage(file){
    if (this.db) {
      if (!this.assets) throw {code: 'no_assets'};
      let blob = file;
      if (!OK_TYPES.includes(file.type) || file.size > 19.5 * 1024 * 1024) blob = await toJpeg(file, 3200, 0.9);
      const r = await retryOnce(() => this.assets.upload(blob, {type: blob.type}));
      return r.id;
    }
    if (!this.localOk) throw {code: 'local_full'};
    const small = await toJpeg(file, 1600, 0.82);
    const url = await blobToDataURL(small);
    const ref = 'local-' + newId();
    if (!lsSet(LS_IMG + ref, url)) throw {code: 'local_full'};
    return ref;
  },
  imgSrc(ref){
    if (!ref) return '';
    if (String(ref).startsWith('local-')) return lsGet(LS_IMG + ref) || '';
    return window.BlotterBackend ? window.BlotterBackend.imgSrc(ref) : '/_blob/' + ref;
  },
  async deleteImage(ref){
    if (!ref) return;
    if (String(ref).startsWith('local-')) { lsDel(LS_IMG + ref); return; }
    if (this.assets) { try { await this.assets.delete(ref); } catch (e) {} }
  }
};

/* ---------- calendar previews of screenshots ---------- */
/* Saving a trade stores a ~10 KB preview of its first screenshot (t.thumb, made from t.thumbRef), so the
   calendar shows it without loading full images. Older trades get one generated once per session. */
function loadImg(url, cors){
  return new Promise((res, rej) => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej({code: 'unsupported_type'}); i.src = url; });
}
function drawThumb(img){
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) throw {code: 'unsupported_type'};
  const k = Math.min(1, 240 / w0, 160 / h0), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.74);
}
async function makeThumb(src){
  if (!src) throw {code: 'unsupported_type'};
  if (typeof src === 'string') return drawThumb(await loadImg(src, !/^(data|blob):/.test(src)));
  const url = URL.createObjectURL(src);
  try { return drawThumb(await loadImg(url, false)); } finally { URL.revokeObjectURL(url); }
}
const Thumbs = {
  m: new Map(), q: [], busy: 0,
  get(ref){
    if (this.m.has(ref)) return this.m.get(ref);
    this.m.set(ref, ''); this.q.push(ref); this.pump();
    return '';
  },
  pump(){
    while (this.busy < 2 && this.q.length) {
      const ref = this.q.shift(), src = Store.imgSrc(ref);
      this.busy++;
      makeThumb(src).then(d => this.m.set(ref, d), () => this.m.set(ref, src || false))
        .then(() => { this.busy--; schedule(); this.pump(); });
    }
  }
};
// '' = preview is being made, false = no image available, otherwise an image URL
function tradeThumb(t){
  const ref = t && t.shots && t.shots[0];
  if (!ref) return false;
  if (t.thumb && t.thumbRef === ref) return t.thumb;
  return Thumbs.get(ref);
}

/* ---------- motion: background chart ---------- */
// The chart is drawn off the main thread (OffscreenCanvas in a worker) where the browser supports it,
// so scrolling, typing and page animations never wait for it. Other browsers draw it here.
// It pauses while the tab is hidden or an overlay (dialog, image view, setup, page change) covers it.
// bgEngine must stay self-contained: its source text also runs inside the worker.
function bgEngine(G){
  const clock = () => G.performance.now();
  const frame = G.requestAnimationFrame ? cb => G.requestAnimationFrame(cb) : cb => G.setTimeout(() => cb(clock()), 33);
  const E = {
    c: null, x: null, w: 0, h: 0, dpr: 1, gap: 17, headX: 0, cs: [], live: null, period: 1600, born: 0,
    min: null, max: null, scrollY: 0, t0: 0, last: 0, glow: 0, P: null, still: false, paused: false, running: false, pausedAt: 0, lf: 0,
    init(o){
      this.c = o.canvas; this.x = this.c.getContext('2d');
      if (!this.x) return;
      this.P = o.pal; this.still = !!o.still; this.scrollY = o.scrollY || 0; this.paused = !!o.paused;
      this.t0 = clock(); this.born = this.t0; this.pausedAt = this.t0;
      this.resize(o);
      if (!this.still && !this.paused) this.start();
    },
    gen(o){
      const vol = 1.7, drift = 0.42;
      const c = o + drift + (Math.random() - 0.44) * vol * 2.3;
      return {o, c, h: Math.max(o, c) + Math.random() * vol * 0.9, l: Math.min(o, c) - Math.random() * vol * 0.9};
    },
    resize(o){
      if (!this.x) return;
      this.dpr = o.dpr; this.w = o.w; this.h = o.h;
      this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
      const narrow = this.w < 640;
      this.gap = narrow ? 13 : 17;
      this.headX = this.w * (narrow ? 0.93 : 0.86);
      const need = Math.ceil(this.headX / this.gap) + 12;
      if (this.cs.length < need) {
        this.cs = []; let p = 100;
        for (let i = 0; i < need; i++) { const k = this.gen(p); this.cs.push(k); p = k.c; }
        this.newLive(clock());
      } else if (this.cs.length > need + 20) this.cs = this.cs.slice(-need);
      this.min = this.max = null;
      this.redraw();
    },
    newLive(now){
      const o = this.cs.length ? this.cs[this.cs.length - 1].c : 100;
      const t = this.gen(o);
      this.live = {o, c: o, h: o, l: o, tc: t.c, th: t.h, tl: t.l};
      this.born = now;
    },
    // a single frame when nothing animates (reduced motion, paused, after a resize or colour change)
    redraw(){ if (this.x && (this.still || this.paused)) this.draw(this.still ? this.t0 + 9999 : this.pausedAt, this.lf); },
    setPal(P){ this.P = P; this.redraw(); },
    setScroll(y){ if (Math.abs(y - this.scrollY) > 2) this.glow = 1; this.scrollY = y; },
    setPaused(p){
      p = !!p;
      if (p === this.paused || this.still) { this.paused = p; return; }
      this.paused = p;
      if (p) { this.pausedAt = clock(); return; }
      const gap = clock() - this.pausedAt; this.born += gap; this.t0 += gap;   // continue where it stopped
      this.start();
    },
    start(){ if (this.running || this.still || this.paused || !this.x) return; this.running = true; this.last = 0; frame(this.tick); },
    tick(now){
      if (this.paused) { this.running = false; return; }
      frame(this.tick);
      if (now - this.last < 32) return;
      this.last = now;
      let f = (now - this.born) / this.period;
      if (f >= 1) {
        const L = this.live; L.c = L.tc; L.h = Math.max(L.h, L.th, L.o, L.c); L.l = Math.min(L.l, L.tl, L.o, L.c);
        this.cs.push({o: L.o, c: L.c, h: L.h, l: L.l}); this.cs.shift();
        this.newLive(now); f = 0;
      } else {
        const L = this.live, e = 1 - Math.pow(1 - f, 2);
        L.c = L.o + (L.tc - L.o) * e + Math.sin(now / 140) * 0.35 * (1 - f);
        L.h = Math.max(L.h, L.c, L.o + (L.th - L.o) * e); L.l = Math.min(L.l, L.c, L.o + (L.tl - L.o) * e);
      }
      this.glow *= 0.9;
      this.lf = f;
      this.draw(now, f);
    },
    draw(now, f){
      const x = this.x, w = this.w, h = this.h, gap = this.gap, p = this.P;
      if (!x || !p) return;
      f = f || 0;
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      x.clearRect(0, 0, w, h);
      const par = -Math.min(this.scrollY * 0.16, h * 0.24);
      const off = f * gap;
      const rg = (c, al) => 'rgba(' + c + ',' + al + ')';
      // grid
      x.lineWidth = 1; x.strokeStyle = rg(p.fg, p.light ? 0.06 : 0.035); x.beginPath();
      for (let gy = ((par % 72) + 72) % 72; gy < h; gy += 72) { x.moveTo(0, Math.round(gy) + .5); x.lineTo(w, Math.round(gy) + .5); }
      for (let gx = this.headX - off; gx > -10; gx -= gap * 6) { x.moveTo(Math.round(gx) + .5, 0); x.lineTo(Math.round(gx) + .5, h); }
      x.stroke();
      // series
      const all = this.cs.concat([this.live]);
      const n = all.length;
      const xs = i => this.headX - (n - 1 - i) * gap - off;
      let tmin = Infinity, tmax = -Infinity;
      for (let i = 0; i < n; i++) { if (xs(i) < -gap) continue; tmin = Math.min(tmin, all[i].l); tmax = Math.max(tmax, all[i].h); }
      if (this.min == null) { this.min = tmin; this.max = tmax; } else { this.min += (tmin - this.min) * 0.06; this.max += (tmax - this.max) * 0.06; }
      const top = h * 0.2 + par, bot = h * 0.94 + par, span = Math.max(1e-6, this.max - this.min);
      const Y = v => top + (1 - (v - this.min) / span) * (bot - top);
      const intro = this.still ? 1 : Math.min(1, (now - this.t0) / 2000);
      const ie = 1 - Math.pow(1 - intro, 3);
      const sweep = -gap + ie * (this.headX + gap * 3);
      const bw = Math.max(3, gap * 0.56);
      for (let i = 0; i < n; i++) {
        const cx = xs(i); if (cx < -gap || cx > w + gap) continue;
        const a = Math.max(0, Math.min(1, (sweep - cx) / 140)); if (!a) continue;
        const k = all[i], up = k.c >= k.o, isLive = i === n - 1;
        x.globalAlpha = a;
        x.strokeStyle = up ? (isLive ? rg(p.light ? p.acc : p.hi, 0.9) : rg(p.acc, 0.42)) : (isLive ? rg(p.fg, 0.6) : rg(p.fg, 0.16));
        x.fillStyle = up ? (isLive ? rg(p.acc, 0.55) : rg(p.acc, 0.16)) : (isLive ? rg(p.fg, 0.25) : rg(p.fg, 0.045));
        x.beginPath(); x.moveTo(Math.round(cx) + .5, Y(k.h)); x.lineTo(Math.round(cx) + .5, Y(k.l)); x.stroke();
        const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
        x.fillRect(cx - bw / 2, y1, bw, Math.max(1.2, y2 - y1));
        x.strokeRect(cx - bw / 2 + .5, y1 + .5, bw - 1, Math.max(1, y2 - y1 - 1));
      }
      x.globalAlpha = 1;
      // moving average
      const P = 9, pts = [];
      for (let i = 0; i < n; i++) {
        const cx = xs(i); if (cx < -gap * 2) continue;
        let s = 0, m = 0; for (let j = Math.max(0, i - P + 1); j <= i; j++) { s += all[j].c; m++; }
        if (cx <= sweep) pts.push([cx, Y(s / m)]);
      }
      if (pts.length > 1) {
        const grad = x.createLinearGradient(0, top, 0, bot);
        grad.addColorStop(0, rg(p.acc, 0.16)); grad.addColorStop(1, rg(p.acc, 0));
        x.beginPath(); x.moveTo(pts[0][0], bot);
        for (const q of pts) x.lineTo(q[0], q[1]);
        x.lineTo(pts[pts.length - 1][0], bot); x.closePath(); x.fillStyle = grad; x.fill();
        x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]));
        // glow from two soft strokes instead of a shadow blur (same look, a fraction of the work)
        const gl = 1 + this.glow * 1.6;
        x.lineJoin = 'round'; x.lineCap = 'round';
        x.lineWidth = 12; x.strokeStyle = rg(p.acc, (0.07 * gl).toFixed(3)); x.stroke();
        x.lineWidth = 6; x.strokeStyle = rg(p.acc, (0.14 * gl).toFixed(3)); x.stroke();
        x.lineWidth = 2.2; x.strokeStyle = rg(p.light ? p.acc : p.hi, 0.85); x.stroke();
        x.lineJoin = 'miter'; x.lineCap = 'butt';
      }
      // live price marker
      if (intro >= 1) {
        const lx = xs(n - 1), ly = Y(this.live.c);
        x.setLineDash([4, 6]); x.lineWidth = 1; x.strokeStyle = rg(p.acc, 0.5);
        x.beginPath(); x.moveTo(lx + 6, Math.round(ly) + .5); x.lineTo(w, Math.round(ly) + .5); x.stroke(); x.setLineDash([]);
        const ph = this.still ? 0.3 : (now % 1800) / 1800;
        x.beginPath(); x.arc(lx, ly, 4 + ph * 16, 0, Math.PI * 2); x.strokeStyle = rg(p.acc, (0.7 * (1 - ph)).toFixed(3)); x.lineWidth = 1.5; x.stroke();
        x.fillStyle = rg(p.acc, 0.16); x.beginPath(); x.arc(lx, ly, 10, 0, Math.PI * 2); x.fill();
        x.fillStyle = rg(p.acc, 0.3); x.beginPath(); x.arc(lx, ly, 6.5, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(lx, ly, 3.6, 0, Math.PI * 2); x.fillStyle = rg(p.light ? p.acc : p.hi, 1); x.fill();
      }
      // the readability veil sits on top as a still CSS layer (#bg-veil), so it is not repainted every frame
    }
  };
  E.tick = E.tick.bind(E);
  return E;
}

const BG = {
  eng: null, worker: null, P: null, scrollY: 0, paused: false, rz: 0,
  pal(){
    const cs = getComputedStyle(document.documentElement), g = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    this.P = {acc: g('--acc-rgb', '217,180,80'), hi: g('--acc-hi-rgb', '246,226,160'), fg: g('--fg-rgb', '255,255,255'), bg: g('--bg-rgb', '6,15,39'), light: g('--is-light', '0') === '1'};
    return this.P;
  },
  size(){
    const w = innerWidth, h = innerHeight;
    // sharp on phones and laptops, but never more than ~2.6 million pixels per frame on big monitors
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.6e6 / Math.max(1, w * h))));
    return {w, h, dpr};
  },
  covered(){
    if (document.hidden) return true;
    for (const id of ['modal', 'lightbox', 'setup', 'loader', 'tour']) { const el = document.getElementById(id); if (el && !el.hidden) return true; }
    return false;
  },
  init(){
    const c = $('#bg');
    if (!c || !c.getContext) return;
    this.scrollY = window.scrollY || 0;
    this.paused = this.covered();
    const opts = () => Object.assign(this.size(), {pal: this.P || this.pal(), still: reduce, scrollY: this.scrollY, paused: this.paused});
    const local = cv => { this.worker = null; this.eng = bgEngine(window); this.eng.init(Object.assign(opts(), {canvas: cv})); };
    let viaWorker = false;
    if (!reduce && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in c && window.URL && URL.createObjectURL) {
      try {
        const src = 'var ok=false;try{ok=!!new OffscreenCanvas(1,1).getContext("2d")}catch(e){}\n'
          + 'if(!ok){postMessage("no")}else{var E=(' + bgEngine.toString() + ')(self);'
          + 'onmessage=function(e){try{var m=e.data;if(m.t==="init")E.init(m.o);else if(E[m.t])E[m.t](m.v)}catch(err){postMessage("err")}};postMessage("ready")}';
        const url = URL.createObjectURL(new Blob([src], {type: 'text/javascript'}));
        const w = new Worker(url);
        let done = false;
        const fail = () => { if (done) return; done = true; clearTimeout(timer); try { w.terminate(); } catch (e) {} URL.revokeObjectURL(url); local(c); };
        const timer = setTimeout(fail, 2500);
        w.onerror = ev => { try { ev.preventDefault(); } catch (e) {} fail(); };
        w.onmessage = e => {
          if (done) {
            // the worker broke after taking over the canvas: draw on a fresh canvas here instead
            if (e.data === 'err' && this.worker === w) {
              try { w.terminate(); } catch (e2) {}
              const fresh = document.createElement('canvas'); fresh.id = 'bg'; fresh.setAttribute('aria-hidden', 'true');
              const old = $('#bg'); if (old) old.replaceWith(fresh);
              local(fresh);
            }
            return;
          }
          if (e.data !== 'ready') { fail(); return; }
          done = true; clearTimeout(timer); URL.revokeObjectURL(url);
          try {
            const off = c.transferControlToOffscreen();
            this.worker = w;
            w.postMessage({t: 'init', o: Object.assign(opts(), {canvas: off})}, [off]);
            w.onerror = null;
          } catch (err) { try { w.terminate(); } catch (e2) {} local(c); }
        };
        viaWorker = true;
      } catch (e) { viaWorker = false; }
    }
    if (!viaWorker) local(c);
    addEventListener('resize', () => { if (!this.rz) this.rz = requestAnimationFrame(() => { this.rz = 0; this.send('resize', this.size()); }); });
    document.addEventListener('visibilitychange', () => this.sync());
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(() => this.sync());
      for (const id of ['modal', 'lightbox', 'setup', 'loader', 'tour']) { const el = document.getElementById(id); if (el) mo.observe(el, {attributes: true, attributeFilter: ['hidden']}); }
    }
  },
  send(t, v){ if (this.worker) this.worker.postMessage({t, v}); else if (this.eng) this.eng[t](v); },
  sync(){ const p = this.covered(); if (p !== this.paused) { this.paused = p; this.send('setPaused', p); } },
  scroll(y){ if (y === this.scrollY) return; this.scrollY = y; this.send('setScroll', y); },
  repal(){ this.send('setPal', this.pal()); }
};

/* ---------- motion: reveal on scroll ---------- */
const Reveal = {
  on: !reduce && 'IntersectionObserver' in window,
  seen: new Map(), io: null,
  init(){
    if (!this.on) return;
    this.io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) this.show(e.target); }, {rootMargin: '0px 0px -6% 0px', threshold: 0.06});
  },
  scan(root){
    if (!this.on || !root) return;
    const vh = innerHeight, now = performance.now();
    root.querySelectorAll('[data-rv]').forEach(el => {
      const k = el.dataset.rv;
      const rd = parseFloat(el.style.getPropertyValue('--rd')) || 0;
      const st = this.seen.get(k);
      if (st === 'wait') { el.classList.add('rv-wait'); this.io.observe(el); return; }
      if (st) {
        const since = now - st;
        if (since < 950 + rd) { el.classList.add('rv-pop'); el.style.animationDelay = (rd - since) + 'ms'; }
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.height && r.top > vh * 0.95) { this.seen.set(k, 'wait'); el.classList.add('rv-wait'); this.io.observe(el); }
      else if (ViewFx.still) this.seen.set(k, now - 5000);
      else { this.seen.set(k, now); el.classList.add('rv-pop'); }
    });
  },
  show(el){
    this.io.unobserve(el);
    const k = el.dataset.rv;
    const gd = parseFloat(el.style.getPropertyValue('--gd')) || 0;
    this.seen.set(k, performance.now() - (parseFloat(el.style.getPropertyValue('--rd')) || 0) + gd);
    el.classList.add('rv-go'); el.classList.remove('rv-wait');
    setTimeout(() => el.classList.remove('rv-go'), 1200 + gd);
  }
};

/* ---------- motion: count-up ---------- */
function setNum(el, v, fmt){
  if (!el) return;
  if (v == null || !isFinite(v)) { cancelAnimationFrame(el._raf); el._v = null; el.textContent = v === Infinity ? '∞' : '–'; return; }
  const prev = el._v;
  el._v = v;
  if (prev === v || reduce) { cancelAnimationFrame(el._raf); el.textContent = fmt(v); return; }
  const from = (prev == null || !isFinite(prev)) ? 0 : prev, t0 = performance.now(), dur = 1000;
  cancelAnimationFrame(el._raf);
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (v - from) * e); if (k < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
}

/* ---------- chronograph: date-wheel digits ---------- */
const Roll = {
  // text: the value as it should read ("75", "4×", "–"); delay: ms before this number starts rolling
  set(el, text, delay){
    if (!el) return;
    text = String(text);
    if (el._rt === text) return;
    const prev = el._digits || [];
    el._rt = text;
    if (reduce || ViewFx.quiet || !el.isConnected) { el.classList.remove('roll'); el.textContent = text; el._digits = null; return; }
    el.classList.add('roll');
    const chars = Array.from(text), digits = [];
    let html = '<span class="sr">' + esc(text) + '</span><span class="rw" aria-hidden="true">';
    chars.forEach((ch, i) => {
      if (ch >= '0' && ch <= '9') {
        const k = chars.length - 1 - i; // position from the right
        digits[k] = +ch;
        html += '<span class="rd"><span class="rs now" data-k="' + k + '" style="--d:' + (prev[k] != null ? prev[k] : 0) + '"></span></span>';
      } else html += '<span class="rx" data-c="' + esc(ch) + '"></span>';
    });
    el.innerHTML = html + '</span>';
    el._digits = digits;
    const strips = el.querySelectorAll('.rs');
    void el.offsetWidth;
    requestAnimationFrame(() => {
      strips.forEach((st, i) => {
        const k = +st.dataset.k;
        st.classList.remove('now');
        st.style.setProperty('--dl', ((delay || 0) + i * 55) + 'ms');
        st.style.setProperty('--d', digits[k]);
      });
    });
  }
};

/* ---------- chronograph: win-rate dial ---------- */
const Dial = {
  svg(){
    let t = '';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, h = i % 5 === 0, r1 = h ? 35.5 : 37.5, r2 = 40;
      const x1 = 60 + Math.sin(a) * r1, y1 = 60 - Math.cos(a) * r1, x2 = 60 + Math.sin(a) * r2, y2 = 60 - Math.cos(a) * r2;
      t += `<line${h ? ' class="h"' : ''} x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }
    return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="dl-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--gold-hi)"/><stop offset=".55" stop-color="var(--gold)"/><stop offset="1" stop-color="var(--gold-lo)"/></linearGradient></defs>
      <g class="dl-ticks">${t}</g>
      <circle class="dl-track" cx="60" cy="60" r="46"/>
      <circle class="dl-arc" cx="60" cy="60" r="46" pathLength="1000"/>
      <circle class="dl-seg tp" cx="60" cy="60" r="54.5" pathLength="1000"/><circle class="dl-seg be" cx="60" cy="60" r="54.5" pathLength="1000"/><circle class="dl-seg sl" cx="60" cy="60" r="54.5" pathLength="1000"/>
      </svg><i class="dl-needle off" aria-hidden="true"></i>`;
  },
  set(wr, tp, be, sl){
    const d = $('#dial');
    if (!d) return;
    const sig = [wr, tp, be, sl].join('|');
    if (d._sig === sig) return;
    d._sig = sig;
    const apply = () => {
      const arc = $('.dl-arc', d), hand = $('.dl-needle', d), segs = $$('.dl-seg', d);
      const v = wr == null ? 0 : Math.max(0, Math.min(1, wr));
      arc.style.strokeDasharray = (v * 1000).toFixed(1) + ' 1000';
      hand.classList.toggle('off', wr == null);
      hand.style.transform = 'rotate(' + (v * 360).toFixed(2) + 'deg)';
      const tot = tp + be + sl, parts = [tp, be, sl].filter(x => x > 0).length, gap = parts > 1 ? 10 : 0;
      let off = 0;
      [tp, be, sl].forEach((n, i) => {
        const len = tot ? Math.max(0, n / tot * 1000 - (n ? gap : 0)) : 0;
        segs[i].style.strokeDasharray = len.toFixed(1) + ' 1000';
        segs[i].style.strokeDashoffset = (-off).toFixed(1);
        if (n) off += len + gap;
      });
    };
    // first values sweep in from zero, once the page has settled
    if (!d._shown) { d._shown = true; if (ViewFx.quiet) apply(); else setTimeout(() => requestAnimationFrame(apply), reduce ? 0 : ViewFx.still ? 900 : 420); } else apply();
  }
};

/* ---------- chronograph: where an interaction came from (for morphs) ---------- */
const Origin = {
  el: null, t: 0,
  init(){
    document.addEventListener('pointerdown', e => {
      const el = e.target.closest && e.target.closest('button, a, [data-day], .thumb, label');
      if (el) { this.el = el; this.t = performance.now(); }
      const pb = e.target.closest && e.target.closest('.btn.primary');
      if (pb && !reduce) {
        const r = pb.getBoundingClientRect();
        pb.style.setProperty('--rx', (e.clientX - r.left) + 'px'); pb.style.setProperty('--ry', (e.clientY - r.top) + 'px');
        pb.classList.remove('press'); void pb.offsetWidth; pb.classList.add('press');
      }
    }, true);
    let raf = 0, last = null;
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const b = last.target.closest && last.target.closest('.btn.primary');
        if (!b) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--px', (last.clientX - r.left) + 'px'); b.style.setProperty('--py', (last.clientY - r.top) + 'px');
      });
    }, {passive: true});
  },
  // the element that opened something, if it was just used and is still on screen
  take(){
    let el = performance.now() - this.t < 900 ? this.el : null;
    if (!el || !document.contains(el)) { const a = document.activeElement; el = a && a !== document.body && a.matches && a.matches('button, a, [data-day]') ? a : null; }
    this.el = null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
    return {el, r};
  }
};
const vis = el => { if (!el || !document.contains(el)) return null; const r = el.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight ? r : null; };
const phoneSheet = () => innerWidth <= 600;

/* ---------- chronograph: page change ---------- */
const ViewFx = {
  busy: false, queued: null, target: null, still: false, quiet: false, scrub: null,
  // can a script drive the view-transition faces? (needed for the finger-driven turn)
  canScrub: (() => { try { new KeyframeEffect(document.documentElement, null, {pseudoElement: '::view-transition-new(root)'}); return typeof document.startViewTransition === 'function'; } catch (e) { return false; } })(),
  go(next){
    if (this.busy) { this.queued = next; this.target = next; updateChrome(); return; }
    if (next === S.view) return;
    const v = $('#view'), veil = $('#vt-veil');
    if (reduce || !veil.animate || S.mounted == null) { goView(next); return; }
    const order = pagesOn(), dir = order.indexOf(next) >= order.indexOf(S.view) ? 1 : -1;
    if (typeof document.startViewTransition === 'function' && !document.hidden) { this.cube(next, dir); return; }
    this.busy = true; this.target = next;
    document.documentElement.classList.add('vt');
    updateChrome();
    this.sweep(dir);
    // a solid veil is cheap to fade; the page itself is never moved as one big picture
    const out = veil.animate([{opacity: 0}, {opacity: 1}], {duration: 190, easing: 'cubic-bezier(.55,0,.75,.06)', fill: 'forwards'});
    let done = false;
    const swap = () => {
      if (done) return; done = true;
      const to = this.queued || next; this.queued = null;
      v.style.setProperty('--vdir', dir);
      v.classList.add('vin');
      goView(to);
      out.cancel();
      const inn = veil.animate([{opacity: 1}, {opacity: 0}], {duration: 460, easing: 'cubic-bezier(.16,1,.3,1)'});
      const fin = () => {
        this.busy = false; this.target = null;
        document.documentElement.classList.remove('vt');
        updateChrome();
        const q = this.queued; this.queued = null;
        if (q && q !== S.view) this.go(q);
      };
      inn.onfinish = fin; inn.oncancel = fin;
      clearTimeout(this.vinT); this.vinT = setTimeout(() => v.classList.remove('vin'), 1500);
    };
    out.onfinish = swap;
    setTimeout(swap, 400); // safety if the animation never reports back
  },
  // the page turns like a cube in the direction of the tab; the browser animates two snapshots
  cube(next, dir){
    const html = document.documentElement;
    this.busy = true; this.target = next;
    html.dataset.vtdir = dir > 0 ? 'fwd' : 'back';
    html.classList.add('vt3d', 'vt');
    this.still = true;
    let vt;
    try {
      vt = document.startViewTransition(() => {
        const to = this.queued || next; this.queued = null;
        html.classList.add('vt-in');
        goView(to);
      });
    } catch (e) {
      html.classList.remove('vt3d', 'vt'); delete html.dataset.vtdir;
      this.still = false; this.busy = false; this.target = null; goView(next); return;
    }
    updateChrome();
    vt.ready.then(() => this.sweep(dir), () => {});
    const fin = () => {
      html.classList.remove('vt3d', 'vt', 'vt-in'); delete html.dataset.vtdir;
      this.still = false; this.busy = false; this.target = null;
      updateChrome();
      const q = this.queued; this.queued = null;
      if (q && q !== S.view) this.go(q);
    };
    vt.finished.then(fin, fin);
  },
  // ---- the same turn, driven by a finger ----
  cfg(){
    const cs = getComputedStyle(document.documentElement);
    return {pp: (cs.getPropertyValue('--cube-p') || '').trim() || '1500px', dip: parseFloat(cs.getPropertyValue('--cube-dip')) || .2, tilt: parseFloat(cs.getPropertyValue('--cube-tilt')) || 4};
  },
  // one face at progress p (0 = old page in front, 1 = new page in front); matches the CSS keyframes
  frame(face, dir, p, c){
    const q = Math.max(0, Math.min(1, p)), sn = Math.sin(Math.PI * q);
    const ang = (face === 'old' ? -90 * p : 90 * (1 - p)) * dir;
    const op = .18 + .82 * Math.max(0, Math.cos(Math.min(90, Math.abs(ang)) * Math.PI / 180));
    return {transform: `perspective(${c.pp}) scale(${(1 - c.dip * sn).toFixed(4)}) translateZ(-50vw) rotateX(${(c.tilt * sn).toFixed(3)}deg) rotateY(${ang.toFixed(3)}deg) translateZ(50vw)`, opacity: op.toFixed(3)};
  },
  faces(dir, from, to, curve, dur, n){
    const html = document.documentElement, c = this.cfg();
    return ['old', 'new'].map(face => {
      const kf = [];
      for (let i = 0; i <= n; i++) { const t = i / n; kf.push(Object.assign(this.frame(face, dir, from + (to - from) * curve(t), c), {offset: t})); }
      return html.animate(kf, {pseudoElement: `::view-transition-${face}(root)`, duration: dur, fill: 'both', easing: 'linear'});
    });
  },
  scrubStart(next, dir){
    if (this.busy || !this.canScrub || next === S.view) return false;
    const html = document.documentElement;
    const sc = this.scrub = {next, dir, from: S.view, p: 0, ready: false, anims: null, done: null};
    this.busy = true; this.target = null; this.still = true;
    html.dataset.vtdir = dir > 0 ? 'fwd' : 'back';
    html.classList.add('vt3d', 'vt', 'vtscrub');
    let vt;
    try { vt = document.startViewTransition(() => goView(next)); }
    catch (e) {
      html.classList.remove('vt3d', 'vt', 'vtscrub'); delete html.dataset.vtdir;
      this.scrub = null; this.still = false; this.busy = false;
      return false;
    }
    vt.ready.then(() => {
      try { sc.anims = this.faces(dir, 0, 1, t => t, 1000, 12); sc.anims.forEach(a => { a.pause(); a.currentTime = sc.p * 1000; }); }
      catch (e) { sc.anims = null; html.classList.remove('vtscrub'); this.sweep(dir); }
      sc.ready = true;
      if (sc.done) this.scrubLand();
    }, () => {});
    const fin = () => {
      if (sc.done === 'cancel' && S.view !== sc.from) this.restore(sc.from);
      // scripted faces must not outlive this turn (a filled animation would sit on the next turn's faces)
      if (sc.anims) sc.anims.forEach(a => a.cancel());
      html.classList.remove('vt3d', 'vt', 'vtscrub', 'vt-in'); delete html.dataset.vtdir; html.style.removeProperty('--glint-d');
      this.scrub = null; this.still = false; this.busy = false; this.target = null;
      updateChrome();
      const q = this.queued; this.queued = null;
      if (q && q !== S.view) this.go(q);
    };
    vt.finished.then(fin, fin);
    return true;
  },
  scrubMove(p){
    const sc = this.scrub;
    if (!sc || sc.done) return;
    sc.p = p;
    if (sc.anims) sc.anims.forEach(a => { a.currentTime = p * 1000; });
    moveTabInd();
  },
  scrubEnd(commit){
    const sc = this.scrub;
    if (!sc || sc.done) return;
    sc.done = commit || !sc.anims && sc.ready ? 'commit' : 'cancel';
    // same as tapping the tab: the hash change is queued behind the running turn and lands on the same page
    if (sc.done === 'commit') location.hash = sc.next;
    updateChrome();
    if (sc.ready) this.scrubLand();
  },
  // after the finger lets go: click into place, or turn back
  scrubLand(){
    const sc = this.scrub, html = document.documentElement;
    if (!sc || !sc.anims) return;
    const p0 = sc.p, old = sc.anims;
    if (sc.done === 'commit') {
      const T = 1.0, back = t => { const u = t - 1; return u * u * ((T + 1) * u + T) + 1; };
      html.style.setProperty('--glint-d', '20ms'); html.classList.add('vt-in');
      sc.anims = this.faces(sc.dir, p0, 1, back, Math.round(300 + 480 * (1 - p0)), 20);
      this.sweep(sc.dir);
    } else {
      const out = t => 1 - Math.pow(1 - t, 3);
      sc.anims = this.faces(sc.dir, p0, 0, out, Math.round(200 + 360 * p0), 12);
      // swap the page back in the same frame the turn ends, so the new page never flashes
      sc.anims[0].onfinish = () => this.restore(sc.from);
    }
    old.forEach(a => a.cancel());
  },
  restore(view){
    if (S.view === view) return;
    this.quiet = true;
    try { goView(view); } finally { this.quiet = false; }
  },
  sweep(dir){
    const sw = $('#vt-sweep'), tb = $('#topbar');
    if (!sw || !sw.animate) return;
    sw.style.top = Math.max(0, tb ? tb.getBoundingClientRect().bottom - 1 : 0) + 'px';
    sw.animate([
      {opacity: 0, transform: `translate3d(${dir * -100}%,0,0) scaleX(.4)`},
      {opacity: 1, offset: .25},
      {opacity: 1, offset: .7},
      {opacity: 0, transform: `translate3d(${dir * 100}%,0,0) scaleX(.4)`}
    ], {duration: 760, easing: 'cubic-bezier(.65,0,.35,1)'});
  }
};

/* ---------- chronograph: the Bilanz card catches the light ---------- */
const Tilt = {
  cur: null, raf: 0, ev: null,
  init(){
    if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.addEventListener('pointermove', e => {
      this.ev = e;
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        const ev = this.ev, eq = ev.target.closest && ev.target.closest('#equity');
        if (this.cur && this.cur !== eq) this.reset();
        if (!eq || Modal.cur || Tour.on) return;
        this.cur = eq;
        const r = eq.getBoundingClientRect();
        const x = Math.max(-.5, Math.min(.5, (ev.clientX - r.left) / r.width - .5)), y = Math.max(-.5, Math.min(.5, (ev.clientY - r.top) / r.height - .5));
        eq.classList.add('tilt'); eq.classList.remove('untilt');
        eq._rot = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
        eq.style.transform = eq._rot;
        const gl = eq.querySelector('.eq-glare i'); if (gl) gl.style.transform = 'translate3d(' + (x * r.width * .9).toFixed(1) + 'px,0,0)';
      });
    }, {passive: true});
    document.addEventListener('pointerleave', () => this.reset());
  },
  reset(){
    const eq = this.cur; this.cur = null;
    if (!eq) return;
    eq._rot = '';
    eq.classList.remove('tilt'); eq.classList.add('untilt');
    eq.style.transform = '';
    clearTimeout(this.ut); this.ut = setTimeout(() => eq.classList.remove('untilt'), 750);
  }
};

/* ---------- chronograph: page titles roll in ---------- */
function splitTitle(root){
  if (reduce || ViewFx.quiet || !root) return;
  const h = root.querySelector('.page-head h1');
  if (!h || h.classList.contains('split')) return;
  const t = h.textContent;
  h.classList.add('split'); h.setAttribute('aria-label', t);
  if (ViewFx.still) h.style.setProperty('--tl0', '430ms');
  h.innerHTML = Array.from(t).map((c, i) => `<span class="tl" aria-hidden="true" style="--i:${i}">${esc(c)}</span>`).join('');
}

/* ---------- chronograph: turn the cube with a finger (phones) ---------- */
const CubeSwipe = {
  g: null,
  init(){
    if (reduce || typeof document.startViewTransition !== 'function') return;
    document.addEventListener('pointerdown', e => this.down(e), {passive: true});
    document.addEventListener('pointermove', e => this.move(e), {passive: true});
    document.addEventListener('pointerup', e => this.up(e), {passive: true});
    document.addEventListener('pointercancel', e => this.up(e), {passive: true});
  },
  down(e){
    this.g = null;
    if (e.pointerType !== 'touch' || !e.isPrimary || pagesOn().length < 2) return;
    if (Modal.cur || LB.isOpen() || Setup.isOpen || Tour.on || Loader.active || ViewFx.busy) return;
    const t = e.target;
    if (!t || !t.closest || !t.closest('#view') || t.closest('input,textarea,select,[contenteditable="true"]')) return;
    // the screen edges belong to the browser's own back/forward swipe
    if (e.clientX < 24 || e.clientX > innerWidth - 24) return;
    // rows that scroll sideways keep their own swipe
    for (let el = t; el && el.id !== 'view'; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2) { const ox = getComputedStyle(el).overflowX; if (ox === 'auto' || ox === 'scroll') return; }
    }
    this.g = {id: e.pointerId, x: e.clientX, y: e.clientY, on: false, p: 0, hist: [], raf: 0};
  },
  move(e){
    const g = this.g;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { this.g = null; return; }
      if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      const pg = pagesOn(), dir = dx < 0 ? 1 : -1, next = pg[pg.indexOf(S.view) + dir];
      if (!next) { this.g = null; return; }
      if (!ViewFx.canScrub) { this.g = null; location.hash = next; return; }
      if (!ViewFx.scrubStart(next, dir)) { this.g = null; return; }
      g.on = true; g.dir = dir;
      try { document.documentElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    g.p = Math.max(0, Math.min(1, -g.dir * dx / (Math.min(innerWidth, 900) * .8)));
    g.hist.push([e.timeStamp, g.p]); if (g.hist.length > 6) g.hist.shift();
    if (!g.raf) g.raf = requestAnimationFrame(() => { g.raf = 0; ViewFx.scrubMove(g.p); });
  },
  up(e){
    const g = this.g;
    if (!g || e.pointerId !== g.id) return;
    this.g = null;
    if (!g.on) return;
    cancelAnimationFrame(g.raf); g.raf = 0;
    ViewFx.scrubMove(g.p);
    // speed of the last moment before letting go (progress per ms); the page swap can hold up a
    // move event or two, so the last pair counts when it is far enough apart
    const h = g.hist, b = h[h.length - 1], a = h[h.length - 2];
    let v = 0;
    if (a && b[0] - a[0] >= 8) v = (b[1] - a[1]) / (b[0] - a[0]);
    else if (h.length > 2 && b[0] > h[0][0]) v = (b[1] - h[0][1]) / (b[0] - h[0][0]);
    ViewFx.scrubEnd(e.type !== 'pointercancel' ? v > .0009 || (g.p > .3 && v > -.0006) : g.p > .5);
  }
};

/* ---------- motion: mantra ---------- */
const MANTRAS = [
  ['Kontoschutz vor', 'Kontowachstum.'],
  ['Prozess', 'vor Gewinn.'],
  ['Konstanz', 'schlägt zurück.'],
  ['Geduld wird', 'bezahlt.'],
  ['Halte dich an', 'das System.'],
  ['Disziplin ist', 'dein Vorteil.']
];
const Mantra = {
  i: Math.floor(Date.now() / 86400000) % MANTRAS.length, timer: 0, el: null,
  mount(el){
    this.el = el;
    el.innerHTML = MANTRAS.map((m, mi) => {
      let i = 0;
      const words = (txt, g) => txt.split(' ').map(wd => `<span class="wm"><span class="w${g ? ' g' : ''}" style="--i:${i++}">${esc(wd)}</span></span>`).join(' ');
      return `<span class="m${mi === this.i ? ' on' : ''}" ${mi === this.i ? '' : 'aria-hidden="true"'}>${words(m[0], false)} ${words(m[1], true)}</span>`;
    }).join('');
    clearInterval(this.timer);
    if (!reduce) this.timer = setInterval(() => this.next(), 7000);
  },
  next(){
    if (!this.el || !document.contains(this.el)) { clearInterval(this.timer); return; }
    if (document.hidden) return;
    const ms = $$('.m', this.el), cur = ms[this.i];
    cur.classList.add('leaving');
    setTimeout(() => {
      cur.classList.remove('on', 'leaving'); cur.setAttribute('aria-hidden', 'true');
      this.i = (this.i + 1) % MANTRAS.length;
      ms[this.i].classList.add('on'); ms[this.i].removeAttribute('aria-hidden');
    }, 480);
  }
};

/* ---------- motion: page loader ---------- */
const LD_OPEN = 176, LD_TP = 64;
const LD_KF = [[0, 176], [0.1, 166], [0.22, 193], [0.38, 231], [0.47, 222], [0.58, 186], [0.72, 128], [0.86, 86], [1, 64]];
function ldPrice(u){
  let i = 1; while (i < LD_KF.length - 1 && u > LD_KF[i][0]) i++;
  const a = LD_KF[i - 1], b = LD_KF[i];
  const t = Math.max(0, Math.min(1, (u - a[0]) / (b[0] - a[0]))), s = t * t * (3 - 2 * t);
  const noise = (Math.sin(u * 61) * 4 + Math.sin(u * 23 + 1.3) * 3) * Math.pow(1 - u, 1.2) * Math.min(1, u * 8);
  return a[1] + (b[1] - a[1]) * s + noise;
}
const LD_NAMES = {kalender: ['', 'Kalender'], learnings: ['', 'Learnings'], outlooks: ['', 'Outlooks']};
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const Loader = {
  on: false, active: false, swapped: false, hitDone: false, target: null, pending: null, raf: 0, t0: 0,
  T: {enter: 240, liveStart: 120, live: 640, swap: 900, exit: 430},
  init(){
    this.el = $('#loader'); this.inner = $('#ld-inner');
    this.body = $('#ld-body'); this.wick = $('#ld-wick'); this.pl = $('#ld-pl'); this.dot = $('#ld-dot'); this.glows = $$('.ld-glow', this.el);
    this.title = $('#ld-title'); this.st = $('#ld-st');
    this.tick = this.tick.bind(this);
    this.el.addEventListener('click', () => this.skipNow());
  },
  setLabel(view){
    const [a, b] = LD_NAMES[view] || [view, ''];
    let i = 0;
    const chars = (txt, g) => Array.from(txt).map(c => `<span class="ch${g ? ' g' : ''}" style="--i:${i++}">${esc(c)}</span>`).join('');
    this.title.innerHTML = chars(a, false) + chars(b, true);
  },
  draw(u){
    const y = ldPrice(u);
    let hi = Math.min(LD_OPEN, y), lo = Math.max(LD_OPEN, y);
    for (let s = 0; s < u; s += 0.01) { const p = ldPrice(s); if (p < hi) hi = p; if (p > lo) lo = p; }
    const bull = y < LD_OPEN - 0.5, ext = u > 0 ? 5 : 0;
    const top = Math.min(LD_OPEN, y), h = Math.max(2, Math.abs(y - LD_OPEN));
    for (const el of [this.body].concat(this.glows)) { el.setAttribute('y', top.toFixed(1)); el.setAttribute('height', h.toFixed(1)); }
    for (const el of [this.body, this.wick, this.pl, this.dot].concat(this.glows)) el.classList.toggle('bull', bull);
    this.wick.setAttribute('y1', (hi - ext).toFixed(1)); this.wick.setAttribute('y2', (lo + ext).toFixed(1));
    this.pl.setAttribute('y1', y.toFixed(1)); this.pl.setAttribute('y2', y.toFixed(1));
    this.dot.setAttribute('cy', y.toFixed(1));
  },
  play(view){
    this.active = true; this.swapped = false; this.hitDone = false; this.pending = null; this.target = view;
    this.setLabel(view);
    this.st.textContent = 'Entry · warte auf TP';
    const el = this.el;
    el.classList.remove('run', 'hit');
    el.style.transform = 'translate3d(0,100%,0)';
    this.inner.style.opacity = ''; this.inner.style.transform = '';
    el.hidden = false; void el.offsetWidth; el.classList.add('run');
    this.draw(0);
    this.t0 = performance.now();
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.tick);
    updateChrome();
  },
  retarget(view){
    if (!this.swapped) { this.target = view; this.setLabel(view); updateChrome(); }
    else this.pending = view;
  },
  skipNow(){ if (this.active && !this.swapped) this.t0 = performance.now() - this.T.swap; },
  tick(now){
    const T = this.T, e = now - this.t0;
    if (e < T.swap) this.el.style.transform = 'translate3d(0,' + ((1 - easeOut(Math.min(1, e / T.enter))) * 100).toFixed(2) + '%,0)';
    const u = Math.max(0, Math.min(1, (e - T.liveStart) / T.live));
    if (!this.swapped) this.draw(u);
    if (u >= 1 && !this.hitDone) { this.hitDone = true; this.el.classList.add('hit'); this.st.textContent = '✓ Take Profit erreicht'; }
    if (e >= T.swap) {
      if (!this.swapped) {
        this.swapped = true; goView(this.target);
        this.exitT0 = performance.now();
        if (this.el.animate) {
          try {
            const o = {duration: T.exit, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards'};
            this.exitAnims = [
              this.el.animate([{transform: 'translate3d(0,0,0)'}, {transform: 'translate3d(0,-100%,0)'}], o),
              this.inner.animate([{transform: 'translate3d(0,0,0)'}, {transform: 'translate3d(0,60px,0)'}], o),
              this.inner.animate([{opacity: 1}, {opacity: 0, offset: 0.714}, {opacity: 0}], {duration: T.exit, easing: 'linear', fill: 'forwards'})
            ];
            this.exitAnims[0].onfinish = () => { if (this.exitAnims) this.finish(); };
            return;
          } catch (err) { this.stopExit(); }
        }
      }
      const k = Math.min(1, (now - this.exitT0) / T.exit), ek = easeInOut(k);
      this.el.style.transform = 'translate3d(0,' + (-ek * 100).toFixed(2) + '%,0)';
      this.inner.style.transform = 'translate3d(0,' + (ek * 60).toFixed(1) + 'px,0)';
      this.inner.style.opacity = Math.max(0, 1 - k * 1.4).toFixed(3);
      if (k >= 1) { this.finish(); return; }
    }
    this.raf = requestAnimationFrame(this.tick);
  },
  stopExit(){
    if (this.exitAnims) { this.exitAnims.forEach(a => { try { a.cancel(); } catch (e) {} }); this.exitAnims = null; }
  },
  finish(){
    this.stopExit();
    this.el.style.transform = 'translate3d(0,-100%,0)'; this.inner.style.opacity = '0';
    this.el.hidden = true; this.el.classList.remove('run', 'hit');
    this.active = false;
    const p = this.pending; this.pending = null;
    if (p && p !== S.view) this.play(p); else updateChrome();
  }
};

/* ---------- scroll-linked effects ---------- */
// One pass per frame: all measurements first, then all style changes, so the browser never has to
// lay out the page twice in a frame. Timeline item positions are cached until the list changes size.
let sq = 0;
const tlPos = new WeakMap();
const tlRO = 'ResizeObserver' in window ? new ResizeObserver(es => { for (const e of es) tlPos.delete(e.target); onScroll(); }) : null;
function tlItems(feed, fr){
  const first = feed.querySelector('.tl-item');
  let c = tlPos.get(feed);
  if (!c || c.first !== first) {
    const list = [];
    feed.querySelectorAll('.tl-item').forEach(it => {
      list.push({it, off: it.offsetParent === feed ? it.offsetTop : it.getBoundingClientRect().top - fr.top});
    });
    c = {first, list};
    tlPos.set(feed, c);
    if (tlRO && !feed._tlObs) { feed._tlObs = true; tlRO.observe(feed); }
  }
  return c.list;
}
function onScroll(){ if (!sq) sq = requestAnimationFrame(scrollFx); }
function scrollFx(){
  sq = 0;
  // read
  const y = window.scrollY || 0, vh = innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  const fill = $('.tl-fill');
  let fr = null, items = null;
  if (fill) { const feed = fill.closest('.feed'); fr = feed.getBoundingClientRect(); items = tlItems(feed, fr); }
  // write
  $('#topbar').classList.toggle('scrolled', y > 6);
  $('#progress').style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
  BG.scroll(y);
  if (!reduce) {
    const ht = $('#hero-txt');
    if (ht) { ht.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)'; ht.style.opacity = Math.max(0.12, 1 - y / 560).toFixed(3); }
    const bw = $('#bg-wrap'); if (bw) bw.style.opacity = (1 - Math.min(1, y / 700) * 0.45).toFixed(3);
  }
  if (fill) {
    const mid = vh * 0.62;
    fill.style.transform = 'scaleY(' + Math.max(0, Math.min(1, (mid - fr.top) / Math.max(1, fr.height))).toFixed(4) + ')';
    for (const o of items) o.it.classList.toggle('lit', fr.top + o.off + 28 < mid);
  }
}

/* ---------- ui chrome ---------- */
let tT = 0;
function toast(msg, bad){ const el = $('#toast'); el.textContent = msg; el.className = 'toast' + (bad ? ' bad' : ''); el.style.setProperty('--toast-t', (bad ? 5.2 : 2.6) + 's'); el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(tT); tT = setTimeout(() => { el.hidden = true; }, bad ? 5200 : 2600); }
function setBanner(t){ const b = $('#banner'); b.textContent = t || ''; b.hidden = !t; }
function updateChrome(){
  const sc = ViewFx.scrub;
  const nav = sc ? (sc.done === 'commit' ? sc.next : sc.from) : (ViewFx.target || S.view);
  const pg = pagesOn();
  $$('.tabs a').forEach(a => { a.hidden = !pg.includes(a.dataset.tab); if (a.dataset.tab === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('.tabs').hidden = pg.length < 2;
  const kp = $('#keys-pages');
  if (kp) { kp.hidden = pg.length < 2; const want = pg.map((_, i) => '<kbd>' + (i + 1) + '</kbd>').join('') + ' Seiten'; if (kp.innerHTML !== want) kp.innerHTML = want; }
  moveTabInd();
  const st = $('#status'), tx = $('#status-t');
  st.className = 'status' + (S.mode === 'cloud' ? ' ok' : S.mode === 'local' ? ' local' : S.mode === 'error' ? ' err' : '');
  tx.textContent = S.mode === 'cloud' ? 'Synchronisiert' : S.mode === 'local' ? 'Nur dieser Browser' : S.mode === 'error' ? 'Kein Zugriff' : 'Verbinde…';
  st.title = S.mode === 'cloud' ? 'Gespeichert in deinem Konto, auf all deinen Geräten verfügbar' : '';
}

function moveTabInd(){
  const ind = $('#tab-ind'), a = $('.tabs a[aria-current="page"]');
  if (!ind || !a || !a.offsetWidth) return;
  const sc = ViewFx.scrub;
  if (sc && !sc.done) {
    const b = $(`.tabs a[data-tab="${sc.next}"]`);
    if (b && b.offsetWidth) {
      const p = sc.p;
      ind.style.transition = 'none';
      ind.style.width = (a.offsetWidth + (b.offsetWidth - a.offsetWidth) * p).toFixed(1) + 'px';
      ind.style.transform = 'translateX(' + (a.offsetLeft + (b.offsetLeft - a.offsetLeft) * p).toFixed(1) + 'px)';
      ind.style.opacity = '1';
      return;
    }
  }
  ind.style.transition = '';
  ind.style.width = a.offsetWidth + 'px';
  ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  ind.style.opacity = '1';
  if (!ind.classList.contains('ready')) requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.add('ready')));
}
let rq = 0;
function schedule(){ if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }
function render(){
  const el = $('#view');
  if (S.mounted !== S.view) { S.mountN++; Views[S.view].mount(el); S.mounted = S.view; S.mountSig = settingsSig(); splitTitle(el); onScroll(); }
  Views[S.view].update();
  Reveal.scan(el);
  updateChrome();
  Modal.refresh();
  onScroll();
}

/* ---------- stats ---------- */
const RES_LABEL = {tp: 'TP', sl: 'SL', be: 'BE'};
const RES_NAME = {tp: 'Take Profit', sl: 'Stop Loss', be: 'Break Even'};
function resOf(t){
  if (t.result === 'tp' || t.result === 'sl' || t.result === 'be') return t.result;
  const p = num(t.pnl);
  if (p != null) return p > 0 ? 'tp' : p < 0 ? 'sl' : 'be';
  return null;
}
const chrono = list => list.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '99').localeCompare(b.time || '99') || (a.createdAt || 0) - (b.createdAt || 0));
function calc(list){
  let tp = 0, sl = 0, be = 0, run = 0, best = 0;
  const per = {};
  const days = new Set();
  for (const t of chrono(list)) {
    const r = resOf(t);
    if (r === 'tp') { tp++; run++; if (run > best) best = run; }
    else if (r === 'sl') { sl++; run = 0; }
    else if (r === 'be') be++;
    const ak = acctOf(t); per[ak] = (per[ak] || 0) + 1;
    if (t.date) days.add(t.date);
  }
  return {n: list.length, tp, sl, be, per, tdays: days.size, best, run, wr: (tp + sl) ? tp / (tp + sl) : null};
}
function tone(c){ if (!c.n) return ''; if (c.tp > c.sl) return 'pos'; if (c.sl > c.tp) return 'neg'; return (c.tp || c.sl || c.be) ? 'flat' : ''; }
const pct = (a, n) => n ? Math.round(a / n * 100) + ' %' : '–';
const curAcct = () => S.acct !== 'all' && acctById(S.acct) ? S.acct : 'all';
const byAcct = list => { const f = curAcct(); return f === 'all' ? list : list.filter(t => acctOf(t) === f); };
const acctCounts = per => accts().filter(a => per[a.id]).map(a => ({a, n: per[a.id]}));
const sortTrades = list => list.slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || (a.createdAt || 0) - (b.createdAt || 0));
const sortEntries = list => list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

const fMonS = new Intl.DateTimeFormat(LOC, {month: 'short'}), fWdS = new Intl.DateTimeFormat(LOC, {weekday: 'short'});
function tlItem(date, rv, i, inner){
  let b = '–', mo = '', wd = '';
  if (date) { const d = parseYmd(date); b = pad(d.getDate()); mo = fMonS.format(d).replace('.', '') + ' \u2019' + String(d.getFullYear()).slice(2); wd = fWdS.format(d).replace('.', ''); }
  return `<div class="tl-item" data-rv="${rv}" style="--rd:${200 + Math.min(i, 5) * 80}ms"><div class="tl-date"><b>${b}</b><span>${esc(mo)}</span><small>${esc(wd)}</small></div><span class="tl-node" aria-hidden="true"></span>${inner}</div>`;
}
function shotsHtml(refs){
  if (!refs || !refs.length) return '';
  return '<div class="shots">' + refs.map((r, i) =>
    `<button type="button" class="thumb" data-lb="${i}" aria-label="Screenshot ${i + 1} vergrößern"><img loading="lazy" decoding="async" src="${esc(Store.imgSrc(r))}" alt=""></button>`).join('') + '</div>';
}

/* trade tape for the hero */
function tapeHtml(list){
  return chrono(list).map((t, i) => {
    const r = resOf(t) || 'na';
    const tip = (t.date ? fDM.format(parseYmd(t.date)) : '') + ' · ' + (t.symbol || 'Trade') + ' · ' + (RES_LABEL[r] || 'ohne Ergebnis') + ' · ' + an(t.account);
    return `<i class="tk ${r}" style="--i:${Math.min(i, 40)}" title="${esc(tip)}"></i>`;
  }).join('');
}
const ratioW = (v, tot) => (tot ? (v / tot * 100).toFixed(2) : 0) + '%';
const countsHtml = c => `<span class="cnts"><span class="cnt"><i class="sw tp"></i>${c.tp} TP</span><span class="cnt"><i class="sw be"></i>${c.be} BE</span><span class="cnt"><i class="sw sl"></i>${c.sl} SL</span></span>`;

/* ---------- views ---------- */
const WD = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const Views = {
  kalender: {
    mount(el){
      const M = S.mountN;
      el.innerHTML = `
      <section class="hero" aria-label="Übersicht">
        <div class="hero-txt" id="hero-txt" data-rv="${M}:hero-t">
          <p class="hero-date" id="hero-date"></p>
          <h1 class="mantra" id="mantra"></h1>
          <p class="hero-sub">Jeder eingetragene Trade macht dich besser. Wähle einen Tag im Kalender und halte fest, was passiert ist.</p>
        </div>
        <div class="equity spot" id="equity" data-rv="${M}:hero-e" style="--rd:180ms">
          <span class="eq-glare" aria-hidden="true"><i></i></span>
          <div class="eq-head"><span class="eyebrow gold" id="eq-label">Bilanz</span><span class="eq-n" id="eq-n"></span></div>
          <div class="eq-row">
            <div class="dial" id="dial">${Dial.svg()}<span class="eq-big"><span class="eq-v" id="eq-v">–</span><span class="eq-u" id="eq-u" hidden>%</span></span></div>
            <div class="eq-side"><span class="eq-vl">Win-Rate<small>TP ÷ (TP + SL)</small></span><div class="ratio-l" id="ratio-l"></div></div>
          </div>
          <div class="ratio" id="ratio" aria-hidden="true"><span class="r tp"></span><span class="r be"></span><span class="r sl"></span></div>
          <div class="tape-h"><span class="eyebrow">Trade-Tape</span><span class="tape-hint">älteste zuerst</span></div>
          <div class="tape" id="tape"></div>
          <div class="eq-foot" id="eq-foot"></div>
        </div>
      </section>
      <div class="cal-head" data-rv="${M}:head" style="--rd:260ms">
        <div class="nav-arrows">
          <button type="button" class="btn icon" data-action="prev-month" aria-label="Vorheriger Monat">${ICON.prev}</button>
          <button type="button" class="btn icon" data-action="next-month" aria-label="Nächster Monat">${ICON.next}</button>
        </div>
        <h2 class="month" id="month-title"></h2>
        <button type="button" class="btn ghost sm" data-action="this-month">Heute</button>
        <span class="spacer"></span>
        <div class="seg" role="radiogroup" aria-label="Konto-Filter" id="acct-filter">
          <button type="button" role="radio" data-acct="all">Alle</button>
          ${accts().map(a => `<button type="button" role="radio" data-acct="${esc(a.id)}" title="${esc(a.name)}">${adot(a.id)}${esc(a.name)}</button>`).join('')}
        </div>
        <button type="button" class="btn primary" data-action="new-trade">${ICON.plus}Trade eintragen</button>
      </div>
      <div class="stats" data-rv="${M}:stats" style="--rd:320ms">
        ${[['n','Trades','Trades',''],['tp','Take Profit','TP','tp'],['sl','Stop Loss','SL','sl'],['be','Break Even','BE','be'],['best','Beste TP-Serie','Serie','']].map(([k, l, sh, c]) =>
          `<div class="stat"><span class="k">${c ? `<i class="sw ${c}"></i>` : ''}<span class="kl">${l}</span><span class="ks">${sh}</span></span><span class="v" id="st-${k}">–</span><span class="s" id="st-${k}-s">&nbsp;</span>${c ? `<span class="meter"><i class="${c}" id="st-${k}-m"></i></span>` : (k === 'best' ? '<span class="streak" id="st-streak"></span>' : '<span class="meter" style="visibility:hidden"></span>')}</div>`).join('')}
      </div>
      <div class="cal-wrap spot" data-rv="${M}:calwrap" style="--rd:420ms"><div class="cal" id="cal"></div></div>
      <div class="weeks" id="weeks"></div>
      <div class="legend" data-rv="${M}:legend">
        <span><span class="pill tp"><b>TP</b></span>Take Profit</span>
        <span><span class="pill be"><b>BE</b></span>Break Even</span>
        <span><span class="pill sl"><b>SL</b></span>Stop Loss</span>
        ${accts().map(a => `<span>${adot(a.id)}${esc(a.name)}</span>`).join('')}
        ${modOn('outlooks') ? `<span><span class="mk">${MI.outlooks}</span>Outlook</span>` : ''}
        ${modOn('learnings') ? `<span><span class="mk">${MI.learnings}</span>Learning</span>` : ''}
      </div>
      <p class="hint" id="cal-hint" hidden><b>Noch keine Trades.</b> Klick auf einen Tag im Kalender oder auf „Trade eintragen“, um deinen ersten Trade mit Konto, Ergebnis (TP, BE oder SL) und Screenshot festzuhalten.</p>`;
      const n = new Date();
      const hr = n.getHours(), greet = hr < 5 ? 'Gute Nacht' : hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend';
      $('#hero-date').innerHTML = (S.settings.name ? `<b>${esc(greet + ', ' + S.settings.name)}.</b> ` : '') + `<span>${esc(fLong.format(n))}</span><span class="hd-kw">, KW ${isoWeek(n)}</span>`;
      Mantra.mount($('#mantra'));
      if (!Views.shone && !reduce) { Views.shone = true; const mn = $('#mantra'); mn.classList.add('shine'); setTimeout(() => mn.classList.remove('shine'), 3400); }
      const af = $('#acct-filter'), afEdge = () => af.classList.toggle('more', af.scrollLeft + af.clientWidth < af.scrollWidth - 2);
      af.addEventListener('scroll', afEdge, {passive: true}); requestAnimationFrame(afEdge);
      void $('#ratio').offsetWidth;
      this.lastTape = null; this.mountMk = null; this.lastMk = null;
    },
    update(){
      const M = S.mountN;
      const m = S.month, y = m.getFullYear(), mo = m.getMonth(), mk = y + '-' + pad(mo + 1);
      const mtTxt = fMonth.format(m);
      if ($('#month-title').textContent !== mtTxt) $('#month-title').innerHTML = '<span class="mt">' + esc(mtTxt) + '</span>';
      const fa = curAcct();
      $$('#acct-filter button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.acct === fa)));
      const afb = $('#acct-filter [aria-checked="true"]'), afw = afb && afb.parentElement;
      if (afw && afw.scrollWidth > afw.clientWidth && (afb.offsetLeft < afw.scrollLeft || afb.offsetLeft + afb.offsetWidth > afw.scrollLeft + afw.clientWidth)) afw.scrollLeft = Math.max(0, afb.offsetLeft - 24);
      const trades = byAcct(S.trades);
      const monthT = trades.filter(t => (t.date || '').startsWith(mk));
      const s = calc(monthT);
      const ready = S.loaded.trades;
      const int = v => String(Math.round(v));

      // hero balance
      $('#eq-label').innerHTML = '<b>Bilanz</b> ' + esc(fMonth.format(m));
      $('#eq-n').textContent = ready ? s.n + (s.n === 1 ? ' Trade' : ' Trades') : '';
      if (ready) {
        const wrOk = s.wr != null && isFinite(s.wr);
        Roll.set($('#eq-v'), wrOk ? String(Math.round(s.wr * 100)) : '–');
        $('#eq-u').hidden = !wrOk;
        Dial.set(wrOk ? s.wr : null, s.tp, s.be, s.sl);
      }
      const tot = s.tp + s.be + s.sl;
      const rs = $$('#ratio .r');
      rs[0].style.width = ratioW(s.tp, tot); rs[1].style.width = ratioW(s.be, tot); rs[2].style.width = ratioW(s.sl, tot);
      $('#ratio-l').innerHTML = !ready ? '' : (tot ? countsHtml(s) : 'Noch keine Trades in diesem Monat');
      const tsig = mk + '|' + fa + '|' + monthT.map(t => t.id + ':' + resOf(t) + ':' + t.date + (t.time || '')).join(',');
      if (tsig !== this.lastTape) {
        $('#tape').innerHTML = monthT.length ? tapeHtml(monthT) : '<span class="tape-empty">Jeder Trade erscheint hier als farbiger Block.</span>';
        this.lastTape = tsig;
      }
      const streak = calc(trades).run;
      $('#eq-foot').innerHTML = `${acctCounts(s.per).map(({a, n}) => `<span>${adot(a.id)}${esc(a.name)} <b>${n}</b></span>`).join('')}<span>Aktuelle Serie <b class="${streak ? 'up' : ''}">${streak ? streak + '× TP' : '–'}</b></span>`;

      // stats
      if (ready) {
        Roll.set($('#st-n'), int(s.n), 0); $('#st-n-s').textContent = s.tdays + (s.tdays === 1 ? ' Handelstag' : ' Handelstage');
        Roll.set($('#st-tp'), int(s.tp), 60); $('#st-tp-s').textContent = s.n ? pct(s.tp, s.n) + ' der Trades' : 'noch keine Trades';
        Roll.set($('#st-sl'), int(s.sl), 120); $('#st-sl-s').textContent = s.n ? pct(s.sl, s.n) + ' der Trades' : 'noch keine Trades';
        Roll.set($('#st-be'), int(s.be), 180); $('#st-be-s').textContent = s.n ? pct(s.be, s.n) + ' der Trades' : 'noch keine Trades';
        for (const k of ['tp', 'sl', 'be']) $('#st-' + k + '-m').style.width = s.n ? (s[k] / s.n * 100).toFixed(2) + '%' : '0%';
        $('#st-streak').innerHTML = Array.from({length: Math.min(s.best, 12)}, () => '<i></i>').join('');
        Roll.set($('#st-best'), Math.round(s.best) + '×', 240); $('#st-best-s').textContent = 'TP in Folge';
      }

      // grid
      const tMap = group(trades, 'date'), oMap = group(modOn('outlooks') ? S.outlooks : [], 'date'), lMap = group(modOn('learnings') ? S.learnings : [], 'date');
      const today = todayStr();
      const first = new Date(y, mo, 1), offset = (first.getDay() + 6) % 7, dim = new Date(y, mo + 1, 0).getDate();
      const rows = Math.ceil((offset + dim) / 7);
      if (this.mountMk == null) this.mountMk = mk;
      const rvOn = mk === this.mountMk;
      const dir = this.lastMk && this.lastMk !== mk ? (mk > this.lastMk ? 'next' : 'prev') : null;
      this.lastMk = mk;
      const nowD = new Date(), isCurMonth = nowD.getFullYear() === y && nowD.getMonth() === mo, todayCol = (nowD.getDay() + 6) % 7;
      let h = WD.map((w, i) => `<div class="wd${i >= 5 ? ' we' : ''}${isCurMonth && i === todayCol ? ' now' : ''}">${w}</div>`).join('') + '<div class="wd wkh">Woche</div>';
      let wl = '';
      for (let r = 0; r < rows; r++) {
        const wList = []; let wStart = null, wEnd = null;
        for (let c = 0; c < 7; c++) {
          const d = new Date(y, mo, 1 - offset + r * 7 + c), key = ymd(d);
          if (c === 0) wStart = d; if (c === 6) wEnd = d;
          const list = sortTrades(tMap.get(key) || []);
          for (const t of list) wList.push(t);
          const dc = calc(list);
          const o = oMap.has(key), l = lMap.has(key);
          const cls = ['day'];
          if (d.getMonth() !== mo) cls.push('out');
          if (key === today) cls.push('today');
          if (c >= 5) cls.push('we');
          if (key > today) cls.push('fut');
          if (!list.length) cls.push('is-empty'); else { const tn = tone(dc); if (tn) cls.push(tn); }
          const shotT = list.filter(t => t.shots && t.shots.length), nShots = shotT.reduce((a, t) => a + t.shots.length, 0);
          const label = fLong.format(d) + (list.length ? ': ' + list.length + (list.length === 1 ? ' Trade' : ' Trades') + ', ' + dc.tp + ' TP, ' + dc.be + ' BE, ' + dc.sl + ' SL' + (nShots ? ', ' + nShots + (nShots === 1 ? ' Screenshot' : ' Screenshots') : '') : ': keine Trades');
          let shot = '';
          if (shotT.length) {
            const src = tradeThumb(shotT[0]);
            if (src !== false) shot = `<span class="d-shot${src ? '' : ' wait'}">${src ? `<img src="${esc(src)}" alt="" decoding="async">` : ''}${nShots > 1 ? `<b>${nShots}</b>` : ''}</span>`;
          }
          const marks = (o ? `<span class="mk" title="Outlook">${MI.outlooks}</span>` : '') + (l ? `<span class="mk" title="Learning">${MI.learnings}</span>` : '');
          const pills = list.slice(0, 4).map(t => {
            const rr = resOf(t) || 'na';
            return `<span class="pill ${rr}" title="${esc((t.symbol || 'Trade') + ' · ' + (RES_NAME[rr] || 'ohne Ergebnis') + ' · ' + an(t.account))}">${adot(acctOf(t))}<b>${RES_LABEL[rr] || '–'}</b>${t.symbol ? `<span class="sym">${esc(t.symbol)}</span>` : ''}</span>`;
          }).join('') + (list.length > 4 ? `<span class="pill more">+${list.length - 4}</span>` : '');
          const dots = list.slice(0, 6).map(t => `<i class="${resOf(t) || 'na'}"></i>`).join('') + (o ? '<i class="ol"></i>' : '') + (l ? '<i class="ol"></i>' : '');
          h += `<button type="button" class="${cls.join(' ')}" data-day="${key}" aria-label="${esc(label)}" ${rvOn ? `data-rv="${M}:${mk}:${key}"` : ''} style="--rd:${Math.min(700, 480 + (r * 7 + c) * 12)}ms;--gd:${c * 45}ms;--wv:${(dir === 'prev' ? (6 - c) + (rows - 1 - r) : c + r) * 26}ms">
            <span class="row1"><span class="d-num">${d.getDate()}</span><span class="rt"><span class="marks">${marks}</span>${shot}</span></span>
            ${list.length ? `<span class="pills">${pills}</span>` : ''}
            ${dots ? `<span class="d-dots">${dots}</span>` : ''}
          </button>`;
        }
        const wc = calc(wList), wt = wc.tp + wc.be + wc.sl, kw = isoWeek(wStart);
        h += `<div class="wk" ${rvOn ? `data-rv="${M}:${mk}:wk${r}"` : ''} style="--rd:${Math.min(760, 560 + r * 40)}ms;--gd:315ms;--wv:${(dir === 'prev' ? (rows - 1 - r) : 7 + r) * 26}ms"><span class="kw">KW ${kw}</span>${wc.n ? `<span class="wk-n">${wc.n} ${wc.n === 1 ? 'Trade' : 'Trades'}</span><span class="wk-l">${countsHtml(wc)}</span><span class="mini"><span class="r tp" style="width:${ratioW(wc.tp, wt)}"></span><span class="r be" style="width:${ratioW(wc.be, wt)}"></span><span class="r sl" style="width:${ratioW(wc.sl, wt)}"></span></span>` : '<span class="none">–</span>'}</div>`;
        wl += `<div class="wrow" ${rvOn ? `data-rv="${M}:${mk}:wl${r}"` : ''} style="--rd:${r * 50}ms"><span class="kw">KW ${kw} · ${fDM.format(wStart)}–${fDM.format(wEnd)}</span><span class="n">${wc.n ? wc.n + (wc.n === 1 ? ' Trade' : ' Trades') : ''}</span><span class="p">${wc.n ? countsHtml(wc) : '–'}</span></div>`;
      }
      $('#cal').innerHTML = h;
      if (dir) {
        const cal = $('#cal'), wk = $('#weeks');
        cal.style.setProperty('--wdir', dir === 'next' ? 1 : -1);
        cal.classList.remove('wave'); void cal.offsetWidth; cal.classList.add('wave');
        clearTimeout(this.waveT); this.waveT = setTimeout(() => cal.classList.remove('wave'), 1400);
        wk.classList.remove('slide-next', 'slide-prev'); void wk.offsetWidth; wk.classList.add('slide-' + dir);
        const mt = $('#month-title'); mt.style.setProperty('--mdir', dir === 'next' ? 1 : -1); mt.classList.remove('swap'); void mt.offsetWidth; mt.classList.add('swap');
      }
      $('#weeks').innerHTML = wl;
      $('#cal-hint').hidden = !(S.loaded.trades && S.trades.length === 0);
    }
  },

  learnings: {
    mount(el){
      const M = S.mountN;
      el.innerHTML = `
      <section aria-label="Learnings">
        <div class="page-head" data-rv="${M}:ph">
          <div class="grow"><h1>Learnings</h1><p id="l-sub">Jeder Fehler, den du aufschreibst, kostet dich nur einmal Geld.</p></div>
          <button type="button" class="btn primary" data-action="new-learning">${ICON.plus}Learning eintragen</button>
        </div>
        <div class="toolbar" data-rv="${M}:tb" style="--rd:120ms">
          <input type="search" class="search" id="l-search" placeholder="Learnings durchsuchen" aria-label="Learnings durchsuchen" value="${esc(S.lq)}">
          <div class="chips" id="l-cats"></div>
        </div>
        <div class="feed" id="l-feed"></div>
      </section>`;
    },
    update(){
      const M = S.mountN;
      const all = S.learnings;
      const cats = Array.from(new Set(all.map(l => (l.category || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, LOC));
      if (S.lcat && !cats.includes(S.lcat)) S.lcat = '';
      $('#l-cats').innerHTML = cats.length ? [['', 'Alle']].concat(cats.map(c => [c, c])).map(([v, l]) => `<button type="button" class="chip" data-lcat="${esc(v)}" aria-pressed="${S.lcat === v}">${esc(l)}</button>`).join('') : '';
      $('#l-sub').textContent = all.length ? all.length + (all.length === 1 ? ' Learning' : ' Learnings') + ' gespeichert. Jeder Fehler, den du aufschreibst, kostet dich nur einmal Geld.' : 'Jeder Fehler, den du aufschreibst, kostet dich nur einmal Geld.';
      const q = S.lq.trim().toLowerCase();
      const list = sortEntries(all.filter(l => (!S.lcat || (l.category || '').trim() === S.lcat) && (!q || [l.title, l.text, l.category].join(' ').toLowerCase().includes(q))));
      const feed = $('#l-feed');
      feed.classList.remove('tl');
      if (!S.loaded.learnings) { feed.innerHTML = '<div class="empty sm"><p>Learnings werden geladen…</p></div>'; return; }
      if (!all.length) { feed.innerHTML = `<div class="empty" data-rv="${M}:empty" style="--rd:200ms"><h3>Noch keine Learnings</h3><p>Halte fest, was du aus einem Trade gelernt hast, mit Text und Screenshot vom Chart. So siehst du später, welche Fehler sich wiederholen.</p><button type="button" class="btn primary" data-action="new-learning">${ICON.plus}Erstes Learning eintragen</button></div>`; return; }
      if (!list.length) { feed.innerHTML = '<div class="empty sm"><p>Keine Learnings passen zu deiner Suche.</p></div>'; return; }
      feed.classList.add('tl');
      feed.innerHTML = '<div class="tl-rail" aria-hidden="true"><i class="tl-fill"></i></div>' + list.map((l, i) => tlItem(l.date, `${M}:l:${esc(l.id)}`, i, `
        <article class="entry spot">
          <div class="e-meta">${l.category ? `<span class="tag">${esc(l.category)}</span>` : '<span>Learning</span>'}<span class="spacer"></span>
            <button type="button" class="btn sm ghost" data-action="edit-learning" data-id="${esc(l.id)}">Bearbeiten</button></div>
          ${l.title ? `<h3 class="e-title">${esc(l.title)}</h3>` : ''}
          ${l.text ? `<p class="e-text">${esc(l.text)}</p>` : ''}
          ${shotsHtml(l.shots)}
        </article>`)).join('');
    }
  },

  outlooks: {
    mount(el){
      const M = S.mountN;
      el.innerHTML = `
      <section aria-label="Outlooks">
        <div class="page-head" data-rv="${M}:ph">
          <div class="grow"><h1>Outlooks</h1><p id="o-sub">Wer vorbereitet ist, reagiert nicht, er handelt nach Plan.</p></div>
          <button type="button" class="btn primary" data-action="new-outlook">${ICON.plus}Outlook eintragen</button>
        </div>
        <div class="toolbar" data-rv="${M}:tb" style="--rd:120ms">
          <input type="search" class="search" id="o-search" placeholder="Instrument oder Text suchen" aria-label="Outlooks durchsuchen" value="${esc(S.oq)}">
          <div class="chips" id="o-bias">
            ${[['all','Alle'],['bull','HTF ▲ Bullish'],['bear','HTF ▼ Bearish']].map(([v, l]) => `<button type="button" class="chip" data-obias="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="feed" id="o-feed"></div>
      </section>`;
    },
    update(){
      const M = S.mountN;
      const all = S.outlooks;
      $$('#o-bias .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.obias === S.obias)));
      const hit = all.filter(o => o.result === 'hit').length, miss = all.filter(o => o.result === 'miss').length;
      $('#o-sub').textContent = all.length
        ? all.length + (all.length === 1 ? ' Outlook' : ' Outlooks') + (hit + miss ? ' · Trefferquote ' + Math.round(hit / (hit + miss) * 100) + ' % (' + hit + ' von ' + (hit + miss) + ' bewertet)' : ' · noch keiner bewertet') + '. Wer vorbereitet ist, handelt nach Plan.'
        : 'Wer vorbereitet ist, reagiert nicht, er handelt nach Plan.';
      const q = S.oq.trim().toLowerCase();
      const list = sortEntries(all.filter(o => (S.obias === 'all' || olTf(o).htf === S.obias) && (!q || [o.symbol, o.title, o.text].join(' ').toLowerCase().includes(q))));
      const feed = $('#o-feed');
      feed.classList.remove('tl');
      if (!S.loaded.outlooks) { feed.innerHTML = '<div class="empty sm"><p>Outlooks werden geladen…</p></div>'; return; }
      if (!all.length) { feed.innerHTML = `<div class="empty" data-rv="${M}:empty" style="--rd:200ms"><h3>Noch keine Outlooks</h3><p>Schreib vor der Session auf, was du vom Markt erwartest, und häng deinen markierten Chart an. Nach dem Tag markierst du, ob es eingetreten ist.</p><button type="button" class="btn primary" data-action="new-outlook">${ICON.plus}Ersten Outlook eintragen</button></div>`; return; }
      if (!list.length) { feed.innerHTML = '<div class="empty sm"><p>Keine Outlooks passen zu deinem Filter.</p></div>'; return; }
      feed.classList.add('tl');
      feed.innerHTML = '<div class="tl-rail" aria-hidden="true"><i class="tl-fill"></i></div>' + list.map((o, i) => {
        const tfs = olTf(o);
        const tfRows = [['HTF', tfs.htf], ['LTF', tfs.ltf]].filter(([, v]) => v).map(([k, v]) => `<span class="ol-tfr"><small>${k}</small><span class="bias ${v}">${v === 'bull' ? '▲ Bullish' : '▼ Bearish'}</span></span>`).join('');
        const res = o.result === 'hit' ? '<span class="res hit">Eingetreten</span>' : o.result === 'miss' ? '<span class="res miss">Nicht eingetreten</span>' : '<span class="res">Offen</span>';
        return tlItem(o.date, `${M}:o:${esc(o.id)}`, i, `
        <article class="entry ol spot">
          <div class="ol-side"><span class="ol-sym">${esc(o.symbol || '—')}</span>${tfRows ? `<div class="ol-tfs">${tfRows}</div>` : ''}</div>
          <div class="ol-main">
            <div class="e-meta"><span>Outlook</span>${res}<span class="spacer"></span>
              <button type="button" class="btn sm ghost" data-action="edit-outlook" data-id="${esc(o.id)}">Bearbeiten</button></div>
            ${o.title ? `<h3 class="e-title">${esc(o.title)}</h3>` : ''}
            ${o.text ? `<p class="e-text">${esc(o.text)}</p>` : ''}
            ${shotsHtml(o.shots)}
          </div>
        </article>`);
      }).join('');
    }
  }
};

/* ---------- modal ---------- */
const Modal = {
  cur: null, opener: null,
  show(builder, opts){
    opts = opts || {};
    const fresh = !this.cur, dirFx = this.goingBack ? 'bwd' : 'fwd';
    this.goingBack = false;
    const from = fresh ? Origin.take() : null;
    if (this.cur && this.cur.cleanup) this.cur.cleanup();
    if (!this.cur) { this.opener = document.activeElement; this.origin = from ? from.el : null; }
    this.cur = {builder, live: !!opts.live, back: opts.back || null, cleanup: opts.cleanup || null, dirty: false};
    const panel = this.freshPanel();
    panel.innerHTML = builder();
    panel.scrollTop = 0;
    $('#modal').hidden = false;
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    if (!fresh && !reduce) panel.classList.add(dirFx);
    else if (fresh && !reduce && panel.animate) {
      panel.style.animation = 'none';
      const pr = panel.getBoundingClientRect();
      if (phoneSheet()) {
        panel.animate([{transform: 'translate3d(0,60%,0)', opacity: .4}, {transform: 'none', opacity: 1}], {duration: 520, easing: 'cubic-bezier(.16,1,.3,1)'});
      } else if (from && pr.width) {
        const sc = Math.max(.14, Math.min(.9, from.r.width / pr.width));
        const dx = from.r.left + from.r.width / 2 - (pr.left + pr.width / 2), dy = from.r.top + from.r.height / 2 - (pr.top + pr.height / 2);
        panel.animate([{transform: `translate3d(${dx}px,${dy}px,0) scale(${sc})`, opacity: 0}, {opacity: 1, offset: .32}, {transform: 'none', opacity: 1}], {duration: 600, easing: 'cubic-bezier(.16,1,.3,1)'});
      } else {
        panel.animate([{transform: 'translate3d(0,18px,0) scale(.97)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 420, easing: 'cubic-bezier(.16,1,.3,1)'});
      }
    }
    document.documentElement.style.overflow = 'hidden';
    if (opts.onMount) opts.onMount(panel);
    if (fresh && !reduce) panel.querySelectorAll('.day-sum .v').forEach((v, i) => Roll.set(v, v.textContent, 180 + i * 70));
    const f = panel.querySelector(opts.focus || '.p-body button, .p-body input, .p-body textarea, .p-foot button');
    if (f) { try { f.focus({preventScroll: true}); } catch (e) { f.focus(); } }
  },
  freshPanel(){
    const old = $('#panel'), panel = old.cloneNode(false);
    old.parentNode.replaceChild(panel, old);
    return panel;
  },
  refresh(){
    if (!this.cur || !this.cur.live) return;
    const panel = $('#panel'), sc = panel.scrollTop;
    panel.innerHTML = this.cur.builder(); panel.scrollTop = sc;
    $$('.tcard', panel).forEach(c => { c.style.animation = 'none'; });
  },
  close(){
    if (!this.cur) return;
    if (this.cur.cleanup) this.cur.cleanup();
    this.cur = null;
    const old = $('#panel'), sc = old.scrollTop, land = this.landTo; this.landTo = null;
    $('#modal').hidden = true; this.freshPanel();
    if (!reduce && old.animate && old.childElementCount) this.fold(old, sc, land);
    document.documentElement.style.overflow = '';
    if (this.opener && document.contains(this.opener)) { try { this.opener.focus({preventScroll: true}); } catch (e) {} }
    this.opener = null;
  },
  // the closing sheet folds back into the element it came from (or into the day a trade was saved to)
  fold(old, sc, land){
    const ghost = document.createElement('div');
    ghost.className = 'modal ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    old.removeAttribute('id'); old.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    old.style.animation = 'none'; old.classList.remove('fwd', 'bwd');
    ghost.append(scrim, old); document.body.append(ghost);
    old.scrollTop = sc;
    const origin = this.origin; this.origin = null;
    const go = () => {
      const pr = old.getBoundingClientRect();
      const target = land ? $('#cal .day[data-day="' + land + '"]') : origin;
      const tr = vis(target);
      let kf;
      if (tr && pr.width && !(phoneSheet() && !land)) {
        const s2 = Math.max(.1, Math.min(.9, tr.width / pr.width));
        const dx = tr.left + tr.width / 2 - (pr.left + pr.width / 2), dy = tr.top + tr.height / 2 - (pr.top + pr.height / 2);
        kf = [{transform: 'none', opacity: 1}, {opacity: 1, offset: .55}, {transform: `translate3d(${dx}px,${dy}px,0) scale(${s2})`, opacity: 0}];
      } else if (phoneSheet()) kf = [{transform: 'none', opacity: 1}, {transform: 'translate3d(0,70%,0)', opacity: .2}];
      else kf = [{transform: 'none', opacity: 1}, {transform: 'translate3d(0,14px,0) scale(.965)', opacity: 0}];
      const a = old.animate(kf, {duration: tr ? 460 : 300, easing: tr ? 'cubic-bezier(.65,0,.35,1)' : 'cubic-bezier(.55,0,.75,.06)', fill: 'forwards'});
      scrim.animate([{opacity: 1}, {opacity: 0}], {duration: tr ? 420 : 280, easing: 'ease-out', fill: 'forwards'});
      const end = () => {
        ghost.remove();
        if (land && target && document.contains(target)) { target.classList.remove('landed'); void target.offsetWidth; target.classList.add('landed'); setTimeout(() => target.classList.remove('landed'), 1100); }
      };
      a.onfinish = end; a.oncancel = end;
      setTimeout(() => { if (ghost.isConnected) end(); }, 900);
    };
    // a saved trade: wait until the calendar shows it, then fly there
    if (land) requestAnimationFrame(() => requestAnimationFrame(go)); else go();
  },
  back(){
    if (this.cur && this.cur.back) { this.goingBack = true; const b = this.cur.back; if (this.cur.cleanup) this.cur.cleanup(); this.cur.cleanup = null; b(); }
    else this.close();
  },
  tryClose(){
    if (this.cur && this.cur.dirty) {
      const err = $('#form-err');
      if (err) { err.textContent = 'Du hast ungespeicherte Änderungen. Speichere sie oder klicke auf „Abbrechen“, um sie zu verwerfen.'; err.hidden = false; err.scrollIntoView({block: 'nearest'}); }
      return;
    }
    this.close();
  }
};

/* ---------- day sheet ---------- */
function openDay(key){
  const builder = () => {
    const d = parseYmd(key);
    const list = sortTrades(S.trades.filter(t => t.date === key));
    const s = calc(list);
    const ol = modOn('outlooks') ? S.outlooks.filter(o => o.date === key) : [], le = modOn('learnings') ? S.learnings.filter(l => l.date === key) : [];
    const card = t => {
      const r = resOf(t), ak = acctOf(t);
      return `<article class="tcard ${r || ''}">
        <div class="tc-head">
          <div class="tc-meta">
            <span class="tc-sym">${esc(t.symbol || '—')}</span>
            ${t.side ? `<span class="side ${t.side === 'short' ? 'short' : 'long'}">${t.side === 'short' ? '▼ Short' : '▲ Long'}</span>` : ''}
            <span class="acc" style="--ac:${acVar(ak)}">${esc(an(ak))}</span>
            ${t.time ? `<span class="tc-time">${esc(t.time)} Uhr</span>` : ''}
          </div>
          <span class="oc-big ${r || 'na'}">${r ? RES_LABEL[r] + `<small>${RES_NAME[r]}</small>` : 'Kein Ergebnis'}</span>
        </div>
        ${t.setup ? `<div class="tc-row tc-sub"><span class="tag">${esc(t.setup)}</span></div>` : ''}
        ${t.note ? `<p class="tc-note">${esc(t.note)}</p>` : ''}
        ${shotsHtml(t.shots)}
        <div class="tc-actions"><button type="button" class="btn sm" data-action="edit-trade" data-id="${esc(t.id)}" data-from-day="${key}">Bearbeiten</button></div>
      </article>`;
    };
    const eyebrow = list.length
      ? [list.length + (list.length === 1 ? ' Trade' : ' Trades')].concat(acctCounts(s.per).map(({a, n}) => n + ' ' + esc(a.name))).join(' · ')
      : 'Keine Trades';
    return `
      <div class="p-head"><div class="ph-t"><span class="eyebrow">${eyebrow} · KW ${isoWeek(d)}</span><h2 id="modal-title">${esc(fLong.format(d))}</h2></div>
        <button type="button" class="btn icon ghost" data-action="close-modal" aria-label="Schließen">${ICON.x}</button></div>
      <div class="p-body">
        ${list.length ? `<div class="day-sum">
          <div><span class="k"><i class="sw tp"></i>Take Profit</span><span class="v">${s.tp}</span></div>
          <div><span class="k"><i class="sw be"></i>Break Even</span><span class="v">${s.be}</span></div>
          <div><span class="k"><i class="sw sl"></i>Stop Loss</span><span class="v">${s.sl}</span></div>
          <div><span class="k">Win-Rate</span><span class="v">${s.wr == null ? '–' : Math.round(s.wr * 100) + ' %'}</span></div>
        </div><div class="tlist">${list.map(card).join('')}</div>`
        : `<div class="empty sm"><p>An diesem Tag ist noch kein Trade eingetragen.</p><button type="button" class="btn primary" data-action="new-trade" data-date="${key}" data-from-day="${key}">${ICON.plus}Trade eintragen</button></div>`}
        ${ol.length || le.length ? `<div class="related"><h3 class="sec">${[ol.length ? 'Outlooks' : '', le.length ? 'Learnings' : ''].filter(Boolean).join(' &amp; ')} zu diesem Tag</h3>
          ${ol.map(o => `<button type="button" class="rel" data-action="edit-outlook" data-id="${esc(o.id)}" data-from-day="${key}"><span class="tag">Outlook</span><span class="t">${esc([o.symbol, o.title].filter(Boolean).join(' · ') || 'Ohne Titel')}</span></button>`).join('')}
          ${le.map(l => `<button type="button" class="rel" data-action="edit-learning" data-id="${esc(l.id)}" data-from-day="${key}"><span class="tag">Learning</span><span class="t">${esc(l.title || (l.text || '').slice(0, 80) || 'Ohne Titel')}</span></button>`).join('')}
        </div>` : ''}
      </div>
      <div class="p-foot">
        ${modOn('outlooks') ? `<button type="button" class="btn sm" data-action="new-outlook" data-date="${key}" data-from-day="${key}">${ICON.plus}Outlook</button>` : ''}
        ${modOn('learnings') ? `<button type="button" class="btn sm" data-action="new-learning" data-date="${key}" data-from-day="${key}">${ICON.plus}Learning</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn primary" data-action="new-trade" data-date="${key}" data-from-day="${key}">${ICON.plus}Trade eintragen</button>
      </div>`;
  };
  Modal.show(builder, {live: true, focus: '.p-foot .btn.primary'});
}

/* HTF / LTF of an outlook. Older outlooks stored one bias plus a timeframe:
   intraday counts as LTF, everything else as HTF. */
function olTf(o){
  const ok = v => (v === 'bull' || v === 'bear') ? v : '';
  if (o.htf !== undefined || o.ltf !== undefined) return {htf: ok(o.htf), ltf: ok(o.ltf)};
  const b = ok(o.bias);
  return o.tf === 'intraday' ? {htf: '', ltf: b} : {htf: b, ltf: ''};
}

/* ---------- forms ---------- */
const FORMS = {
  trades: {
    newTitle: 'Trade eintragen', editTitle: 'Trade bearbeiten', saved: 'Trade gespeichert', deleted: 'Trade gelöscht', what: 'diesen Trade',
    defaults: o => ({account: acctById(S.lastAccount) ? S.lastAccount : accts()[0].id, date: o.date || todayStr(), side: 'long'}),
    fields: [
      {k: 'account', t: 'acct', label: 'Konto'},
      {k: 'date', t: 'date', label: 'Datum'},
      {k: 'time', t: 'time', label: 'Uhrzeit', opt: true},
      {k: 'symbol', t: 'text', label: 'Instrument', ph: 'z. B. NQ, DAX, EURUSD', list: 'dl-symbols', caps: true},
      {k: 'side', t: 'seg', label: 'Richtung', cls: 'side-seg', opts: [['long', '▲ Long'], ['short', '▼ Short']]},
      {k: 'result', t: 'seg', label: 'Ergebnis', cls: 'oc-seg', full: true, opts: [['tp', ICON.tp + '<b>TP</b><small>Take Profit</small>'], ['be', ICON.be + '<b>BE</b><small>Break Even</small>'], ['sl', ICON.sl + '<b>SL</b><small>Stop Loss</small>']]},
      {k: 'setup', t: 'text', label: 'Setup', ph: 'z. B. Entry Model 1, 2 oder 3', list: 'dl-setups', opt: true, full: true},
      {k: 'note', t: 'area', label: 'Notizen', ph: 'Warum bist du rein? Was lief gut, was nicht?', opt: true, rows: 5},
      {k: 'shots', t: 'shots', label: 'Screenshots'}
    ],
    validate: v => {
      if (!v.account) return 'Wähle aus, auf welchem Konto der Trade lief.';
      if (!v.date) return 'Gib ein Datum an.';
      if (!v.result) return 'Wähle aus, ob der Trade in TP, BE oder SL gegangen ist.';
    }
  },
  learnings: {
    newTitle: 'Learning eintragen', editTitle: 'Learning bearbeiten', saved: 'Learning gespeichert', deleted: 'Learning gelöscht', what: 'dieses Learning',
    defaults: o => ({date: o.date || todayStr()}),
    fields: [
      {k: 'date', t: 'date', label: 'Datum'},
      {k: 'category', t: 'text', label: 'Kategorie', ph: 'z. B. Psychologie', list: 'dl-cats', opt: true},
      {k: 'title', t: 'text', label: 'Titel', ph: 'Was hast du gelernt?', full: true},
      {k: 'text', t: 'area', label: 'Text', ph: 'Beschreibe die Situation und was du künftig anders machst.', rows: 8},
      {k: 'shots', t: 'shots', label: 'Screenshots'}
    ],
    validate: v => { if (!v.date) return 'Gib ein Datum an.'; if (!v.title && !v.text) return 'Gib einen Titel oder Text ein.'; }
  },
  outlooks: {
    newTitle: 'Outlook eintragen', editTitle: 'Outlook bearbeiten', saved: 'Outlook gespeichert', deleted: 'Outlook gelöscht', what: 'diesen Outlook',
    defaults: o => ({date: o.date || todayStr(), htf: '', ltf: '', result: 'open'}),
    fields: [
      {k: 'date', t: 'date', label: 'Gilt für'},
      {k: 'symbol', t: 'text', label: 'Instrument', ph: 'z. B. NQ, DAX, EURUSD', list: 'dl-symbols', caps: true},
      {k: 'htf', t: 'seg', label: 'HTF', hint: 'Higher Timeframe', cls: 'bias-seg', opts: [['bull', '▲ Bullish'], ['bear', '▼ Bearish']]},
      {k: 'ltf', t: 'seg', label: 'LTF', hint: 'Lower Timeframe', cls: 'bias-seg', opts: [['bull', '▲ Bullish'], ['bear', '▼ Bearish']]},
      {k: 'title', t: 'text', label: 'Titel', ph: 'z. B. Wochenausblick NQ', full: true, opt: true},
      {k: 'text', t: 'area', label: 'Analyse', ph: 'Key Levels, Szenarien, Plan für die Session…', rows: 8},
      {k: 'result', t: 'seg', label: 'Review', cls: 'res-seg', full: true, opts: [['open', 'Offen'], ['hit', 'Eingetreten'], ['miss', 'Nicht eingetreten']]},
      {k: 'shots', t: 'shots', label: 'Screenshots'}
    ],
    validate: v => { if (!v.date) return 'Gib ein Datum an.'; if (!v.symbol && !v.title && !v.text) return 'Gib zumindest ein Instrument, einen Titel oder einen Text ein.'; }
  }
};

function datalists(){
  const uniq = arr => Array.from(new Set(arr.map(x => (x || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, LOC));
  const opt = a => a.map(x => `<option value="${esc(x)}"></option>`).join('');
  return `<datalist id="dl-symbols">${opt(uniq(S.trades.map(t => t.symbol).concat(S.outlooks.map(o => o.symbol))))}</datalist>
    <datalist id="dl-setups">${opt(uniq(['Entry Model 1', 'Entry Model 2', 'Entry Model 3'].concat(S.trades.map(t => t.setup))))}</datalist>
    <datalist id="dl-cats">${opt(uniq(['Psychologie', 'Risikomanagement', 'Entry', 'Exit', 'Setup', 'Disziplin', 'Marktstruktur'].concat(S.learnings.map(l => l.category))))}</datalist>`;
}

function fieldHtml(f, v){
  const full = f.full ? ' full' : '';
  const opt = f.opt ? '<span class="opt">optional</span>' : '';
  const val = v[f.k];
  const id = 'f-' + f.k;
  switch (f.t) {
    case 'acct':
      return `<div class="fld full"><span class="lbl" id="${id}-l">${f.label}</span>
        <div class="acct-pick" role="radiogroup" aria-labelledby="${id}-l" data-field="${f.k}">
          ${(() => { const cur = acctOf({account: val}); return accts().map((a, i) =>
            `<button type="button" role="radio" data-val="${esc(a.id)}" data-c="${a.color}" style="--ac:${acVar(a.id)}" aria-checked="${a.id === cur}"><span class="dot"></span><span><b>${esc(a.name)}</b><small>Konto ${i + 1}</small></span></button>`).join(''); })()}
        </div></div>`;
    case 'seg':
      return `<div class="fld${full}"><span class="lbl" id="${id}-l">${f.label}${f.hint ? `<span class="opt">${f.hint}</span>` : ''}${opt}</span>
        <div class="seg wide ${f.cls || ''}" role="radiogroup" aria-labelledby="${id}-l" data-field="${f.k}">
          ${f.opts.map(([k, l]) => `<button type="button" role="radio" data-val="${k}" aria-checked="${val === k}">${l}</button>`).join('')}
        </div></div>`;
    case 'date': case 'time':
      return `<label class="fld${full}" for="${id}"><span class="lbl">${f.label}${opt}</span><input class="inp" type="${f.t}" id="${id}" value="${esc(val || '')}"></label>`;
    case 'text':
      return `<label class="fld${full}" for="${id}"><span class="lbl">${f.label}${opt}</span><input class="inp" type="text" id="${id}" value="${esc(val || '')}" placeholder="${esc(f.ph || '')}"${f.list ? ` list="${f.list}"` : ''} autocomplete="off"${f.caps ? ' autocapitalize="characters"' : ''}></label>`;
    case 'dec': {
      const shown = val == null || Number.isNaN(val) ? '' : String(val).replace('.', ',');
      return `<div class="fld${full}"><label class="lbl" for="${id}">${f.label}${opt}</label>
        <div class="ig"><button type="button" class="sign" data-action="flip-sign" data-target="${id}" aria-label="Vorzeichen umkehren" title="Vorzeichen umkehren">±</button>
        <input type="text" inputmode="decimal" id="${id}" value="${esc(shown)}" placeholder="${esc(f.ph || '')}" autocomplete="off">
        ${f.unit ? `<span class="sfx">${esc(f.unit)}</span>` : ''}</div></div>`;
    }
    case 'area':
      return `<label class="fld full" for="${id}"><span class="lbl">${f.label}${opt}</span><textarea class="inp" id="${id}" rows="${f.rows || 5}" placeholder="${esc(f.ph || '')}">${esc(val || '')}</textarea></label>`;
    case 'shots': {
      const can = Store.canUpload();
      return `<div class="fld full"><span class="lbl">${f.label}<span class="opt">optional</span></span>
        ${can ? `<label class="drop" for="f-file" id="drop" tabindex="0" role="button">${ICON.img}<b>Screenshot hinzufügen</b><span>Klicken, Bild hierher ziehen oder mit <kbd>${isMac ? '⌘' : 'Strg'}+V</kbd> einfügen</span></label>
        <input type="file" id="f-file" accept="image/*" multiple hidden>` : `<p class="lbl">Screenshots können in dieser Ansicht nicht hinzugefügt werden.</p>`}
        <div class="thumbs" id="thumbs" hidden></div></div>`;
    }
  }
  return '';
}

function openForm(kind, entry, opts){
  opts = opts || {};
  const def = FORMS[kind];
  const isNew = !entry;
  const v = Object.assign({}, def.defaults(opts), entry || {});
  if (kind === 'trades' && entry && !entry.result) v.result = resOf(entry) || '';
  if (kind === 'outlooks' && entry) Object.assign(v, olTf(entry));
  const st = {shots: (v.shots || []).map(ref => ({ref})), removed: [], busy: false};
  const back = opts.fromDay ? () => openDay(opts.fromDay) : null;

  const builder = () => `
    <div class="p-head"><div class="ph-t"><h2 id="modal-title">${isNew ? def.newTitle : def.editTitle}</h2></div>
      <button type="button" class="btn icon ghost" data-action="close-modal" aria-label="Schließen">${ICON.x}</button></div>
    <form class="p-body" id="entry-form" novalidate>
      <div class="form">${def.fields.map(f => fieldHtml(f, v)).join('')}</div>
      ${datalists()}
      <p class="form-err" id="form-err" role="alert" hidden></p>
    </form>
    <div class="p-foot">
      ${isNew ? '' : '<div class="confirm" id="del-zone"><button type="button" class="btn ghost danger" data-action="ask-del">Löschen</button></div>'}
      <span class="spacer"></span>
      <button type="button" class="btn" data-action="form-cancel">Abbrechen</button>
      <button type="submit" form="entry-form" class="btn primary" id="save-btn">${isNew ? 'Speichern' : 'Änderungen speichern'}</button>
    </div>`;

  let panel, urls = [];
  const markDirty = () => { if (Modal.cur) Modal.cur.dirty = true; const e = $('#form-err'); if (e && !st.busy) e.hidden = true; };
  const showErr = msg => { const e = $('#form-err'); e.textContent = msg; e.hidden = false; e.scrollIntoView({block: 'nearest'}); };

  const renderThumbs = () => {
    const el = panel.querySelector('#thumbs'); if (!el) return;
    el.innerHTML = st.shots.map((s, i) => `<div class="thumb"><img decoding="async" src="${esc(s.ref ? Store.imgSrc(s.ref) : s.url)}" alt=""><button type="button" class="tv" data-lb="${i}" aria-label="Screenshot ${i + 1} ansehen"></button>${s.ref ? '' : '<span class="nb">neu</span>'}<button type="button" class="rm" data-rm="${i}" aria-label="Screenshot ${i + 1} entfernen">×</button></div>`).join('');
    el.hidden = !st.shots.length;
  };
  const addFiles = files => {
    const imgs = Array.from(files || []).filter(f => f && (f.type || '').startsWith('image/'));
    if (!imgs.length) { toast('Nur Bilddateien können als Screenshot angehängt werden.', true); return; }
    for (const f of imgs) { if (f.size > 40 * 1024 * 1024) { toast('Ein Bild ist größer als 40 MB und wurde übersprungen.', true); continue; } const url = URL.createObjectURL(f); urls.push(url); st.shots.push({file: f, url}); }
    markDirty(); renderThumbs();
  };
  const onPaste = e => {
    if (!Store.canUpload()) return;
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []).filter(i => i.kind === 'file' && i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault();
    addFiles(items.map(i => i.getAsFile()).filter(Boolean));
    toast(items.length === 1 ? 'Screenshot eingefügt' : items.length + ' Screenshots eingefügt');
  };

  const collect = () => {
    const out = {};
    for (const f of def.fields) {
      if (f.t === 'shots') continue;
      if (f.t === 'seg' || f.t === 'acct') { const b = panel.querySelector(`[data-field="${f.k}"] [aria-checked="true"]`); out[f.k] = b ? b.dataset.val : ''; continue; }
      const el = panel.querySelector('#f-' + f.k); const raw = el ? el.value : '';
      out[f.k] = f.t === 'dec' ? parseDec(raw) : raw.trim();
    }
    if (out.symbol) out.symbol = out.symbol.toUpperCase();
    return out;
  };

  const submit = async e => {
    e.preventDefault();
    if (st.busy) return;
    const vals = collect();
    const msg = def.validate(vals);
    if (msg) { showErr(msg); return; }
    st.busy = true;
    const btn = panel.querySelector('#save-btn'), label = btn.textContent;
    $$('.p-foot button', panel).forEach(b => b.disabled = true);
    try {
      const pending = st.shots.filter(s => !s.ref);
      let i = 0;
      for (const s of pending) { i++; btn.textContent = pending.length > 1 ? `Screenshot ${i}/${pending.length} wird hochgeladen…` : 'Screenshot wird hochgeladen…'; s.ref = await Store.uploadImage(s.file); }
      btn.textContent = 'Wird gespeichert…';
      const ts = Date.now();
      const obj = Object.assign({}, entry || {}, vals, {
        id: (entry && entry.id) || newId(),
        shots: st.shots.map(s => s.ref),
        createdAt: (entry && entry.createdAt) || ts, updatedAt: ts
      });
      if (kind === 'trades') {
        delete obj.pnl; delete obj.r;
        const first = st.shots[0];
        if (!first) { delete obj.thumb; delete obj.thumbRef; }
        else if (!obj.thumb || obj.thumbRef !== first.ref) {
          try { obj.thumb = await makeThumb(first.file || Store.imgSrc(first.ref)); obj.thumbRef = first.ref; }
          catch (e) { delete obj.thumb; delete obj.thumbRef; }
        }
      }
      if (kind === 'outlooks') { delete obj.bias; delete obj.tf; }
      await Store.save(kind, obj);
      for (const ref of st.removed) Store.deleteImage(ref);
      if (kind === 'trades' && obj.account) { S.lastAccount = obj.account; lsSet('blotter.lastAccount', obj.account); }
      st.busy = false;
      if (!reduce) {
        btn.classList.add('done');
        btn.innerHTML = '<svg class="ok" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>Gespeichert';
        await new Promise(r => setTimeout(r, 380));
      }
      toast(def.saved);
      if (Modal.cur) Modal.cur.dirty = false;
      if (kind === 'trades' && !opts.fromDay && obj.date && S.view === 'kalender') Modal.landTo = obj.date;
      if (kind === 'trades' && !opts.fromDay && obj.date) {
        const d = parseYmd(obj.date); S.month = new Date(d.getFullYear(), d.getMonth(), 1);
        if (S.view !== 'kalender') location.hash = 'kalender';
        schedule();
      }
      Modal.back();
    } catch (err) {
      st.busy = false;
      $$('.p-foot button', panel).forEach(b => b.disabled = false);
      btn.textContent = label;
      renderThumbs();
      showErr(errText(err));
    }
  };

  const doDelete = async () => {
    if (!entry || st.busy) return;
    st.busy = true;
    $$('.p-foot button', panel).forEach(b => b.disabled = true);
    try {
      await Store.remove(kind, entry.id);
      for (const ref of (entry.shots || [])) Store.deleteImage(ref);
      st.busy = false;
      if (Modal.cur) Modal.cur.dirty = false;
      toast(def.deleted);
      Modal.back();
    } catch (err) {
      st.busy = false;
      $$('.p-foot button', panel).forEach(b => b.disabled = false);
      showErr(errText(err));
    }
  };

  Modal.show(builder, {
    back,
    focus: kind === 'learnings' ? '#f-title' : '#f-symbol',
    onMount(p){
      panel = p;
      p.querySelector('#entry-form').addEventListener('submit', submit);
      p.addEventListener('input', markDirty);
      p.addEventListener('click', e => {
        const sb = e.target.closest('[data-field] [data-val]');
        if (sb) { $$('[data-val]', sb.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === sb))); markDirty(); return; }
        const rm = e.target.closest('[data-rm]');
        if (rm) { const i = +rm.dataset.rm; const s = st.shots[i]; if (s) { if (s.ref) st.removed.push(s.ref); st.shots.splice(i, 1); markDirty(); renderThumbs(); } return; }
        const fs = e.target.closest('[data-action="flip-sign"]');
        if (fs) { const inp = p.querySelector('#' + fs.dataset.target); const val = inp.value.trim(); inp.value = val.startsWith('-') || val.startsWith('−') ? val.slice(1) : '-' + val; markDirty(); inp.focus(); return; }
        const ad = e.target.closest('[data-action="ask-del"]');
        if (ad) { $('#del-zone', p).innerHTML = `<span>${esc(def.what.charAt(0).toUpperCase() + def.what.slice(1))} löschen?</span><button type="button" class="btn sm danger-solid" data-action="confirm-del">Ja, löschen</button><button type="button" class="btn sm" data-action="cancel-del">Nein</button>`; return; }
        if (e.target.closest('[data-action="cancel-del"]')) { $('#del-zone', p).innerHTML = '<button type="button" class="btn ghost danger" data-action="ask-del">Löschen</button>'; return; }
        if (e.target.closest('[data-action="confirm-del"]')) { doDelete(); return; }
        if (e.target.closest('[data-action="form-cancel"]')) { if (Modal.cur) Modal.cur.dirty = false; Modal.back(); }
      });
      const fi = p.querySelector('#f-file');
      if (fi) fi.addEventListener('change', () => { addFiles(fi.files); fi.value = ''; });
      const drop = p.querySelector('#drop');
      if (drop) {
        drop.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && fi) { e.preventDefault(); fi.click(); } });
        ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
        ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
        drop.addEventListener('drop', e => addFiles(e.dataTransfer && e.dataTransfer.files));
      }
      document.addEventListener('paste', onPaste);
      renderThumbs();
    },
    cleanup(){ document.removeEventListener('paste', onPaste); urls.forEach(u => URL.revokeObjectURL(u)); urls = []; }
  });
}

/* ---------- lightbox ---------- */
const LB = {
  list: [], i: 0,
  opener: null,
  open(list, i){
    if (!list.length) return;
    const from = Origin.take();
    this.opener = document.activeElement; this.list = list; this.i = i; this.show(true); $('#lightbox').hidden = false; $('.lb-close').focus();
    const img = $('#lb-img'), lb = $('#lightbox');
    if (reduce || !img.animate) return;
    lb.animate([{opacity: 0}, {opacity: 1}], {duration: 260, easing: 'ease-out'});
    const grow = () => {
      if (!this.isOpen()) return;
      const r = img.getBoundingClientRect(), o = from && vis(from.el);
      if (o && r.width) {
        const sc = o.width / r.width;
        img.animate([{transform: `translate3d(${o.left - r.left}px,${o.top - r.top}px,0) scale(${sc})`, transformOrigin: '0 0', opacity: .6}, {transform: 'none', transformOrigin: '0 0', opacity: 1}], {duration: 560, easing: 'cubic-bezier(.16,1,.3,1)'});
      } else img.animate([{opacity: 0, transform: 'scale(.96)'}, {opacity: 1, transform: 'none'}], {duration: 340, easing: 'cubic-bezier(.16,1,.3,1)'});
    };
    if (img.complete && img.naturalWidth) grow(); else img.addEventListener('load', grow, {once: true});
  },
  show(first){
    const img = $('#lb-img');
    if (!first && !reduce && img.animate && this.lastI != null && this.lastI !== this.i) {
      const d = (this.i > this.lastI && !(this.lastI === 0 && this.i === this.list.length - 1)) || (this.lastI === this.list.length - 1 && this.i === 0) ? 1 : -1;
      img.addEventListener('load', () => img.animate([{opacity: 0, transform: `translate3d(${d * 48}px,0,0)`}, {opacity: 1, transform: 'none'}], {duration: 380, easing: 'cubic-bezier(.16,1,.3,1)'}), {once: true});
    }
    this.lastI = this.i;
    img.src = this.list[this.i];
    const many = this.list.length > 1;
    $('.lb-prev').hidden = !many; $('.lb-next').hidden = !many;
    $('#lb-count').textContent = many ? (this.i + 1) + ' / ' + this.list.length : '';
  },
  step(d){ this.i = (this.i + d + this.list.length) % this.list.length; this.show(); },
  close(){
    const img = $('#lb-img'), tr = vis(this.opener);
    if (!reduce && img.animate && tr && img.naturalWidth) {
      const r = img.getBoundingClientRect();
      const g = img.cloneNode(); g.removeAttribute('id'); g.className = 'lb-ghost';
      Object.assign(g.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
      const f = document.createElement('div'); f.className = 'lb-fade';
      document.body.append(f, g);
      const a = g.animate([{transform: 'none', opacity: 1}, {transform: `translate3d(${tr.left - r.left}px,${tr.top - r.top}px,0) scale(${tr.width / r.width},${tr.height / r.height})`, opacity: .9}], {duration: 420, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards'});
      f.animate([{opacity: 1}, {opacity: 0}], {duration: 360, easing: 'ease-out', fill: 'forwards'});
      const end = () => { g.remove(); f.remove(); };
      a.onfinish = end; a.oncancel = end; setTimeout(end, 800);
    }
    this.lastI = null;
    $('#lightbox').hidden = true; img.removeAttribute('src');
    const o = this.opener; this.opener = null;
    if (o && document.contains(o)) { try { o.focus({preventScroll: true}); } catch (e) {} }
  },
  isOpen(){ return !$('#lightbox').hidden; }
};
(() => {
  // swipe between screenshots on touch screens
  const lb = $('#lightbox');
  let sx = 0, sy = 0, on = false;
  lb.addEventListener('pointerdown', e => { on = e.pointerType !== 'mouse' && !e.target.closest('button'); sx = e.clientX; sy = e.clientY; }, {passive: true});
  lb.addEventListener('pointerup', e => {
    if (!on) return; on = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (LB.list.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) LB.step(dx < 0 ? 1 : -1);
  }, {passive: true});
  lb.addEventListener('pointercancel', () => { on = false; }, {passive: true});
})();

/* ---------- personalisation ---------- */
const SKINS = [
  {id: 'navy', name: 'Navy & Gold', sub: 'Das Original'},
  {id: 'onyx', name: 'Graphit', sub: 'Schwarz und Weiß, ganz schlicht'},
  {id: 'slate', name: 'Schiefer', sub: 'Blaugrau und ruhig'},
  {id: 'mocha', name: 'Mokka', sub: 'Dunkel und warm'},
  {id: 'forest', name: 'Wald', sub: 'Tiefgrün und Champagner'},
  {id: 'midnight', name: 'Mitternacht', sub: 'Indigo und Lavendel'},
  {id: 'petrol', name: 'Petrol', sub: 'Petrol und Kupfer'},
  {id: 'bordeaux', name: 'Bordeaux', sub: 'Weinrot und Roségold'},
  {id: 'paper', name: 'Hell', sub: 'Weiß und Anthrazit'},
  {id: 'sand', name: 'Sand', sub: 'Hell und warm'},
  {id: 'mist', name: 'Nebel', sub: 'Hellgrau und Stahlblau'},
  {id: 'sage', name: 'Salbei', sub: 'Hell und naturgrün'}
];
const SKIN_IDS = SKINS.map(k => k.id);
// schemes that were replaced by calmer ones
const SKIN_OLD = {ocean: 'slate', royal: 'navy', copper: 'mocha', arctic: 'paper'};
const skinId = id => SKIN_OLD[id] || id;
function normSettings(d){
  d = d || {};
  const o = {theme: 'navy', name: '', modules: {learnings: true, outlooks: true}, accounts: [], setupDone: !!d.setupDone, tourDone: !!d.tourDone};
  if (SKIN_IDS.includes(skinId(d.theme))) o.theme = skinId(d.theme);
  if (typeof d.name === 'string') o.name = d.name.trim().slice(0, 30);
  if (d.modules && typeof d.modules === 'object') { o.modules.learnings = d.modules.learnings !== false; o.modules.outlooks = d.modules.outlooks !== false; }
  o.accounts = normAccounts(d);
  return o;
}
/* Accounts: 1 to 10, each {id, name, color}. Trades point to an id. Older journals stored two fixed
   names (acctNames.main / .neben); those become the first two accounts with the same ids. */
const MAX_ACCTS = 10;
const AC_KEYS = ['gold', 'silver', 'violet', 'coral', 'mint', 'rose', 'sky', 'lemon', 'blue', 'sand'];
const ACCT_PH = ['z. B. FTMO 100k', 'z. B. Privatkonto', 'z. B. Apex 50k', 'z. B. Topstep', 'z. B. Demokonto'];
const acctDefault = (id, i) => id === 'main' ? 'Main-Konto' : id === 'neben' ? 'Neben-Konto' : 'Konto ' + (i + 1);
function normAccounts(d){
  let src = Array.isArray(d.accounts) ? d.accounts : null;
  if (!src) { const n = d.acctNames && typeof d.acctNames === 'object' ? d.acctNames : {}; src = [{id: 'main', name: n.main, color: 'gold'}, {id: 'neben', name: n.neben, color: 'silver'}]; }
  const out = [], seen = new Set();
  for (const a of src) {
    if (!a || typeof a !== 'object') continue;
    const id = String(a.id || '');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({id, name: String(a.name || '').trim().slice(0, 24) || acctDefault(id, out.length), color: AC_KEYS.includes(a.color) ? a.color : ''});
    if (out.length >= MAX_ACCTS) break;
  }
  if (!out.length) out.push({id: 'main', name: 'Main-Konto', color: 'gold'});
  for (const a of out) if (!a.color) a.color = freeColor(out);
  return out;
}
function freeColor(list, after){
  const used = new Set(list.map(a => a.color)), start = after ? AC_KEYS.indexOf(after) + 1 : 0;
  for (let i = 0; i < AC_KEYS.length; i++) { const k = AC_KEYS[(start + i) % AC_KEYS.length]; if (!used.has(k)) return k; }
  return AC_KEYS[start % AC_KEYS.length];
}
const newAcctId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function accts(){ const l = S.settings.accounts; return l && l.length ? l : [{id: 'main', name: 'Main-Konto', color: 'gold'}]; }
function acctById(id){ return id ? accts().find(a => a.id === id) : undefined; }
function acctOf(t){ const a = t && acctById(t.account); return a ? a.id : accts()[0].id; }
function acVar(id){ return 'var(--ac-' + (acctById(id) || accts()[0]).color + ')'; }
const adot = id => `<i class="ad" style="--ac:${acVar(id)}"></i>`;
const settingsSig = () => JSON.stringify([S.settings.name, S.settings.modules, S.settings.accounts]);
function modOn(k){ return k === 'kalender' || !(S.settings.modules && S.settings.modules[k] === false); }
function pagesOn(){ return ['kalender', 'learnings', 'outlooks'].filter(modOn); }
function an(id){ return (acctById(id) || accts()[0]).name; }
function applySkin(id, persist){
  id = skinId(id);
  if (!SKIN_IDS.includes(id)) id = 'navy';
  const r = document.documentElement;
  if (r.getAttribute('data-skin') !== id) { r.setAttribute('data-skin', id); BG.repal(); }
  if (persist) lsSet('blotter.skin', id);
}
function applySettings(){
  applySkin(S.settings.theme, true);
  if (!modOn(S.view) && !Loader.active) { S.view = 'kalender'; S.mounted = null; try { if (location.hash && location.hash !== '#kalender') location.hash = 'kalender'; } catch (e) {} }
  if (S.mountSig && settingsSig() !== S.mountSig) S.mounted = null;
  schedule();
}

const MI = {
  kalender: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  learnings: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  outlooks: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
};
const MODS = [
  {k: 'kalender', name: 'Kalender', desc: 'Alle Trades im Monatsüberblick mit TP, BE und SL.', locked: true},
  {k: 'learnings', name: 'Learnings', desc: 'Halte fest, was du aus Trades lernst, mit Text und Screenshots.'},
  {k: 'outlooks', name: 'Outlooks', desc: 'Plane deine Markterwartung vorab und bewerte sie danach.'}
];
function skinPreview(id){
  const C = [[26, 2], [32, 6], [22, 12, 1], [38, 10], [28, 18, 1], [44, 16], [34, 24, 1], [50, 22]];
  return `<span class="sk-prev" data-skin="${id}" aria-hidden="true"><span class="sk-bar"><i class="lg"></i><i class="on"></i><i></i><i></i></span><span class="sk-chart">${C.map(([h, b, dn]) => `<i${dn ? ' class="dn"' : ''} style="height:${h}%;margin-bottom:${b}px"></i>`).join('')}</span><span class="sk-cal">${['tp', '', 'sl', '', 'tp', '', '', 'tp', 'td', '', 'sl', 'tp', '', ''].map(c => `<i${c ? ` class="${c}"` : ''}></i>`).join('')}</span></span>`;
}
function skinGrid(sel){
  return `<div class="skin-grid" role="radiogroup" aria-label="Farbschema">${SKINS.map(k => `<button type="button" class="skin-card" role="radio" aria-checked="${k.id === sel}" data-skin-pick="${k.id}">${skinPreview(k.id)}<span class="sk-meta"><b>${k.name}</b><small>${k.sub}</small></span><span class="sk-check" aria-hidden="true">✓</span></button>`).join('')}</div>`;
}
function modGrid(mods){
  return `<div class="mod-grid">${MODS.map(m => m.locked
    ? `<div class="mod-card locked" aria-checked="true"><span class="mi">${MI[m.k]}</span><b>${m.name}</b><small>${m.desc}</small><span class="tg">Immer dabei<span class="tgl"></span></span></div>`
    : `<button type="button" class="mod-card" role="switch" aria-checked="${mods[m.k] !== false}" data-mod="${m.k}"><span class="mi">${MI[m.k]}</span><b>${m.name}</b><small>${m.desc}</small><span class="tg">Anzeigen<span class="tgl"></span></span></button>`).join('')}</div>`;
}
function acctEditor(list, p, fresh){
  return `<div class="acct-ed" data-acct-ed="${p}">
    ${list.map((a, i) => `<div class="acct-row${a.id === fresh ? ' new' : ''}">
      <button type="button" class="acct-color" data-acct-color="${esc(a.id)}" data-c="${a.color}" style="--ac:var(--ac-${a.color})" title="Farbe wechseln" aria-label="Farbe von Konto ${i + 1} wechseln"></button>
      <input class="inp" id="${p}-acc-${i}" data-acct-name="${esc(a.id)}" maxlength="24" autocomplete="off" placeholder="${ACCT_PH[i % ACCT_PH.length]}" value="${esc(a.name)}" aria-label="Name von Konto ${i + 1}">
      <button type="button" class="btn icon ghost acct-del" data-acct-del="${esc(a.id)}" title="Konto entfernen" aria-label="Konto ${i + 1} entfernen"${list.length < 2 ? ' disabled' : ''}>${ICON.x}</button>
    </div>`).join('')}
    <div class="acct-foot">${list.length < MAX_ACCTS ? `<button type="button" class="btn sm" data-acct-add>${ICON.plus}Konto hinzufügen</button>` : ''}<small>${list.length} von ${MAX_ACCTS} Konten</small></div>
    <p class="acct-msg" role="alert" hidden></p>
  </div>`;
}
function acctEdClick(e, draft){
  const ed = e.target.closest('[data-acct-ed]');
  if (!ed) return false;
  const p = ed.dataset.acctEd, add = e.target.closest('[data-acct-add]'), del = e.target.closest('[data-acct-del]'), col = e.target.closest('[data-acct-color]');
  if (!add && !del && !col) return false;
  readNames(draft, p);
  const list = draft.accounts;
  let fresh = null, focus = null;
  if (add) {
    if (list.length >= MAX_ACCTS) return true;
    fresh = newAcctId();
    list.push({id: fresh, name: '', color: freeColor(list)});
    focus = '#' + p + '-acc-' + (list.length - 1);
  } else if (del) {
    const id = del.dataset.acctDel, i = list.findIndex(a => a.id === id);
    if (i < 0 || list.length < 2) return true;
    const n = S.trades.filter(t => acctOf(t) === id).length;
    if (n) {
      const m = $('.acct-msg', ed);
      m.textContent = '„' + (list[i].name || 'Dieses Konto') + '“ hat ' + n + (n === 1 ? ' Trade' : ' Trades') + '. Ordne ' + (n === 1 ? 'ihn' : 'sie') + ' zuerst einem anderen Konto zu oder lösche ' + (n === 1 ? 'ihn' : 'sie') + ', dann kannst du das Konto entfernen.';
      m.hidden = false;
      return true;
    }
    list.splice(i, 1);
    focus = list.length < MAX_ACCTS ? '[data-acct-add]' : '#' + p + '-acc-' + Math.max(0, i - 1);
  } else {
    const a = list.find(x => x.id === col.dataset.acctColor);
    if (!a) return true;
    a.color = freeColor(list.filter(x => x !== a), a.color);
    col.dataset.c = a.color; col.style.setProperty('--ac', 'var(--ac-' + a.color + ')');
    return true;
  }
  const box = document.createElement('div');
  box.innerHTML = acctEditor(list, p, fresh);
  ed.replaceWith(box.firstElementChild);
  const f = focus && document.querySelector('[data-acct-ed="' + p + '"] ' + focus);
  if (f) { try { f.focus({preventScroll: false}); } catch (err) {} }
  return true;
}
function pickerClick(e, draft){
  if (!draft) return false;
  const sk = e.target.closest('[data-skin-pick]');
  if (sk) { draft.theme = sk.dataset.skinPick; $$('[data-skin-pick]', sk.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === sk))); applySkin(draft.theme); return true; }
  const md = e.target.closest('[data-mod]');
  if (md) { const k = md.dataset.mod; draft.modules[k] = draft.modules[k] === false; md.setAttribute('aria-checked', String(draft.modules[k])); return true; }
  return acctEdClick(e, draft);
}
function pruneAccts(draft){
  const keep = draft.accounts.filter(a => a.name || S.trades.some(t => acctOf(t) === a.id));
  draft.accounts = keep.length ? keep : draft.accounts.slice(0, 1);
}
function readNames(draft, p){
  $$('[data-acct-ed="' + p + '"] [data-acct-name]').forEach(el => {
    const a = draft.accounts.find(x => x.id === el.dataset.acctName);
    if (a) a.name = el.value.trim().slice(0, 24);
  });
}

const Setup = {
  el: null, step: 0, draft: null, isOpen: false, dismissed: false, busy: false, failed: false, N: 4,
  init(){
    this.el = $('#setup');
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-su]');
      if (b) { const a = b.dataset.su; if (a === 'next') this.next(); else if (a === 'back') this.go(this.step - 1); else if (a === 'skip') this.finish(true); return; }
      pickerClick(e, this.draft);
    });
    this.el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      // Enter in the last account name adds the next account instead of finishing the wizard
      const ed = e.target.closest('[data-acct-ed]'), rows = ed ? $$('[data-acct-name]', ed) : [];
      if (ed && e.target === rows[rows.length - 1] && e.target.value.trim() && rows.length < MAX_ACCTS) { const b = $('[data-acct-add]', ed); if (b) { b.click(); return; } }
      this.next();
    });
  },
  maybe(){ if (S.settingsLoaded && !S.settings.setupDone && !this.isOpen && !this.dismissed) this.start(); else if (S.settingsLoaded && S.settings.setupDone) Tour.maybe(); },
  start(){
    this.draft = JSON.parse(JSON.stringify(S.settings));
    this.isOpen = true; this.step = 0; this.failed = false;
    if (Tour.on) Tour.end();
    if (Modal.cur) Modal.close();
    this.el.classList.remove('out'); this.el.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    this.render(1);
  },
  collect(){
    const n = document.getElementById('su-name');
    if (n) this.draft.name = n.value.trim().slice(0, 30);
    readNames(this.draft, 'su');
  },
  go(i){ if (i < 0 || i >= this.N) return; this.collect(); const dir = i < this.step ? -1 : 1; this.step = i; this.render(dir); },
  next(){ if (this.step < this.N - 1) this.go(this.step + 1); else this.finish(false); },
  render(dir){
    const d = this.draft, i = this.step;
    $('#su-count').textContent = 'Schritt ' + (i + 1) + ' von ' + this.N;
    $('#su-bar').style.width = ((i + 1) / this.N * 100) + '%';
    $('#su-back').hidden = i === 0;
    $('#su-skip').hidden = i === this.N - 1;
    $('#su-next').innerHTML = i === this.N - 1 ? 'Journal starten' : 'Weiter' + ICON.next;
    $('#su-err').hidden = true;
    const steps = [
      () => `<div class="su-h"><span class="eyebrow gold">Willkommen bei Blotter</span><h2 id="su-title">Richte dein Trading Journal in vier kurzen Schritten ein.</h2><p>Name, Farbschema, Seiten und Konten. Alles lässt sich später in den Einstellungen ändern.</p></div>
        <label class="fld" for="su-name"><span class="lbl">Wie dürfen wir dich nennen?<span class="opt">optional</span></span><input class="inp big-inp" id="su-name" maxlength="30" autocomplete="given-name" placeholder="Dein Vorname" value="${esc(d.name)}"></label>`,
      () => `<div class="su-h"><span class="eyebrow gold">Farbschema</span><h2 id="su-title">Wähle deinen Look.</h2><p>Deine Auswahl gilt sofort für das ganze Journal im Hintergrund.</p></div>${skinGrid(d.theme)}`,
      () => `<div class="su-h"><span class="eyebrow gold">Seiten</span><h2 id="su-title">Was soll dein Journal können?</h2><p>Der Kalender ist immer dabei. Learnings und Outlooks nimmst du dazu oder lässt sie weg.</p></div>${modGrid(d.modules)}`,
      () => `<div class="su-h"><span class="eyebrow gold">Konten</span><h2 id="su-title">Welche Konten tradest du?</h2><p>Leg so viele an, wie du brauchst, zum Beispiel deinen Broker und deine Prop-Firm-Challenges. Mit einem Klick auf das Farbfeld wählst du die Farbe, an der du das Konto im Kalender erkennst.</p></div>${acctEditor(d.accounts, 'su')}`
    ];
    $('#su-body').innerHTML = `<div class="su-step${dir < 0 ? ' back' : ''}">${steps[i]()}</div>`;
    $('#su-body').scrollTop = 0;
    const f = $('#su-body input') || $('#su-body [aria-checked="true"]:not(.locked)') || $('#su-next');
    if (f) { try { f.focus({preventScroll: true}); } catch (e) {} }
    $('.su-card').scrollTop = 0;
  },
  async finish(skip){
    if (this.busy) return;
    this.collect();
    pruneAccts(this.draft);
    this.busy = true;
    const btn = $('#su-next'); btn.disabled = true;
    const prev = S.settings;
    S.settings = normSettings(Object.assign({}, this.draft, {setupDone: true}));
    try { await Store.saveSettings(); }
    catch (err) {
      this.busy = false; btn.disabled = false;
      if (!this.failed) {
        this.failed = true; S.settings = prev;
        const er = $('#su-err'); er.textContent = errText(err) + ' Klicke nochmal, um ohne Speichern weiterzumachen.'; er.hidden = false;
        return;
      }
    }
    this.busy = false; btn.disabled = false;
    this.close();
    applySettings();
    if (!S.settings.tourDone) Tour.maybe(650);
    else toast(skip ? 'Du kannst alles jederzeit in den Einstellungen anpassen.' : (S.settings.name ? 'Willkommen, ' + S.settings.name + '. Dein Journal ist bereit.' : 'Dein Journal ist bereit.'));
  },
  close(){
    this.isOpen = false; this.dismissed = true;
    this.el.classList.add('out');
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!this.isOpen) { this.el.hidden = true; this.el.classList.remove('out'); $('#su-body').innerHTML = ''; } }, 450);
  }
};

/* ---------- guided tour: once after the setup, restart from the settings ---------- */
const Tour = {
  on: false, i: 0, steps: [], dismissed: false, raf: 0, until: 0, timer: 0, stepAt: 0, startView: null, prevFocus: null,
  init(){
    this.el = $('#tour'); this.hole = $('#tour-hole'); this.card = $('#tour-card');
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-tour]');
      if (!b) return;
      const a = b.dataset.tour;
      if (a === 'next') this.next(); else if (a === 'back') this.go(this.i - 1); else this.end();
    });
    const kick = () => { if (this.on) { this.foot(); this.follow(260); } };
    addEventListener('resize', kick);
    addEventListener('scroll', kick, {passive: true});
  },
  // first visit: after the setup, or when an existing journal has never seen the tour
  maybe(delay){
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.on || this.dismissed || !S.settingsLoaded || !S.settings.setupDone || S.settings.tourDone) return;
      if (Setup.isOpen || Modal.cur || LB.isOpen() || Loader.active || document.hidden) { this.maybe(1200); return; }
      this.start();
    }, delay == null ? 1400 : delay);
  },
  build(){
    const L = modOn('learnings'), O = modOn('outlooks');
    const touch = matchMedia('(hover: none)').matches;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const wide = matchMedia('(min-width: 761px) and (hover: hover)').matches;
    const phone = matchMedia('(max-width: 760px)').matches;
    const nm = S.settings.name;
    const pages = ['Kalender'].concat(L ? ['Learnings'] : [], O ? ['Outlooks'] : []);
    const list = pages.length > 2 ? pages.slice(0, -1).join(', ') + ' und ' + pages[pages.length - 1] : pages.join(' und ');
    const shots = touch ? 'Screenshots wählst du direkt aus deinen Fotos.' : 'Screenshots ziehst du einfach ins Formular oder fügst sie mit ' + (mac ? '⌘V' : 'Strg+V') + ' ein.';
    const keys = ['N trägt etwas Neues ein', '← und → wechseln den Monat', 'T springt zu heute'].concat(pages.length > 1 ? [pages.map((p, k) => k + 1).join(', ') + ' öffnen die Seiten'] : []);
    const hasTrades = S.trades.length > 0;
    return [
      {center: true, eyebrow: 'Kurze Tour · 1 Minute', t: nm ? 'Willkommen, ' + nm + '.' : 'Willkommen bei Blotter.', x: 'In einer Minute siehst du, wo alles ist und wie du das Meiste aus deinem Journal holst.', next: 'Tour starten'},
      pages.length > 1 && {sel: '#topbar .tabs', t: 'Deine Bereiche', x: 'Oben wechselst du zwischen ' + list + '.'},
      {view: 'kalender', sel: '#equity', t: 'Deine Bilanz', x: 'Win-Rate, die Verteilung von TP, BE und SL und dein Trade-Tape für den gewählten Monat. Alles rechnet sich von selbst.'},
      {view: 'kalender', sel: '.cal-head', t: 'Monat und Konten', x: 'Mit den Pfeilen blätterst du durch die Monate, „Heute“ bringt dich zurück. Mit dem Konto-Filter siehst du nur die Trades eines Kontos.'},
      {view: 'kalender', sel: '.cal-head [data-action="new-trade"]', t: 'Trade eintragen', x: 'Konto, Instrument, Long oder Short, Ergebnis (TP, BE oder SL), Setup und Notizen. ' + shots},
      {view: 'kalender', sel: '.stats', t: 'Der Monat in Zahlen', x: 'Anzahl der Trades, Take Profits, Stop Losses und Break Evens mit ihrem Anteil, dazu deine beste TP-Serie.'},
      {view: 'kalender', sel: '.cal-wrap', t: 'Dein Kalender', x: 'Jeder Tag zeigt seine Trades nach Ergebnis: grün für TP, grau für BE, rot für SL. Wähl einen Tag, um seine Einträge zu sehen oder für ihn etwas einzutragen.' + (phone ? ' Darunter siehst du jede Woche zusammengefasst.' : '')},
      L && {view: 'learnings', sel: '#view .page-head', also: '#view .toolbar', t: 'Learnings', x: 'Schreib auf, was du aus deinen Trades gelernt hast, mit Kategorie und Screenshots. Über Suche und Kategorien findest du alles schnell wieder.'},
      O && {view: 'outlooks', sel: '#view .page-head', also: '#view .toolbar', t: 'Outlooks', x: 'Plane vor der Session: HTF und LTF jeweils bullish oder bearish, dazu dein Szenario. Danach markierst du, ob es eingetreten ist, und siehst deine Trefferquote.'},
      {view: 'kalender', sel: '#topbar [data-action="open-settings"]', pad: 6, t: 'Einstellungen', x: 'Name, Farbschema, Seiten und Konten' + (window.BlotterBackend ? ' sowie dein Abo' : '') + ' verwaltest du hier. Dort kannst du diese Tour auch jederzeit neu starten.'},
      wide && {view: 'kalender', sel: '.foot .keys', t: 'Tastenkürzel', x: keys.join(', ') + '.'},
      {center: true, view: 'kalender', eyebrow: 'Los geht’s', t: hasTrades ? 'Alles klar. Viel Erfolg beim Traden.' : 'Bereit für deinen ersten Trade?', x: (Store.db ? 'Alles speichert sich automatisch und ist auf all deinen Geräten da. ' : '') + (hasTrades ? 'Trag deinen nächsten Trade ein, solange alles frisch ist.' : 'Trag ihn gleich ein, solange alles frisch ist.'), next: hasTrades ? 'Trade eintragen' : 'Ersten Trade eintragen', alt: 'Fertig', cta: () => openForm('trades', null, {})},
    ].filter(Boolean);
  },
  start(){
    clearTimeout(this.timer);
    if (Modal.cur) Modal.close();
    if (LB.isOpen()) LB.close();
    this.steps = this.build(); this.on = true; this.dismissed = false; this.startView = S.view;
    this.prevFocus = document.activeElement;
    this.el.classList.remove('out'); this.el.hidden = false;
    document.documentElement.classList.add('touring');
    this.show(0);
  },
  next(){
    if (!this.on) return;
    const s = this.steps[this.i];
    if (this.i >= this.steps.length - 1) { this.end(true); if (s.cta) setTimeout(s.cta, 120); return; }
    this.go(this.i + 1);
  },
  go(i){ if (this.on && i >= 0 && i < this.steps.length && i !== this.i) this.show(i); },
  show(i){
    const first = !this.el.dataset.shown;
    this.el.dataset.shown = '1';
    this.i = i; this.stepAt = performance.now();
    const s = this.steps[i], n = this.steps.length, c = this.card;
    c.classList.add('swap');
    setTimeout(() => {
      if (!this.on || this.i !== i) return;
      if (s.view && s.view !== S.view && modOn(s.view)) { goView(s.view); try { history.replaceState(null, '', '#' + s.view); } catch (e) {} }
      $('#tour-n').textContent = s.eyebrow || 'Schritt ' + i + ' von ' + (n - 2);
      $('#tour-t').textContent = s.t;
      $('#tour-d').textContent = s.x;
      $('#tour-bar').style.width = (i / (n - 1) * 100) + '%';
      this.foot();
      $('#tour-skip').textContent = i === n - 1 ? (s.alt || 'Fertig') : 'Überspringen';
      $('#tour-next').innerHTML = s.next ? esc(s.next) : 'Weiter' + ICON.next;
      c.classList.toggle('center', !!s.center);
      this.reveal(s);
      this.place();
      c.classList.remove('swap');
      try { $('#tour-next').focus({preventScroll: true}); } catch (e) {}
      this.follow(1600);
    }, first ? 0 : 170);
  },
  // narrow phones: the corner × ends the tour, so the middle steps only show Zurück / Weiter
  foot(){
    const n = this.steps.length, i = this.i, narrow = innerWidth < 420;
    $('#tour-back').hidden = i === 0 || (narrow && i === n - 1);
    $('#tour-skip').hidden = narrow && i > 0 && i < n - 1;
  },
  els(s){ return [s.sel, s.also].filter(Boolean).map(q => $(q)).filter(el => el && el.getClientRects().length); },
  rect(s){
    const els = this.els(s);
    if (!els.length) return null;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const el of els) { const q = el.getBoundingClientRect(); l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
    return {left: l, top: t, right: r, bottom: b, width: r - l, height: b - t};
  },
  docked(){ return innerWidth < 640; },
  topSafe(){ const tb = $('#topbar'); return (tb ? Math.max(0, tb.getBoundingClientRect().bottom) : 0) + 14; },
  // scroll the highlighted part into view, leaving room for the card
  reveal(s){
    if (s.center) return;
    const els = this.els(s);
    if (!els.length || els.every(el => el.closest('#topbar'))) return;
    const r = this.rect(s), ch = this.card.offsetHeight + 28;
    const top = this.topSafe(), bottom = innerHeight - (this.docked() ? ch : 16);
    const avail = bottom - top, need = this.docked() ? r.height : r.height + ch;
    let y;
    if (need <= avail) y = r.top - top - (avail - need) / 2;
    else if (r.height <= avail) y = r.top - top - (avail - r.height) / 2;
    else y = r.top - top;
    if (Math.abs(y) < 4) return;
    // jump (the page is dimmed anyway); the spotlight glides to its new place
    scrollTo(0, Math.max(0, Math.min(scrollY + y, document.documentElement.scrollHeight - innerHeight)));
  },
  place(){
    const s = this.steps[this.i];
    if (!s || !this.on) return;
    const W = innerWidth, H = innerHeight, c = this.card, h = this.hole;
    const docked = this.docked();
    this.el.classList.toggle('docked', docked);
    h.classList.toggle('snap', performance.now() - this.stepAt > 700);
    const r = s.center ? null : this.rect(s);
    let box = null;
    if (r) {
      const p = s.pad != null ? s.pad : 8;
      const l = Math.max(4, r.left - p), t = Math.max(4, r.top - p);
      box = {l, t, w: Math.max(0, Math.min(W - 4, r.right + p) - l), h: Math.max(0, Math.min(H - 4, r.bottom + p) - t)};
    }
    if (box && box.w > 0 && box.h > 0) {
      h.classList.remove('none');
      const el = this.els(s)[0];
      const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8;
      h.style.transform = `translate(${box.l}px,${box.t}px)`;
      h.style.width = box.w + 'px'; h.style.height = box.h + 'px';
      h.style.borderRadius = Math.min(28, rad + (s.pad != null ? s.pad : 8)) + 'px';
    } else {
      h.classList.add('none');
      h.style.transform = `translate(${W / 2}px,${H / 2}px)`; h.style.width = '0px'; h.style.height = '0px';
    }
    if (docked && !s.center) { c.style.transform = ''; return; }
    const cw = c.offsetWidth, chh = c.offsetHeight, gap = 14, m = 12;
    let x = null, y;
    if (!box || s.center) { x = (W - cw) / 2; y = (H - chh) / 2; }
    else if (box.t + box.h + gap + chh <= H - m) y = box.t + box.h + gap;
    else if (box.t - gap - chh >= m) y = box.t - gap - chh;
    else if (box.l + box.w + gap + cw <= W - m) { x = box.l + box.w + gap; y = Math.min(Math.max(m, box.t), H - chh - m); }
    else if (box.l - gap - cw >= m) { x = box.l - gap - cw; y = Math.min(Math.max(m, box.t), H - chh - m); }
    else y = H - chh - m;
    if (x == null) x = box.l + box.w / 2 - cw / 2;
    x = Math.min(Math.max(m, x), W - cw - m);
    y = Math.max(m, y);
    c.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  },
  // keep the spotlight on its target while the page scrolls or elements animate in
  follow(ms){
    this.until = Math.max(this.until, performance.now() + ms);
    if (this.raf) return;
    const f = () => {
      if (!this.on) { this.raf = 0; return; }
      this.place();
      this.raf = performance.now() < this.until ? requestAnimationFrame(f) : 0;
    };
    this.raf = requestAnimationFrame(f);
  },
  end(){
    if (!this.on) return;
    this.on = false; this.dismissed = true; clearTimeout(this.timer);
    document.documentElement.classList.remove('touring');
    this.el.classList.add('out');
    setTimeout(() => { if (!this.on) { this.el.hidden = true; this.el.classList.remove('out'); delete this.el.dataset.shown; this.hole.classList.add('none'); } }, 300);
    const back = modOn(this.startView) ? this.startView : 'kalender';
    if (S.view !== back) { goView(back); try { history.replaceState(null, '', '#' + back); } catch (e) {} }
    else { try { scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}); } catch (e) { scrollTo(0, 0); } }
    if (!S.settings.tourDone) {
      S.settings = normSettings(Object.assign({}, S.settings, {tourDone: true}));
      Store.saveSettings().catch(() => {});
    }
    const pf = this.prevFocus; this.prevFocus = null;
    if (pf && pf !== document.body && document.contains(pf)) { try { pf.focus({preventScroll: true}); } catch (e) {} }
  }
};

function openSettings(){
  const draft = JSON.parse(JSON.stringify(S.settings));
  let saved = false;
  const builder = () => `
    <div class="p-head"><div class="ph-t"><h2 id="modal-title">Einstellungen</h2></div>
      <button type="button" class="btn icon ghost" data-action="close-modal" aria-label="Schließen">${ICON.x}</button></div>
    <div class="p-body">
      <section class="set-sec"><h3>Dein Name</h3><input class="inp" id="set-name" maxlength="30" autocomplete="given-name" placeholder="Dein Vorname" value="${esc(draft.name)}"></section>
      <section class="set-sec"><h3>Farbschema</h3>${skinGrid(draft.theme)}</section>
      <section class="set-sec"><h3>Seiten</h3>${modGrid(draft.modules)}</section>
      <section class="set-sec"><h3>Konten</h3>${acctEditor(draft.accounts, 'set')}</section>
      ${window.BlotterBackend ? `<section class="set-sec"><h3>Konto &amp; Abo</h3><p class="acct-mail">Angemeldet als <b>${esc(window.BlotterBackend.email || '')}</b></p><div class="acct-btns"><button type="button" class="btn" data-action="acct-portal">Abo verwalten oder kündigen</button><button type="button" class="btn ghost" data-action="acct-logout">Abmelden</button></div></section>` : ''}
      <section class="set-sec"><h3>Hilfe</h3><p class="set-help">Die kurze Tour zeigt dir noch einmal alle Bereiche deines Journals.</p><div><button type="button" class="btn sm" data-action="set-tour">Tour starten</button></div></section>
      <p class="form-err" id="form-err" role="alert" hidden></p>
    </div>
    <div class="p-foot">
      <button type="button" class="btn ghost sm" data-action="set-wizard">Einrichtung neu starten</button>
      <span class="spacer"></span>
      <button type="button" class="btn" data-action="set-cancel">Abbrechen</button>
      <button type="button" class="btn primary" data-action="set-save">Speichern</button>
    </div>`;
  Modal.show(builder, {
    focus: '#set-name',
    onMount(p){
      p.addEventListener('input', () => { if (Modal.cur) Modal.cur.dirty = true; });
      p.addEventListener('click', async e => {
        if (pickerClick(e, draft)) { if (Modal.cur) Modal.cur.dirty = true; return; }
        const a = e.target.closest('[data-action]');
        if (!a) return;
        const act = a.dataset.action;
        if (act === 'set-cancel') { if (Modal.cur) Modal.cur.dirty = false; Modal.close(); }
        else if (act === 'acct-portal' || act === 'acct-logout') {
          a.disabled = true;
          try { if (act === 'acct-portal') await window.BlotterBackend.portal(); else await window.BlotterBackend.logout(); }
          catch (err) { a.disabled = false; const er = $('#form-err', p); er.textContent = errText(err); er.hidden = false; }
        }
        else if (act === 'set-wizard') { if (Modal.cur) Modal.cur.dirty = false; Modal.close(); Setup.dismissed = false; Setup.start(); }
        else if (act === 'set-tour') { if (Modal.cur) Modal.cur.dirty = false; Modal.close(); setTimeout(() => Tour.start(), 260); }
        else if (act === 'set-save') {
          draft.name = ($('#set-name', p).value || '').trim().slice(0, 30);
          readNames(draft, 'set');
          pruneAccts(draft);
          const prev = S.settings;
          S.settings = normSettings(Object.assign({}, draft, {setupDone: true}));
          a.disabled = true;
          try {
            await Store.saveSettings();
            saved = true;
            if (Modal.cur) Modal.cur.dirty = false;
            Modal.close(); applySettings(); toast('Einstellungen gespeichert');
          } catch (err) {
            S.settings = prev; a.disabled = false;
            const er = $('#form-err', p); er.textContent = errText(err); er.hidden = false;
          }
        }
      });
    },
    cleanup(){ if (!saved) applySkin(S.settings.theme); }
  });
}

/* ---------- shortcuts & pointer glow ---------- */
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  if (Modal.cur || LB.isOpen() || Loader.active || Setup.isOpen || Tour.on) return;
  const tg = e.target;
  if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
  const k = (e.key || '').toLowerCase();
  const pi = ['1', '2', '3'].indexOf(k), pg = pagesOn();
  if (pi >= 0) { if (!pg[pi]) return; location.hash = pg[pi]; }
  else if (k === 'n') openForm(S.view === 'kalender' ? 'trades' : S.view, null, {});
  else if (S.view === 'kalender' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + (e.key === 'ArrowLeft' ? -1 : 1), 1); schedule(); }
  else if (S.view === 'kalender' && k === 't') { const n = new Date(); S.month = new Date(n.getFullYear(), n.getMonth(), 1); schedule(); }
  else return;
  e.preventDefault();
});
try {
  if (!reduce && matchMedia('(hover: hover)').matches) {
    // the glow is its own small layer that only gets moved, so nothing else on the card is restyled or repainted
    let spEl = null, spX = 0, spY = 0, spQ = 0;
    const spotFx = () => {
      spQ = 0;
      const el = spEl;
      if (!el || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      let g = el._glow;
      if (!g || !g.isConnected || g.parentNode.parentNode !== el) {
        const wrap = document.createElement('span'); wrap.className = 'spot-fx'; wrap.setAttribute('aria-hidden', 'true');
        g = document.createElement('i'); wrap.appendChild(g); el.insertBefore(wrap, el.firstChild); el._glow = g;
      }
      g.style.transform = 'translate3d(' + (spX - r.left - 380).toFixed(0) + 'px,' + (spY - r.top - 380).toFixed(0) + 'px,0)';
    };
    document.addEventListener('pointermove', e => {
      const el = e.target && e.target.closest ? e.target.closest('.spot') : null;
      if (!el) return;
      spEl = el; spX = e.clientX; spY = e.clientY;
      if (!spQ) spQ = requestAnimationFrame(spotFx);
    }, {passive: true});
  }
} catch (e) {}
addEventListener('resize', moveTabInd);
try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveTabInd); } catch (e) {}

/* ---------- events ---------- */
function findById(kind, id){ return S[kind].find(x => x.id === id); }

document.addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'lightbox') { LB.close(); return; }
  const lb = t.closest('[data-lb]');
  if (lb) {
    const box = lb.closest('.shots, .thumbs');
    const srcs = box ? $$('img', box).map(i => i.getAttribute('src')).filter(Boolean) : [];
    LB.open(srcs, Math.min(+lb.dataset.lb || 0, Math.max(0, srcs.length - 1)));
    return;
  }
  const day = t.closest('[data-day]');
  if (day) { openDay(day.dataset.day); return; }
  const ac = t.closest('[data-acct]');
  if (ac) { S.acct = ac.dataset.acct; lsSet('blotter.acct', S.acct); schedule(); return; }
  const lc = t.closest('[data-lcat]');
  if (lc) { S.lcat = lc.dataset.lcat; schedule(); return; }
  const ob = t.closest('[data-obias]');
  if (ob) { S.obias = ob.dataset.obias; schedule(); return; }
  const a = t.closest('[data-action]');
  if (!a) return;
  const act = a.dataset.action, fromDay = a.dataset.fromDay || null;
  switch (act) {
    case 'prev-month': S.month = new Date(S.month.getFullYear(), S.month.getMonth() - 1, 1); schedule(); break;
    case 'next-month': S.month = new Date(S.month.getFullYear(), S.month.getMonth() + 1, 1); schedule(); break;
    case 'this-month': { const n = new Date(); S.month = new Date(n.getFullYear(), n.getMonth(), 1); schedule(); break; }
    case 'new-trade': openForm('trades', null, {date: a.dataset.date, fromDay}); break;
    case 'new-learning': openForm('learnings', null, {date: a.dataset.date, fromDay}); break;
    case 'new-outlook': openForm('outlooks', null, {date: a.dataset.date, fromDay}); break;
    case 'edit-trade': { const x = findById('trades', a.dataset.id); if (x) openForm('trades', x, {fromDay}); break; }
    case 'edit-learning': { const x = findById('learnings', a.dataset.id); if (x) openForm('learnings', x, {fromDay}); break; }
    case 'edit-outlook': { const x = findById('outlooks', a.dataset.id); if (x) openForm('outlooks', x, {fromDay}); break; }
    case 'close-modal': Modal.tryClose(); break;
    case 'open-settings': openSettings(); break;
    case 'lb-close': LB.close(); break;
    case 'lb-prev': LB.step(-1); break;
    case 'lb-next': LB.step(1); break;
  }
});

/* keep keyboard focus inside the open dialog, lightbox or setup */
function trapTab(e){
  const root = Tour.on ? $('#tour-card') : LB.isOpen() ? $('#lightbox') : Modal.cur ? $('#panel') : Setup.isOpen ? $('#setup .su-card') : null;
  if (!root) return false;
  const f = $$('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])', root)
    .filter(el => !el.hidden && !el.closest('[hidden]') && el.getClientRects().length);
  if (!f.length) { e.preventDefault(); return true; }
  const first = f[0], last = f[f.length - 1], a = document.activeElement, inside = root.contains(a);
  if (e.shiftKey ? (!inside || a === first) : (!inside || a === last)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return true; }
  return false;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && trapTab(e)) return;
  if (Tour.on) {
    if (e.key === 'Escape') { e.preventDefault(); Tour.end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); Tour.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); Tour.go(Tour.i - 1); }
    return;
  }
  if (Loader.active && e.key === 'Escape') { e.preventDefault(); Loader.skipNow(); return; }
  if (LB.isOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); LB.close(); }
    else if (e.key === 'ArrowLeft') LB.step(-1);
    else if (e.key === 'ArrowRight') LB.step(1);
    return;
  }
  if (e.key === 'Escape' && Modal.cur) { e.preventDefault(); Modal.tryClose(); }
});

document.addEventListener('error', e => { const el = e.target; if (el && el.tagName === 'IMG') el.classList.add('broken'); }, true);

document.addEventListener('input', e => {
  if (e.target.id === 'l-search') { S.lq = e.target.value; Views.learnings.update(); Reveal.scan($('#view')); onScroll(); }
  else if (e.target.id === 'o-search') { S.oq = e.target.value; Views.outlooks.update(); Reveal.scan($('#view')); onScroll(); }
});


addEventListener('scroll', onScroll, {passive: true});
addEventListener('resize', onScroll);

const hashView = () => { const h = (location.hash || '').replace('#', ''); return Views[h] && modOn(h) ? h : 'kalender'; };
function readHash(){ S.view = hashView(); }
function goView(next){
  if (Modal.cur && !Modal.cur.dirty) Modal.close();
  S.view = next;
  window.scrollTo(0, 0);
  render();
}
window.addEventListener('hashchange', () => {
  const next = hashView();
  if (next === S.view && !ViewFx.busy) return;
  if (S.mounted == null) { goView(next); return; }
  ViewFx.go(next);
});

readHash();
Reveal.init();
Loader.init();
Setup.init();
Tour.init();
Origin.init();
Tilt.init();
CubeSwipe.init();
BG.init();
render();
Store.init();
})();
