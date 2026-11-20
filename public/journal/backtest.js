/* Blotter · Backtesting
   Replays the user's own 1-minute data candle by candle. Data never leaves the user's account:
   it is imported from files the user downloaded (HistData, MetaTrader, TradingView, Dukascopy export),
   stored as compressed monthly blocks in their private storage, and only shown to them.
   Loaded on demand by the journal: window.BlotterBT.mount(el, ctx). */
(function () {
'use strict';

/* ---------------------------------------------------------------- basics */
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const LOC = 'de-AT';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const yieldUI = () => new Promise(r => setTimeout(r, 0));
const rid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const monthKey = ms => { const d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
const monthStart = key => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, 1);
const nextMonth = key => { const y = +key.slice(0, 4), m = +key.slice(5, 7); return m === 12 ? (y + 1) + '-01' : y + '-' + pad(m + 1); };
const prevMonth = key => { const y = +key.slice(0, 4), m = +key.slice(5, 7); return m === 1 ? (y - 1) + '-12' : y + '-' + pad(m - 1); };
const nf = (v, d) => new Intl.NumberFormat(LOC, {minimumFractionDigits: d, maximumFractionDigits: d}).format(v);
const fRn = new Intl.NumberFormat(LOC, {minimumFractionDigits: 1, maximumFractionDigits: 2});
const fR = r => (r > 0.004 ? '+' : r < -0.004 ? '−' : '±') + fRn.format(Math.abs(r) < 0.005 ? 0 : Math.abs(r)) + 'R';
const fDate = new Intl.DateTimeFormat(LOC, {day: '2-digit', month: '2-digit', year: 'numeric'});
const fDT = new Intl.DateTimeFormat(LOC, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
const fMon = new Intl.DateTimeFormat(LOC, {month: 'short', year: 'numeric'});
const fHM = new Intl.DateTimeFormat(LOC, {hour: '2-digit', minute: '2-digit'});

// US daylight saving: second Sunday of March 2:00 to first Sunday of November 2:00 (local NY)
function usDst(ms) {
  const y = new Date(ms).getUTCFullYear();
  const mar = new Date(Date.UTC(y, 2, 1)); const s = Date.UTC(y, 2, 1 + ((7 - mar.getUTCDay()) % 7) + 7, 7);  // 2:00 EST = 07:00 UTC
  const nov = new Date(Date.UTC(y, 10, 1)); const e = Date.UTC(y, 10, 1 + ((7 - nov.getUTCDay()) % 7), 6);    // 2:00 EDT = 06:00 UTC
  return ms >= s && ms < e;
}
const nyOffset = ms => (usDst(ms) ? -4 : -5) * HOUR;          // New York local = UTC + offset
const localOffset = ms => -new Date(ms).getTimezoneOffset() * MIN;

/* ---------------------------------------------------------------- markets */
const MARKETS = [
  {id: 'NAS100', name: 'Nasdaq 100', tag: 'NQ', hist: 'nsxusd', digits: 2, unit: 'Punkte', pip: 1},
  {id: 'SPX500', name: 'S&P 500', tag: 'ES', hist: 'spxusd', digits: 2, unit: 'Punkte', pip: 1},
  {id: 'GER40', name: 'DAX 40', tag: 'DAX', hist: 'grxeur', digits: 1, unit: 'Punkte', pip: 1},
  {id: 'XAUUSD', name: 'Gold', tag: 'XAUUSD', hist: 'xauusd', digits: 2, unit: 'Punkte', pip: 1},
  {id: 'EURUSD', name: 'EUR/USD', tag: 'EURUSD', hist: 'eurusd', digits: 5, unit: 'Pips', pip: 0.0001},
  {id: 'GBPUSD', name: 'GBP/USD', tag: 'GBPUSD', hist: 'gbpusd', digits: 5, unit: 'Pips', pip: 0.0001},
];
const MK = Object.fromEntries(MARKETS.map(m => [m.id, m]));
const HIST_URL = m => 'https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/' + m.hist;
const TFS = [
  {id: '1m', min: 1, label: '1m'}, {id: '5m', min: 5, label: '5m'}, {id: '15m', min: 15, label: '15m'},
  {id: '30m', min: 30, label: '30m'}, {id: '1h', min: 60, label: '1h'}, {id: '4h', min: 240, label: '4h'}, {id: '1D', min: 1440, label: 'D'},
];
const TF = Object.fromEntries(TFS.map(t => [t.id, t]));
const LOOKBACK_BARS = 1200;

/* ---------------------------------------------------------------- bars in memory
   {t: Float64Array (UTC ms, bar open), o,h,l,c: Float64Array, n} */
function emptyBars(cap) { cap = cap || 0; return {t: new Float64Array(cap), o: new Float64Array(cap), h: new Float64Array(cap), l: new Float64Array(cap), c: new Float64Array(cap), n: 0}; }
function concatBars(list) {
  const n = list.reduce((a, b) => a + b.n, 0), out = emptyBars(n);
  let k = 0;
  for (const b of list) { for (const f of ['t', 'o', 'h', 'l', 'c']) out[f].set(b[f].subarray(0, b.n), k); k += b.n; }
  out.n = n; return out;
}
function lowerBound(t, n, x) { let a = 0, b = n; while (a < b) { const m = (a + b) >> 1; if (t[m] < x) a = m + 1; else b = m; } return a; }

/* ---------------------------------------------------------------- block codec
   One block = one market, one resolution, one period. Columnar, gzip-compressed.
   header: 'BTD1' | u8 version | u8 digits | u8 res (1 = minute, 60 = hour) | u8 0 | f64 base time | u32 count
   then u32 offsets (in res units from base), then i32 columns in price steps (price × 10^digits), stored as small
   differences so they compress well: open − previous close, high − open, low − open, close − open */
async function gz(buf, mode) {
  const s = new Blob([buf]).stream().pipeThrough(mode === 'c' ? new CompressionStream('gzip') : new DecompressionStream('gzip'));
  return await new Response(s).arrayBuffer();
}
async function encodeBlock(bars, digits, res, base) {
  const n = bars.n, H = 20, buf = new ArrayBuffer(H + n * 20), dv = new DataView(buf);
  [66, 84, 68, 49].forEach((b, i) => dv.setUint8(i, b));
  dv.setUint8(4, 1); dv.setUint8(5, digits); dv.setUint8(6, res); dv.setUint8(7, 0);
  dv.setFloat64(8, base, true); dv.setUint32(16, n, true);
  const off = new Uint32Array(buf, H, n), f = Math.pow(10, digits), unit = res * MIN;
  const O = new Int32Array(buf, H + n * 4, n), Hh = new Int32Array(buf, H + n * 8, n), L = new Int32Array(buf, H + n * 12, n), C = new Int32Array(buf, H + n * 16, n);
  let pc = 0;
  for (let i = 0; i < n; i++) {
    off[i] = Math.round((bars.t[i] - base) / unit);
    const o = Math.round(bars.o[i] * f), c = Math.round(bars.c[i] * f);
    O[i] = o - pc; Hh[i] = Math.round(bars.h[i] * f) - o; L[i] = Math.round(bars.l[i] * f) - o; C[i] = c - o; pc = c;
  }
  return new Blob([await gz(buf, 'c')], {type: 'application/octet-stream'});
}
async function decodeBlock(ab) {
  const buf = await gz(ab, 'd'), dv = new DataView(buf);
  if (dv.getUint8(0) !== 66 || dv.getUint8(1) !== 84 || dv.getUint8(2) !== 68) throw new Error('bad block');
  const digits = dv.getUint8(5), res = dv.getUint8(6), base = dv.getFloat64(8, true), n = dv.getUint32(16, true), H = 20;
  const off = new Uint32Array(buf, H, n), f = Math.pow(10, digits), unit = res * MIN;
  const O = new Int32Array(buf, H + n * 4, n), Hh = new Int32Array(buf, H + n * 8, n), L = new Int32Array(buf, H + n * 12, n), C = new Int32Array(buf, H + n * 16, n);
  const b = emptyBars(n); b.n = n;
  let pc = 0;
  for (let i = 0; i < n; i++) {
    const o = pc + O[i], c = o + C[i];
    b.t[i] = base + off[i] * unit; b.o[i] = o / f; b.h[i] = (o + Hh[i]) / f; b.l[i] = (o + L[i]) / f; b.c[i] = c / f; pc = c;
  }
  b.digits = digits;
  return b;
}

/* ---------------------------------------------------------------- storage
   cloud: ctx.md (private bucket, own folder) with a local IndexedDB copy as cache
   local: IndexedDB only */
const IDB = {
  db: null,
  open() {
    if (this.db) return this.db;
    this.db = new Promise((res, rej) => {
      let r;
      try { r = indexedDB.open('blotter-marketdata', 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => r.result.createObjectStore('blocks');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return this.db;
  },
  async get(k) {
    try { const db = await this.open(); return await new Promise((res, rej) => { const q = db.transaction('blocks').objectStore('blocks').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
    catch (e) { return null; }
  },
  async put(k, v) {
    try { const db = await this.open(); await new Promise((res, rej) => { const t = db.transaction('blocks', 'readwrite'); t.objectStore('blocks').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; }
    catch (e) { return false; }
  },
  async del(k) {
    try { const db = await this.open(); await new Promise((res) => { const t = db.transaction('blocks', 'readwrite'); t.objectStore('blocks').delete(k); t.oncomplete = res; t.onerror = res; }); } catch (e) {}
  },
};
const Blocks = {
  mem: new Map(),   // key -> Promise<bars|null>
  key: (mk, res, period) => mk + '/' + res + '/' + period,
  async put(k, blob) {
    const ab = await blob.arrayBuffer();
    if (CTX.md) await CTX.md.put(k, blob);
    else if (!(await IDB.put(k, ab))) throw {code: 'local_full'};
    if (CTX.md) IDB.put(k, ab);
    this.mem.delete(k);
  },
  get(k) {
    if (!this.mem.has(k)) {
      const p = (async () => {
        let ab = await IDB.get(k);
        if (!ab && CTX.md) { ab = await CTX.md.get(k); if (ab) IDB.put(k, ab); }
        return ab ? await decodeBlock(ab) : null;
      })().catch(() => null);
      this.mem.set(k, p);
      if (this.mem.size > 40) this.mem.delete(this.mem.keys().next().value);
    }
    return this.mem.get(k);
  },
  async remove(keys) {
    for (const k of keys) { this.mem.delete(k); await IDB.del(k); }
    if (CTX.md && keys.length) await CTX.md.remove(keys);
  },
};

/* the data index lives in the journal's own store (kind 'backtests', id 'data') */
function dataIndex() {
  const d = (CTX.S.backtests || []).find(x => x.id === 'data');
  return (d && d.markets) || {};
}
async function saveIndex(markets) {
  await CTX.Store.save('backtests', {id: 'data', markets, updatedAt: Date.now()});
}
const sessions = () => (CTX.S.backtests || []).filter(x => x.id && x.id.startsWith('bt-'));

/* ---------------------------------------------------------------- file reading */
// ZIP: read the central directory, inflate entries with the browser's own decompressor
async function zipEntries(file) {
  const buf = await file.arrayBuffer(), dv = new DataView(buf), n = buf.byteLength;
  let eocd = -1;
  for (let i = n - 22; i >= Math.max(0, n - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw {code: 'zip'};
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    p += 46 + nlen + elen + clen;
    if (/\/$/.test(name) || !/\.(csv|txt)$/i.test(name)) continue;
    const ds = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    const raw = new Uint8Array(buf, ds, csize);
    out.push({name, size: usize || csize, stream: () => method === 0 ? new Blob([raw]).stream() : new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))});
  }
  // HistData ZIPs carry a .txt status report next to the .csv data
  return out.some(e => /\.csv$/i.test(e.name)) ? out.filter(e => /\.csv$/i.test(e.name)) : out;
}
async function* lines(stream) {
  const rd = stream.pipeThrough(new TextDecoderStream()).getReader();
  let rest = '';
  try {
    for (;;) {
      const {value, done} = await rd.read();
      if (done) break;
      const parts = (rest + value).split(/\r?\n/);
      rest = parts.pop();
      yield parts;
    }
    if (rest) yield [rest];
  } finally { rd.cancel().catch(() => {}); }
}

/* ---------------------------------------------------------------- formats
   Each parser turns a line into [localTimeMsAsIfUTC, o, h, l, c] (time in the file's own clock) or null. */
const num = s => { const v = +String(s).trim().replace(/^"|"$/g, ''); return Number.isFinite(v) ? v : NaN; };
const FORMATS = {
  histdata: {   // 20240102 170000;1.104150;1.104210;1.104120;1.104190;0
    name: 'HistData (Generic ASCII)', tz: 'est',
    test: l => /^\d{8} \d{6};[\d.]+;[\d.]+;[\d.]+;[\d.]+/.test(l),
    parse(l) { const f = l.split(';'); const d = f[0]; return [Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13)), num(f[1]), num(f[2]), num(f[3]), num(f[4])]; },
  },
  mt4: {        // 2024.01.02,17:00,1.10415,1.10421,1.10412,1.10419,0   (HistData MetaTrader files and MT4 exports)
    name: 'MetaTrader (CSV)', tz: 'broker',
    test: l => /^\d{4}\.\d{2}\.\d{2},\d{2}:\d{2}(:\d{2})?,[\d.]+,[\d.]+,[\d.]+,[\d.]+/.test(l),
    parse(l) { const f = l.split(','); const d = f[0], t = f[1]; return [Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5)), num(f[2]), num(f[3]), num(f[4]), num(f[5])]; },
  },
  mt5: {        // <DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t...   2024.01.02\t00:00:00\t...
    name: 'MetaTrader 5 (Export)', tz: 'broker',
    test: l => /^\d{4}\.\d{2}\.\d{2}\t\d{2}:\d{2}(:\d{2})?\t[\d.]+\t/.test(l),
    parse(l) { const f = l.split('\t'); const d = f[0], t = f[1]; return [Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), +t.slice(0, 2), +t.slice(3, 5)), num(f[2]), num(f[3]), num(f[4]), num(f[5])]; },
  },
  dukascopy: {  // 02.01.2024 00:00:00.000,1.10415,1.10421,1.10412,1.10419,123.4   (Dukascopy export, GMT)
    name: 'Dukascopy (CSV)', tz: 'utc',
    test: l => /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}(\.\d+)?( GMT[+-]\d{4})?,[\d.]+,/.test(l),
    parse(l) { const f = l.split(','); const d = f[0]; return [Date.UTC(+d.slice(6, 10), +d.slice(3, 5) - 1, +d.slice(0, 2), +d.slice(11, 13), +d.slice(14, 16)), num(f[1]), num(f[2]), num(f[3]), num(f[4])]; },
  },
  unix: {       // time,open,high,low,close   with unix seconds (TradingView export)
    name: 'TradingView (CSV)', tz: 'utc',
    test: l => /^\d{9,13},[\d.]+,[\d.]+,[\d.]+,[\d.]+/.test(l),
    parse(l) { const f = l.split(','); let t = +f[0]; if (t < 1e11) t *= 1000; return [t, num(f[1]), num(f[2]), num(f[3]), num(f[4])]; },
  },
  iso: {        // 2024-01-02T00:00:00Z,1.1,1.2,1.0,1.1   or with offset / space
    name: 'CSV mit ISO-Zeit', tz: 'utc',
    test: l => /^"?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?"?[,;]\s*"?[\d.]+/.test(l),
    parse(l) {
      const f = l.split(/[,;]/), s = f[0].replace(/"/g, '').trim();
      const zone = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
      const d = zone ? Date.parse(s.replace(' ', 'T')) : Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16));
      return [d, num(f[1]), num(f[2]), num(f[3]), num(f[4])];
    },
  },
};
function detectFormat(sample) {
  const body = sample.filter(l => l && !/^[<A-Za-z"]/.test(l.trim()) || /^"?\d{4}-/.test(l)).slice(0, 20);
  for (const [id, f] of Object.entries(FORMATS)) {
    const ok = body.filter(l => f.test(l.trim())).length;
    if (ok && ok >= Math.min(5, body.length) - 1) return id;
  }
  return null;
}
// time zones of files
const TZS = [
  {id: 'utc', name: 'UTC (GMT)', toUtc: t => t},
  {id: 'est', name: 'HistData: New York ohne Sommerzeit (UTC−5)', toUtc: t => t + 5 * HOUR},
  {id: 'broker', name: 'MetaTrader-Broker: UTC+2, im US-Sommer UTC+3', toUtc: t => { const g = t - 2 * HOUR; return usDst(g) ? t - 3 * HOUR : g; }},
  {id: 'vienna', name: 'Wien/Berlin (MEZ/MESZ)', toUtc: t => { const g = t - HOUR; return euDst(g) ? t - 2 * HOUR : g; }},
  {id: 'ny', name: 'New York mit Sommerzeit', toUtc: t => { const g = t + 5 * HOUR; return usDst(g) ? t + 4 * HOUR : g; }},
];
function euDst(ms) {
  const y = new Date(ms).getUTCFullYear();
  const lastSun = m => { const d = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, d.getUTCDate() - d.getUTCDay(), 1); };
  return ms >= lastSun(2) && ms < lastSun(9);
}
const tzById = id => TZS.find(z => z.id === id) || TZS[0];
function decimalsOf(s) { const m = String(s).trim().match(/\.(\d*?)0*$/); return m ? m[1].length : 0; }

/* ---------------------------------------------------------------- import
   files -> month blocks (minute) + year blocks (hour) in the user's storage */
async function readSample(src) {
  const it = lines(src.stream());
  const got = [];
  try { for await (const part of it) { got.push(...part); if (got.length >= 60) break; } } catch (e) {}
  return got.slice(0, 60);
}
async function inspectFiles(files) {
  const sources = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed') {
      for (const e of await zipEntries(f)) sources.push({name: e.name, size: e.size, stream: e.stream, from: f.name});
    } else sources.push({name: f.name, size: f.size, stream: () => f.stream(), from: f.name});
  }
  const out = [];
  for (const s of sources) {
    const sample = await readSample(s);
    const fmt = detectFormat(sample);
    if (!fmt) { out.push({src: s, fmt: null}); continue; }
    let tz = FORMATS[fmt].tz;
    if (fmt === 'mt4' && /DAT_MT_/i.test(s.name + s.from)) tz = 'est';
    const body = sample.filter(l => FORMATS[fmt].test(l.trim()));
    let digits = 0;
    for (const l of body) { const p = FORMATS[fmt].parse(l.trim()); if (p) for (let k = 1; k <= 4; k++) digits = Math.max(digits, decimalsOf(String(p[k]))); }
    digits = Math.min(6, digits);
    const guess = guessMarket(s.name + ' ' + s.from);
    out.push({src: s, fmt, tz, digits, guess});
  }
  return out;
}
function guessMarket(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = [['NAS100', /nsxusd|nas100|nasdaq|ustec|us100|ndx|nq1|usatechidx/], ['SPX500', /spxusd|spx500|us500|sp500|spx|es1|usa500idx/],
    ['GER40', /grxeur|ger40|ger30|de40|de30|dax|fdax|deuidx/], ['XAUUSD', /xauusd|gold|xau/], ['EURUSD', /eurusd/], ['GBPUSD', /gbpusd/]];
  for (const [id, re] of hits) if (re.test(n)) return id;
  return null;
}
// month accumulator: Map minute-of-month -> index
function MonthAcc(key) { this.key = key; this.base = monthStart(key); this.map = new Map(); }
MonthAcc.prototype.add = function (t, o, h, l, c) { this.map.set(Math.round((t - this.base) / MIN), [o, h, l, c]); };
MonthAcc.prototype.bars = function () {
  const ks = Array.from(this.map.keys()).sort((a, b) => a - b), b = emptyBars(ks.length);
  ks.forEach((k, i) => { const v = this.map.get(k); b.t[i] = this.base + k * MIN; b.o[i] = v[0]; b.h[i] = v[1]; b.l[i] = v[2]; b.c[i] = v[3]; });
  b.n = ks.length; return b;
};
function toHours(bars) {
  const out = emptyBars(Math.ceil(bars.n / 30) + 2);
  let k = -1, cur = -1;
  for (let i = 0; i < bars.n; i++) {
    const hs = Math.floor(bars.t[i] / HOUR) * HOUR;
    if (hs !== cur) { k++; cur = hs; out.t[k] = hs; out.o[k] = bars.o[i]; out.h[k] = bars.h[i]; out.l[k] = bars.l[i]; out.c[k] = bars.c[i]; }
    else { if (bars.h[i] > out.h[k]) out.h[k] = bars.h[i]; if (bars.l[i] < out.l[k]) out.l[k] = bars.l[i]; out.c[k] = bars.c[i]; }
  }
  out.n = k + 1; return out;
}
async function importFiles(market, items, tzId, onProgress) {
  const tz = tzById(tzId), months = new Map();
  const total = items.reduce((a, it) => a + (it.src.size || 1), 0);
  let done = 0, rows = 0, bad = 0, digits = 0;
  for (const it of items) {
    const f = FORMATS[it.fmt];
    digits = Math.max(digits, it.digits || 0);
    let bytes = 0;
    for await (const chunk of lines(it.src.stream())) {
      for (const raw of chunk) {
        bytes += raw.length + 1;
        const l = raw.trim();
        if (!l || !f.test(l)) { if (l) bad++; continue; }
        const p = f.parse(l);
        if (!p || !(p[1] > 0) || !(p[2] > 0) || !(p[3] > 0) || !(p[4] > 0) || !Number.isFinite(p[0])) { bad++; continue; }
        const t = Math.floor(tz.toUtc(p[0]) / MIN) * MIN;
        const mk = monthKey(t);
        let acc = months.get(mk); if (!acc) months.set(mk, acc = new MonthAcc(mk));
        acc.add(t, p[1], Math.max(p[1], p[2], p[3], p[4]), Math.min(p[1], p[2], p[3], p[4]), p[4]);
        rows++;
      }
      onProgress && onProgress(0.7 * (done + Math.min(bytes, it.src.size || bytes)) / total, rows);
      await yieldUI();
    }
    done += it.src.size || bytes;
  }
  if (!rows) throw {code: 'empty', bad};
  digits = Math.max(0, Math.min(6, digits || MK[market].digits));
  // merge into what is already stored and write month blocks
  const idx = dataIndex(), info = Object.assign({months: {}, digits}, idx[market] || {});
  info.digits = Math.max(info.digits || 0, digits);
  const keys = Array.from(months.keys()).sort(), years = new Set();
  let k = 0;
  for (const mk of keys) {
    const acc = months.get(mk);
    if (info.months[mk]) {
      const old = await Blocks.get(Blocks.key(market, 'm1', mk));
      if (old) for (let i = 0; i < old.n; i++) { const m = Math.round((old.t[i] - acc.base) / MIN); if (!acc.map.has(m)) acc.map.set(m, [old.o[i], old.h[i], old.l[i], old.c[i]]); }
    }
    const bars = acc.bars();
    await Blocks.put(Blocks.key(market, 'm1', mk), await encodeBlock(bars, info.digits, 1, acc.base));
    info.months[mk] = bars.n;
    years.add(mk.slice(0, 4));
    onProgress && onProgress(0.7 + 0.25 * (++k / keys.length), rows);
  }
  // hour blocks per year (for higher timeframes and long history)
  for (const y of years) {
    const parts = [];
    for (let m = 1; m <= 12; m++) {
      const mk = y + '-' + pad(m);
      if (!info.months[mk]) continue;
      const b = months.has(mk) ? months.get(mk).bars() : await Blocks.get(Blocks.key(market, 'm1', mk));
      if (b) parts.push(toHours(b));
    }
    const hb = concatBars(parts);
    await Blocks.put(Blocks.key(market, 'h1', y), await encodeBlock(hb, info.digits, 60, Date.UTC(+y, 0, 1)));
  }
  const all = Object.keys(info.months).sort();
  info.first = all[0]; info.last = all[all.length - 1];
  info.bars = Object.values(info.months).reduce((a, b) => a + b, 0);
  info.updatedAt = Date.now();
  idx[market] = info;
  await saveIndex(idx);
  onProgress && onProgress(1, rows);
  return {rows, bad, months: keys.length, first: keys[0], last: keys[keys.length - 1]};
}
async function removeMarket(market) {
  const idx = dataIndex(), info = idx[market];
  if (!info) return;
  const keys = Object.keys(info.months).map(mk => Blocks.key(market, 'm1', mk));
  new Set(Object.keys(info.months).map(mk => mk.slice(0, 4))).forEach(y => keys.push(Blocks.key(market, 'h1', y)));
  await Blocks.remove(keys);
  delete idx[market];
  await saveIndex(idx);
}

/* ---------------------------------------------------------------- data access */
async function minutes(market, fromMs, toMs) {
  const info = dataIndex()[market]; if (!info) return emptyBars();
  const parts = [];
  for (let mk = monthKey(fromMs); monthStart(mk) <= toMs; mk = nextMonth(mk)) {
    if (!info.months[mk]) continue;
    const b = await Blocks.get(Blocks.key(market, 'm1', mk));
    if (b) parts.push(b);
  }
  const all = concatBars(parts);
  const a = lowerBound(all.t, all.n, fromMs), z = lowerBound(all.t, all.n, toMs + 1);
  return slice(all, a, z);
}
async function hours(market, fromMs, toMs) {
  const info = dataIndex()[market]; if (!info) return emptyBars();
  const parts = [];
  for (let y = new Date(fromMs).getUTCFullYear(); y <= new Date(toMs).getUTCFullYear(); y++) {
    if (!Object.keys(info.months).some(k => k.startsWith(y + '-'))) continue;
    const b = await Blocks.get(Blocks.key(market, 'h1', String(y)));
    if (b) parts.push(b);
  }
  const all = concatBars(parts);
  return slice(all, lowerBound(all.t, all.n, fromMs), lowerBound(all.t, all.n, toMs + 1));
}
function slice(b, a, z) {
  const out = {n: Math.max(0, z - a)};
  for (const f of ['t', 'o', 'h', 'l', 'c']) out[f] = b[f].subarray(a, z);
  return out;
}
// first minute at or after a time (searching forward month by month)
async function firstMinuteFrom(market, ms) {
  const info = dataIndex()[market]; if (!info) return null;
  const keys = Object.keys(info.months).sort();
  for (const mk of keys) {
    if (monthStart(nextMonth(mk)) <= ms) continue;
    const b = await Blocks.get(Blocks.key(market, 'm1', mk));
    if (!b || !b.n) continue;
    const i = lowerBound(b.t, b.n, ms);
    if (i < b.n) return b.t[i];
  }
  return null;
}

/* ---------------------------------------------------------------- timeframes
   bars up to 1h start on the UTC clock; 4h and daily bars start at 17:00 New York (the FX/CFD trading day) */
function barStart(ms, tfMin) {
  if (tfMin < 240) return Math.floor(ms / (tfMin * MIN)) * tfMin * MIN;
  const off = nyOffset(ms) + 7 * HOUR;       // shift so 17:00 New York becomes 00:00
  const span = tfMin * MIN;
  return Math.floor((ms + off) / span) * span - off;
}
function aggregate(src, tfMin, untilMs) {
  const out = emptyBars(Math.ceil(src.n / Math.max(1, tfMin / 60)) + 4 + Math.ceil(src.n / tfMin));
  let k = -1, cur = -Infinity;
  for (let i = 0; i < src.n; i++) {
    const t = src.t[i];
    if (untilMs != null && t > untilMs) break;
    const bs = barStart(t, tfMin);
    if (bs !== cur) { k++; cur = bs; out.t[k] = bs; out.o[k] = src.o[i]; out.h[k] = src.h[i]; out.l[k] = src.l[i]; out.c[k] = src.c[i]; }
    else { if (src.h[i] > out.h[k]) out.h[k] = src.h[i]; if (src.l[i] < out.l[k]) out.l[k] = src.l[i]; out.c[k] = src.c[i]; }
  }
  out.n = k + 1; return out;
}
function atr(b, len) {
  const n = b.n; if (n < 2) return 0;
  let s = 0, c = 0;
  for (let i = Math.max(1, n - len); i < n; i++) { s += Math.max(b.h[i] - b.l[i], Math.abs(b.h[i] - b.c[i - 1]), Math.abs(b.l[i] - b.c[i - 1])); c++; }
  return c ? s / c : 0;
}

/* ---------------------------------------------------------------- trades and statistics */
function rOf(tr, exit) {
  const risk = Math.abs(tr.entry - tr.sl0);
  if (!risk) return 0;
  return (tr.side === 'long' ? exit - tr.entry : tr.entry - exit) / risk;
}
const resultOf = r => r > 0.05 ? 'tp' : r < -0.05 ? 'sl' : 'be';
function stats(trades) {
  const closed = trades.filter(t => t.exitTime != null);
  let tp = 0, sl = 0, be = 0, sum = 0, win = 0, loss = 0, peak = 0, eq = 0, dd = 0;
  const curve = [0];
  for (const t of closed) {
    const r = t.r || 0; const k = resultOf(r);
    if (k === 'tp') { tp++; win += r; } else if (k === 'sl') { sl++; loss += -r; } else be++;
    sum += r; eq += r; curve.push(eq); peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq);
  }
  return {n: closed.length, tp, sl, be, sum, avg: closed.length ? sum / closed.length : 0, wr: tp + sl ? tp / (tp + sl) : null, pf: loss ? win / loss : (win ? Infinity : null), dd, curve};
}
function sparkSvg(curve, w, h) {
  if (curve.length < 2) return `<svg viewBox="0 0 ${w} ${h}" class="spark" aria-hidden="true"><path d="M0 ${h / 2}H${w}" class="sp-zero"/></svg>`;
  const lo = Math.min(0, ...curve), hi = Math.max(0, ...curve), span = hi - lo || 1;
  const x = i => (i / (curve.length - 1)) * w, y = v => h - 2 - ((v - lo) / span) * (h - 4);
  const d = curve.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
  const last = curve[curve.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" class="spark ${last > 0 ? 'pos' : last < 0 ? 'neg' : ''}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(0).toFixed(1)}H${w}" class="sp-zero"/><path d="${d}" class="sp-line"/></svg>`;
}

/* ---------------------------------------------------------------- module state */
let CTX = null;
const V = {el: null, mode: 'list', sid: null, ws: null, dlg: null, guideOpen: null, guideSrc: 'histdata'};

/* ================================================================ OVERVIEW */
function renderList() {
  const el = V.el; if (!el) return;
  const idx = dataIndex(), list = sessions().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const have = MARKETS.filter(m => idx[m.id]);
  const loaded = CTX.S.loaded ? CTX.S.loaded.backtests !== false : true;
  el.innerHTML = `
  <section class="bt-over" aria-label="Backtesting">
    <div class="page-head">
      <div class="grow"><h1>Backtesting</h1><p>Spiel den Markt Kerze für Kerze nach und teste dein Setup, bevor echtes Geld im Spiel ist.</p></div>
      <button type="button" class="btn primary" data-bt="new"${have.length ? '' : ' disabled'}>${ICON_PLUS}Neue Session</button>
    </div>
    <div class="bt-cols">
      <div class="bt-sess">
        <h2 class="bt-h">Sessions</h2>
        ${!loaded ? '<div class="empty sm"><p>Sessions werden geladen…</p></div>'
          : list.length ? '<div class="bt-cards">' + list.map(sessCard).join('') + '</div>'
          : `<div class="empty"><h3>Noch keine Session</h3><p>${have.length ? 'Starte eine Session: Markt wählen, Startzeitpunkt setzen und dann Kerze für Kerze traden.' : 'Importiere zuerst Kursdaten für einen Markt. Wo du sie bekommst und wie du sie herunterlädst, steht in der Anleitung.'}</p>${have.length ? `<button type="button" class="btn primary" data-bt="new">${ICON_PLUS}Erste Session starten</button>` : '<button type="button" class="btn" data-bt="guide">Zur Anleitung</button>'}</div>`}
      </div>
      <aside class="bt-data" aria-label="Kursdaten">
        <h2 class="bt-h">Kursdaten</h2>
        <p class="bt-note">Deine 1-Minuten-Daten, die nur du siehst. Lade sie einmal herunter und importiere sie hier. <button type="button" class="bt-link" data-bt="guide">Wo bekomme ich die Daten?</button></p>
        <ul class="bt-mkts">${MARKETS.map(m => mktRow(m, idx[m.id])).join('')}</ul>
      </aside>
    </div>
    ${guideHtml(V.guideOpen == null ? !have.length : V.guideOpen)}
  </section>`;
  const g = $('#bt-guide', el);
  if (g) g.addEventListener('toggle', () => { V.guideOpen = g.open; });
}

/* ---- guide: where the price data comes from and how to download it */
const ICON_EXT = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const DUKA_URL = 'https://www.dukascopy.com/swiss/deutsch/marketwatch/historical/';
const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const SOURCES = [
  {id: 'histdata', name: 'HistData', badge: 'Empfohlen',
    lead: 'Kostenlos, ohne Abo und viele Jahre zurück. Für alle sechs Märkte der einfachste Weg.',
    steps: [
      'Öffne unten die Seite deines Markts bei HistData. Dort sind 1-Minuten-Kerzen im Format „Generic ASCII“ schon ausgewählt.',
      'Klicke auf das Jahr, das du testen willst. Für das laufende Jahr stehen dort einzelne Monate.',
      'Auf der nächsten Seite klickst du den Link mit dem Dateinamen, der mit „HISTDATA_COM_ASCII“ beginnt. Die ZIP-Datei wird heruntergeladen.',
      'Wiederhole das für jedes weitere Jahr.',
      'Zieh die ZIP-Dateien unverändert in den Import. Entpacken musst du nichts.'
    ],
    extra: () => `<h4 class="bt-g-sub">Deine Märkte bei HistData</h4>
      <ul class="bt-g-links">${MARKETS.map(m => `<li><a href="${HIST_URL(m)}" target="_blank" rel="noopener noreferrer">
        <span class="bt-mk-tag">${esc(m.tag)}</span><span class="bt-g-lt"><b>${esc(m.name)}</b><small>heißt dort ${esc(m.hist.toUpperCase())}</small></span>${ICON_EXT}</a></li>`).join('')}</ul>`},
  {id: 'dukascopy', name: 'Dukascopy',
    lead: 'Kostenlos und sehr sauber, dazu viele Märkte. Für den Download kann Dukascopy eine kostenlose Anmeldung verlangen.',
    steps: [
      `Öffne den ${ext(DUKA_URL, 'Export historischer Daten bei Dukascopy')}.`,
      'Wähle dein Instrument. Indizes heißen dort anders, der Nasdaq 100 zum Beispiel „USA 100 Technical Index“.',
      'Stell den Zeitrahmen auf 1 Minute, wähl den Zeitraum und als Dateiformat CSV. Die Zeit bleibt auf GMT.',
      'Lade die Datei herunter und zieh sie in den Import.'
    ]},
  {id: 'mt5', name: 'MetaTrader 5',
    lead: 'Die Kurse deines eigenen Brokers. Wie weit sie zurückgehen, hängt vom Broker ab.',
    steps: [
      'Öffne in MetaTrader 5 „Ansicht → Symbole“ (unter Windows Strg+U).',
      'Wähle dein Symbol, zum Beispiel US100, GER40 oder XAUUSD, und öffne den Reiter „Balken“ (Bars).',
      'Stell M1 und den Zeitraum ein und klicke „Anfordern“ (Request).',
      'Klicke „Balken exportieren“ (Export Bars) und speichere die Datei als CSV.',
      'Zieh die Datei in den Import. Blotter schlägt die übliche Serverzeit vor (UTC+2, im US-Sommer UTC+3). Prüf, ob das bei deinem Broker stimmt.'
    ],
    tip: 'Kommen weniger Kerzen als erwartet, erhöhe in den MetaTrader-Einstellungen unter „Charts“ die maximale Anzahl Balken und starte MetaTrader neu.'},
  {id: 'tradingview', name: 'TradingView',
    lead: 'Geht nur mit einem bezahlten TradingView-Abo. Exportiert werden nur die Kerzen, die im Chart geladen sind, bei 1-Minuten-Kerzen also eher kurze Zeiträume.',
    steps: [
      'Öffne deinen Markt im 1-Minuten-Chart.',
      'Scroll nach links, bis der Zeitraum geladen ist, den du testen willst.',
      'Öffne oben im Menü „Chartdaten herunterladen…“ (Download chart data) und lade die CSV-Datei herunter.',
      'Zieh die Datei in den Import.'
    ]}
];
function guideHtml(open) {
  const cur = SOURCES.find(s => s.id === V.guideSrc) || SOURCES[0];
  return `<details class="bt-guide" id="bt-guide"${open ? ' open' : ''}>
    <summary><span class="bt-g-title">Anleitung: Kursdaten herunterladen</span><span class="bt-g-hint">Woher die Kurse kommen und wie du sie in Blotter bekommst</span></summary>
    <div class="bt-g-body">
      <p class="bt-g-intro">Für das Backtesting brauchst du Kurse als 1-Minuten-Kerzen (M1). Blotter liefert keine Kurse mit: Du lädst sie einmal selbst herunter und importierst sie hier. Danach liegen sie privat in deinem Konto und sind auf all deinen Geräten da. Für den Anfang reicht ein Jahr pro Markt, das sind etwa 2 MB.</p>
      <div class="bt-g-tabs" role="tablist" aria-label="Datenquelle">${SOURCES.map(s => `<button type="button" role="tab" id="bt-gt-${s.id}" aria-controls="bt-gp-${s.id}" aria-selected="${s === cur}" tabindex="${s === cur ? 0 : -1}" data-bt="gsrc" data-src="${s.id}">${esc(s.name)}${s.badge ? `<span class="bt-g-badge">${esc(s.badge)}</span>` : ''}</button>`).join('')}</div>
      ${SOURCES.map(s => `<section class="bt-g-panel" role="tabpanel" id="bt-gp-${s.id}" aria-labelledby="bt-gt-${s.id}"${s === cur ? '' : ' hidden'}>
        <p class="bt-g-lead">${s.lead}</p>
        <ol class="bt-g-steps">${s.steps.map(t => `<li>${t}</li>`).join('')}</ol>
        ${s.tip ? `<p class="bt-g-tip">${esc(s.tip)}</p>` : ''}
        ${s.extra ? s.extra() : ''}
      </section>`).join('')}
      <dl class="bt-g-notes">
        <div><dt>Zeitzone</dt><dd>Blotter erkennt beim Import, aus welcher Quelle die Datei stammt, und stellt die Zeitzone passend ein. Vor dem Import kannst du sie noch ändern.</dd></div>
        <div><dt>Mehr Jahre</dt><dd>Weitere Jahre kannst du jederzeit mit „Ergänzen“ dazuholen. Bereits importierte Monate werden zusammengeführt.</dd></div>
        <div><dt>Nur für dich</dt><dd>Deine Kursdaten liegen in deinem Konto und sind für niemanden sonst sichtbar.</dd></div>
      </dl>
      <div class="bt-g-foot"><button type="button" class="btn primary" data-bt="import">Kursdaten importieren</button></div>
    </div>
  </details>`;
}
function selectSource(id) {
  if (!SOURCES.some(s => s.id === id)) return;
  V.guideSrc = id;
  const g = $('#bt-guide'); if (!g) return;
  $$('[role="tab"]', g).forEach(t => { const on = t.dataset.src === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
  $$('.bt-g-panel', g).forEach(p => { p.hidden = p.id !== 'bt-gp-' + id; });
}
function showGuide() {
  closeDialog();
  if (V.mode !== 'list') return;
  const g = $('#bt-guide'); if (!g) return;
  g.open = true; V.guideOpen = true;
  // below the sticky header (two rows on phones)
  requestAnimationFrame(() => {
    const tb = document.getElementById('topbar'), off = (tb ? tb.getBoundingClientRect().bottom : 0) + 14;
    window.scrollTo({top: Math.max(0, g.getBoundingClientRect().top + window.scrollY - off), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });
}
const ICON_PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
function mktRow(m, info) {
  const span = info ? fMon.format(new Date(monthStart(info.first))) + ' – ' + fMon.format(new Date(monthStart(info.last))) : '';
  return `<li class="bt-mkt${info ? ' has' : ''}">
    <span class="bt-mk-tag">${esc(m.tag)}</span>
    <span class="bt-mk-txt"><b>${esc(m.name)}</b><small>${info ? esc(span) + ' · ' + nf(info.bars, 0) + ' Kerzen' : 'Noch keine Daten'}</small></span>
    <button type="button" class="btn sm${info ? ' ghost' : ''}" data-bt="import" data-mk="${m.id}">${info ? 'Ergänzen' : 'Importieren'}</button>
  </li>`;
}
function sessCard(s) {
  const st = stats(s.trades || []), m = MK[s.market] || {tag: s.market};
  const when = s.cursor ? fDate.format(new Date(s.cursor)) : '';
  return `<button type="button" class="bt-card spot" data-bt="open" data-id="${esc(s.id)}">
    <span class="bt-c-top"><span class="bt-mk-tag">${esc(m.tag)}</span><span class="bt-c-tf">${esc((TF[s.tf] || TF['5m']).label)}</span><span class="spacer"></span><span class="bt-c-when">${esc(when)}</span></span>
    <b class="bt-c-name">${esc(s.name || 'Session')}</b>
    ${sparkSvg(st.curve, 240, 46)}
    <span class="bt-c-stats"><span><b>${st.n}</b> Trades</span><span><b>${st.wr == null ? '–' : Math.round(st.wr * 100) + ' %'}</b> Win-Rate</span><span class="${st.sum > 0 ? 'pos' : st.sum < 0 ? 'neg' : ''}"><b>${st.n ? fR(st.sum) : '–'}</b> gesamt</span></span>
  </button>`;
}

/* ================================================================ DIALOGS */
function dialog(html, cls) {
  closeDialog();
  const d = document.createElement('div');
  d.className = 'bt-dlg-wrap';
  d.innerHTML = `<div class="bt-dlg ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(d);
  V.dlg = d;
  requestAnimationFrame(() => d.classList.add('on'));
  const f = d.querySelector('[autofocus], input, select, button.primary');
  if (f) setTimeout(() => f.focus(), 60);
  d.addEventListener('mousedown', e => { if (e.target === d && !d.dataset.busy) closeDialog(); });
  return d;
}
function closeDialog() {
  const d = V.dlg; V.dlg = null;
  if (!d) return;
  d.classList.remove('on');
  setTimeout(() => d.remove(), 220);
}

/* ---- import */
function openImport(market) {
  const m = MK[market] || MARKETS[0];
  const d = dialog(`
    <div class="bt-dlg-head"><h2>Kursdaten importieren</h2><button type="button" class="btn icon ghost" data-bt="close" aria-label="Schließen">✕</button></div>
    <label class="bt-fl">Markt
      <select class="inp" id="bt-im-mk">${MARKETS.map(x => `<option value="${x.id}"${x.id === m.id ? ' selected' : ''}>${esc(x.name)} (${esc(x.tag)})</option>`).join('')}</select>
    </label>
    <div class="bt-steps" id="bt-im-help"></div>
    <label class="bt-drop" id="bt-drop" tabindex="0">
      <input type="file" id="bt-file" multiple accept=".zip,.csv,.txt" hidden>
      <b>Dateien hierher ziehen</b><span>oder klicken zum Auswählen · ZIP, CSV oder TXT, mehrere auf einmal</span>
    </label>
    <div class="bt-im-files" id="bt-im-files"></div>
    <div class="bt-im-foot">
      <div class="bt-prog" id="bt-prog" hidden><i></i></div>
      <p class="bt-im-msg" id="bt-im-msg" role="status"></p>
      <div class="row-btns"><button type="button" class="btn ghost" data-bt="close">Abbrechen</button><button type="button" class="btn primary" id="bt-im-go" disabled>Importieren</button></div>
    </div>`, 'wide');
  const help = () => {
    const x = MK[$('#bt-im-mk', d).value];
    $('#bt-im-help', d).innerHTML = `<ol>
      <li>Öffne <a href="${HIST_URL(x)}" target="_blank" rel="noopener noreferrer">HistData: ${esc(x.name)}</a> (kostenlos).</li>
      <li>Lade die Jahre herunter, die du testen willst. Für das laufende Jahr gibt es einzelne Monate.</li>
      <li>Zieh die ZIP-Dateien unverändert hier hinein. Exporte aus MetaTrader, TradingView oder Dukascopy gehen auch.</li></ol>
      <p class="bt-steps-more">Schritt für Schritt und für alle Quellen: <button type="button" class="bt-link" data-bt="guide">Anleitung öffnen</button></p>`;
  };
  help();
  $('#bt-im-mk', d).addEventListener('change', () => { help(); if (state.items) showFiles(); });
  const state = {items: null};
  const showFiles = () => {
    const box = $('#bt-im-files', d), mk = $('#bt-im-mk', d).value;
    const ok = state.items.filter(i => i.fmt), bad = state.items.filter(i => !i.fmt);
    const tz = ok.length ? ok[0].tz : 'utc';
    const other = ok.find(i => i.guess && i.guess !== mk);
    box.innerHTML = `<ul>${state.items.map(i => `<li class="${i.fmt ? '' : 'bad'}"><b>${esc(i.src.name)}</b><span>${i.fmt ? esc(FORMATS[i.fmt].name) : 'Format nicht erkannt'}</span></li>`).join('')}</ul>
      ${ok.length ? `<label class="bt-fl">Zeitzone der Datei<select class="inp" id="bt-im-tz">${TZS.map(z => `<option value="${z.id}"${z.id === tz ? ' selected' : ''}>${esc(z.name)}</option>`).join('')}</select></label>` : ''}
      ${other ? `<p class="bt-warn">Die Datei „${esc(other.src.name)}“ sieht nach ${esc(MK[other.guess].name)} aus. Prüfe, ob der Markt oben stimmt.</p>` : ''}
      ${bad.length ? '<p class="bt-warn">Nicht erkannte Dateien werden übersprungen. Unterstützt: HistData (Generic ASCII oder MetaTrader), MetaTrader-Export, TradingView-Export, Dukascopy-Export.</p>' : ''}`;
    $('#bt-im-go', d).disabled = !ok.length;
  };
  const take = async files => {
    if (!files || !files.length) return;
    $('#bt-im-msg', d).textContent = 'Dateien werden geprüft…';
    try {
      state.items = await inspectFiles(Array.from(files));
      const g = state.items.find(i => i.guess);
      if (g && !(MK[$('#bt-im-mk', d).value] && state.items.some(i => i.guess === $('#bt-im-mk', d).value))) { $('#bt-im-mk', d).value = g.guess; help(); }
      $('#bt-im-msg', d).textContent = '';
      showFiles();
    } catch (e) {
      $('#bt-im-msg', d).textContent = 'Die Datei konnte nicht gelesen werden. Ist es eine ZIP-, CSV- oder TXT-Datei?';
    }
  };
  const drop = $('#bt-drop', d), fi = $('#bt-file', d);
  drop.addEventListener('click', e => { if (e.target !== fi) { e.preventDefault(); fi.click(); } });
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
  fi.addEventListener('change', () => take(fi.files));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files); });
  $('#bt-im-go', d).addEventListener('click', async () => {
    const mk = $('#bt-im-mk', d).value, tz = ($('#bt-im-tz', d) || {}).value || 'utc';
    const items = state.items.filter(i => i.fmt);
    const go = $('#bt-im-go', d), prog = $('#bt-prog', d), msg = $('#bt-im-msg', d);
    go.disabled = true; d.dataset.busy = '1'; prog.hidden = false;
    $$('button[data-bt="close"]', d).forEach(b => { b.disabled = true; });
    try {
      const res = await importFiles(mk, items, tz, (p, rows) => {
        prog.firstElementChild.style.transform = `scaleX(${p.toFixed(3)})`;
        msg.textContent = p < 0.7 ? nf(rows, 0) + ' Kerzen gelesen…' : 'Wird gespeichert…';
      });
      delete d.dataset.busy;
      msg.textContent = '';
      CTX.toast(nf(res.rows, 0) + ' Kerzen für ' + MK[mk].name + ' importiert (' + fMon.format(new Date(monthStart(res.first))) + ' – ' + fMon.format(new Date(monthStart(res.last))) + ').');
      closeDialog();
      if (V.mode === 'list') renderList();
    } catch (e) {
      delete d.dataset.busy;
      $$('button[data-bt="close"]', d).forEach(b => { b.disabled = false; });
      go.disabled = false; prog.hidden = true;
      msg.textContent = e && e.code === 'empty' ? 'In den Dateien wurden keine Kerzen gefunden.'
        : e && (e.code === 'local_full' || e.code === 'quota_exceeded') ? 'Der Speicher ist voll. Importiere weniger Jahre auf einmal.'
        : 'Import hat nicht geklappt. Prüfe deine Verbindung und versuch es erneut.';
    }
  });
}

/* ---- new session */
function openNew() {
  const idx = dataIndex(), have = MARKETS.filter(m => idx[m.id]);
  if (!have.length) { openImport(); return; }
  const m0 = have[0], info0 = idx[m0.id];
  const defStart = mk => { const i = idx[mk]; const k = i.last; const s = monthStart(Object.keys(i.months).sort().length > 1 ? prevMonth(k) : k); return s; };
  const toLocalInput = ms => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const d = dialog(`
    <div class="bt-dlg-head"><h2>Neue Session</h2><button type="button" class="btn icon ghost" data-bt="close" aria-label="Schließen">✕</button></div>
    <label class="bt-fl">Markt<select class="inp" id="bt-n-mk">${have.map(m => `<option value="${m.id}">${esc(m.name)} (${esc(m.tag)})</option>`).join('')}</select></label>
    <div class="bt-2">
      <label class="bt-fl">Start (deine Zeit)<input class="inp" type="datetime-local" id="bt-n-start" value="${toLocalInput(defStart(m0.id) + 8 * HOUR)}"></label>
      <label class="bt-fl">Zeiteinheit<select class="inp" id="bt-n-tf">${TFS.map(t => `<option value="${t.id}"${t.id === '5m' ? ' selected' : ''}>${t.id === '1D' ? 'Täglich' : t.label}</option>`).join('')}</select></label>
    </div>
    <label class="bt-fl">Name (optional)<input class="inp" id="bt-n-name" maxlength="60" placeholder="z. B. London Sweep, Q1"></label>
    <p class="bt-note" id="bt-n-span"></p>
    <p class="bt-im-msg" id="bt-n-msg" role="status"></p>
    <div class="row-btns end"><button type="button" class="btn ghost" data-bt="close">Abbrechen</button><button type="button" class="btn primary" id="bt-n-go">Session starten</button></div>`);
  const span = () => { const i = idx[$('#bt-n-mk', d).value]; $('#bt-n-span', d).textContent = 'Daten vorhanden: ' + fMon.format(new Date(monthStart(i.first))) + ' bis ' + fMon.format(new Date(monthStart(i.last))) + '.'; };
  span();
  $('#bt-n-mk', d).addEventListener('change', () => { span(); $('#bt-n-start', d).value = toLocalInput(defStart($('#bt-n-mk', d).value) + 8 * HOUR); });
  $('#bt-n-go', d).addEventListener('click', async () => {
    const mk = $('#bt-n-mk', d).value, tf = $('#bt-n-tf', d).value, v = $('#bt-n-start', d).value;
    const start = v ? new Date(v).getTime() : NaN;
    const msg = $('#bt-n-msg', d);
    if (!Number.isFinite(start)) { msg.textContent = 'Wähle einen Startzeitpunkt.'; return; }
    $('#bt-n-go', d).disabled = true; msg.textContent = 'Daten werden geladen…';
    const first = await firstMinuteFrom(mk, start);
    if (first == null) { msg.textContent = 'Ab diesem Zeitpunkt gibt es keine Daten. Wähle einen früheren Start.'; $('#bt-n-go', d).disabled = false; return; }
    const name = $('#bt-n-name', d).value.trim() || MK[mk].tag + ' ab ' + fDate.format(new Date(first));
    const s = {id: rid('bt'), name, market: mk, tf, start: first, cursor: first, trades: [], order: null, createdAt: Date.now(), updatedAt: Date.now()};
    try { await CTX.Store.save('backtests', s); }
    catch (e) { msg.textContent = 'Die Session konnte nicht gespeichert werden. Prüfe deine Verbindung.'; $('#bt-n-go', d).disabled = false; return; }
    closeDialog();
    openSession(s.id);
  });
}

/* ================================================================ WORKSPACE */
function openSession(id) {
  const s = sessions().find(x => x.id === id);
  if (!s) return;
  V.mode = 'ws'; V.sid = id;
  CTX.setWide && CTX.setWide(true);
  V.ws = new Workspace(s);
}
function closeSession() {
  if (V.ws) { V.ws.flush(); V.ws.destroy(); V.ws = null; }
  V.mode = 'list'; V.sid = null;
  CTX.setWide && CTX.setWide(false);
  renderList();
}

class Workspace {
  constructor(s) {
    this.s = JSON.parse(JSON.stringify(s));
    this.tf = TF[s.tf] ? s.tf : '5m';
    this.m = MK[s.market];
    this.digits = (dataIndex()[s.market] || {}).digits || this.m.digits;
    this.min = emptyBars(); this.i = -1;     // minute window, index of the last revealed minute
    this.view = emptyBars();                  // displayed bars
    this.playing = false; this.speed = 2; this.draft = null;
    this.dirty = false; this.saveT = 0;
    this.build();
    this.load();
  }
  /* ---------- layout */
  build() {
    const el = V.el;
    el.innerHTML = `
    <section class="bt-ws" aria-label="Backtest ${esc(this.s.name)}">
      <div class="bt-bar">
        <button type="button" class="btn sm ghost" data-ws="back" aria-label="Zurück zu den Sessions">‹ Sessions</button>
        <div class="bt-title"><b>${esc(this.s.name)}</b><span><span class="bt-mk-tag">${esc(this.m.tag)}</span><span id="bt-clock">–</span></span></div>
        <span class="spacer"></span>
        <div class="seg bt-tfs" role="radiogroup" aria-label="Zeiteinheit">${TFS.map(t => `<button type="button" role="radio" aria-checked="${t.id === this.tf}" data-tf="${t.id}">${t.label}</button>`).join('')}</div>
      </div>
      <div class="bt-main">
        <div class="bt-chartbox">
          <div class="bt-chart" id="bt-chart"><div class="bt-loading" id="bt-loading">Kursdaten werden geladen…</div></div>
          <div class="bt-ctrl" role="group" aria-label="Wiedergabe">
            <button type="button" class="btn icon" data-ws="play" id="bt-play" aria-label="Abspielen" title="Abspielen (Leertaste)"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path class="pl" d="M8 5.5v13l11-6.5z" fill="currentColor"/><path class="pa" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg></button>
            <button type="button" class="btn icon" data-ws="step" aria-label="Nächste Kerze" title="Nächste Kerze (→)"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 5.5v13l9-6.5z" fill="currentColor"/><path d="M16.5 5H19v14h-2.5z" fill="currentColor"/></svg></button>
            <div class="seg bt-speed" role="radiogroup" aria-label="Tempo">${[1, 2, 5, 10].map(v => `<button type="button" role="radio" aria-checked="${v === this.speed}" data-speed="${v}">${v}×</button>`).join('')}</div>
            <span class="spacer"></span>
            <button type="button" class="btn sm ghost" data-ws="jump">Springen</button>
          </div>
        </div>
        <aside class="bt-side">
          <div class="bt-ticket" id="bt-ticket"></div>
          <div class="bt-stats" id="bt-stats"></div>
          <div class="bt-trades" id="bt-trades"></div>
        </aside>
      </div>
    </section>`;
    this.box = $('#bt-chart', el);
    this.onClick = e => this.click(e);
    el.addEventListener('click', this.onClick);
    this.onInput = e => this.input(e);
    el.addEventListener('input', this.onInput);
    this.onKey = e => this.key(e);
    window.addEventListener('keydown', this.onKey, true);
  }
  destroy() {
    this.pause();
    window.removeEventListener('keydown', this.onKey, true);
    V.el && V.el.removeEventListener('click', this.onClick);
    V.el && V.el.removeEventListener('input', this.onInput);
    if (this.ro) this.ro.disconnect();
    if (this.chart) { try { this.chart.remove(); } catch (e) {} this.chart = null; }
  }
  /* ---------- data */
  async load() {
    try { await CTX.chartLib(); } catch (e) { $('#bt-loading').textContent = 'Der Chart konnte nicht geladen werden. Prüfe deine Verbindung.'; return; }
    this.initChart();
    await this.loadAround(this.s.cursor);
    this.redraw(true);
    this.renderSide();
    const ld = $('#bt-loading'); if (ld) ld.remove();
  }
  async loadAround(cursor) {
    const tfm = TF[this.tf].min;
    const back = tfm < 60 ? Math.max(LOOKBACK_BARS * tfm * MIN, 2 * DAY) : 2 * DAY + 4 * DAY;
    const from = cursor - back, to = monthStart(nextMonth(nextMonth(monthKey(cursor))));
    this.min = await minutes(this.s.market, from, to);
    this.i = lowerBound(this.min.t, this.min.n, cursor + 1) - 1;
    if (this.i < 0 && this.min.n) this.i = 0;
    this.hist = null;
    if (tfm >= 60) {
      const hf = cursor - LOOKBACK_BARS * tfm * MIN * (tfm >= 1440 ? 1.45 : 1.1);
      this.hist = await hours(this.s.market, hf, barStart(cursor, tfm) - 1);
    }
    this.end = this.min.n ? this.min.t[this.min.n - 1] : cursor;
  }
  async more() {   // the next two months after the loaded window
    if (this.fetching) return this.fetching;
    this.fetching = (async () => {
      const from = this.min.n ? this.min.t[this.min.n - 1] + MIN : this.s.cursor;
      const add = await minutes(this.s.market, from, monthStart(nextMonth(nextMonth(monthKey(from)))));
      if (add.n) { this.min = concatBars([this.min, add]); this.end = this.min.t[this.min.n - 1]; }
      return add.n;
    })().finally(() => { this.fetching = null; });
    return this.fetching;
  }
  get now() { return this.i >= 0 ? this.min.t[this.i] : this.s.cursor; }
  get last() { return this.i >= 0 ? this.min.c[this.i] : NaN; }
  /* ---------- chart */
  initChart() {
    const L = window.LightweightCharts, cs = getComputedStyle(document.documentElement);
    const rgb = v => (cs.getPropertyValue(v) || '').trim();
    const up = 'rgb(' + (rgb('--up-rgb') || '67,216,150') + ')', dn = 'rgb(' + (rgb('--down-rgb') || '255,115,119') + ')';
    const fg = rgb('--fg-rgb') || '230,236,245';
    this.col = {up, dn, fg: 'rgba(' + fg + ',.92)', mute: 'rgba(' + fg + ',.55)', grid: 'rgba(' + fg + ',.06)', upA: 'rgba(' + (rgb('--up-rgb') || '67,216,150') + ',', dnA: 'rgba(' + (rgb('--down-rgb') || '255,115,119') + ','};
    const font = (cs.getPropertyValue('--f-mono') || '').trim() || 'ui-monospace, Menlo, monospace';
    this.chart = L.createChart(this.box, {
      autoSize: true,
      layout: {background: {type: 'solid', color: 'transparent'}, textColor: this.col.mute, fontFamily: font, fontSize: 11, attributionLogo: true},
      grid: {vertLines: {color: this.col.grid}, horzLines: {color: this.col.grid}},
      rightPriceScale: {borderColor: this.col.grid, scaleMargins: {top: 0.12, bottom: 0.1}},
      timeScale: {borderColor: this.col.grid, timeVisible: true, secondsVisible: false, rightOffset: 12, barSpacing: 8, shiftVisibleRangeOnNewBar: true},
      crosshair: {mode: 0, vertLine: {color: this.col.mute, labelBackgroundColor: '#1b2a52'}, horzLine: {color: this.col.mute, labelBackgroundColor: '#1b2a52'}},
      localization: {locale: LOC, priceFormatter: p => nf(p, this.digits)},
    });
    this.series = this.chart.addSeries(L.CandlestickSeries, {
      upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn,
      priceFormat: {type: 'price', precision: this.digits, minMove: Math.pow(10, -this.digits)}, priceLineVisible: true, lastValueVisible: true,
    });
    this.markers = L.createSeriesMarkers ? L.createSeriesMarkers(this.series, []) : null;
    this.wmLine = t => [{text: this.m.tag + ' · ' + TF[t].label, color: 'rgba(' + fg + ',.05)', fontSize: 64, fontStyle: '700'}];
    try { this.wm = L.createTextWatermark(this.chart.panes()[0], {horzAlign: 'center', vertAlign: 'center', lines: this.wmLine(this.tf)}); } catch (e) { this.wm = null; }
    this.pos = new PositionPrimitive(this);
    this.series.attachPrimitive(this.pos);
    this.lines = {};
    this.drag = new LineDrag(this);
  }
  ct(ms) { return Math.floor((ms + localOffset(ms)) / 1000); }      // chart time: local clock shown as UTC
  barOf(ms) { return barStart(ms, TF[this.tf].min); }
  redraw(fit) {
    const tfm = TF[this.tf].min, now = this.now;
    const curStart = this.barOf(now);
    let bars;
    if (tfm < 60) {
      const from = lowerBound(this.min.t, this.min.n, curStart - LOOKBACK_BARS * tfm * MIN);
      bars = aggregate(slice(this.min, from, this.i + 1), tfm);
    } else {
      const h = this.hist ? aggregate(this.hist, tfm) : emptyBars();
      let z = h.n; while (z > 0 && h.t[z - 1] >= curStart) z--;
      const from = lowerBound(this.min.t, this.min.n, curStart);
      const cur = aggregate(slice(this.min, from, this.i + 1), tfm);
      bars = concatBars([slice(h, Math.max(0, z - LOOKBACK_BARS), z), cur]);
    }
    this.view = bars;
    const data = [];
    let lastT = -Infinity;
    for (let i = 0; i < bars.n; i++) {
      const t = this.ct(bars.t[i]);
      if (t <= lastT) continue;
      lastT = t;
      data.push({time: t, open: bars.o[i], high: bars.h[i], low: bars.l[i], close: bars.c[i]});
    }
    this.series.setData(data);
    this.lastBarT = lastT;
    if (fit) this.chart.timeScale().scrollToRealTime();
    this.applyMarkers();
    this.refreshLines();
    this.clock();
  }
  // reveal one more minute; returns false at the end of the data
  async tick() {
    if (this.i + 1 >= this.min.n) {
      const n = await this.more();
      if (!n) return false;
    }
    this.i++;
    const tfm = TF[this.tf].min, t = this.min.t[this.i];
    const bs = this.barOf(t), v = this.view;
    const k = v.n - 1;
    if (k >= 0 && v.t[k] === bs) {
      if (this.min.h[this.i] > v.h[k]) v.h[k] = this.min.h[this.i];
      if (this.min.l[this.i] < v.l[k]) v.l[k] = this.min.l[this.i];
      v.c[k] = this.min.c[this.i];
    } else {
      if (v.t.length <= v.n) { const g = emptyBars(v.n * 2 + 64); for (const f of ['t', 'o', 'h', 'l', 'c']) g[f].set(v[f].subarray(0, v.n)); g.n = v.n; this.view = g; }
      const w = this.view, j = w.n++;
      w.t[j] = bs; w.o[j] = this.min.o[this.i]; w.h[j] = this.min.h[this.i]; w.l[j] = this.min.l[this.i]; w.c[j] = this.min.c[this.i];
    }
    const w = this.view, j = w.n - 1, ctime = this.ct(w.t[j]);
    if (ctime >= this.lastBarT) { this.series.update({time: ctime, open: w.o[j], high: w.h[j], low: w.l[j], close: w.c[j]}); this.lastBarT = ctime; }
    this.fill();
    return true;
  }
  // reveals minutes until the bar in progress is complete (or, if it just completed, the whole next bar)
  async stepBar() {
    if (this.busy) return; this.busy = true;
    try {
      for (let moved = 0; moved < 50000; moved++) {
        if (this.i + 1 >= this.min.n && !(await this.more())) { this.endOfData(); break; }
        if (moved > 0 && this.barOf(this.min.t[this.i + 1]) !== this.barOf(this.now)) break;
        await this.tick();
        if (this.stopFlag) { this.stopFlag = false; break; }
      }
      this.after();
    } finally { this.busy = false; }
  }
  play() {
    if (this.playing) return;
    this.playing = true; this.acc = 0; this.t0 = performance.now();
    $('#bt-play') && $('#bt-play').classList.add('on');
    $('#bt-play') && $('#bt-play').setAttribute('aria-label', 'Anhalten');
    const loop = async now => {
      if (!this.playing) return;
      const dt = Math.min(100, now - this.t0); this.t0 = now;
      this.acc += dt / 1000 * this.speed * TF[this.tf].min;
      let k = Math.min(Math.floor(this.acc), 600);
      this.acc -= k;
      while (k-- > 0 && this.playing) {
        if (!(await this.tick())) { this.endOfData(); break; }
        if (this.stopFlag) { this.stopFlag = false; this.pause(); break; }
      }
      this.after();
      if (this.playing) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  pause() {
    this.playing = false; cancelAnimationFrame(this.raf);
    const b = $('#bt-play'); if (b) { b.classList.remove('on'); b.setAttribute('aria-label', 'Abspielen'); }
  }
  endOfData() { this.pause(); CTX.toast('Ende der importierten Daten erreicht. Importiere weitere Monate, um weiterzumachen.'); }
  after() {
    this.s.cursor = this.now;
    this.clock();
    this.refreshLines();
    this.renderLive();
    this.markDirty();
  }
  clock() { const c = $('#bt-clock'); if (c) c.textContent = fDT.format(new Date(this.now)); }
  async setTf(id) {
    if (!TF[id] || id === this.tf) return;
    this.pause();
    this.tf = id; this.s.tf = id;
    $$('.bt-tfs [data-tf]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.tf === id)));
    if (TF[id].min >= 60 && !this.hist || TF[id].min < 60) await this.loadAround(this.now);
    else this.hist = await hours(this.s.market, this.now - LOOKBACK_BARS * TF[id].min * MIN * (TF[id].min >= 1440 ? 1.45 : 1.1), this.barOf(this.now) - 1);
    if (this.wm) { try { this.wm.applyOptions({lines: this.wmLine(id)}); } catch (e) {} }
    this.redraw(true);
    this.markDirty();
  }
  /* ---------- orders and positions
     s.order: {side, kind:'market'|'limit'|'stop', entry, sl, tp, placedAt, fillTime?, open?}  (one at a time)
     s.trades: closed trades {id, side, entry, sl0, sl, tp, entryTime, exitTime, exit, r, kind} */
  newDraft(side) {
    if (this.s.order) { CTX.toast('Schließe zuerst die offene Position.'); return; }
    const p = this.last; if (!Number.isFinite(p)) return;
    const a = atr(this.view, 14) || p * 0.002;
    const d = Math.max(a * 1.2, Math.pow(10, -this.digits) * 5);
    const r = x => +x.toFixed(this.digits);
    this.draft = side === 'long'
      ? {side, kind: 'market', entry: r(p), sl: r(p - d), tp: r(p + 2 * d)}
      : {side, kind: 'market', entry: r(p), sl: r(p + d), tp: r(p - 2 * d)};
    this.renderSide(); this.refreshLines();
  }
  validate(o) {
    const lp = this.last;
    const e = o.kind === 'market' ? lp : o.entry;
    if (!(o.sl > 0) || !(o.tp > 0) || !(e > 0)) return 'Trag Entry, Stop Loss und Take Profit ein.';
    if (o.side === 'long' && !(o.sl < e && o.tp > e)) return 'Beim Long liegt der Stop Loss unter dem Entry und der Take Profit darüber.';
    if (o.side === 'short' && !(o.sl > e && o.tp < e)) return 'Beim Short liegt der Stop Loss über dem Entry und der Take Profit darunter.';
    return '';
  }
  place() {
    const o = this.draft; if (!o) return;
    const lp = this.last;
    if (o.kind !== 'market') o.kind = (o.side === 'long') === (o.entry < lp) ? 'limit' : 'stop';
    const err = this.validate(o);
    if (err) { const m = $('#bt-tk-msg'); if (m) m.textContent = err; return; }
    const ord = {id: rid('t'), side: o.side, kind: o.kind, entry: o.kind === 'market' ? lp : o.entry, sl: o.sl, tp: o.tp, placedAt: this.now};
    if (ord.kind === 'market') { ord.open = true; ord.entryTime = this.now; ord.sl0 = ord.sl; }
    this.s.order = ord; this.draft = null;
    this.renderSide(); this.refreshLines(); this.markDirty(true);
  }
  cancelOrder() { if (this.s.order && !this.s.order.open) { this.s.order = null; this.renderSide(); this.refreshLines(); this.markDirty(true); } }
  // runs on every revealed minute
  fill() {
    const o = this.s.order; if (!o) return;
    const i = this.i, O = this.min.o[i], H = this.min.h[i], L = this.min.l[i], t = this.min.t[i];
    const long = o.side === 'long';
    if (!o.open) {
      const hit = o.kind === 'limit' ? (long ? L <= o.entry : H >= o.entry) : (long ? H >= o.entry : L <= o.entry);
      if (!hit) return;
      // a gap through the price fills at the open of the minute
      if (o.kind === 'stop' && (long ? O > o.entry : O < o.entry)) o.entry = O;
      if (o.kind === 'limit' && (long ? O < o.entry : O > o.entry)) o.entry = O;
      o.open = true; o.entryTime = t; o.sl0 = o.sl;
      CTX.toast((long ? 'Long' : 'Short') + ' ausgelöst bei ' + nf(o.entry, this.digits) + '.');
      this.renderSide();
    }
    // stop first when both levels are inside one minute (the cautious reading)
    let exit = null;
    if (long) {
      if (L <= o.sl) exit = O < o.sl ? O : o.sl;
      else if (H >= o.tp) exit = O > o.tp ? O : o.tp;
    } else {
      if (H >= o.sl) exit = O > o.sl ? O : o.sl;
      else if (L <= o.tp) exit = O < o.tp ? O : o.tp;
    }
    if (exit != null) this.close(exit, t);
  }
  close(exit, t) {
    const o = this.s.order; if (!o || !o.open) return;
    const tr = {id: o.id, side: o.side, kind: o.kind, entry: o.entry, sl0: o.sl0, sl: o.sl, tp: o.tp, entryTime: o.entryTime, exitTime: t, exit};
    tr.r = Math.round(rOf(tr, exit) * 100) / 100;
    (this.s.trades = this.s.trades || []).push(tr);
    this.s.order = null;
    const k = resultOf(tr.r);
    CTX.toast((k === 'tp' ? 'Take Profit' : k === 'sl' ? 'Stop Loss' : 'Break Even') + ': ' + fR(tr.r));
    if (this.playing) this.stopFlag = true;
    this.applyMarkers(); this.renderSide(); this.refreshLines(); this.markDirty(true);
  }
  closeNow() { const o = this.s.order; if (o && o.open) this.close(this.last, this.now); }
  toBe() { const o = this.s.order; if (o && o.open) { o.sl = o.entry; this.renderSide(); this.refreshLines(); this.markDirty(true); } }
  /* ---------- lines on the chart */
  levels() {
    const o = this.s.order || this.draft;
    if (!o) return null;
    return {o, draft: !this.s.order, entry: o.kind === 'market' && !this.s.order ? this.last : o.entry, sl: o.sl, tp: o.tp};
  }
  refreshLines() {
    if (!this.series) return;
    const lv = this.levels();
    const want = lv ? {entry: lv.entry, sl: lv.sl, tp: lv.tp} : {};
    const style = {entry: [this.col.mute, 'Entry'], sl: [this.col.dn, 'SL'], tp: [this.col.up, 'TP']};
    for (const k of ['entry', 'sl', 'tp']) {
      const v = want[k];
      if (!Number.isFinite(v)) { if (this.lines[k]) { this.series.removePriceLine(this.lines[k]); delete this.lines[k]; } continue; }
      const base = {side: lv.o.side, entry: lv.entry, sl0: lv.o.sl0 != null ? lv.o.sl0 : lv.sl};
      const title = style[k][1] + (k === 'entry' ? '' : ' ' + fR(rOf(base, v)));
      const opt = {price: v, color: style[k][0], lineWidth: 1, lineStyle: k === 'entry' ? 2 : 0, axisLabelVisible: true, title};
      if (this.lines[k]) this.lines[k].applyOptions(opt); else this.lines[k] = this.series.createPriceLine(opt);
    }
    this.pos.update();
  }
  applyMarkers() {
    if (!this.markers) return;
    const ms = [], lastT = this.lastBarT, firstT = this.view.n ? this.ct(this.view.t[0]) : Infinity;
    for (const t of this.s.trades || []) {
      const et = this.ct(this.barOf(t.entryTime)), xt = this.ct(this.barOf(t.exitTime));
      if (et >= firstT && et <= lastT) ms.push({time: et, position: t.side === 'long' ? 'belowBar' : 'aboveBar', color: this.col.mute, shape: t.side === 'long' ? 'arrowUp' : 'arrowDown', text: ''});
      const k = resultOf(t.r);
      if (xt >= firstT && xt <= lastT) ms.push({time: xt, position: t.side === 'long' ? 'aboveBar' : 'belowBar', color: k === 'tp' ? this.col.up : k === 'sl' ? this.col.dn : this.col.mute, shape: 'circle', text: fR(t.r)});
    }
    ms.sort((a, b) => a.time - b.time);
    try { this.markers.setMarkers(ms); } catch (e) {}
  }
  /* ---------- side panel */
  renderSide() { this.renderTicket(); this.renderStats(); this.renderTrades(); }
  renderLive() {
    const o = this.s.order, el = $('#bt-live');
    if (el && o && o.open) { const r = rOf(o, this.last); el.textContent = fR(r); el.className = 'bt-live ' + (r > 0 ? 'pos' : r < 0 ? 'neg' : ''); }
    if (this.draft && this.draft.kind === 'market') this.renderRR();
  }
  renderRR() {
    const lv = this.levels(); const el = $('#bt-rr'); if (!el || !lv) return;
    const risk = Math.abs(lv.entry - lv.sl), rew = Math.abs(lv.tp - lv.entry);
    const dd = this.m.pip < 1 ? 1 : Math.min(2, this.digits);
    el.innerHTML = `<span><small>Risiko</small><b>${nf(risk / this.m.pip, dd)} ${this.m.unit}</b></span><span><small>Chance</small><b>${nf(rew / this.m.pip, dd)} ${this.m.unit}</b></span><span><small>R:R</small><b>1 : ${risk ? nf(rew / risk, 2) : '–'}</b></span>`;
  }
  renderTicket() {
    const el = $('#bt-ticket'); if (!el) return;
    const o = this.s.order, d = this.draft, fx = v => Number.isFinite(v) ? v.toFixed(this.digits) : '';
    if (o && o.open) {
      const r = rOf(o, this.last);
      el.innerHTML = `<div class="bt-pos ${o.side}">
        <div class="bt-pos-h"><span class="bt-side-tag ${o.side}">${o.side === 'long' ? 'Long' : 'Short'}</span><span>offen seit ${esc(fHM.format(new Date(o.entryTime)))}</span><span class="spacer"></span><b id="bt-live" class="bt-live ${r > 0 ? 'pos' : r < 0 ? 'neg' : ''}">${fR(r)}</b></div>
        <div class="bt-lv"><span><small>Entry</small><b>${nf(o.entry, this.digits)}</b></span>
          <label><small>Stop Loss</small><input class="inp" inputmode="decimal" data-lv="sl" value="${fx(o.sl)}"></label>
          <label><small>Take Profit</small><input class="inp" inputmode="decimal" data-lv="tp" value="${fx(o.tp)}"></label></div>
        <div class="row-btns"><button type="button" class="btn sm ghost" data-ws="be">SL auf Einstand</button><button type="button" class="btn sm" data-ws="closepos">Position schließen</button></div>
        <p class="bt-hint">Ziehe SL und TP direkt im Chart.</p></div>`;
      return;
    }
    if (o && !o.open) {
      el.innerHTML = `<div class="bt-pos ${o.side} pending">
        <div class="bt-pos-h"><span class="bt-side-tag ${o.side}">${o.side === 'long' ? 'Buy' : 'Sell'} ${o.kind === 'limit' ? 'Limit' : 'Stop'}</span><span>wartet auf ${nf(o.entry, this.digits)}</span></div>
        <div class="bt-lv"><span><small>Entry</small><b>${nf(o.entry, this.digits)}</b></span><span><small>Stop Loss</small><b>${nf(o.sl, this.digits)}</b></span><span><small>Take Profit</small><b>${nf(o.tp, this.digits)}</b></span></div>
        <div class="row-btns"><button type="button" class="btn sm ghost" data-ws="cancelord">Order löschen</button></div></div>`;
      return;
    }
    if (d) {
      el.innerHTML = `<div class="bt-pos ${d.side} draft">
        <div class="bt-pos-h"><span class="bt-side-tag ${d.side}">${d.side === 'long' ? 'Long' : 'Short'}</span><div class="seg bt-kind" role="radiogroup" aria-label="Ordertyp"><button type="button" role="radio" aria-checked="${d.kind === 'market'}" data-kind="market">Markt</button><button type="button" role="radio" aria-checked="${d.kind !== 'market'}" data-kind="pending">Preis</button></div></div>
        <div class="bt-lv">
          <label><small>Entry</small><input class="inp" inputmode="decimal" data-lv="entry" value="${fx(d.kind === 'market' ? this.last : d.entry)}"${d.kind === 'market' ? ' disabled' : ''}></label>
          <label><small>Stop Loss</small><input class="inp" inputmode="decimal" data-lv="sl" value="${fx(d.sl)}"></label>
          <label><small>Take Profit</small><input class="inp" inputmode="decimal" data-lv="tp" value="${fx(d.tp)}"></label></div>
        <div class="bt-rrq" role="group" aria-label="Take Profit als Vielfaches des Risikos">${[1, 1.5, 2, 3].map(x => `<button type="button" class="chip" data-rr="${x}">${nf(x, x % 1 ? 1 : 0)}R</button>`).join('')}</div>
        <div class="bt-rr" id="bt-rr"></div>
        <p class="bt-im-msg" id="bt-tk-msg" role="status"></p>
        <div class="row-btns"><button type="button" class="btn sm ghost" data-ws="discard">Verwerfen</button><button type="button" class="btn sm primary" data-ws="place">${d.side === 'long' ? 'Long' : 'Short'} platzieren</button></div>
        <p class="bt-hint">Linien im Chart ziehen oder Werte eintragen. Enter platziert, Esc verwirft.</p></div>`;
      this.renderRR();
      return;
    }
    el.innerHTML = `<div class="bt-new"><button type="button" class="btn bt-long" data-ws="long">Long</button><button type="button" class="btn bt-short" data-ws="short">Short</button></div>
      <p class="bt-hint">Leertaste spielt ab oder hält an, → zeigt die nächste Kerze, L und S öffnen eine Order.</p>`;
  }
  renderStats() {
    const el = $('#bt-stats'); if (!el) return;
    const st = stats(this.s.trades || []);
    el.innerHTML = `<div class="bt-st-grid">
      <span><small>Trades</small><b>${st.n}</b></span>
      <span><small>Win-Rate</small><b>${st.wr == null ? '–' : Math.round(st.wr * 100) + ' %'}</b></span>
      <span class="${st.sum > 0 ? 'pos' : st.sum < 0 ? 'neg' : ''}"><small>Gesamt</small><b>${st.n ? fR(st.sum) : '–'}</b></span>
      <span><small>Profitfaktor</small><b>${st.pf == null ? '–' : st.pf === Infinity ? '∞' : nf(st.pf, 2)}</b></span>
      <span><small>Ø pro Trade</small><b>${st.n ? fR(st.avg) : '–'}</b></span>
      <span><small>Max. Drawdown</small><b>${st.n ? fR(-st.dd).replace('−0,0R', '0R') : '–'}</b></span></div>
      <div class="bt-curve">${sparkSvg(st.curve, 300, 64)}</div>
      <div class="bt-cnts"><span><i class="sw tp"></i>${st.tp} TP</span><span><i class="sw be"></i>${st.be} BE</span><span><i class="sw sl"></i>${st.sl} SL</span></div>`;
  }
  renderTrades() {
    const el = $('#bt-trades'); if (!el) return;
    const list = (this.s.trades || []).slice().reverse();
    el.innerHTML = list.length ? `<h3 class="bt-h sm">Trades</h3><ol class="bt-tl">${list.map((t, i) => {
      const k = resultOf(t.r);
      return `<li><span class="bt-res ${k}">${k.toUpperCase()}</span><span class="bt-tl-m"><b>${t.side === 'long' ? 'Long' : 'Short'} · ${esc(fDT.format(new Date(t.entryTime)))}</b><small>${nf(t.entry, this.digits)} → ${nf(t.exit, this.digits)}</small></span><b class="${t.r > 0 ? 'pos' : t.r < 0 ? 'neg' : ''}">${fR(t.r)}</b><button type="button" class="btn icon ghost sm" data-ws="deltrade" data-id="${esc(t.id)}" aria-label="Trade löschen" title="Trade löschen">✕</button></li>`;
    }).join('')}</ol>` : '';
  }
  /* ---------- input */
  click(e) {
    const b = e.target.closest('[data-ws],[data-tf],[data-speed],[data-rr],[data-kind]');
    if (!b || b.disabled) return;
    if (b.dataset.tf) { this.setTf(b.dataset.tf); return; }
    if (b.dataset.speed) { this.speed = +b.dataset.speed; $$('.bt-speed [data-speed]').forEach(x => x.setAttribute('aria-checked', String(x === b))); return; }
    if (b.dataset.rr && this.draft) {
      const d = this.draft, e0 = d.kind === 'market' ? this.last : d.entry, risk = Math.abs(e0 - d.sl);
      d.tp = +(d.side === 'long' ? e0 + risk * +b.dataset.rr : e0 - risk * +b.dataset.rr).toFixed(this.digits);
      this.renderTicket(); this.refreshLines(); return;
    }
    if (b.dataset.kind && this.draft) {
      const d = this.draft;
      if (b.dataset.kind === 'market') d.kind = 'market'; else { if (d.kind === 'market') d.entry = +this.last.toFixed(this.digits); d.kind = 'pending'; }
      this.renderTicket(); this.refreshLines(); return;
    }
    const a = b.dataset.ws;
    if (a === 'back') closeSession();
    else if (a === 'play') this.playing ? this.pause() : this.play();
    else if (a === 'step') { this.pause(); this.stepBar(); }
    else if (a === 'long' || a === 'short') this.newDraft(a);
    else if (a === 'place') this.place();
    else if (a === 'discard') { this.draft = null; this.renderSide(); this.refreshLines(); }
    else if (a === 'cancelord') this.cancelOrder();
    else if (a === 'closepos') this.closeNow();
    else if (a === 'be') this.toBe();
    else if (a === 'jump') this.openJump();
    else if (a === 'deltrade') { this.s.trades = (this.s.trades || []).filter(t => t.id !== b.dataset.id); this.applyMarkers(); this.renderSide(); this.markDirty(true); }
  }
  input(e) {
    const f = e.target.dataset && e.target.dataset.lv; if (!f) return;
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    if (!Number.isFinite(v)) return;
    const o = this.draft || (this.s.order && this.s.order.open ? this.s.order : null);
    if (!o) return;
    o[f] = v;
    if (this.draft) this.renderRR();
    this.refreshLines();
    if (!this.draft) this.markDirty();
  }
  key(e) {
    if (V.mode !== 'ws' || V.dlg || e.metaKey || e.ctrlKey || e.altKey) return;
    if (CTX.S.view !== 'backtest' || !this.box.isConnected) { if (!this.box.isConnected) { this.flush(); this.destroy(); if (V.ws === this) { V.ws = null; V.mode = 'list'; } } return; }
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) { if (e.key === 'Enter' && this.draft && tg.dataset.lv) { e.preventDefault(); this.place(); } return; }
    const k = e.key;
    if (k === ' ') { e.preventDefault(); this.playing ? this.pause() : this.play(); }
    else if (k === 'ArrowRight') { e.preventDefault(); this.pause(); this.stepBar(); }
    else if (k === 'l' || k === 'L') { e.preventDefault(); this.newDraft('long'); }
    else if (k === 's' || k === 'S') { e.preventDefault(); this.newDraft('short'); }
    else if (k === 'Enter' && this.draft) { e.preventDefault(); this.place(); }
    else if (k === 'Escape' && this.draft) { e.preventDefault(); e.stopPropagation(); this.draft = null; this.renderSide(); this.refreshLines(); }
    else if (/^[1-7]$/.test(k) && e.shiftKey === false && document.activeElement && document.activeElement.closest && document.activeElement.closest('.bt-ws')) { /* page keys stay with the journal */ }
  }
  openJump() {
    this.pause();
    const toLocalInput = ms => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
    const d = dialog(`<div class="bt-dlg-head"><h2>Vorspulen</h2><button type="button" class="btn icon ghost" data-bt="close" aria-label="Schließen">✕</button></div>
      <p class="bt-note">Spult bis zu einem späteren Zeitpunkt vor. Offene Orders und Positionen laufen dabei mit.</p>
      <label class="bt-fl">Bis (deine Zeit)<input class="inp" type="datetime-local" id="bt-j-to" value="${toLocalInput(this.now + DAY)}"></label>
      <div class="bt-rrq">${[['Nächste Stunde', HOUR], ['Nächster Tag', DAY], ['Nächste Woche', 7 * DAY]].map(([l, v]) => `<button type="button" class="chip" data-jv="${v}">${l}</button>`).join('')}</div>
      <p class="bt-im-msg" id="bt-j-msg" role="status"></p>
      <div class="row-btns end"><button type="button" class="btn ghost" data-bt="close">Abbrechen</button><button type="button" class="btn primary" id="bt-j-go">Vorspulen</button></div>`);
    d.addEventListener('click', e => { const c = e.target.closest('[data-jv]'); if (c) $('#bt-j-to', d).value = toLocalInput(this.now + +c.dataset.jv); });
    $('#bt-j-go', d).addEventListener('click', async () => {
      const to = new Date($('#bt-j-to', d).value).getTime();
      if (!(to > this.now)) { $('#bt-j-msg', d).textContent = 'Wähle einen Zeitpunkt nach dem aktuellen.'; return; }
      $('#bt-j-go', d).disabled = true; $('#bt-j-msg', d).textContent = 'Wird vorgespult…';
      await this.jump(to);
      closeDialog();
    });
  }
  async jump(to) {
    // fast-forward without drawing; orders still fill
    let n = 0;
    for (;;) {
      if (this.i + 1 >= this.min.n && !(await this.more())) { this.endOfData(); break; }
      if (this.min.t[this.i + 1] > to) break;
      this.i++; this.fill();
      if (this.stopFlag) { this.stopFlag = false; break; }
      if (++n % 20000 === 0) await yieldUI();
    }
    // keep the loaded window small
    await this.loadAround(this.now);
    this.redraw(true);
    this.after();
  }
  /* ---------- saving */
  markDirty(now) {
    this.dirty = true;
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => this.flush(), now ? 300 : 2500);
  }
  flush() {
    if (!this.dirty) return;
    this.dirty = false; clearTimeout(this.saveT);
    this.s.updatedAt = Date.now();
    const body = JSON.parse(JSON.stringify(this.s));
    CTX.Store.save('backtests', body).catch(() => { this.dirty = true; CTX.toast('Die Session konnte nicht gespeichert werden. Prüfe deine Verbindung.'); });
  }
}

/* ---------------------------------------------------------------- position tool on the chart */
class PositionPrimitive {
  constructor(ws) { this.ws = ws; this._req = null; const self = this; this._view = {zOrder: () => 'bottom', renderer: () => ({draw: t => self.draw(t)})}; }
  attached(p) { this._req = p.requestUpdate; this.chart = p.chart; this.series = p.series; }
  detached() { this._req = null; }
  update() { this._req && this._req(); }
  updateAllViews() {}
  paneViews() { return [this._view]; }
  draw(target) {
    const ws = this.ws, lv = ws.levels(); if (!lv || !this.series) return;
    const ts = this.chart.timeScale();
    const y = p => this.series.priceToCoordinate(p);
    const ye = y(lv.entry), ys = y(lv.sl), yt = y(lv.tp);
    if (ye == null || ys == null || yt == null) return;
    const o = lv.o;
    let x0 = o.open || o.placedAt ? ts.timeToCoordinate(ws.ct(ws.barOf(o.entryTime || o.placedAt))) : null;
    const xl = ts.timeToCoordinate(ws.lastBarT);
    if (x0 == null) x0 = xl == null ? null : xl;
    if (x0 == null) return;
    const x1 = Math.max(x0 + 70, (xl == null ? x0 : xl) + 46);
    target.useBitmapCoordinateSpace(sc => {
      const c = sc.context, hr = sc.horizontalPixelRatio, vr = sc.verticalPixelRatio;
      const X0 = Math.round(x0 * hr), X1 = Math.round(x1 * hr);
      const box = (a, b, col) => { c.fillStyle = col; c.fillRect(X0, Math.round(Math.min(a, b) * vr), X1 - X0, Math.max(1, Math.round(Math.abs(b - a) * vr))); };
      const alpha = lv.draft ? 0.1 : 0.17;
      box(ye, yt, ws.col.upA + alpha + ')');
      box(ye, ys, ws.col.dnA + alpha + ')');
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.fillRect(X0, Math.round(ye * vr), X1 - X0, Math.max(1, Math.round(vr)));
    });
  }
}

/* ---------------------------------------------------------------- dragging SL / TP / entry on the chart */
class LineDrag {
  constructor(ws) {
    this.ws = ws; const box = ws.box;
    this.down = e => this.start(e);
    this.hover = e => this.over(e);
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => box.addEventListener(t, this.down, {capture: true, passive: false}));
    box.addEventListener('pointermove', this.hover, {capture: true});
  }
  pick(clientY) {
    const ws = this.ws, lv = ws.levels(); if (!lv) return null;
    const r = ws.box.getBoundingClientRect(), y = clientY - r.top;
    const can = lv.draft ? ['tp', 'sl'].concat(lv.o.kind !== 'market' ? ['entry'] : []) : lv.o.open ? ['tp', 'sl'] : [];
    let best = null, bd = 9;
    for (const k of can) { const c = ws.series.priceToCoordinate(lv[k]); if (c == null) continue; const dd = Math.abs(c - y); if (dd < bd) { bd = dd; best = k; } }
    return best;
  }
  over(e) {
    if (this.on) return;
    const k = this.pick(e.clientY);
    this.ws.box.classList.toggle('bt-grab', !!k);
  }
  start(e) {
    const pt = e.touches ? e.touches[0] : e;
    const k = this.pick(pt.clientY);
    if (!k) return;
    e.preventDefault(); e.stopPropagation();
    if (this.on) return;
    this.on = k;
    const ws = this.ws;
    ws.chart.applyOptions({handleScroll: false, handleScale: false});
    const move = ev => {
      const p = ev.touches ? ev.touches[0] : ev;
      const r = ws.box.getBoundingClientRect();
      const price = ws.series.coordinateToPrice(p.clientY - r.top);
      if (price == null) return;
      const o = ws.draft || ws.s.order;
      const v = +(+price).toFixed(ws.digits);
      if (this.on === 'entry') o.entry = v; else o[this.on] = v;
      ws.refreshLines();
      const inp = document.querySelector(`#bt-ticket [data-lv="${this.on}"]`);
      if (inp) inp.value = v.toFixed(ws.digits);
      if (ws.draft) ws.renderRR();
      ev.preventDefault && ev.cancelable && ev.preventDefault();
    };
    const up = () => {
      window.removeEventListener('pointermove', move, true); window.removeEventListener('touchmove', move, true);
      window.removeEventListener('pointerup', up, true); window.removeEventListener('touchend', up, true); window.removeEventListener('pointercancel', up, true);
      ws.chart.applyOptions({handleScroll: true, handleScale: true});
      this.on = null;
      if (!ws.draft) ws.markDirty(true);
    };
    window.addEventListener('pointermove', move, true); window.addEventListener('touchmove', move, {capture: true, passive: false});
    window.addEventListener('pointerup', up, true); window.addEventListener('touchend', up, true); window.addEventListener('pointercancel', up, true);
  }
}

/* ================================================================ module API */
function onClick(e) {
  const b = e.target.closest('[data-bt]');
  if (!b || b.disabled) return;
  const a = b.dataset.bt;
  if (a === 'new') openNew();
  else if (a === 'import') openImport(b.dataset.mk);
  else if (a === 'open') openSession(b.dataset.id);
  else if (a === 'close') { if (!(V.dlg && V.dlg.dataset.busy)) closeDialog(); }
  else if (a === 'guide') { if (!(V.dlg && V.dlg.dataset.busy)) showGuide(); }
  else if (a === 'gsrc') selectSource(b.dataset.src);
}
// arrow keys move between the guide's source tabs
function onKeyTabs(e) {
  const t = e.target.closest && e.target.closest('.bt-g-tabs [role="tab"]');
  if (!t || !/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
  const tabs = $$('[role="tab"]', t.parentElement), i = tabs.indexOf(t);
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  e.preventDefault(); e.stopPropagation();
  selectSource(tabs[j].dataset.src); tabs[j].focus();
}
function onKeyDlg(e) { if (e.key === 'Escape' && V.dlg && !V.dlg.dataset.busy) { e.preventDefault(); e.stopPropagation(); closeDialog(); } }

window.BlotterBT = {
  mount(el, ctx) {
    CTX = ctx; V.el = el;
    if (!this.bound) { document.addEventListener('click', onClick); window.addEventListener('keydown', onKeyDlg, true); document.addEventListener('keydown', onKeyTabs); this.bound = true; }
    if (V.ws) { V.ws.flush(); V.ws.destroy(); V.ws = null; }
    if (V.mode === 'ws' && V.sid && sessions().some(s => s.id === V.sid)) openSession(V.sid);
    else { V.mode = 'list'; renderList(); }
  },
  update() { if (V.mode === 'list') renderList(); },
  unmount() { if (V.ws) { V.ws.flush(); V.ws.destroy(); V.ws = null; } closeDialog(); CTX && CTX.setWide && CTX.setWide(false); },
  busy() { return V.mode === 'ws'; },
  // for tests and the console
  _: {encodeBlock, decodeBlock, detectFormat, FORMATS, TZS, aggregate, barStart, stats, rOf, usDst, importFiles, inspectFiles, dataIndex, minutes, hours, V},
};
})();
