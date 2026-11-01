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
  acct: ['all','main','neben'].includes(lsGet('blotter.acct')) ? lsGet('blotter.acct') : 'all',
  lastAccount: lsGet('blotter.lastAccount') === 'neben' ? 'neben' : 'main',
  trades: [], learnings: [], outlooks: [],
  settings: {theme: 'navy', name: '', modules: {learnings: true, outlooks: true}, acctNames: {main: 'Main-Konto', neben: 'Neben-Konto'}, setupDone: false},
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

/* ---------- motion: background chart ---------- */
const BG = {
  c: null, x: null, w: 0, h: 0, dpr: 1, gap: 17, headX: 0, cs: [], live: null, period: 1600, born: 0,
  min: null, max: null, scrollY: 0, t0: 0, last: 0, raf: 0, glow: 0, P: null,
  pal(){
    const cs = getComputedStyle(document.documentElement), g = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    this.P = {acc: g('--acc-rgb', '217,180,80'), hi: g('--acc-hi-rgb', '246,226,160'), fg: g('--fg-rgb', '255,255,255'), bg: g('--bg-rgb', '6,15,39'), light: g('--is-light', '0') === '1'};
    return this.P;
  },
  init(){
    this.c = $('#bg'); this.x = this.c && this.c.getContext && this.c.getContext('2d');
    if (!this.x) return;
    this.t0 = performance.now(); this.born = this.t0;
    this.resize();
    addEventListener('resize', () => { this.resize(); if (reduce) this.draw(performance.now() + 9999); });
    if (reduce) { this.draw(this.t0 + 9999); return; }
    this.tick = this.tick.bind(this);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); });
    this.start();
  },
  gen(o){
    const vol = 1.7, drift = 0.42;
    const c = o + drift + (Math.random() - 0.44) * vol * 2.3;
    return {o, c, h: Math.max(o, c) + Math.random() * vol * 0.9, l: Math.min(o, c) - Math.random() * vol * 0.9};
  },
  resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    const narrow = this.w < 640;
    this.gap = narrow ? 13 : 17;
    this.headX = this.w * (narrow ? 0.93 : 0.86);
    const need = Math.ceil(this.headX / this.gap) + 12;
    if (this.cs.length < need) {
      this.cs = []; let p = 100;
      for (let i = 0; i < need; i++) { const k = this.gen(p); this.cs.push(k); p = k.c; }
      this.newLive(performance.now());
    } else if (this.cs.length > need + 20) this.cs = this.cs.slice(-need);
    this.min = this.max = null;
  },
  newLive(now){
    const o = this.cs.length ? this.cs[this.cs.length - 1].c : 100;
    const t = this.gen(o);
    this.live = {o, c: o, h: o, l: o, tc: t.c, th: t.h, tl: t.l};
    this.born = now;
  },
  start(){ if (!this.raf) this.raf = requestAnimationFrame(this.tick); },
  tick(now){
    if (document.hidden) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(this.tick);
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
    this.draw(now, f);
  },
  draw(now, f){
    const x = this.x, w = this.w, h = this.h, gap = this.gap;
    f = f || 0;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    const par = -Math.min(this.scrollY * 0.16, h * 0.24);
    const off = f * gap;
    // grid
    const p = this.P || this.pal(), rg = (c, al) => 'rgba(' + c + ',' + al + ')';
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
    const intro = reduce ? 1 : Math.min(1, (now - this.t0) / 2000);
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
      for (const p of pts) x.lineTo(p[0], p[1]);
      x.lineTo(pts[pts.length - 1][0], bot); x.closePath(); x.fillStyle = grad; x.fill();
      x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
      x.lineWidth = 2.2; x.strokeStyle = rg(p.light ? p.acc : p.hi, 0.85);
      x.shadowColor = rg(p.acc, 0.9); x.shadowBlur = 14 + this.glow * 26;
      x.stroke(); x.shadowBlur = 0;
    }
    // live price marker
    if (intro >= 1) {
      const lx = xs(n - 1), ly = Y(this.live.c);
      x.setLineDash([4, 6]); x.lineWidth = 1; x.strokeStyle = rg(p.acc, 0.5);
      x.beginPath(); x.moveTo(lx + 6, Math.round(ly) + .5); x.lineTo(w, Math.round(ly) + .5); x.stroke(); x.setLineDash([]);
      const ph = reduce ? 0.3 : (now % 1800) / 1800;
      x.beginPath(); x.arc(lx, ly, 4 + ph * 16, 0, Math.PI * 2); x.strokeStyle = rg(p.acc, (0.7 * (1 - ph)).toFixed(3)); x.lineWidth = 1.5; x.stroke();
      x.beginPath(); x.arc(lx, ly, 3.6, 0, Math.PI * 2); x.fillStyle = rg(p.light ? p.acc : p.hi, 1); x.shadowColor = rg(p.acc, 1); x.shadowBlur = 16; x.fill(); x.shadowBlur = 0;
    }
    // readability veil on the content side
    const veil = x.createLinearGradient(0, 0, w, 0);
    veil.addColorStop(0, rg(p.bg, 0.62)); veil.addColorStop(0.55, rg(p.bg, 0.25)); veil.addColorStop(1, rg(p.bg, 0));
    x.fillStyle = veil; x.fillRect(0, 0, w, h);
    const vg = x.createLinearGradient(0, h * 0.45, 0, h);
    vg.addColorStop(0, rg(p.bg, 0)); vg.addColorStop(1, rg(p.bg, 0.6));
    x.fillStyle = vg; x.fillRect(0, h * 0.45, w, h * 0.55);
  }
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

/* ---------- motion: mantra ---------- */
const MANTRAS = [
  ['Plan the trade.', 'Trade the plan.'],
  ['Disziplin ist', 'dein Edge.'],
  ['Prozess', 'vor Profit.'],
  ['Konstanz', 'schlägt Glück.'],
  ['Kapital schützen.', 'Chancen nutzen.'],
  ['Geduld wird', 'bezahlt.'],
  ['Verluste klein.', 'Gewinne laufen.'],
  ['Jeder Tag ist', 'ein Datenpunkt.']
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
const LD_NAMES = {kalender: ['Kal', 'ender'], learnings: ['Lear', 'nings'], outlooks: ['Out', 'looks']};
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const Loader = {
  on: !reduce, active: false, swapped: false, hitDone: false, target: null, pending: null, raf: 0, t0: 0,
  T: {enter: 240, liveStart: 120, live: 640, swap: 900, exit: 430},
  init(){
    this.el = $('#loader'); this.inner = $('#ld-inner');
    this.body = $('#ld-body'); this.wick = $('#ld-wick'); this.pl = $('#ld-pl'); this.dot = $('#ld-dot');
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
    this.body.setAttribute('y', top.toFixed(1)); this.body.setAttribute('height', h.toFixed(1));
    for (const el of [this.body, this.wick, this.pl, this.dot]) el.classList.toggle('bull', bull);
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
      if (!this.swapped) { this.swapped = true; goView(this.target); }
      const k = Math.min(1, (e - T.swap) / T.exit), ek = easeInOut(k);
      this.el.style.transform = 'translate3d(0,' + (-ek * 100).toFixed(2) + '%,0)';
      this.inner.style.transform = 'translate3d(0,' + (ek * 60).toFixed(1) + 'px,0)';
      this.inner.style.opacity = Math.max(0, 1 - k * 1.4).toFixed(3);
      if (k >= 1) { this.finish(); return; }
    }
    this.raf = requestAnimationFrame(this.tick);
  },
  finish(){
    this.el.hidden = true; this.el.classList.remove('run', 'hit');
    this.active = false;
    const p = this.pending; this.pending = null;
    if (p && p !== S.view) this.play(p); else updateChrome();
  }
};

/* ---------- scroll-linked effects ---------- */
let sq = 0;
function onScroll(){
  if (sq) return;
  sq = requestAnimationFrame(() => {
    sq = 0;
    const y = window.scrollY || 0;
    $('#topbar').classList.toggle('scrolled', y > 6);
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (Math.abs(y - BG.scrollY) > 2) BG.glow = 1;
    BG.scrollY = y;
    if (!reduce) {
      const ht = $('#hero-txt');
      if (ht) { ht.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)'; ht.style.opacity = Math.max(0.12, 1 - y / 560).toFixed(3); }
      const eq = $('#equity');
      if (eq) eq.style.transform = 'translate3d(0,' + (y * 0.06).toFixed(1) + 'px,0)';
      const cv = $('#bg'); if (cv) cv.style.opacity = (1 - Math.min(1, y / 700) * 0.45).toFixed(3);
    }
    const fill = $('.tl-fill');
    if (fill) {
      const feed = fill.closest('.feed'), r = feed.getBoundingClientRect(), mid = innerHeight * 0.62;
      fill.style.transform = 'scaleY(' + Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height))).toFixed(4) + ')';
      feed.querySelectorAll('.tl-item').forEach(it => it.classList.toggle('lit', it.getBoundingClientRect().top + 28 < mid));
    }
  });
}

/* ---------- ui chrome ---------- */
let tT = 0;
function toast(msg, bad){ const el = $('#toast'); el.textContent = msg; el.className = 'toast' + (bad ? ' bad' : ''); el.hidden = true; void el.offsetWidth; el.hidden = false; clearTimeout(tT); tT = setTimeout(() => { el.hidden = true; }, bad ? 5200 : 2600); }
function setBanner(t){ const b = $('#banner'); b.textContent = t || ''; b.hidden = !t; }
function updateChrome(){
  const nav = Loader.active ? Loader.target : S.view;
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
  ind.style.width = a.offsetWidth + 'px';
  ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  ind.style.opacity = '1';
  if (!ind.classList.contains('ready')) requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.add('ready')));
}
let rq = 0;
function schedule(){ if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); }); }
function render(){
  const el = $('#view');
  if (S.mounted !== S.view) { S.mountN++; Views[S.view].mount(el); S.mounted = S.view; S.mountSig = settingsSig(); onScroll(); }
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
  let tp = 0, sl = 0, be = 0, main = 0, neben = 0, run = 0, best = 0;
  const days = new Set();
  for (const t of chrono(list)) {
    const r = resOf(t);
    if (r === 'tp') { tp++; run++; if (run > best) best = run; }
    else if (r === 'sl') { sl++; run = 0; }
    else if (r === 'be') be++;
    if (t.account === 'neben') neben++; else main++;
    if (t.date) days.add(t.date);
  }
  return {n: list.length, tp, sl, be, main, neben, tdays: days.size, best, run, wr: (tp + sl) ? tp / (tp + sl) : null};
}
function tone(c){ if (!c.n) return ''; if (c.tp > c.sl) return 'pos'; if (c.sl > c.tp) return 'neg'; return (c.tp || c.sl || c.be) ? 'flat' : ''; }
const pct = (a, n) => n ? Math.round(a / n * 100) + ' %' : '–';
const byAcct = list => S.acct === 'all' ? list : list.filter(t => (t.account === 'neben' ? 'neben' : 'main') === S.acct);
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
    `<button type="button" class="thumb" data-lb="${i}" aria-label="Screenshot ${i + 1} vergrößern"><img loading="lazy" src="${esc(Store.imgSrc(r))}" alt=""></button>`).join('') + '</div>';
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
          <span class="eyebrow gold" id="hero-date"></span>
          <h1 class="mantra" id="mantra"></h1>
          <p class="hero-sub">Jeder eingetragene Trade macht dich besser. Wähle einen Tag im Kalender und halte fest, was passiert ist.</p>
        </div>
        <div class="equity spot" id="equity" data-rv="${M}:hero-e" style="--rd:180ms">
          <div class="eq-head"><span class="eyebrow gold" id="eq-label">Bilanz</span><span class="eq-n" id="eq-n"></span></div>
          <div class="eq-row"><span class="eq-v gold-t" id="eq-v">–</span><span class="eq-vl">Win-Rate<small>TP ÷ (TP + SL)</small></span></div>
          <div class="ratio" id="ratio" aria-hidden="true"><span class="r tp"></span><span class="r be"></span><span class="r sl"></span></div>
          <div class="ratio-l" id="ratio-l"></div>
          <div class="tape-h"><span class="eyebrow">Trade-Tape</span><span class="tape-hint">ältester → neuester</span></div>
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
          <button type="button" role="radio" data-acct="main">${esc(an('main'))}</button>
          <button type="button" role="radio" data-acct="neben">${esc(an('neben'))}</button>
        </div>
        <button type="button" class="btn primary" data-action="new-trade">${ICON.plus}Trade eintragen</button>
      </div>
      <div class="stats" data-rv="${M}:stats" style="--rd:320ms">
        ${[['n','Trades',''],['tp','Take Profit','tp'],['sl','Stop Loss','sl'],['be','Break Even','be'],['best','Beste Serie','']].map(([k, l, c]) =>
          `<div class="stat"><span class="k">${c ? `<i class="sw ${c}"></i>` : ''}${l}</span><span class="v" id="st-${k}">–</span><span class="s" id="st-${k}-s">&nbsp;</span>${c ? `<span class="meter"><i class="${c}" id="st-${k}-m"></i></span>` : (k === 'best' ? '<span class="streak" id="st-streak"></span>' : '<span class="meter" style="visibility:hidden"></span>')}</div>`).join('')}
      </div>
      <div class="cal-wrap spot" data-rv="${M}:calwrap" style="--rd:420ms"><div class="cal" id="cal"></div></div>
      <div class="weeks" id="weeks"></div>
      <div class="legend" data-rv="${M}:legend">
        <span><span class="pill tp"><b>TP</b></span>Take Profit</span>
        <span><span class="pill be"><b>BE</b></span>Break Even</span>
        <span><span class="pill sl"><b>SL</b></span>Stop Loss</span>
        <span><i class="ad main"></i>${esc(an('main'))}</span>
        <span><i class="ad neben"></i>${esc(an('neben'))}</span>
        ${modOn('outlooks') ? '<span><span class="mk">O</span>Outlook</span>' : ''}
        ${modOn('learnings') ? '<span><span class="mk">L</span>Learning</span>' : ''}
      </div>
      <p class="hint" id="cal-hint" hidden><b>Noch keine Trades.</b> Klick auf einen Tag im Kalender oder auf „Trade eintragen“, um deinen ersten Trade mit Konto, Ergebnis (TP, BE oder SL) und Screenshot festzuhalten.</p>`;
      const n = new Date();
      const hr = n.getHours(), greet = hr < 5 ? 'Gute Nacht' : hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend';
      $('#hero-date').textContent = (S.settings.name ? greet + ', ' + S.settings.name + ' · ' : '') + fLong.format(n) + ' · KW ' + isoWeek(n);
      Mantra.mount($('#mantra'));
      void $('#ratio').offsetWidth;
      this.lastTape = null; this.mountMk = null; this.lastMk = null;
    },
    update(){
      const M = S.mountN;
      const m = S.month, y = m.getFullYear(), mo = m.getMonth(), mk = y + '-' + pad(mo + 1);
      $('#month-title').textContent = fMonth.format(m);
      $$('#acct-filter button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.acct === S.acct)));
      const trades = byAcct(S.trades);
      const monthT = trades.filter(t => (t.date || '').startsWith(mk));
      const s = calc(monthT);
      const ready = S.loaded.trades;
      const int = v => String(Math.round(v));

      // hero balance
      $('#eq-label').textContent = 'Bilanz · ' + fMonth.format(m);
      $('#eq-n').textContent = ready ? s.n + (s.n === 1 ? ' Trade' : ' Trades') : '';
      if (ready) setNum($('#eq-v'), s.wr, v => Math.round(v * 100) + ' %');
      const tot = s.tp + s.be + s.sl;
      const rs = $$('#ratio .r');
      rs[0].style.width = ratioW(s.tp, tot); rs[1].style.width = ratioW(s.be, tot); rs[2].style.width = ratioW(s.sl, tot);
      $('#ratio-l').innerHTML = !ready ? '' : (tot ? countsHtml(s) : 'Noch keine Trades in diesem Monat');
      const tsig = mk + '|' + S.acct + '|' + monthT.map(t => t.id + ':' + resOf(t) + ':' + t.date + (t.time || '')).join(',');
      if (tsig !== this.lastTape) {
        $('#tape').innerHTML = monthT.length ? tapeHtml(monthT) : '<span class="tape-empty">Jeder Trade erscheint hier als farbiger Block.</span>';
        this.lastTape = tsig;
      }
      const streak = calc(trades).run;
      $('#eq-foot').innerHTML = `<span><i class="ad main"></i>${esc(an('main'))} <b>${s.main}</b></span><span><i class="ad neben"></i>${esc(an('neben'))} <b>${s.neben}</b></span><span>Aktuelle Serie <b class="${streak ? 'up' : ''}">${streak ? streak + '× TP' : '–'}</b></span>`;

      // stats
      if (ready) {
        setNum($('#st-n'), s.n, int); $('#st-n-s').textContent = s.tdays + (s.tdays === 1 ? ' Handelstag' : ' Handelstage');
        setNum($('#st-tp'), s.tp, int); $('#st-tp-s').textContent = s.n ? pct(s.tp, s.n) + ' der Trades' : 'noch keine Trades';
        setNum($('#st-sl'), s.sl, int); $('#st-sl-s').textContent = s.n ? pct(s.sl, s.n) + ' der Trades' : 'noch keine Trades';
        setNum($('#st-be'), s.be, int); $('#st-be-s').textContent = s.n ? pct(s.be, s.n) + ' der Trades' : 'noch keine Trades';
        for (const k of ['tp', 'sl', 'be']) $('#st-' + k + '-m').style.width = s.n ? (s[k] / s.n * 100).toFixed(2) + '%' : '0%';
        $('#st-streak').innerHTML = Array.from({length: Math.min(s.best, 12)}, () => '<i></i>').join('');
        setNum($('#st-best'), s.best, v => Math.round(v) + '× TP'); $('#st-best-s').textContent = 'längste TP-Serie im Monat';
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
          const label = fLong.format(d) + (list.length ? ': ' + list.length + (list.length === 1 ? ' Trade' : ' Trades') + ', ' + dc.tp + ' TP, ' + dc.be + ' BE, ' + dc.sl + ' SL' : ': keine Trades');
          const marks = (o ? '<span class="mk" title="Outlook">O</span>' : '') + (l ? '<span class="mk" title="Learning">L</span>' : '');
          const pills = list.slice(0, 4).map(t => {
            const rr = resOf(t) || 'na';
            return `<span class="pill ${rr}" title="${esc((t.symbol || 'Trade') + ' · ' + (RES_NAME[rr] || 'ohne Ergebnis') + ' · ' + an(t.account))}"><i class="ad ${t.account === 'neben' ? 'neben' : 'main'}"></i><b>${RES_LABEL[rr] || '–'}</b>${t.symbol ? `<span class="sym">${esc(t.symbol)}</span>` : ''}</span>`;
          }).join('') + (list.length > 4 ? `<span class="pill more">+${list.length - 4}</span>` : '');
          const dots = list.slice(0, 6).map(t => `<i class="${resOf(t) || 'na'}"></i>`).join('') + (o ? '<i class="ol"></i>' : '') + (l ? '<i class="ol"></i>' : '');
          h += `<button type="button" class="${cls.join(' ')}" data-day="${key}" aria-label="${esc(label)}" ${rvOn ? `data-rv="${M}:${mk}:${key}"` : ''} style="--rd:${Math.min(700, 480 + (r * 7 + c) * 12)}ms;--gd:${c * 45}ms">
            <span class="row1"><span class="d-num">${d.getDate()}</span><span class="marks">${marks}</span></span>
            ${list.length ? `<span class="pills">${pills}</span>` : ''}
            ${dots ? `<span class="d-dots">${dots}</span>` : ''}
          </button>`;
        }
        const wc = calc(wList), wt = wc.tp + wc.be + wc.sl, kw = isoWeek(wStart);
        h += `<div class="wk" ${rvOn ? `data-rv="${M}:${mk}:wk${r}"` : ''} style="--rd:${Math.min(760, 560 + r * 40)}ms;--gd:315ms"><span class="kw">KW ${kw}</span>${wc.n ? `<span class="wk-n">${wc.n} ${wc.n === 1 ? 'Trade' : 'Trades'}</span><span class="wk-l">${countsHtml(wc)}</span><span class="mini"><span class="r tp" style="width:${ratioW(wc.tp, wt)}"></span><span class="r be" style="width:${ratioW(wc.be, wt)}"></span><span class="r sl" style="width:${ratioW(wc.sl, wt)}"></span></span>` : '<span class="none">–</span>'}</div>`;
        wl += `<div class="wrow" ${rvOn ? `data-rv="${M}:${mk}:wl${r}"` : ''} style="--rd:${r * 50}ms"><span class="kw">KW ${kw} · ${fDM.format(wStart)}–${fDM.format(wEnd)}</span><span class="n">${wc.n ? wc.n + (wc.n === 1 ? ' Trade' : ' Trades') : ''}</span><span class="p">${wc.n ? countsHtml(wc) : '–'}</span></div>`;
      }
      $('#cal').innerHTML = h;
      if (dir) {
        for (const el of [$('#cal'), $('#weeks')]) { el.classList.remove('slide-next', 'slide-prev'); void el.offsetWidth; el.classList.add('slide-' + dir); }
        const mt = $('#month-title'); mt.classList.remove('swap'); void mt.offsetWidth; mt.classList.add('swap');
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
          <div class="grow"><span class="eyebrow gold">Journal · Lernen</span><h1>Lear<span class="gold-t">nings</span></h1><p id="l-sub">Jeder Fehler, den du aufschreibst, kostet dich nur einmal Geld.</p></div>
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
          <div class="grow"><span class="eyebrow gold">Journal · Vorbereitung</span><h1>Out<span class="gold-t">looks</span></h1><p id="o-sub">Wer vorbereitet ist, reagiert nicht, er handelt nach Plan.</p></div>
          <button type="button" class="btn primary" data-action="new-outlook">${ICON.plus}Outlook eintragen</button>
        </div>
        <div class="toolbar" data-rv="${M}:tb" style="--rd:120ms">
          <input type="search" class="search" id="o-search" placeholder="Nach Instrument oder Text suchen" aria-label="Outlooks durchsuchen" value="${esc(S.oq)}">
          <div class="chips" id="o-bias">
            ${[['all','Alle'],['bull','▲ Bullish'],['bear','▼ Bearish'],['neutral','● Neutral']].map(([v, l]) => `<button type="button" class="chip" data-obias="${v}">${l}</button>`).join('')}
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
      const list = sortEntries(all.filter(o => (S.obias === 'all' || (o.bias || 'neutral') === S.obias) && (!q || [o.symbol, o.title, o.text].join(' ').toLowerCase().includes(q))));
      const feed = $('#o-feed');
      feed.classList.remove('tl');
      if (!S.loaded.outlooks) { feed.innerHTML = '<div class="empty sm"><p>Outlooks werden geladen…</p></div>'; return; }
      if (!all.length) { feed.innerHTML = `<div class="empty" data-rv="${M}:empty" style="--rd:200ms"><h3>Noch keine Outlooks</h3><p>Schreib vor der Session auf, was du vom Markt erwartest, und häng deinen markierten Chart an. Nach dem Tag markierst du, ob es eingetreten ist.</p><button type="button" class="btn primary" data-action="new-outlook">${ICON.plus}Ersten Outlook eintragen</button></div>`; return; }
      if (!list.length) { feed.innerHTML = '<div class="empty sm"><p>Keine Outlooks passen zu deinem Filter.</p></div>'; return; }
      feed.classList.add('tl');
      feed.innerHTML = '<div class="tl-rail" aria-hidden="true"><i class="tl-fill"></i></div>' + list.map((o, i) => {
        const b = o.bias || 'neutral';
        const bl = b === 'bull' ? '▲ Bullish' : b === 'bear' ? '▼ Bearish' : '● Neutral';
        const tf = {intraday: 'Intraday', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly'}[o.tf] || '';
        const res = o.result === 'hit' ? '<span class="res hit">Eingetreten</span>' : o.result === 'miss' ? '<span class="res miss">Nicht eingetreten</span>' : '<span class="res">Offen</span>';
        return tlItem(o.date, `${M}:o:${esc(o.id)}`, i, `
        <article class="entry ol spot">
          <div class="ol-side"><span class="ol-sym">${esc(o.symbol || '—')}</span><span class="bias ${b === 'bull' ? 'bull' : b === 'bear' ? 'bear' : ''}">${bl}</span>${tf ? `<span class="ol-tf">${tf}</span>` : ''}</div>
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
    if (this.cur && this.cur.cleanup) this.cur.cleanup();
    if (!this.cur) this.opener = document.activeElement;
    this.cur = {builder, live: !!opts.live, back: opts.back || null, cleanup: opts.cleanup || null, dirty: false};
    const panel = $('#panel');
    panel.innerHTML = builder();
    panel.scrollTop = 0;
    $('#modal').hidden = false;
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    document.documentElement.style.overflow = 'hidden';
    if (opts.onMount) opts.onMount(panel);
    const f = panel.querySelector(opts.focus || '.p-body button, .p-body input, .p-body textarea, .p-foot button');
    if (f) { try { f.focus({preventScroll: true}); } catch (e) { f.focus(); } }
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
    $('#modal').hidden = true; $('#panel').innerHTML = '';
    document.documentElement.style.overflow = '';
    if (this.opener && document.contains(this.opener)) { try { this.opener.focus({preventScroll: true}); } catch (e) {} }
    this.opener = null;
  },
  back(){
    if (this.cur && this.cur.back) { const b = this.cur.back; if (this.cur.cleanup) this.cur.cleanup(); this.cur.cleanup = null; b(); }
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
      const r = resOf(t), nb = t.account === 'neben';
      return `<article class="tcard ${r || ''}">
        <div class="tc-row">
          <span class="acc ${nb ? 'neben' : 'main'}">${esc(an(t.account))}</span>
          <span class="tc-sym">${esc(t.symbol || '—')}</span>
          ${t.side ? `<span class="side ${t.side === 'short' ? 'short' : 'long'}">${t.side === 'short' ? '▼ Short' : '▲ Long'}</span>` : ''}
          ${t.time ? `<span class="tc-time">${esc(t.time)} Uhr</span>` : ''}
          <span class="oc-big ${r || 'na'}">${r ? RES_LABEL[r] + `<small>${RES_NAME[r]}</small>` : 'Kein Ergebnis'}</span>
        </div>
        ${t.setup ? `<div class="tc-row tc-sub"><span class="tag">${esc(t.setup)}</span></div>` : ''}
        ${t.note ? `<p class="tc-note">${esc(t.note)}</p>` : ''}
        ${shotsHtml(t.shots)}
        <div class="tc-actions"><button type="button" class="btn sm" data-action="edit-trade" data-id="${esc(t.id)}" data-from-day="${key}">Bearbeiten</button></div>
      </article>`;
    };
    const eyebrow = list.length
      ? list.length + (list.length === 1 ? ' Trade' : ' Trades') + ' · ' + s.main + ' ' + an('main') + ' · ' + s.neben + ' ' + an('neben')
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

/* ---------- forms ---------- */
const FORMS = {
  trades: {
    newTitle: 'Trade eintragen', editTitle: 'Trade bearbeiten', saved: 'Trade gespeichert', deleted: 'Trade gelöscht', what: 'diesen Trade',
    defaults: o => ({account: S.lastAccount, date: o.date || todayStr(), side: 'long'}),
    fields: [
      {k: 'account', t: 'acct', label: 'Konto'},
      {k: 'date', t: 'date', label: 'Datum'},
      {k: 'time', t: 'time', label: 'Uhrzeit', opt: true},
      {k: 'symbol', t: 'text', label: 'Instrument', ph: 'z. B. NQ, DAX, EURUSD', list: 'dl-symbols', caps: true},
      {k: 'side', t: 'seg', label: 'Richtung', cls: 'side-seg', opts: [['long', '▲ Long'], ['short', '▼ Short']]},
      {k: 'result', t: 'seg', label: 'Ergebnis', cls: 'oc-seg', full: true, opts: [['tp', ICON.tp + '<b>TP</b><small>Take Profit</small>'], ['be', ICON.be + '<b>BE</b><small>Break Even</small>'], ['sl', ICON.sl + '<b>SL</b><small>Stop Loss</small>']]},
      {k: 'setup', t: 'text', label: 'Setup', ph: 'z. B. Breakout, Liquidity Sweep', list: 'dl-setups', opt: true, full: true},
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
    defaults: o => ({date: o.date || todayStr(), bias: 'neutral', tf: 'daily', result: 'open'}),
    fields: [
      {k: 'date', t: 'date', label: 'Gilt für'},
      {k: 'symbol', t: 'text', label: 'Instrument', ph: 'z. B. NQ, DAX, EURUSD', list: 'dl-symbols', caps: true},
      {k: 'bias', t: 'seg', label: 'Bias', cls: 'bias-seg', full: true, opts: [['bull', '▲ Bullish'], ['bear', '▼ Bearish'], ['neutral', '● Neutral']]},
      {k: 'tf', t: 'seg', label: 'Zeitrahmen', full: true, opts: [['intraday', 'Intraday'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]},
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
    <datalist id="dl-setups">${opt(uniq(S.trades.map(t => t.setup)))}</datalist>
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
          ${[['main', esc(an('main')), 'Konto 1'], ['neben', esc(an('neben')), 'Konto 2']].map(([k, l, s]) =>
            `<button type="button" role="radio" data-val="${k}" aria-checked="${val === k}"><span class="dot"></span><span><b>${l}</b><small>${s}</small></span></button>`).join('')}
        </div></div>`;
    case 'seg':
      return `<div class="fld${full}"><span class="lbl" id="${id}-l">${f.label}${opt}</span>
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
        ${can ? `<label class="drop" for="f-file" id="drop">${ICON.img}<b>Screenshot hinzufügen</b><span>Klicken, Bild hierher ziehen oder mit <kbd>${isMac ? '⌘' : 'Strg'}+V</kbd> einfügen</span></label>
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
  const st = {shots: (v.shots || []).map(ref => ({ref})), removed: [], busy: false};
  const back = opts.fromDay ? () => openDay(opts.fromDay) : null;

  const builder = () => `
    <div class="p-head"><div class="ph-t"><span class="eyebrow">${kind === 'trades' ? 'Trade' : kind === 'learnings' ? 'Learning' : 'Outlook'}</span><h2 id="modal-title">${isNew ? def.newTitle : def.editTitle}</h2></div>
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
    el.innerHTML = st.shots.map((s, i) => `<div class="thumb"><img src="${esc(s.ref ? Store.imgSrc(s.ref) : s.url)}" alt=""><button type="button" class="tv" data-lb="${i}" aria-label="Screenshot ${i + 1} ansehen"></button>${s.ref ? '' : '<span class="nb">neu</span>'}<button type="button" class="rm" data-rm="${i}" aria-label="Screenshot ${i + 1} entfernen">×</button></div>`).join('');
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
      if (kind === 'trades') { delete obj.pnl; delete obj.r; }
      await Store.save(kind, obj);
      for (const ref of st.removed) Store.deleteImage(ref);
      if (kind === 'trades' && obj.account) { S.lastAccount = obj.account; lsSet('blotter.lastAccount', obj.account); }
      st.busy = false;
      toast(def.saved);
      if (Modal.cur) Modal.cur.dirty = false;
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
  open(list, i){ if (!list.length) return; this.list = list; this.i = i; this.show(); $('#lightbox').hidden = false; $('.lb-close').focus(); },
  show(){
    $('#lb-img').src = this.list[this.i];
    const many = this.list.length > 1;
    $('.lb-prev').hidden = !many; $('.lb-next').hidden = !many;
    $('#lb-count').textContent = many ? (this.i + 1) + ' / ' + this.list.length : '';
  },
  step(d){ this.i = (this.i + d + this.list.length) % this.list.length; this.show(); },
  close(){ $('#lightbox').hidden = true; $('#lb-img').removeAttribute('src'); },
  isOpen(){ return !$('#lightbox').hidden; }
};

/* ---------- personalisation ---------- */
const SKINS = [
  {id: 'navy', name: 'Navy & Gold', sub: 'Das Original'},
  {id: 'onyx', name: 'Onyx & Platin', sub: 'Schwarz, kühl, minimal'},
  {id: 'ocean', name: 'Ozean', sub: 'Petrol & Himmelblau'},
  {id: 'royal', name: 'Royal', sub: 'Violett & Gold'},
  {id: 'copper', name: 'Graphit & Kupfer', sub: 'Warm und dunkel'},
  {id: 'arctic', name: 'Arctic', sub: 'Hell und klar'}
];
const SKIN_IDS = SKINS.map(k => k.id);
function normSettings(d){
  d = d || {};
  const o = {theme: 'navy', name: '', modules: {learnings: true, outlooks: true}, acctNames: {main: 'Main-Konto', neben: 'Neben-Konto'}, setupDone: !!d.setupDone};
  if (SKIN_IDS.includes(d.theme)) o.theme = d.theme;
  if (typeof d.name === 'string') o.name = d.name.trim().slice(0, 30);
  if (d.modules && typeof d.modules === 'object') { o.modules.learnings = d.modules.learnings !== false; o.modules.outlooks = d.modules.outlooks !== false; }
  if (d.acctNames && typeof d.acctNames === 'object') for (const k of ['main', 'neben']) { const v = String(d.acctNames[k] || '').trim().slice(0, 24); if (v) o.acctNames[k] = v; }
  return o;
}
const settingsSig = () => JSON.stringify([S.settings.name, S.settings.modules, S.settings.acctNames]);
function modOn(k){ return k === 'kalender' || !(S.settings.modules && S.settings.modules[k] === false); }
function pagesOn(){ return ['kalender', 'learnings', 'outlooks'].filter(modOn); }
function an(k){ const n = S.settings.acctNames || {}; return k === 'neben' ? (n.neben || 'Neben-Konto') : (n.main || 'Main-Konto'); }
function applySkin(id, persist){
  if (!SKIN_IDS.includes(id)) id = 'navy';
  const r = document.documentElement;
  if (r.getAttribute('data-skin') !== id) { r.setAttribute('data-skin', id); BG.P = null; if (reduce) BG.draw(performance.now() + 1e5); }
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
function acctFields(n, p){
  return `<div class="acct-fields">
    <label class="fld" for="${p}-acc-main"><span class="lbl"><i class="ad main"></i>Konto 1</span><input class="inp big-inp" id="${p}-acc-main" maxlength="24" autocomplete="off" placeholder="z. B. FTMO 100k" value="${esc(n.main)}"></label>
    <label class="fld" for="${p}-acc-neben"><span class="lbl"><i class="ad neben"></i>Konto 2</span><input class="inp big-inp" id="${p}-acc-neben" maxlength="24" autocomplete="off" placeholder="z. B. Privatkonto" value="${esc(n.neben)}"></label>
  </div>`;
}
function pickerClick(e, draft){
  if (!draft) return false;
  const sk = e.target.closest('[data-skin-pick]');
  if (sk) { draft.theme = sk.dataset.skinPick; $$('[data-skin-pick]', sk.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === sk))); applySkin(draft.theme); return true; }
  const md = e.target.closest('[data-mod]');
  if (md) { const k = md.dataset.mod; draft.modules[k] = draft.modules[k] === false; md.setAttribute('aria-checked', String(draft.modules[k])); return true; }
  return false;
}
function readNames(draft, p){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
  const a = v(p + '-acc-main'), b = v(p + '-acc-neben');
  if (a != null) draft.acctNames.main = a.slice(0, 24) || 'Main-Konto';
  if (b != null) draft.acctNames.neben = b.slice(0, 24) || 'Neben-Konto';
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
    this.el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); this.next(); } });
  },
  maybe(){ if (S.settingsLoaded && !S.settings.setupDone && !this.isOpen && !this.dismissed) this.start(); },
  start(){
    this.draft = JSON.parse(JSON.stringify(S.settings));
    this.isOpen = true; this.step = 0; this.failed = false;
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
      () => `<div class="su-h"><span class="eyebrow gold">Konten</span><h2 id="su-title">Wie heißen deine Konten?</h2><p>Zum Beispiel dein Broker oder deine Prop-Firm-Challenge. Die Namen siehst du überall im Journal.</p></div>${acctFields(d.acctNames, 'su')}`
    ];
    $('#su-body').innerHTML = `<div class="su-step${dir < 0 ? ' back' : ''}">${steps[i]()}</div>`;
    const f = $('#su-body input') || $('#su-body [aria-checked="true"]:not(.locked)') || $('#su-next');
    if (f) { try { f.focus({preventScroll: true}); } catch (e) {} }
    $('.su-card').scrollTop = 0;
  },
  async finish(skip){
    if (this.busy) return;
    this.collect();
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
    toast(skip ? 'Du kannst alles jederzeit in den Einstellungen anpassen.' : (S.settings.name ? 'Willkommen, ' + S.settings.name + '. Dein Journal ist bereit.' : 'Dein Journal ist bereit.'));
  },
  close(){
    this.isOpen = false; this.dismissed = true;
    this.el.classList.add('out');
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!this.isOpen) { this.el.hidden = true; this.el.classList.remove('out'); $('#su-body').innerHTML = ''; } }, 450);
  }
};

function openSettings(){
  const draft = JSON.parse(JSON.stringify(S.settings));
  let saved = false;
  const builder = () => `
    <div class="p-head"><div class="ph-t"><span class="eyebrow">Personalisierung</span><h2 id="modal-title">Einstellungen</h2></div>
      <button type="button" class="btn icon ghost" data-action="close-modal" aria-label="Schließen">${ICON.x}</button></div>
    <div class="p-body">
      <section class="set-sec"><h3>Dein Name</h3><input class="inp" id="set-name" maxlength="30" autocomplete="given-name" placeholder="Dein Vorname" value="${esc(draft.name)}"></section>
      <section class="set-sec"><h3>Farbschema</h3>${skinGrid(draft.theme)}</section>
      <section class="set-sec"><h3>Seiten</h3>${modGrid(draft.modules)}</section>
      <section class="set-sec"><h3>Konten</h3>${acctFields(draft.acctNames, 'set')}</section>
      ${window.BlotterBackend ? `<section class="set-sec"><h3>Konto &amp; Abo</h3><p class="acct-mail">Angemeldet als <b>${esc(window.BlotterBackend.email || '')}</b></p><div class="acct-btns"><button type="button" class="btn" data-action="acct-portal">Abo verwalten oder kündigen</button><button type="button" class="btn ghost" data-action="acct-logout">Abmelden</button></div></section>` : ''}
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
        else if (act === 'set-save') {
          draft.name = ($('#set-name', p).value || '').trim().slice(0, 30);
          readNames(draft, 'set');
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
  if (Modal.cur || LB.isOpen() || Loader.active || Setup.isOpen) return;
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
    document.addEventListener('pointermove', e => {
      const el = e.target && e.target.closest ? e.target.closest('.spot') : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
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

document.addEventListener('keydown', e => {
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
  if (Loader.active) { Loader.retarget(next); return; }
  if (next === S.view) return;
  if (!Loader.on || S.mounted == null) { goView(next); return; }
  Loader.play(next);
});

readHash();
Reveal.init();
Loader.init();
Setup.init();
BG.init();
render();
Store.init();
})();
