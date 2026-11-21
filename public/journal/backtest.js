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
  {id: '1m', min: 1, label: '1m', name: '1 Minute'}, {id: '3m', min: 3, label: '3m', name: '3 Minuten'}, {id: '5m', min: 5, label: '5m', name: '5 Minuten'},
  {id: '15m', min: 15, label: '15m', name: '15 Minuten'}, {id: '30m', min: 30, label: '30m', name: '30 Minuten'}, {id: '1h', min: 60, label: '1h', name: '1 Stunde'},
  {id: '4h', min: 240, label: '4h', name: '4 Stunden'}, {id: '1D', min: 1440, label: 'D', name: 'Täglich'},
  {id: '1W', min: 10080, label: 'W', name: 'Wöchentlich'}, {id: '1M', min: 43200, label: 'M', name: 'Monatlich'},
];
const WEEK = 7 * DAY, MONTH_MIN = 43200;
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
   bars up to 1h start on the UTC clock; 4h, daily, weekly and monthly bars follow the FX/CFD trading day,
   which starts at 17:00 New York: the week opens Sunday 17:00, the month with its first trading day */
const nyShift = ms => nyOffset(ms) + 7 * HOUR;      // shifted so 17:00 New York becomes 00:00 of the trading day
function barStart(ms, tfMin) {
  if (tfMin < 240) return Math.floor(ms / (tfMin * MIN)) * tfMin * MIN;
  const off = nyShift(ms), t = ms + off;
  // weeks and months: one fixed start per bar, taken at the bar's own start (daylight saving can change within it)
  if (tfMin === MONTH_MIN) { const d = new Date(t), m0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); return m0 - nyShift(m0); }
  if (tfMin === 10080) { const w0 = Math.floor((t - 4 * DAY) / WEEK) * WEEK + 4 * DAY; return w0 - nyShift(w0); }   // 5 Jan 1970 was a Monday
  if (tfMin === 1440) {
    // prints after the Friday close count to Friday, anything before the Sunday open to Monday: no weekend candles
    let d = Math.floor(t / DAY); const wd = (d + 4) % 7;   // 1 Jan 1970 was a Thursday; 0 = Sunday, 6 = Saturday
    if (wd === 6) d -= 1; else if (wd === 0) d += 1;
    return d * DAY - off;
  }
  const span = tfMin * MIN;
  return Math.floor(t / span) * span - off;
}
// the trading date of a daily, weekly or monthly bar (00:00 of that day, as the chart shows it)
const tradingDay = bs => Math.round((bs + nyShift(bs)) / DAY) * DAY;
function aggregate(src, tfMin, untilMs) {
  const out = emptyBars(src.n + 1);    // never more bars than source bars (a guess by trading hours fell short on weekly and daily bars)
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
      <label class="bt-fl">Zeiteinheit<select class="inp" id="bt-n-tf">${TFS.map(t => `<option value="${t.id}"${t.id === '5m' ? ' selected' : ''}>${t.min >= 1440 ? t.name : t.label}</option>`).join('')}</select></label>
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
    this.cs = loadCS();
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
        <div class="seg bt-tfs" role="radiogroup" aria-label="Zeiteinheit">${TFS.map(t => `<button type="button" role="radio" aria-checked="${t.id === this.tf}" data-tf="${t.id}" title="${t.name}" aria-label="${t.name}">${t.label}</button>`).join('')}</div>
        <div class="bt-acts" role="group" aria-label="Chart">
          <button type="button" class="btn icon ghost" data-ws="undo" aria-label="Rückgängig" title="Rückgängig (${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Strg+'}Z)" disabled>${UI_ICON.undo}</button>
          <button type="button" class="btn icon ghost" data-ws="redo" aria-label="Wiederholen" title="Wiederholen (${/Mac|iPhone|iPad/.test(navigator.platform) ? '⇧⌘' : 'Strg+Umschalt+'}Z)" disabled>${UI_ICON.redo}</button>
          <button type="button" class="btn icon ghost" data-ws="chartset" aria-label="Chart-Einstellungen" title="Chart-Einstellungen">${UI_ICON.gear}</button>
        </div>
      </div>
      <div class="bt-main">
        <div class="bt-chartbox">
          <div class="bt-chartrow">
            <div class="bt-tools" id="bt-tools" role="toolbar" aria-label="Zeichenwerkzeuge"></div>
            <div class="bt-chart" id="bt-chart"><div class="bt-loading" id="bt-loading">Kursdaten werden geladen…</div></div>
          </div>
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
    if (this.draw) { this.draw.destroy(); this.draw = null; }
    clearTimeout(csTimer); saveCS(this.cs, true);
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
    const from = Math.min(cursor - back, barStart(cursor, tfm)), to = monthStart(nextMonth(nextMonth(monthKey(cursor))));
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
    this.col.bg = getComputedStyle(this.box.closest('.bt-chartbox')).backgroundColor || '#0b1222';
    const font = (cs.getPropertyValue('--f-mono') || '').trim() || 'ui-monospace, Menlo, monospace';
    this.font = font;
    this.chart = L.createChart(this.box, {
      autoSize: true,
      layout: {background: {type: 'solid', color: 'transparent'}, textColor: this.col.mute, fontFamily: font, fontSize: 11, attributionLogo: true},
      grid: {vertLines: {color: this.col.grid}, horzLines: {color: this.col.grid}},
      rightPriceScale: {borderColor: this.col.grid, scaleMargins: {top: 0.12, bottom: 0.1}},
      timeScale: {borderColor: this.col.grid, timeVisible: TF[this.tf].min < 1440, secondsVisible: false, rightOffset: 12, barSpacing: 8, shiftVisibleRangeOnNewBar: true},
      crosshair: {mode: 0, vertLine: {color: this.col.mute, labelBackgroundColor: '#1b2a52'}, horzLine: {color: this.col.mute, labelBackgroundColor: '#1b2a52'}},
      localization: {locale: LOC, priceFormatter: p => nf(p, this.digits)},
    });
    this.wmLine = t => [{text: this.m.tag + ' · ' + TF[t].label, color: 'rgba(' + fg + ',.05)', fontSize: 64, fontStyle: '700'}];
    try { this.wm = L.createTextWatermark(this.chart.panes()[0], {horzAlign: 'center', vertAlign: 'center', lines: this.wmLine(this.tf)}); } catch (e) { this.wm = null; }
    this.pos = new PositionPrimitive(this);
    this.lines = {};
    this.dataT = []; this.dataIdx = [];
    this.drag = new LineDrag(this);      // before the drawings: a grabbed SL or TP line wins
    this.draw = new DrawLayer(this);
    this.makeSeries();
    this.applyStyle();
    this.legendInit();
  }
  /* ---------- style: series type, colours, background, grid, scales */
  seriesOpts() {
    const cs = this.cs, col = this.col, up = cs.upBody || col.up, dn = cs.dnBody || col.dn, none = 'rgba(0,0,0,0)';
    const base = {priceFormat: {type: 'price', precision: this.digits, minMove: Math.pow(10, -this.digits)}, priceLineVisible: cs.lastPrice, lastValueVisible: cs.lastPrice};
    const k = seriesKind(cs.type);
    if (k === 'bar') return Object.assign(base, {upColor: up, downColor: dn, openVisible: true, thinBars: false});
    if (k === 'line') return Object.assign(base, {color: cs.lineColor || '#2962ff', lineWidth: cs.lineWidth});
    if (k === 'area') { const lc = cs.lineColor || '#2962ff'; return Object.assign(base, {lineColor: lc, topColor: rgba(lc, 0.32), bottomColor: rgba(lc, 0.02), lineWidth: cs.lineWidth}); }
    const hollow = cs.type === 'hollow';
    return Object.assign(base, {
      upColor: hollow || !cs.body ? none : up, downColor: cs.body ? dn : none,
      borderVisible: cs.border || hollow || !cs.body, borderUpColor: cs.upBorder || up, borderDownColor: cs.dnBorder || dn,
      wickVisible: cs.wick, wickUpColor: cs.upWick || up, wickDownColor: cs.dnWick || dn,
    });
  }
  makeSeries() {
    const L = window.LightweightCharts, k = seriesKind(this.cs.type);
    if (this.series) {
      try { if (this.markers && this.markers.detach) this.markers.detach(); } catch (e) {}
      for (const key of Object.keys(this.lines || {})) { try { this.series.removePriceLine(this.lines[key]); } catch (e) {} }
      try { this.series.detachPrimitive(this.pos); } catch (e) {}
      try { this.series.detachPrimitive(this.draw.prim); } catch (e) {}
      try { this.chart.removeSeries(this.series); } catch (e) {}
    }
    this.lines = {};
    const T = {candle: L.CandlestickSeries, bar: L.BarSeries, line: L.LineSeries, area: L.AreaSeries}[k];
    this.series = this.chart.addSeries(T, this.seriesOpts());
    this.stype = k; this.htype = this.cs.type;
    this.markers = L.createSeriesMarkers ? L.createSeriesMarkers(this.series, []) : null;
    this.series.attachPrimitive(this.pos);
    this.series.attachPrimitive(this.draw.prim);
  }
  applyStyle() {
    const cs = this.cs, col = this.col;
    const bg = cs.bgMode === 'solid' ? {type: 'solid', color: cs.bg} : cs.bgMode === 'gradient' ? {type: 'gradient', topColor: cs.bg, bottomColor: cs.bg2} : {type: 'solid', color: 'transparent'};
    const gc = cs.gridColor || col.grid, cc = cs.crossColor || col.mute;
    this.chart.applyOptions({
      layout: {background: bg, textColor: cs.textColor || col.mute, fontSize: cs.fontSize},
      grid: {vertLines: {visible: cs.grid === 'both' || cs.grid === 'vert', color: gc}, horzLines: {visible: cs.grid === 'both' || cs.grid === 'horz', color: gc}},
      crosshair: {mode: this.draw && this.draw.tool === 'pointer' ? 2 : 0, vertLine: {color: cc, style: cs.cross}, horzLine: {color: cc, style: cs.cross}},
      rightPriceScale: {mode: cs.scale},
      timeScale: {rightOffset: cs.rightOffset},
    });
    if (this.wm) { try { this.wm.applyOptions({visible: cs.watermark}); } catch (e) {} }
    if (seriesKind(cs.type) !== this.stype || (this.htype === 'ha') !== (cs.type === 'ha')) {
      this.makeSeries();
      if (this.view && this.view.n) { this.redraw(false); this.renderLegend(); }
    } else { this.series.applyOptions(this.seriesOpts()); this.htype = cs.type; }
    this.renderLegend();
  }
  // a bar as the series wants it: OHLC, Heikin Ashi, or the close for line and area
  haAt(j) {
    const w = this.view, H = this.ha || (this.ha = {o: [], c: []});
    const c = (w.o[j] + w.h[j] + w.l[j] + w.c[j]) / 4;
    const o = j > 0 && H.o[j - 1] != null ? (H.o[j - 1] + H.c[j - 1]) / 2 : (w.o[j] + w.c[j]) / 2;
    H.o[j] = o; H.c[j] = c;
    return {open: o, high: Math.max(w.h[j], o, c), low: Math.min(w.l[j], o, c), close: c};
  }
  point(j, time) {
    const w = this.view;
    if (this.stype === 'line' || this.stype === 'area') return {time, value: w.c[j]};
    if (this.cs.type === 'ha') return Object.assign({time}, this.haAt(j));
    return {time, open: w.o[j], high: w.h[j], low: w.l[j], close: w.c[j]};
  }
  /* ---------- status line: market, timeframe and the bar under the crosshair */
  legendInit() {
    const el = document.createElement('div');
    el.className = 'bt-legend'; el.setAttribute('aria-hidden', 'true');
    this.box.appendChild(el); this.legend = el;
    this.chart.subscribeCrosshairMove(p => { this.legendAt = p && p.time != null && p.seriesData ? p.seriesData.get(this.series) || null : null; this.renderLegend(); });
  }
  renderLegend() {
    const el = this.legend; if (!el) return;
    el.hidden = !this.cs.legend;
    if (!this.cs.legend) return;
    const b = this.legendAt || this.lastPt; if (!b) { el.textContent = ''; return; }
    const v = k => b[k] != null ? b[k] : b.value;
    const o = v('open'), h = v('high'), l = v('low'), c = v('close'), dg = this.digits;
    const ch = c - o, pct = o ? ch / o * 100 : 0, cl = ch > 0 ? 'up' : ch < 0 ? 'dn' : '';
    const sg = ch > 0 ? '+' : ch < 0 ? '−' : '';
    el.innerHTML = `<b>${esc(this.m.tag)} · ${esc(TF[this.tf].label)}</b><span class="lg-o">O <i class="${cl}">${nf(o, dg)}</i></span><span class="lg-o">H <i class="${cl}">${nf(h, dg)}</i></span><span class="lg-o">L <i class="${cl}">${nf(l, dg)}</i></span><span>C <i class="${cl}">${nf(c, dg)}</i></span><span class="${cl}">${sg}${nf(Math.abs(ch), dg)} (${sg}${nf(Math.abs(pct), 2)} %)</span>`;
  }
  ct(ms) { return Math.floor((ms + localOffset(ms)) / 1000); }      // chart time: local clock shown as UTC
  bt(bs) { return TF[this.tf].min >= 1440 ? tradingDay(bs) / 1000 : this.ct(bs); }   // chart time of a bar
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
    this.ha = null;
    const data = [], dT = [], dI = [];
    let lastT = -Infinity;
    for (let i = 0; i < bars.n; i++) {
      const t = this.bt(bars.t[i]);
      const pt = this.point(i, t);
      if (t <= lastT) continue;
      lastT = t;
      data.push(pt); dT.push(bars.t[i]); dI.push(i);
    }
    this.series.setData(data);
    this.dataT = dT; this.dataIdx = dI;
    this.lastPt = data[data.length - 1] || null;
    this.lastBarT = lastT;
    this.renderLegend && this.renderLegend();
    if (fit) this.chart.timeScale().scrollToRealTime();
    this.applyMarkers();
    this.refreshLines();
    this.clock();
  }
  // reveal one more minute; returns false at the end of the data. quiet: the chart catches up in syncBar()
  async tick(quiet) {
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
      if (this.pend) this.syncBar();
      if (v.t.length <= v.n) { const g = emptyBars(v.n * 2 + 64); for (const f of ['t', 'o', 'h', 'l', 'c']) g[f].set(v[f].subarray(0, v.n)); g.n = v.n; this.view = g; }
      const w = this.view, j = w.n++;
      w.t[j] = bs; w.o[j] = this.min.o[this.i]; w.h[j] = this.min.h[this.i]; w.l[j] = this.min.l[this.i]; w.c[j] = this.min.c[this.i];
    }
    if (quiet) this.pend = true; else this.syncBar();
    this.fill();
    return true;
  }
  // bring the chart's last bar up to date
  syncBar() {
    this.pend = false;
    const w = this.view, j = w.n - 1; if (j < 0) return;
    const ctime = this.bt(w.t[j]);
    if (ctime >= this.lastBarT) {
      if (ctime > this.lastBarT) { this.dataT.push(w.t[j]); this.dataIdx.push(j); }
      this.lastPt = this.point(j, ctime);
      this.series.update(this.lastPt); this.lastBarT = ctime;
    }
  }
  // reveals minutes until the bar in progress is complete (or, if it just completed, the whole next bar)
  async stepBar() {
    if (this.busy) return; this.busy = true;
    try {
      for (let moved = 0; moved < 60000; moved++) {
        if (this.i + 1 >= this.min.n && !(await this.more())) { this.endOfData(); break; }
        if (moved > 0 && this.barOf(this.min.t[this.i + 1]) !== this.barOf(this.now)) break;
        await this.tick(true);
        if (this.stopFlag) { this.stopFlag = false; break; }
      }
      this.syncBar();
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
      let k = Math.min(Math.floor(this.acc), 2400);
      this.acc -= k;
      while (k-- > 0 && this.playing) {
        if (!(await this.tick(true))) { this.endOfData(); break; }
        if (this.stopFlag) { this.stopFlag = false; this.pause(); break; }
      }
      this.syncBar();
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
    if (!this.legendAt) this.renderLegend();
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
    const covered = this.min.n && this.min.t[0] <= this.barOf(this.now);
    if (TF[id].min < 60 || !this.hist || !covered) await this.loadAround(this.now);
    else this.hist = await hours(this.s.market, this.now - LOOKBACK_BARS * TF[id].min * MIN * (TF[id].min >= 1440 ? 1.45 : 1.1), this.barOf(this.now) - 1);
    this.chart.applyOptions({timeScale: {timeVisible: TF[id].min < 1440}});
    if (this.wm) { try { this.wm.applyOptions({lines: this.wmLine(id)}); } catch (e) {} }
    this.redraw(true);
    this.renderLegend();
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
    if (this.pend) this.syncBar();
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
    const ms = [], lastT = this.lastBarT, firstT = this.view.n ? this.bt(this.view.t[0]) : Infinity;
    for (const t of this.s.trades || []) {
      const et = this.bt(this.barOf(t.entryTime)), xt = this.bt(this.barOf(t.exitTime));
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
    const b = e.target.closest('[data-ws],[data-tf],[data-speed],[data-rr],[data-kind],[data-dtool],[data-dfly],[data-dopt],[data-dpick]');
    if (!b || b.disabled) return;
    if (b.dataset.dtool || b.dataset.dfly || b.dataset.dopt || b.dataset.dpick) { if (this.draw) this.draw.toolClick(b); return; }
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
    else if (a === 'undo') this.draw && this.draw.undo();
    else if (a === 'redo') this.draw && this.draw.redo();
    else if (a === 'chartset') { this.pause(); openChartSettings(this); }
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
    if (V.mode !== 'ws' || V.dlg) return;
    if (CTX.S.view !== 'backtest' || !this.box.isConnected) { if (!this.box.isConnected) { this.flush(); this.destroy(); if (V.ws === this) { V.ws = null; V.mode = 'list'; } } return; }
    if (this.draw && this.draw.key(e)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
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
    let x0 = o.open || o.placedAt ? ts.timeToCoordinate(ws.bt(ws.barOf(o.entryTime || o.placedAt))) : null;
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
    if ((this.ws.draw && this.ws.draw.busy()) || (e.target.closest && e.target.closest(OVERLAYS))) { this.ws.box.classList.remove('bt-grab'); return; }
    const k = this.pick(e.clientY);
    this.ws.box.classList.toggle('bt-grab', !!k);
  }
  start(e) {
    if ((this.ws.draw && this.ws.draw.busy() && !this.on) || (e.target.closest && e.target.closest(OVERLAYS))) return;
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

/* ================================================================ chart style (TradingView-like settings)
   One style per user (journal settings, falls back to this browser). null colours follow the colour scheme. */
const CS_DEF = {
  type: 'candles', body: true, border: true, wick: true,
  upBody: null, dnBody: null, upBorder: null, dnBorder: null, upWick: null, dnWick: null,
  lineColor: null, lineWidth: 2,
  bgMode: 'theme', bg: '#0b1222', bg2: '#16213d',
  grid: 'both', gridColor: null, cross: 2, crossColor: null,
  watermark: true, legend: true, textColor: null, fontSize: 11, scale: 0, lastPrice: true, rightOffset: 12,
  magnet: false, stay: false,
};
const CS_TYPES = [['candles', 'Kerzen'], ['hollow', 'Hohle Kerzen'], ['ha', 'Heikin Ashi'], ['bars', 'Balken'], ['line', 'Linie'], ['area', 'Fläche']];
const HEX = /^#[0-9a-f]{6}$/i;
function pickCS(o) {
  const r = {};
  if (!o || typeof o !== 'object') return r;
  for (const k of Object.keys(CS_DEF)) {
    const v = o[k], d = CS_DEF[k];
    if (v === undefined) continue;
    if (d === null || k === 'bg' || k === 'bg2') { if (v === null || (typeof v === 'string' && HEX.test(v))) r[k] = v; }
    else if (typeof v === typeof d) r[k] = v;
  }
  if (!CS_TYPES.some(t => t[0] === r.type)) delete r.type;
  return r;
}
function loadCS() {
  let src = null;
  try { src = CTX && CTX.chartStyle ? CTX.chartStyle() : JSON.parse(localStorage.getItem('blotter.btChart') || 'null'); } catch (e) { src = null; }
  return Object.assign({}, CS_DEF, pickCS(src));
}
let csTimer = 0;
function saveCS(st, now) {
  clearTimeout(csTimer);
  const go = () => {
    const diff = {};
    for (const k of Object.keys(CS_DEF)) if (st[k] !== CS_DEF[k]) diff[k] = st[k];
    try {
      if (CTX && CTX.saveChartStyle) Promise.resolve(CTX.saveChartStyle(diff)).catch(() => CTX.toast('Die Chart-Einstellungen konnten nicht gespeichert werden. Prüfe deine Verbindung.'));
      else localStorage.setItem('blotter.btChart', JSON.stringify(diff));
    } catch (e) {}
  };
  if (now) go(); else csTimer = setTimeout(go, 700);
}
const seriesKind = t => t === 'bars' ? 'bar' : t === 'line' ? 'line' : t === 'area' ? 'area' : 'candle';
// '#rrggbb' or 'rgb(r,g,b)' with an alpha
function rgba(c, a) {
  if (HEX.test(c)) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (m) { const p = m[1].split(',').slice(0, 3).map(s => s.trim()); return `rgba(${p.join(',')},${a})`; }
  return c;
}
function toHex(c) {
  if (HEX.test(c)) return c.toLowerCase();
  const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return '#888888';
  return '#' + m[1].split(',').slice(0, 3).map(s => clamp(Math.round(+s), 0, 255).toString(16).padStart(2, '0')).join('');
}
function lightColor(c) { const h = toHex(c), n = parseInt(h.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; }

/* ================================================================ drawings
   Kept with the session as s.drawings = [{id, type, pts: [{t, p}], st, lock}]: t is UTC ms, p a price, so a
   drawing stays at its place on every timeframe. One series primitive paints them; the pointer handling sits
   on the chart box in front of the chart's own panning. */
const D_COLORS = ['#2962ff', '#00bcd4', '#089981', '#4caf50', '#ffeb3b', '#ff9800', '#f23645', '#e91e63', '#9c27b0', '#ffffff', '#b2b5be', '#787b86', '#434651', '#131722'];
const FIB_LV = [[0, '#787b86'], [0.236, '#f23645'], [0.382, '#ff9800'], [0.5, '#4caf50'], [0.618, '#089981'], [0.786, '#00bcd4'], [1, '#787b86'], [1.618, '#2962ff'], [2.618, '#9c27b0']];
const FIBX_LV = [[0, '#787b86'], [0.618, '#ff9800'], [1, '#089981'], [1.272, '#00bcd4'], [1.618, '#2962ff'], [2, '#9c27b0'], [2.618, '#f23645']];
const MAX_DRAWINGS = 400, MAX_BRUSH = 600;
const OVERLAYS = '.bt-ftb,.bt-pop,.bt-txted,.bt-legend';
const ic = (d, sw) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="${sw || 1.6}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2" fill="currentColor" stroke="none"/>`;
const TOOLS = {
  cross: {name: 'Fadenkreuz', cursor: true, icon: ic('<path d="M12 3v7M12 14v7M3 12h7M14 12h7"/>')},
  pointer: {name: 'Zeiger', cursor: true, icon: ic('<path d="M6.5 3.5l11 8.6-4.9.9 2.9 5.9-2.4 1.2-2.9-6-3.7 3.3z"/>')},
  eraser: {name: 'Radierer', cursor: true, icon: ic('<path d="M9 20h11"/><path d="M5.6 14.6l8.5-8.5a2 2 0 0 1 2.8 0l1.6 1.6a2 2 0 0 1 0 2.8L11 18H8.4z"/><path d="M9.6 10.6l4.4 4.4"/>')},
  trend: {name: 'Trendlinie', n: 2, key: 'T', icon: ic('<path d="M6 18L18 6"/>' + dot(5, 19) + dot(19, 5))},
  ray: {name: 'Strahl', n: 2, icon: ic('<path d="M6.5 17.5L21 4"/>' + dot(5.5, 18.5))},
  ext: {name: 'Verlängerte Linie', n: 2, icon: ic('<path d="M2.5 21.5l19-19"/>' + dot(8, 16) + dot(16, 8))},
  info: {name: 'Info-Linie', n: 2, icon: ic('<path d="M4 20l9-9"/>' + dot(4, 20) + '<rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><path d="M15.5 6h3M15.5 8h2"/>')},
  arrowline: {name: 'Pfeil', n: 2, icon: ic('<path d="M5 19L19 5M11 5h8v8"/>')},
  hline: {name: 'Horizontale Linie', n: 1, key: 'H', icon: ic('<path d="M3 12h18"/>' + dot(12, 12))},
  hray: {name: 'Horizontaler Strahl', n: 1, key: 'J', icon: ic('<path d="M8 12h13"/>' + dot(6, 12))},
  vline: {name: 'Vertikale Linie', n: 1, key: 'V', icon: ic('<path d="M12 3v18"/>' + dot(12, 12))},
  crossline: {name: 'Kreuzlinie', n: 1, key: 'C', icon: ic('<path d="M12 3v18M3 12h18"/>')},
  channel: {name: 'Paralleler Kanal', n: 3, icon: ic('<path d="M3 14L15 4M9 20L21 10"/><path d="M6 17l12-10" stroke-dasharray="1.5 2.6"/>')},
  fib: {name: 'Fib-Retracement', n: 2, key: 'F', icon: ic('<path d="M3 5h18M3 9.7h18M3 14.3h18M3 19h18"/><path d="M6 19L18 5" stroke-dasharray="1.5 2.6"/>')},
  fibext: {name: 'Trendbasierte Fib-Extension', n: 3, icon: ic('<path d="M3 20l5-8 4 4"/><path d="M12 5h9M12 9h9M12 13h9" /><path d="M12 16l9-11" stroke-dasharray="1.5 2.6"/>')},
  rect: {name: 'Rechteck', n: 2, key: 'R', icon: ic('<rect x="4" y="6" width="16" height="12" rx="1.5"/>')},
  ellipse: {name: 'Ellipse', n: 2, icon: ic('<ellipse cx="12" cy="12" rx="9" ry="6.2"/>')},
  triangle: {name: 'Dreieck', n: 3, icon: ic('<path d="M12 4.5l8.5 15h-17z"/>')},
  path: {name: 'Pfad', n: Infinity, icon: ic('<path d="M3 18l5-8 5 5 4-9 4 3"/>' + dot(3, 18) + dot(21, 9))},
  brush: {name: 'Pinsel', free: true, icon: ic('<path d="M3.5 17.5c2.6 0 2.8-4.2 5.6-4.2 2.8 0 2.6 4.4 5.6 4.4 2.6 0 3.5-5.8 5.8-8.2"/>')},
  text: {name: 'Text', n: 1, icon: ic('<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>')},
  callout: {name: 'Sprechblase', n: 2, icon: ic('<path d="M4 4.5h16v10H11l-4.5 4.5v-4.5H4z"/>')},
  pricelabel: {name: 'Preis-Label', n: 1, icon: ic('<path d="M3 12l5-6h13v12H8z"/><path d="M11 12h6"/>')},
  up: {name: 'Pfeil nach oben', n: 1, icon: ic('<path d="M12 4l7 8h-4v8H9v-8H5z"/>')},
  down: {name: 'Pfeil nach unten', n: 1, icon: ic('<path d="M12 20l7-8h-4V4H9v8H5z"/>')},
  long: {name: 'Long-Position', n: 1, icon: ic('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 13h16"/><path d="M9 9.5l3-3 3 3"/>')},
  short: {name: 'Short-Position', n: 1, icon: ic('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 11h16"/><path d="M9 14.5l3 3 3-3"/>')},
  range: {name: 'Datum- und Preisbereich', n: 2, icon: ic('<rect x="4" y="4" width="16" height="16" rx="1.5" stroke-dasharray="2 2.4"/><path d="M12 7.5v9M9.5 9.5L12 7l2.5 2.5M9.5 14.5L12 17l2.5-2.5"/>')},
};
const TGROUPS = [
  {id: 'cursor', name: 'Cursor', tools: ['cross', 'pointer', 'eraser']},
  {id: 'lines', name: 'Linien', tools: ['trend', 'ray', 'ext', 'info', 'arrowline', 'hline', 'hray', 'vline', 'crossline', 'channel']},
  {id: 'fib', name: 'Fibonacci', tools: ['fib', 'fibext']},
  {id: 'shapes', name: 'Formen', tools: ['rect', 'ellipse', 'triangle', 'path', 'brush']},
  {id: 'notes', name: 'Text und Marker', tools: ['text', 'callout', 'pricelabel', 'up', 'down']},
  {id: 'pos', name: 'Positionen und Messen', tools: ['long', 'short', 'range']},
];
const UI_ICON = {
  magnet: ic('<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z"/><path d="M6 8h4M14 8h4"/>'),
  stay: ic('<path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  unlock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.7-1.5"/>'),
  eye: ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><path d="M4 20L20 4"/>'),
  trash: ic('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  clone: ic('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'),
  undo: ic('<path d="M9 6L4 11l5 5"/><path d="M4 11h10.5a5.5 5.5 0 0 1 0 11H12"/>'),
  redo: ic('<path d="M15 6l5 5-5 5"/><path d="M20 11H9.5a5.5 5.5 0 0 0 0 11H12"/>'),
  gear: ic('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  caret: '<svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><path d="M7 1v6H1z" fill="currentColor"/></svg>',
  text: ic('<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>'),
  order: ic('<path d="M4 12h12M12 7l5 5-5 5"/><path d="M20 5v14"/>'),
  flip: ic('<path d="M7 4v16M17 4v16M7 8l-3 3M7 8l3 3M17 16l-3-3M17 16l3-3"/>'),
  ext: ic('<path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3"/>' + dot(9, 12) + dot(15, 12)),
};
const LINE_TYPES = new Set(['trend', 'ray', 'ext', 'info', 'arrowline', 'channel', 'fib', 'fibext', 'path']);
const FILL_TYPES = new Set(['rect', 'ellipse', 'triangle', 'channel', 'range', 'text']);
const TEXT_TYPES = new Set(['text', 'callout', 'hline', 'up', 'down', 'rect']);
const EXT_TYPES = new Set(['trend', 'rect', 'channel', 'fib']);
const NO_LINE = new Set(['text', 'pricelabel', 'up', 'down', 'long', 'short']);
function defStyle(type) {
  const s = {color: '#2962ff', width: 2, dash: 0, fill: false, alpha: 0.2, text: '', size: 14, extL: false, extR: false, rev: false};
  if (type === 'hline' || type === 'hray' || type === 'vline' || type === 'crossline') s.width = 1;
  if (type === 'rect' || type === 'ellipse' || type === 'triangle' || type === 'channel' || type === 'range') { s.fill = true; s.width = 1; }
  if (type === 'fib' || type === 'fibext') { s.color = '#787b86'; s.width = 1; s.fill = true; s.alpha = 0.08; }
  if (type === 'text') { s.color = '#ffffff'; s.alpha = 0.7; s.fill = false; }
  if (type === 'callout' || type === 'pricelabel') { s.color = '#2962ff'; s.size = 13; }
  if (type === 'up') s.color = '#089981';
  if (type === 'down') s.color = '#f23645';
  if (type === 'brush') s.color = '#ff9800';
  return s;
}
const dashOf = (k, w) => k === 1 ? [Math.max(4, w * 3), Math.max(3, w * 2.5)] : k === 2 ? [w, Math.max(3, w * 2.4)] : [];
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const fAxT = new Intl.DateTimeFormat(LOC, {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'});
const fAxD = new Intl.DateTimeFormat(LOC, {weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit'});
function durText(ms) {
  const m = Math.round(Math.abs(ms) / MIN), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return [d ? d + ' T' : '', h ? h + ' Std' : '', mm && d < 3 ? mm + ' Min' : ''].filter(Boolean).join(' ') || '0 Min';
}

class DrawPrimitive {
  constructor(layer) {
    this.L = layer; this._req = null; this._pa = []; this._ta = [];
    this._pv = [{zOrder: () => 'top', renderer: () => ({draw: t => this.L.render(t)})}];
  }
  attached(p) { this.chart = p.chart; this.series = p.series; this._req = p.requestUpdate; }
  detached() { this._req = null; }
  update() { this._req && this._req(); }
  updateAllViews() { const v = this.L.axisViews(); this._pa = v.price; this._ta = v.time; }
  paneViews() { return this._pv; }
  priceAxisViews() { return this._pa; }
  timeAxisViews() { return this._ta; }
}

class DrawLayer {
  constructor(ws) {
    this.ws = ws;
    if (!Array.isArray(ws.s.drawings)) ws.s.drawings = [];
    if (!ws.s.drawOpt || typeof ws.s.drawOpt !== 'object') ws.s.drawOpt = {};
    this.tool = 'cross';
    this.last = {}; for (const g of TGROUPS) this.last[g.id] = g.tools[0];
    this.sel = null; this.mk = null; this.drag = null; this.pop = null; this.ed = null;
    this.undoS = []; this.redoS = [];
    this.geo = new Map();
    this.prim = new DrawPrimitive(this);
    this.font = (getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif');
    this.bind();
    this.renderTools();
  }
  get list() { return this.ws.s.drawings; }
  get opt() { return this.ws.s.drawOpt; }
  get ts() { return this.ws.chart.timeScale(); }
  byId(id) { return this.list.find(d => d.id === id) || null; }
  update() { this.prim.update(); }
  busy() { return !!(this.mk || this.drag || !TOOLS[this.tool].cursor); }
  /* ---------- time and price ↔ screen */
  lg(ms) {
    const T = this.ws.dataT, n = T ? T.length : 0; if (!n) return null;
    const st = TF[this.ws.tf].min * MIN;
    if (ms <= T[0]) return (ms - T[0]) / st;
    if (ms >= T[n - 1]) return n - 1 + (ms - T[n - 1]) / st;
    const i = lowerBound(T, n, ms + 1) - 1, a = T[i], b = T[i + 1];
    return i + (ms - a) / (b - a);
  }
  msAt(l) {
    const T = this.ws.dataT, n = T.length, st = TF[this.ws.tf].min * MIN;
    if (l <= 0) return T[0] + l * st;
    if (l >= n - 1) return T[n - 1] + (l - (n - 1)) * st;
    const i = Math.floor(l); return T[i] + (l - i) * (T[i + 1] - T[i]);
  }
  // the chart converts whole bar indices only; between two bars the position is interpolated
  lgAt(x) {
    const ts = this.ts, r = ts.coordinateToLogical(x); if (r == null) return null;
    const i = Math.round(r), a = ts.logicalToCoordinate(i), b = ts.logicalToCoordinate(i + 1);
    return a == null || b == null || b === a ? r : i + (x - a) / (b - a);
  }
  X(ms) {
    const l = this.lg(ms); if (l == null) return null;
    const i = Math.floor(l), f = l - i, a = this.ts.logicalToCoordinate(i);
    if (a == null || f < 1e-9) return a;
    const b = this.ts.logicalToCoordinate(i + 1);
    return b == null ? a : a + f * (b - a);
  }
  Y(p) { const s = this.ws.series; return s ? s.priceToCoordinate(p) : null; }
  rp(p) { return +(+p).toFixed(this.ws.digits); }
  ptAt(x, y, snap) {
    const ws = this.ws; if (!ws.dataT || !ws.dataT.length) return null;
    const l = this.lgAt(x); if (l == null) return null;
    let p = ws.series.coordinateToPrice(y); if (p == null) return null;
    const L = snap ? Math.round(l) : l;
    if (snap && ws.cs.magnet) {
      const vi = ws.dataIdx && ws.dataIdx[L], v = ws.view;
      if (vi != null && vi < v.n) {
        let best = null, bd = 30;
        for (const c of [v.o[vi], v.h[vi], v.l[vi], v.c[vi]]) { const cy = this.Y(c); if (cy == null) continue; const dd = Math.abs(cy - y); if (dd < bd) { bd = dd; best = c; } }
        if (best != null) p = best;
      }
    }
    return {t: Math.round(this.msAt(L)), p: this.rp(p)};
  }
  pane() { const r = this.ws.box.getBoundingClientRect(); return {r, w: this.ts.width(), h: r.height - this.ts.height()}; }
  loc(e) {
    const pt = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    const {r, w, h} = this.pane();
    const x = pt.clientX - r.left, y = pt.clientY - r.top;
    return {x, y, inPane: x >= 0 && y >= 0 && x <= w && y <= h};
  }
  /* ---------- painting */
  render(target) {
    this.geo.clear();
    const ws = this.ws;
    if (this.opt.hidden || !ws.dataT || !ws.dataT.length || !ws.series) return;
    target.useMediaCoordinateSpace(({context: c, mediaSize: sz}) => {
      this.W = sz.width; this.H = sz.height;
      for (const d of this.list) {
        const P = d.pts.map(pt => ({x: this.X(pt.t), y: this.Y(pt.p)}));
        if (P.some(q => q.x == null || q.y == null || !Number.isFinite(q.x) || !Number.isFinite(q.y))) continue;
        const g = {segs: [], polys: [], rects: [], ells: [], handles: P.map((q, i) => ({x: q.x, y: q.y, i}))};
        c.save();
        try { (RENDER[d.type] || RENDER.trend)(this, c, d, P, g); } catch (e) {}
        c.restore();
        this.geo.set(d.id, g);
      }
      const s = this.sel && this.byId(this.sel), g = s && this.geo.get(s.id);
      if (g) for (const h of g.handles) {
        c.beginPath(); c.arc(h.x, h.y, 5, 0, Math.PI * 2);
        c.fillStyle = ws.col.bg || '#0b1222'; c.fill();
        c.lineWidth = 1.6; c.strokeStyle = (s.type === 'long' || s.type === 'short') ? '#ffffff' : s.st.color; c.stroke();
      }
    });
  }
  pen(c, st, w) { c.strokeStyle = st.color; c.lineWidth = w || st.width; c.setLineDash(dashOf(st.dash, c.lineWidth)); c.lineCap = 'round'; c.lineJoin = 'round'; }
  seg(c, g, x1, y1, x2, y2, extL, extR) {
    if (extL || extR) {
      const dx = x2 - x1, dy = y2 - y1;
      if (Math.abs(dx) < 1e-6) { if (extL || extR) { y1 = extL ? (dy > 0 ? -10 : this.H + 10) : y1; y2 = extR ? (dy > 0 ? this.H + 10 : -10) : y2; } }
      else {
        const k = dy / dx, L0 = -10, R0 = this.W + 10;
        if (extL) { const xe = dx > 0 ? L0 : R0; y1 = y1 + k * (xe - x1); x1 = xe; }
        if (extR) { const xe = dx > 0 ? R0 : L0; y2 = y2 + k * (xe - x2); x2 = xe; }
      }
    }
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    g.segs.push([x1, y1, x2, y2]);
  }
  label(c, txt, x, y, o) {
    o = o || {};
    const lines = String(txt).split('\n'), fs = o.size || 12, lh = Math.round(fs * 1.35);
    c.font = `${o.bold ? '600 ' : ''}${fs}px ${o.mono ? (this.ws.font || 'monospace') : this.font}`;
    const w = Math.max(...lines.map(l => c.measureText(l).width)) + (o.pad || 0) * 2, h = lines.length * lh + (o.pad || 0) * 2 - (lh - fs) + 2;
    let bx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    let by = o.base === 'bottom' ? y - h : o.base === 'middle' ? y - h / 2 : y;
    if (o.bg) { c.fillStyle = o.bg; c.beginPath(); c.roundRect ? c.roundRect(bx, by, w, h, o.radius || 4) : c.rect(bx, by, w, h); c.fill(); if (o.border) { c.strokeStyle = o.border; c.lineWidth = 1; c.setLineDash([]); c.stroke(); } }
    c.fillStyle = o.color || '#fff'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, bx + (o.pad || 0), by + (o.pad || 0) + i * lh + 1));
    return [bx, by, w, h];
  }
  priceTxt(p) { return nf(p, this.ws.digits); }
  moveTxt(a, b, t0, t1) {
    const m = this.ws.m, dp = b - a, pct = a ? dp / a * 100 : 0;
    const unit = m.pip < 1 ? nf(dp / m.pip, 1) + ' ' + m.unit : '';
    const bars = Math.round((this.lg(t1) || 0) - (this.lg(t0) || 0));
    return `${dp >= 0 ? '+' : '−'}${nf(Math.abs(dp), this.ws.digits)} (${dp >= 0 ? '+' : '−'}${nf(Math.abs(pct), 2)} %)${unit ? ' · ' + unit.replace('-', '−') : ''}\n${Math.abs(bars)} Kerzen · ${durText(t1 - t0)}`;
  }
  /* ---------- axis labels: horizontal and vertical lines always, the selected drawing's points */
  axisViews() {
    const price = [], time = [], ws = this.ws;
    if (this.opt.hidden || !ws.series || !ws.dataT || !ws.dataT.length) return {price, time};
    const pv = (p, col) => ({coordinate: () => { const y = this.Y(p); return y == null ? -100 : y; }, text: () => this.priceTxt(p), textColor: () => lightColor(col) ? '#131722' : '#ffffff', backColor: () => col, visible: () => true, tickVisible: () => true});
    const tv = (t, col) => ({coordinate: () => { const x = this.X(t); return x == null ? -100 : x; }, text: () => (TF[ws.tf].min >= 1440 ? fAxD : fAxT).format(new Date(t)), textColor: () => lightColor(col) ? '#131722' : '#ffffff', backColor: () => col, visible: () => true, tickVisible: () => true});
    for (const d of this.list) {
      if (d.type === 'hline' || d.type === 'hray' || d.type === 'crossline') price.push(pv(d.pts[0].p, d.st.color));
      if (d.type === 'vline' || d.type === 'crossline') time.push(tv(d.pts[0].t, d.st.color));
    }
    const s = this.sel && this.byId(this.sel);
    if (s && !['hline', 'hray', 'vline', 'crossline'].includes(s.type)) {
      const col = s.type === 'long' || s.type === 'short' ? '#2962ff' : s.st.color;
      const ps = new Set(), tsSet = new Set();
      for (const pt of s.pts) { if (!ps.has(pt.p)) { ps.add(pt.p); price.push(pv(pt.p, col)); } if (!tsSet.has(pt.t)) { tsSet.add(pt.t); time.push(tv(pt.t, col)); } }
    }
    return {price, time};
  }
  /* ---------- hit test */
  hit(x, y, tol) {
    if (this.opt.hidden) return null;
    const sg = this.sel && this.geo.get(this.sel);
    if (sg) for (let k = 0; k < sg.handles.length; k++) { const h = sg.handles[k]; if (Math.hypot(h.x - x, h.y - y) <= tol + 2) return {id: this.sel, h: k}; }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i], g = this.geo.get(d.id); if (!g) continue;
      if (g.segs.some(s => segDist(x, y, s[0], s[1], s[2], s[3]) <= tol)) return {id: d.id, h: -1};
      if (g.rects.some(r => x >= r[0] - tol && x <= r[0] + r[2] + tol && y >= r[1] - tol && y <= r[1] + r[3] + tol)) return {id: d.id, h: -1};
      if (g.polys.some(p => inPoly(x, y, p))) return {id: d.id, h: -1};
      if (g.ells.some(e => { const nx = (x - e[0]) / (e[2] + tol), ny = (y - e[1]) / (e[3] + tol); return nx * nx + ny * ny <= 1; })) return {id: d.id, h: -1};
      if (g.handles.some(h => Math.hypot(h.x - x, h.y - y) <= tol)) return {id: d.id, h: -1};
    }
    return null;
  }
  /* ---------- pointer handling */
  bind() {
    const box = this.ws.box;
    this.onDown = e => this.down(e);
    this.onHover = e => this.hover(e);
    this.onMove = e => this.move(e);
    this.onUp = e => this.up(e);
    this.onDbl = e => this.dbl(e);
    this.onCtx = e => { if (this.mk) { e.preventDefault(); this.finishOrCancel(); } };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => box.addEventListener(t, this.onDown, {capture: true, passive: false}));
    box.addEventListener('pointermove', this.onHover);
    box.addEventListener('dblclick', this.onDbl);
    box.addEventListener('contextmenu', this.onCtx);
    this.onOut = e => { if (this.pop && !e.target.closest('.bt-pop,.bt-ftb,.bt-fly,.bt-tools')) this.closePop(); };
    document.addEventListener('pointerdown', this.onOut, true);
  }
  unbind() {
    const box = this.ws.box;
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => box.removeEventListener(t, this.onDown, {capture: true}));
    box.removeEventListener('pointermove', this.onHover);
    box.removeEventListener('dblclick', this.onDbl);
    box.removeEventListener('contextmenu', this.onCtx);
    document.removeEventListener('pointerdown', this.onOut, true);
    this.release();
  }
  take(e) { if (e.cancelable) e.preventDefault(); e.stopPropagation(); this.eat = true; }
  capture() {
    if (this.capt) return; this.capt = true;
    window.addEventListener('pointermove', this.onMove, true);
    window.addEventListener('pointerup', this.onUp, true);
    window.addEventListener('pointercancel', this.onUp, true);
    window.addEventListener('touchmove', this.onTouchBlock = e => { if (e.cancelable) e.preventDefault(); }, {capture: true, passive: false});
    this.ws.chart.applyOptions({handleScroll: false, handleScale: false});
  }
  release() {
    if (!this.capt) return; this.capt = false;
    window.removeEventListener('pointermove', this.onMove, true);
    window.removeEventListener('pointerup', this.onUp, true);
    window.removeEventListener('pointercancel', this.onUp, true);
    window.removeEventListener('touchmove', this.onTouchBlock, {capture: true});
    this.ws.chart && this.ws.chart.applyOptions({handleScroll: true, handleScale: true});
  }
  down(e) {
    const ws = this.ws;
    if (e.target && e.target.closest && e.target.closest(OVERLAYS)) return;
    if (e.type !== 'pointerdown') { if (this.eat) { if (e.cancelable) e.preventDefault(); e.stopPropagation(); } return; }
    this.eat = false;
    if (ws.drag && ws.drag.on) return;
    if (this.ed) return;
    if (e.button > 0) return;
    const {x, y, inPane} = this.loc(e);
    if (!inPane) return;
    this.closePop();
    if (this.mk) { this.take(e); this.mkDown(x, y, e); return; }
    const tool = TOOLS[this.tool];
    if (!tool.cursor) { this.take(e); this.begin(x, y, e); return; }
    const h = this.hit(x, y, e.pointerType === 'touch' ? 14 : 6);
    if (this.tool === 'eraser') { const dh = h && this.byId(h.id); if (dh && !(dh.lock || this.opt.locked)) { this.take(e); this.remove(h.id); } return; }
    if (!h) { if (this.sel) this.select(null); return; }
    this.take(e);
    if (this.sel !== h.id) this.select(h.id);
    const d = this.byId(h.id);
    if (!d || d.lock || this.opt.locked) return;
    this.snap();
    this.drag = {d, h: h.h, x0: x, y0: y, orig: JSON.parse(JSON.stringify(d.pts)), l0: this.lgAt(x), p0: ws.series.coordinateToPrice(y), moved: false};
    this.capture();
  }
  hover(e) {
    if (this.capt || this.ed) return;
    if (e.target && e.target.closest && e.target.closest(OVERLAYS)) { this.ws.box.classList.remove('bt-c-move', 'bt-c-pt', 'bt-c-draw'); return; }
    const {x, y, inPane} = this.loc(e);
    const box = this.ws.box;
    box.classList.toggle('bt-c-draw', !TOOLS[this.tool].cursor && inPane);
    if (!TOOLS[this.tool].cursor || !inPane) { box.classList.remove('bt-c-move', 'bt-c-pt'); return; }
    const h = this.hit(x, y, 6), d = h && this.byId(h.id);
    box.classList.toggle('bt-c-pt', !!h && (h.h >= 0 || this.tool === 'eraser') && !(d && (d.lock || this.opt.locked) && this.tool !== 'eraser'));
    box.classList.toggle('bt-c-move', !!h && h.h < 0 && this.tool !== 'eraser' && !(d.lock || this.opt.locked));
  }
  move(e) {
    const {x, y} = this.loc(e);
    if (this.mk) this.mkMove(x, y, e);
    else if (this.drag) this.dragMove(x, y, e);
  }
  up(e) {
    const {x, y} = this.loc(e);
    if (this.mk) { this.mkUp(x, y, e); return; }
    if (this.drag) {
      const g = this.drag; this.drag = null; this.release();
      if (!g.moved) { this.undoS.pop(); return; }
      this.changed();
    }
  }
  dbl(e) {
    if (e.target && e.target.closest && e.target.closest(OVERLAYS)) return;
    const {x, y, inPane} = this.loc(e); if (!inPane) return;
    if (this.mk && this.mk.d.type === 'path') { e.preventDefault(); e.stopPropagation(); this.finishOrCancel(); return; }
    if (!TOOLS[this.tool].cursor) return;
    const h = this.hit(x, y, 8), d = h && this.byId(h.id);
    if (d && TEXT_TYPES.has(d.type) && !(d.lock || this.opt.locked)) { e.preventDefault(); e.stopPropagation(); this.select(d.id); this.editText(d); }
  }
  /* ---------- creating */
  begin(x, y, e) {
    const t = this.tool, def = TOOLS[t];
    if (this.list.length >= MAX_DRAWINGS) { CTX.toast('Diese Session hat schon ' + MAX_DRAWINGS + ' Zeichnungen. Lösch ein paar, um neue anzulegen.'); return; }
    const p = this.ptAt(x, y, t !== 'brush'); if (!p) return;
    this.snap();
    const d = {id: rid('d'), type: t, pts: [p], st: defStyle(t)};
    if (t === 'text') d.st.color = toHex(this.ws.col.fg);
    if (t === 'long' || t === 'short') {
      const top = this.ws.series.coordinateToPrice(0), bot = this.ws.series.coordinateToPrice(this.pane().h);
      const risk = Math.max(Math.abs(top - bot) * 0.05, Math.pow(10, -this.ws.digits) * 5), sgn = t === 'long' ? 1 : -1;
      const t1 = Math.round(this.msAt(Math.round(this.lg(p.t)) + 24));
      d.pts = [p, {t: t1, p: this.rp(p.p + sgn * 2 * risk)}, {t: t1, p: this.rp(p.p - sgn * risk)}];
      this.list.push(d); this.finish(d); return;
    }
    if (def.n === 1) { this.list.push(d); this.finish(d); return; }
    this.list.push(d);
    if (def.free) { this.mk = {d, brush: true, lx: x, ly: y}; this.capture(); this.update(); return; }
    d.pts.push({t: p.t, p: p.p});
    this.mk = {d, i: 1, down: true, first: true, x0: x, y0: y, moved: false};
    this.capture(); this.update();
  }
  mkDown(x, y, e) {
    const m = this.mk; if (m.brush) return;
    m.down = true; m.x0 = x; m.y0 = y; m.moved = false;
    this.mkMove(x, y, e);
  }
  mkMove(x, y, e) {
    const m = this.mk, d = m.d;
    if (m.brush) {
      if (Math.hypot(x - m.lx, y - m.ly) < 2.5 || d.pts.length >= MAX_BRUSH) return;
      const p = this.ptAt(x, y, false); if (p) { d.pts.push(p); m.lx = x; m.ly = y; this.update(); }
      return;
    }
    if (m.down && Math.hypot(x - m.x0, y - m.y0) > 5) m.moved = true;
    const p = this.ptAt(x, y, true); if (!p) return;
    if (e.shiftKey && LINE_TYPES.has(d.type) && m.i > 0) p.p = d.pts[m.i - 1].p;
    d.pts[m.i] = p; this.update();
  }
  mkUp(x, y, e) {
    const m = this.mk;
    if (m.brush) { if (m.d.pts.length < 2) this.cancel(); else this.finish(m.d); return; }
    const wasDown = m.down; m.down = false;
    if (!wasDown) return;
    if (m.first && !m.moved) { m.first = false; return; }   // a click: the next point follows the pointer
    m.first = false;
    this.mkMove(x, y, e);
    const d = m.d, n = TOOLS[d.type].n;
    m.i++;
    if (m.i >= n) { this.finish(d); return; }
    d.pts.push({t: d.pts[m.i - 1].t, p: d.pts[m.i - 1].p});
    this.update();
  }
  finishOrCancel() {
    const m = this.mk; if (!m) return;
    const d = m.d;
    if (d.type === 'path') {
      // the point that follows the pointer, and the double click's twin points, go
      d.pts.pop();
      while (d.pts.length > 2) { const a = d.pts[d.pts.length - 1], b = d.pts[d.pts.length - 2]; if (Math.abs((this.X(a.t) || 0) - (this.X(b.t) || 0)) < 4 && Math.abs((this.Y(a.p) || 0) - (this.Y(b.p) || 0)) < 4) d.pts.pop(); else break; }
      if (d.pts.length >= 2) { this.finish(d); return; }
    }
    this.cancel();
  }
  finish(d) {
    this.mk = null; this.release();
    const P = d.pts.map(pt => [this.X(pt.t), this.Y(pt.p)]);
    const flat = P.length > 1 && P.every(q => Math.abs(q[0] - P[0][0]) < 3 && Math.abs(q[1] - P[0][1]) < 3) && !['long', 'short'].includes(d.type);
    if (flat && TOOLS[d.type].n !== 1) { this.list.splice(this.list.indexOf(d), 1); this.undoS.pop(); this.update(); return; }
    this.select(d.id);
    this.changed();
    if (!this.ws.cs.stay) this.setTool('cross');
    if (d.type === 'text' || d.type === 'callout') this.editText(d, true);
  }
  cancel() {
    const m = this.mk; if (!m) return;
    this.mk = null; this.release();
    const i = this.list.indexOf(m.d); if (i >= 0) this.list.splice(i, 1);
    this.undoS.pop();
    this.update();
  }
  dragMove(x, y, e) {
    const g = this.drag, d = g.d;
    if (!g.moved && Math.hypot(x - g.x0, y - g.y0) < 3) return;
    g.moved = true;
    if (g.h >= 0) {
      const geo = this.geo.get(d.id), hd = geo && geo.handles[g.h];
      const p = this.ptAt(x, y, d.type !== 'brush'); if (!p || !hd) return;
      if (hd.set) hd.set(p, e);
      else {
        if (e.shiftKey && LINE_TYPES.has(d.type) && d.pts.length === 2) p.p = d.pts[1 - hd.i].p;
        d.pts[hd.i] = p;
        if (d.type === 'hline' || d.type === 'hray' || d.type === 'crossline' || d.type === 'vline') d.pts[0] = p;
      }
    } else {
      const l = this.lgAt(x), pr = this.ws.series.coordinateToPrice(y);
      if (l == null || pr == null || g.l0 == null || g.p0 == null) return;
      const dl = d.type === 'brush' ? l - g.l0 : Math.round(l - g.l0), dp = pr - g.p0;
      d.pts = g.orig.map(pt => ({t: Math.round(this.msAt(this.lg(pt.t) + dl)), p: this.rp(pt.p + dp)}));
    }
    this.update();
    this.renderFtb(true);
  }
  /* ---------- changes, undo, saving */
  snap() {
    this.undoS.push(JSON.stringify(this.list));
    if (this.undoS.length > 80) this.undoS.shift();
    this.redoS = [];
    this.syncBtns();
  }
  changed() { this.ws.markDirty(); this.update(); this.renderFtb(); this.syncBtns(); }
  restore(json) {
    this.ws.s.drawings = JSON.parse(json);
    if (this.sel && !this.byId(this.sel)) this.sel = null;
    this.closeEd(false);
    this.changed();
  }
  undo() { if (this.mk) { this.cancel(); return; } if (!this.undoS.length) return; this.redoS.push(JSON.stringify(this.list)); this.restore(this.undoS.pop()); }
  redo() { if (!this.redoS.length) return; this.undoS.push(JSON.stringify(this.list)); this.restore(this.redoS.pop()); }
  syncBtns() {
    const u = document.querySelector('.bt-ws [data-ws="undo"]'), r = document.querySelector('.bt-ws [data-ws="redo"]');
    if (u) u.disabled = !this.undoS.length && !this.mk;
    if (r) r.disabled = !this.redoS.length;
  }
  select(id) {
    if (this.sel === id) return;
    this.sel = id; this.closePop();
    this.update(); this.renderFtb();
  }
  remove(id) {
    const i = this.list.findIndex(d => d.id === id); if (i < 0) return;
    this.snap(); this.list.splice(i, 1);
    if (this.sel === id) this.sel = null;
    this.changed();
  }
  clone(id) {
    const d = this.byId(id); if (!d) return;
    this.snap();
    const c = JSON.parse(JSON.stringify(d)); c.id = rid('d'); c.lock = false;
    const dl = 6, dp = (this.ws.series.coordinateToPrice(0) - this.ws.series.coordinateToPrice(24)) || 0;
    c.pts = c.pts.map(pt => ({t: Math.round(this.msAt(this.lg(pt.t) + dl)), p: this.rp(pt.p - dp)}));
    this.list.push(c); this.sel = c.id; this.changed();
  }
  setSt(patch, coalesce) {
    const d = this.byId(this.sel); if (!d) return;
    const now = Date.now();
    if (!(coalesce && this.lastSt && this.lastSt.k === coalesce && this.lastSt.id === d.id && now - this.lastSt.t < 1200)) this.snap();
    this.lastSt = {k: coalesce, id: d.id, t: now};
    Object.assign(d.st, patch);
    this.changed();
  }
  clearAll() {
    if (!this.list.length) return;
    const dl = dialog(`<div class="bt-dlg-head"><h2>Alle Zeichnungen löschen?</h2><button type="button" class="btn icon ghost" data-bt="close" aria-label="Schließen">✕</button></div>
      <p class="bt-note">Das entfernt alle ${this.list.length} Zeichnungen dieser Session. Mit Rückgängig holst du sie zurück, solange die Session offen ist.</p>
      <div class="row-btns end"><button type="button" class="btn ghost" data-bt="close">Abbrechen</button><button type="button" class="btn primary" id="bt-dc-go">Alle löschen</button></div>`);
    $('#bt-dc-go', dl).addEventListener('click', () => { this.snap(); this.ws.s.drawings = []; this.sel = null; closeDialog(); this.changed(); this.renderTools(); });
  }
  /* ---------- keys (called by the workspace) */
  key(e) {
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return false;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return true; }
    if (mod && !e.altKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); this.redo(); return true; }
    if (e.altKey && !mod) {
      const k = (e.code || '').replace('Key', '');
      const t = Object.keys(TOOLS).find(id => TOOLS[id].key === k);
      if (t) { e.preventDefault(); this.setTool(t); return true; }
      return false;
    }
    if (mod) return false;
    if (e.key === 'Escape') {
      if (this.pop) { e.preventDefault(); e.stopPropagation(); this.closePop(); return true; }
      if (this.mk) { e.preventDefault(); e.stopPropagation(); this.finishOrCancel(); return true; }
      if (this.sel) { e.preventDefault(); e.stopPropagation(); this.select(null); return true; }
      if (this.tool !== 'cross') { e.preventDefault(); e.stopPropagation(); this.setTool('cross'); return true; }
      return false;
    }
    if (e.key === 'Enter' && this.mk && this.mk.d.type === 'path') { e.preventDefault(); this.finishOrCancel(); return true; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) {
      const d = this.byId(this.sel);
      if (d && !(d.lock || this.opt.locked)) { e.preventDefault(); this.remove(this.sel); return true; }
    }
    return false;
  }
  /* ---------- left toolbar */
  setTool(t) {
    if (!TOOLS[t]) return;
    if (this.mk) this.cancel();
    this.tool = t;
    const g = TGROUPS.find(x => x.tools.includes(t)); if (g) this.last[g.id] = t;
    if (!TOOLS[t].cursor) this.select(null);
    this.ws.chart && this.ws.chart.applyOptions({crosshair: {mode: t === 'pointer' ? 2 : 0}});
    this.ws.box.classList.toggle('bt-c-erase', t === 'eraser');
    this.closePop();
    this.renderTools();
  }
  renderTools() {
    const el = document.getElementById('bt-tools'); if (!el) return;
    const cs = this.ws.cs, o = this.opt;
    const grp = g => {
      const cur = this.last[g.id], on = g.tools.includes(this.tool);
      const t = on ? this.tool : cur;
      return `<div class="bt-tg${on ? ' on' : ''}"><button type="button" class="bt-tb" data-dtool="${t}" aria-pressed="${on}" aria-label="${esc(TOOLS[t].name)}" title="${esc(TOOLS[t].name)}${TOOLS[t].key ? ' (Alt+' + TOOLS[t].key + ')' : ''}">${TOOLS[t].icon}</button>${g.tools.length > 1 ? `<button type="button" class="bt-tc" data-dfly="${g.id}" aria-haspopup="menu" aria-expanded="${this.pop && this.pop.fly === g.id}" aria-label="${esc(g.name)}: alle Werkzeuge" title="${esc(g.name)}">${UI_ICON.caret}</button>` : ''}</div>`;
    };
    el.innerHTML = TGROUPS.map(grp).join('') + `<span class="bt-tsep" aria-hidden="true"></span>
      <button type="button" class="bt-tb" data-dopt="magnet" aria-pressed="${!!cs.magnet}" aria-label="Magnet: Punkte rasten an Open, High, Low und Close ein" title="Magnet">${UI_ICON.magnet}</button>
      <button type="button" class="bt-tb" data-dopt="stay" aria-pressed="${!!cs.stay}" aria-label="Zeichenmodus beibehalten" title="Zeichenmodus beibehalten">${UI_ICON.stay}</button>
      <button type="button" class="bt-tb" data-dopt="locked" aria-pressed="${!!o.locked}" aria-label="Alle Zeichnungen sperren" title="Alle Zeichnungen sperren">${o.locked ? UI_ICON.lock : UI_ICON.unlock}</button>
      <button type="button" class="bt-tb" data-dopt="hidden" aria-pressed="${!!o.hidden}" aria-label="Alle Zeichnungen ausblenden" title="Alle Zeichnungen ausblenden">${o.hidden ? UI_ICON.eyeOff : UI_ICON.eye}</button>
      <button type="button" class="bt-tb" data-dopt="clear" aria-label="Alle Zeichnungen löschen" title="Alle Zeichnungen löschen">${UI_ICON.trash}</button>`;
  }
  toolClick(b) {
    if (b.dataset.dtool) { const t = b.dataset.dtool; this.setTool(this.tool === t && !TOOLS[t].cursor ? 'cross' : t); return; }
    if (b.dataset.dfly) { this.openFly(b.dataset.dfly, b); return; }
    if (b.dataset.dpick) { this.setTool(b.dataset.dpick); return; }
    const k = b.dataset.dopt;
    if (k === 'magnet' || k === 'stay') { this.ws.cs[k] = !this.ws.cs[k]; saveCS(this.ws.cs); this.renderTools(); }
    else if (k === 'locked') { this.opt.locked = !this.opt.locked; this.ws.markDirty(); this.renderTools(); this.renderFtb(); }
    else if (k === 'hidden') { this.opt.hidden = !this.opt.hidden; if (this.opt.hidden) this.select(null); this.ws.markDirty(); this.update(); this.renderTools(); }
    else if (k === 'clear') this.clearAll();
  }
  openFly(gid, btn) {
    if (this.pop && this.pop.fly === gid) { this.closePop(); return; }
    this.closePop();
    const g = TGROUPS.find(x => x.id === gid); if (!g) return;
    const el = document.createElement('div');
    el.className = 'bt-fly bt-pop'; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', g.name);
    el.innerHTML = `<p class="bt-fly-h">${esc(g.name)}</p>` + g.tools.map(t => `<button type="button" role="menuitemradio" aria-checked="${this.tool === t}" data-dpick="${t}">${TOOLS[t].icon}<span>${esc(TOOLS[t].name)}</span>${TOOLS[t].key ? `<kbd>Alt+${TOOLS[t].key}</kbd>` : ''}</button>`).join('');
    const host = this.ws.box.closest('.bt-chartbox');
    host.appendChild(el);
    const hr = host.getBoundingClientRect(), br = btn.closest('.bt-tg').getBoundingClientRect();
    const vertical = getComputedStyle(document.getElementById('bt-tools')).flexDirection === 'column';
    if (vertical) { el.style.left = (br.right - hr.left + 6) + 'px'; el.style.top = Math.max(6, Math.min(br.top - hr.top, hr.height - el.offsetHeight - 6)) + 'px'; }
    else { el.style.left = Math.max(6, Math.min(br.left - hr.left, hr.width - el.offsetWidth - 6)) + 'px'; el.style.top = (br.bottom - hr.top + 6) + 'px'; }
    this.pop = {el, fly: gid};
    this.renderTools();
    const first = el.querySelector('[aria-checked="true"]') || el.querySelector('button'); first && first.focus({preventScroll: true});
    el.addEventListener('keydown', e => {
      const bs = $$('button', el), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); }
    });
  }
  closePop() {
    if (!this.pop) return;
    const p = this.pop; this.pop = null; p.el.remove();
    if (p.fly) this.renderTools();
  }
  /* ---------- floating toolbar of the selected drawing */
  renderFtb(onlyPos) {
    let el = this.ws.box.querySelector('.bt-ftb');
    const d = this.sel && this.byId(this.sel);
    if (!d || this.opt.hidden) { if (el) el.remove(); return; }
    if (onlyPos && el) return;
    if (!el) { el = document.createElement('div'); el.className = 'bt-ftb'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Zeichnung bearbeiten'); this.ws.box.appendChild(el); el.addEventListener('click', e => { const b = e.target.closest('[data-fx]'); if (b && !b.disabled) this.fx(b.dataset.fx, b); }); }
    const st = d.st, locked = d.lock || this.opt.locked, T = d.type;
    const b = (k, inner, label, extra) => `<button type="button" class="bt-fb" data-fx="${k}" aria-label="${esc(label)}" title="${esc(label)}"${locked && k !== 'lock' ? ' disabled' : ''}${extra || ''}>${inner}</button>`;
    let h = `<span class="bt-fname">${esc(TOOLS[T].name)}</span>`;
    if (T !== 'long' && T !== 'short') h += b('color', `<i class="bt-sw" style="background:${st.color}"></i>`, T === 'text' ? 'Textfarbe' : 'Farbe');
    if (FILL_TYPES.has(T)) h += b('fill', `<i class="bt-sw fill${st.fill ? '' : ' off'}" style="background:${st.fill ? rgba(st.fillColor || st.color, Math.max(st.alpha, 0.35)) : 'transparent'}"></i>`, T === 'text' ? 'Hintergrund' : 'Füllung');
    if (!NO_LINE.has(T) || T === 'long' || T === 'short') { if (!NO_LINE.has(T)) { h += b('width', `<span class="bt-fw"><i style="height:${st.width}px"></i></span>`, 'Linienstärke'); h += b('dash', `<span class="bt-fd d${st.dash}"></span>`, 'Linienstil'); } }
    if (TEXT_TYPES.has(T)) h += b('text', UI_ICON.text, 'Text bearbeiten');
    if (T === 'text' || T === 'callout' || T === 'pricelabel' || (TEXT_TYPES.has(T) && st.text)) h += b('size', `<span class="bt-fs">${st.size}</span>`, 'Schriftgröße');
    if (EXT_TYPES.has(T)) h += b('ext', UI_ICON.ext, 'Verlängern');
    if (T === 'fib') h += b('rev', UI_ICON.flip, 'Umkehren', ` aria-pressed="${!!st.rev}"`);
    if (T === 'long' || T === 'short') h += b('order', UI_ICON.order + '<span>Als Order</span>', 'Als Order übernehmen');
    h += `<span class="bt-fsep"></span>` + b('lock', d.lock ? UI_ICON.lock : UI_ICON.unlock, d.lock ? 'Entsperren' : 'Sperren', ` aria-pressed="${!!d.lock}"`) + b('clone', UI_ICON.clone, 'Duplizieren') + b('del', UI_ICON.trash, 'Löschen (Entf)');
    el.innerHTML = h;
  }
  fx(k, btn) {
    const d = this.byId(this.sel); if (!d) return;
    if (k === 'del') { this.remove(d.id); return; }
    if (k === 'clone') { this.clone(d.id); return; }
    if (k === 'lock') { this.snap(); d.lock = !d.lock; this.changed(); return; }
    if (k === 'text') { this.editText(d); return; }
    if (k === 'rev') { this.setSt({rev: !d.st.rev}); return; }
    if (k === 'order') { this.toOrder(d); return; }
    if (this.pop && this.pop.fx === k) { this.closePop(); return; }
    this.closePop();
    const el = document.createElement('div');
    el.className = 'bt-pop bt-fpop';
    const st = d.st;
    if (k === 'color' || k === 'fill') {
      const cur = k === 'fill' ? (st.fillColor || st.color) : st.color;
      el.innerHTML = `<div class="bt-pal">${D_COLORS.map(c => `<button type="button" class="bt-pc${c === cur ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>
        <label class="bt-prow">Eigene Farbe <input type="color" value="${toHex(cur)}" data-cc></label>
        ${k === 'fill' ? `<label class="bt-prow"><input type="checkbox" data-fon${st.fill ? ' checked' : ''}> ${d.type === 'text' ? 'Hintergrund anzeigen' : 'Füllung anzeigen'}</label><label class="bt-prow">Deckkraft <input type="range" min="5" max="100" step="5" value="${Math.round(st.alpha * 100)}" data-alpha></label>` : ''}`;
      el.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (!c) return; this.setSt(k === 'fill' ? {fillColor: c.dataset.c, fill: true} : {color: c.dataset.c}); this.refreshPop(el, k); });
      el.addEventListener('input', e => {
        if (e.target.matches('[data-cc]')) this.setSt(k === 'fill' ? {fillColor: e.target.value, fill: true} : {color: e.target.value}, 'cc' + k);
        if (e.target.matches('[data-alpha]')) this.setSt({alpha: +e.target.value / 100, fill: true}, 'alpha');
        if (e.target.matches('[data-fon]')) this.setSt({fill: e.target.checked});
      });
    } else if (k === 'width') {
      el.innerHTML = [1, 2, 3, 4].map(w => `<button type="button" class="bt-pl${st.width === w ? ' on' : ''}" data-w="${w}"><i style="height:${w}px"></i><span>${w} px</span></button>`).join('');
      el.addEventListener('click', e => { const c = e.target.closest('[data-w]'); if (c) { this.setSt({width: +c.dataset.w}); this.closePop(); } });
    } else if (k === 'dash') {
      el.innerHTML = [[0, 'Durchgezogen'], [1, 'Gestrichelt'], [2, 'Gepunktet']].map(([v, n]) => `<button type="button" class="bt-pl${st.dash === v ? ' on' : ''}" data-dash="${v}"><span class="bt-fd d${v}"></span><span>${n}</span></button>`).join('');
      el.addEventListener('click', e => { const c = e.target.closest('[data-dash]'); if (c) { this.setSt({dash: +c.dataset.dash}); this.closePop(); } });
    } else if (k === 'size') {
      el.innerHTML = [10, 12, 14, 16, 20, 24, 28, 36].map(s => `<button type="button" class="bt-pl${st.size === s ? ' on' : ''}" data-size="${s}"><span>${s}</span></button>`).join('');
      el.addEventListener('click', e => { const c = e.target.closest('[data-size]'); if (c) { this.setSt({size: +c.dataset.size}); this.closePop(); } });
    } else if (k === 'ext') {
      el.innerHTML = `<label class="bt-prow"><input type="checkbox" data-ext="extL"${st.extL ? ' checked' : ''}> Nach links verlängern</label><label class="bt-prow"><input type="checkbox" data-ext="extR"${st.extR ? ' checked' : ''}> Nach rechts verlängern</label>`;
      el.addEventListener('change', e => { const c = e.target.closest('[data-ext]'); if (c) this.setSt({[c.dataset.ext]: c.checked}); });
    } else return;
    this.ws.box.appendChild(el);
    const br = btn.getBoundingClientRect(), hr = this.ws.box.getBoundingClientRect();
    el.style.left = Math.max(6, Math.min(br.left - hr.left, hr.width - el.offsetWidth - 6)) + 'px';
    el.style.top = (br.bottom - hr.top + 6) + 'px';
    this.pop = {el, fx: k};
  }
  refreshPop(el, k) {
    const d = this.byId(this.sel); if (!d) return;
    const cur = k === 'fill' ? (d.st.fillColor || d.st.color) : d.st.color;
    $$('[data-c]', el).forEach(b => b.classList.toggle('on', b.dataset.c === cur));
    const cc = $('[data-cc]', el); if (cc) cc.value = toHex(cur);
    const fo = $('[data-fon]', el); if (fo) fo.checked = !!d.st.fill;
  }
  toOrder(d) {
    const ws = this.ws;
    if (ws.s.order) { CTX.toast('Schließe zuerst die offene Position.'); return; }
    const side = d.type === 'long' ? 'long' : 'short';
    const e0 = d.pts[0].p, tp = d.pts[1].p, sl = d.pts[2].p;
    const lp = ws.last, near = Math.abs(e0 - lp) <= Math.pow(10, -ws.digits) * 2;
    ws.draft = {side, kind: near ? 'market' : 'pending', entry: this.rp(e0), sl: this.rp(sl), tp: this.rp(tp)};
    ws.renderSide(); ws.refreshLines();
    const err = ws.validate(Object.assign({}, ws.draft, {kind: near ? 'market' : (side === 'long') === (e0 < lp) ? 'limit' : 'stop'}));
    CTX.toast(err ? 'Als Entwurf übernommen. ' + err : 'Als Order-Entwurf übernommen. Prüf ihn rechts und platziere ihn.');
  }
  /* ---------- text editing on the chart */
  editText(d, fresh) {
    this.closeEd(true);
    const P = this.X(d.pts[d.type === 'callout' ? 1 : 0].t), Q = this.Y(d.pts[d.type === 'callout' ? 1 : 0].p);
    if (P == null || Q == null) return;
    const ta = document.createElement('textarea');
    ta.className = 'bt-txted'; ta.value = d.st.text || ''; ta.rows = 2;
    ta.setAttribute('aria-label', 'Text der Zeichnung');
    ta.placeholder = d.type === 'hline' || d.type === 'rect' || d.type === 'up' || d.type === 'down' ? 'Beschriftung' : 'Text';
    ta.style.left = Math.max(4, Math.min(P, this.W - 180)) + 'px';
    ta.style.top = Math.max(4, Math.min(Q - (d.type === 'hline' ? 34 : 0), this.H - 70)) + 'px';
    ta.style.fontSize = Math.min(20, d.st.size || 14) + 'px';
    this.ws.box.appendChild(ta);
    const before = JSON.stringify(this.list);
    this.ed = {ta, d, fresh, before};
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.closeEd(true); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeEd(false); }
    });
    ta.addEventListener('blur', () => setTimeout(() => this.closeEd(true), 0));
    setTimeout(() => { ta.focus(); ta.select(); }, 0);
  }
  closeEd(keep) {
    const ed = this.ed; if (!ed) return;
    this.ed = null;
    const v = ed.ta.value.replace(/\s+$/, '').slice(0, 500);
    ed.ta.remove();
    const d = ed.d;
    if (keep && v !== (d.st.text || '')) {
      if (!ed.fresh) { this.undoS.push(ed.before); this.redoS = []; }
      d.st.text = v;
    }
    if ((d.type === 'text' || d.type === 'callout') && !(d.st.text || '').trim() && this.byId(d.id)) {
      if (ed.fresh) { this.list.splice(this.list.indexOf(d), 1); this.undoS.pop(); if (this.sel === d.id) this.sel = null; }
    }
    this.changed();
  }
  destroy() { this.closeEd(false); this.closePop(); this.unbind(); }
}

/* how each drawing paints itself; g collects what can be hit and the handles */
const RENDER = {
  trend(L, c, d, P, g) {
    const s = d.st, T = d.type;
    L.pen(c, s);
    L.seg(c, g, P[0].x, P[0].y, P[1].x, P[1].y, T === 'ext' || (T === 'trend' && s.extL), T === 'ray' || T === 'ext' || (T === 'trend' && s.extR));
    if (T === 'arrowline') {
      const a = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x), len = 8 + s.width * 2.5;
      c.setLineDash([]); c.beginPath();
      c.moveTo(P[1].x - len * Math.cos(a - 0.45), P[1].y - len * Math.sin(a - 0.45)); c.lineTo(P[1].x, P[1].y); c.lineTo(P[1].x - len * Math.cos(a + 0.45), P[1].y - len * Math.sin(a + 0.45)); c.stroke();
    }
    if (T === 'info') {
      const r = L.label(c, L.moveTxt(d.pts[0].p, d.pts[1].p, d.pts[0].t, d.pts[1].t), P[1].x + 10, P[1].y, {size: 11, mono: true, pad: 6, bg: rgba(s.color, 0.88), color: lightColor(s.color) ? '#131722' : '#fff', base: 'middle'});
      g.rects.push(r);
    }
  },
  hline(L, c, d, P, g) {
    const s = d.st; L.pen(c, s);
    L.seg(c, g, 0, P[0].y, L.W, P[0].y);
    g.handles = [{x: Math.min(L.W - 40, Math.max(40, P[0].x)), y: P[0].y, i: 0}];
    if (s.text) g.rects.push(L.label(c, s.text, 8, P[0].y - 4, {size: s.size, color: s.color, base: 'bottom'}));
  },
  hray(L, c, d, P, g) { L.pen(c, d.st); L.seg(c, g, P[0].x, P[0].y, L.W, P[0].y); },
  vline(L, c, d, P, g) {
    L.pen(c, d.st); L.seg(c, g, P[0].x, 0, P[0].x, L.H);
    g.handles = [{x: P[0].x, y: Math.min(L.H - 30, Math.max(30, P[0].y)), i: 0}];
  },
  crossline(L, c, d, P, g) { L.pen(c, d.st); L.seg(c, g, 0, P[0].y, L.W, P[0].y); L.seg(c, g, P[0].x, 0, P[0].x, L.H); },
  channel(L, c, d, P, g) {
    const s = d.st, [a, b] = P, q = P[2] || P[1];
    const k = Math.abs(b.x - a.x) < 1e-6 ? 0 : (b.y - a.y) / (b.x - a.x);
    const off = q.y - (a.y + k * (q.x - a.x));
    let x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    if (s.extL) { const xe = x2 > x1 ? -10 : L.W + 10; y1 += k * (xe - x1); x1 = xe; }
    if (s.extR) { const xe = x2 > x1 ? L.W + 10 : -10; y2 += k * (xe - x2); x2 = xe; }
    if (s.fill) { c.fillStyle = rgba(s.fillColor || s.color, s.alpha); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x2, y2 + off); c.lineTo(x1, y1 + off); c.closePath(); c.fill(); }
    g.polys.push([{x: x1, y: y1}, {x: x2, y: y2}, {x: x2, y: y2 + off}, {x: x1, y: y1 + off}]);
    L.pen(c, s); L.seg(c, g, x1, y1, x2, y2); L.seg(c, g, x1, y1 + off, x2, y2 + off);
    c.globalAlpha = 0.6; c.setLineDash([4, 4]); c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1 + off / 2); c.lineTo(x2, y2 + off / 2); c.stroke(); c.globalAlpha = 1;
    if (P[2]) g.handles[2] = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + off, set: p => { d.pts[2] = p; }};
  },
  fib(L, c, d, P, g) {
    const s = d.st, [a, b] = P, p0 = d.pts[0].p, p1 = d.pts[1].p;
    const xa = Math.min(a.x, b.x), xb = s.extR ? L.W : Math.max(a.x, b.x), xl = s.extL ? 0 : xa;
    c.setLineDash([3, 4]); c.strokeStyle = rgba(s.color, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    g.segs.push([a.x, a.y, b.x, b.y]);
    let prevY = null;
    for (let i = 0; i < FIB_LV.length; i++) {
      const [lv, col] = FIB_LV[i];
      const pr = s.rev ? p0 + (p1 - p0) * lv : p1 + (p0 - p1) * lv;
      const y = L.Y(pr); if (y == null) continue;
      if (s.fill && prevY != null) { c.fillStyle = rgba(col, s.alpha); c.fillRect(xl, Math.min(prevY, y), xb - xl, Math.abs(y - prevY)); }
      prevY = y;
      c.setLineDash(dashOf(s.dash, s.width)); c.strokeStyle = col; c.lineWidth = s.width;
      L.seg(c, g, xl, y, xb, y);
      L.label(c, `${nf(lv, lv % 1 ? 3 : 0)} (${L.priceTxt(pr)})`, xl + 4, y - 2, {size: 11, mono: true, color: col, base: 'bottom'});
    }
    g.rects.push([xl, Math.min(a.y, b.y), xb - xl, Math.abs(b.y - a.y)]);
  },
  fibext(L, c, d, P, g) {
    const s = d.st, [a, b, q] = P;
    c.setLineDash([3, 4]); c.strokeStyle = rgba(s.color, 0.7); c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); if (q) c.lineTo(q.x, q.y); c.stroke();
    g.segs.push([a.x, a.y, b.x, b.y]); if (q) g.segs.push([b.x, b.y, q.x, q.y]);
    if (!q) return;
    const dp = d.pts[1].p - d.pts[0].p, base = d.pts[2].p;
    const xa = q.x, xb = q.x + Math.max(60, Math.abs(b.x - a.x));
    let prevY = null;
    for (const [lv, col] of FIBX_LV) {
      const pr = base + dp * lv, y = L.Y(pr); if (y == null) continue;
      if (s.fill && prevY != null) { c.fillStyle = rgba(col, s.alpha); c.fillRect(xa, Math.min(prevY, y), xb - xa, Math.abs(y - prevY)); }
      prevY = y;
      c.setLineDash(dashOf(s.dash, s.width)); c.strokeStyle = col; c.lineWidth = s.width;
      L.seg(c, g, xa, y, xb, y);
      L.label(c, `${nf(lv, lv % 1 ? 3 : 0)} (${L.priceTxt(pr)})`, xa + 4, y - 2, {size: 11, mono: true, color: col, base: 'bottom'});
    }
  },
  rect(L, c, d, P, g) {
    const s = d.st;
    let x1 = Math.min(P[0].x, P[1].x), x2 = Math.max(P[0].x, P[1].x);
    const y1 = Math.min(P[0].y, P[1].y), y2 = Math.max(P[0].y, P[1].y);
    if (s.extL) x1 = 0; if (s.extR) x2 = L.W;
    if (s.fill) { c.fillStyle = rgba(s.fillColor || s.color, s.alpha); c.fillRect(x1, y1, x2 - x1, y2 - y1); }
    L.pen(c, s); c.strokeRect(x1, y1, x2 - x1, y2 - y1);
    g.rects.push([x1, y1, x2 - x1, y2 - y1]);
    if (s.text) L.label(c, s.text, (x1 + x2) / 2, (y1 + y2) / 2, {size: s.size, color: s.color, align: 'center', base: 'middle'});
    // the other two corners can be dragged as well
    const [p0, p1] = d.pts;
    g.handles.push({x: P[1].x, y: P[0].y, set: p => { d.pts[1] = {t: p.t, p: p1.p}; d.pts[0] = {t: p0.t, p: p.p}; }});
    g.handles.push({x: P[0].x, y: P[1].y, set: p => { d.pts[0] = {t: p.t, p: p0.p}; d.pts[1] = {t: p1.t, p: p.p}; }});
  },
  ellipse(L, c, d, P, g) {
    const s = d.st, cx = (P[0].x + P[1].x) / 2, cy = (P[0].y + P[1].y) / 2, rx = Math.abs(P[1].x - P[0].x) / 2, ry = Math.abs(P[1].y - P[0].y) / 2;
    c.beginPath(); c.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    if (s.fill) { c.fillStyle = rgba(s.fillColor || s.color, s.alpha); c.fill(); }
    L.pen(c, s); c.stroke();
    g.ells.push([cx, cy, rx, ry]);
  },
  triangle(L, c, d, P, g) {
    const s = d.st;
    c.beginPath(); c.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) c.lineTo(P[i].x, P[i].y); c.closePath();
    if (s.fill && P.length > 2) { c.fillStyle = rgba(s.fillColor || s.color, s.alpha); c.fill(); }
    L.pen(c, s); c.stroke();
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; g.segs.push([a.x, a.y, b.x, b.y]); }
    if (P.length > 2) g.polys.push(P);
  },
  path(L, c, d, P, g) {
    L.pen(c, d.st);
    c.beginPath(); c.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) c.lineTo(P[i].x, P[i].y); c.stroke();
    for (let i = 1; i < P.length; i++) g.segs.push([P[i - 1].x, P[i - 1].y, P[i].x, P[i].y]);
  },
  brush(L, c, d, P, g) {
    L.pen(c, d.st);
    c.beginPath(); c.moveTo(P[0].x, P[0].y);
    for (let i = 1; i < P.length - 1; i++) { const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2; c.quadraticCurveTo(P[i].x, P[i].y, mx, my); }
    if (P.length > 1) c.lineTo(P[P.length - 1].x, P[P.length - 1].y);
    c.stroke();
    for (let i = 1; i < P.length; i++) g.segs.push([P[i - 1].x, P[i - 1].y, P[i].x, P[i].y]);
    g.handles = [];
  },
  text(L, c, d, P, g) {
    const s = d.st;
    const r = L.label(c, s.text || ' ', P[0].x, P[0].y, {size: s.size, color: s.color, pad: s.fill ? 6 : 0, bg: s.fill ? rgba(s.fillColor || '#131722', s.alpha) : null});
    g.rects.push(r);
  },
  callout(L, c, d, P, g) {
    const s = d.st;
    const r = L.label(c, s.text || ' ', P[1].x, P[1].y, {size: s.size, color: lightColor(s.color) ? '#131722' : '#fff', pad: 8, bg: s.color, radius: 6});
    const cx = clamp(P[0].x, r[0] + 6, r[0] + r[2] - 6), cy = P[0].y < r[1] ? r[1] : P[0].y > r[1] + r[3] ? r[1] + r[3] : r[1] + r[3] / 2;
    c.fillStyle = s.color; c.beginPath(); c.moveTo(P[0].x, P[0].y); c.lineTo(cx - 7, cy); c.lineTo(cx + 7, cy); c.closePath(); c.fill();
    g.rects.push(r); g.segs.push([P[0].x, P[0].y, cx, cy]);
  },
  pricelabel(L, c, d, P, g) {
    const s = d.st, txt = L.priceTxt(d.pts[0].p);
    const r = L.label(c, txt, P[0].x + 8, P[0].y - 12, {size: s.size, mono: true, color: lightColor(s.color) ? '#131722' : '#fff', pad: 6, bg: s.color, base: 'bottom', radius: 5});
    c.fillStyle = s.color; c.beginPath(); c.moveTo(P[0].x, P[0].y); c.lineTo(r[0] + 4, r[1] + r[3] - 1); c.lineTo(r[0] + 16, r[1] + r[3] - 1); c.closePath(); c.fill();
    g.rects.push(r);
  },
  up(L, c, d, P, g) { RENDER.mark(L, c, d, P, g, 1); },
  down(L, c, d, P, g) { RENDER.mark(L, c, d, P, g, -1); },
  mark(L, c, d, P, g, dir) {
    const s = d.st, x = P[0].x, y = P[0].y, h = 22, w = 16, k = dir;   // tip at the point, body away from it
    c.fillStyle = s.color; c.beginPath();
    c.moveTo(x, y); c.lineTo(x + w / 2, y + k * 9); c.lineTo(x + 3.5, y + k * 9); c.lineTo(x + 3.5, y + k * h); c.lineTo(x - 3.5, y + k * h); c.lineTo(x - 3.5, y + k * 9); c.lineTo(x - w / 2, y + k * 9); c.closePath(); c.fill();
    g.rects.push([x - w / 2, Math.min(y, y + k * h), w, h]);
    if (s.text) g.rects.push(L.label(c, s.text, x, y + k * (h + 4), {size: s.size, color: s.color, align: 'center', base: k > 0 ? 'top' : 'bottom'}));
  },
  long(L, c, d, P, g) { RENDER.pos(L, c, d, P, g, 1); },
  short(L, c, d, P, g) { RENDER.pos(L, c, d, P, g, -1); },
  pos(L, c, d, P, g, k) {
    const ws = L.ws, [E, T, S] = P, xa = Math.min(E.x, T.x), xb = Math.max(E.x, T.x, xa + 30);
    const pe = d.pts[0].p, pt = d.pts[1].p, ps = d.pts[2].p;
    c.fillStyle = ws.col.upA + '0.22)'; c.fillRect(xa, Math.min(E.y, T.y), xb - xa, Math.abs(T.y - E.y));
    c.fillStyle = ws.col.dnA + '0.22)'; c.fillRect(xa, Math.min(E.y, S.y), xb - xa, Math.abs(S.y - E.y));
    c.setLineDash([]); c.lineWidth = 1; c.strokeStyle = ws.col.fg; c.beginPath(); c.moveTo(xa, E.y); c.lineTo(xb, E.y); c.stroke();
    const risk = Math.abs(pe - ps), rew = Math.abs(pt - pe), rr = risk ? rew / risk : 0, m = ws.m;
    const amt = v => m.pip < 1 ? nf(v / m.pip, 1) + ' ' + m.unit : nf(v, ws.digits) + ' ' + m.unit;
    const pct = v => pe ? nf(v / pe * 100, 2) + ' %' : '';
    const lb = (txt, y, up, col) => L.label(c, txt, (xa + xb) / 2, y + (up ? -4 : 4), {size: 11, mono: true, pad: 5, bg: col, color: '#fff', align: 'center', base: up ? 'bottom' : 'top', radius: 4});
    const tUp = T.y < E.y;
    lb(`Ziel: ${amt(rew)} (${pct(rew)})`, T.y, tUp, ws.col.up);
    lb(`Stop: ${amt(risk)} (${pct(risk)})`, S.y, !tUp, ws.col.dn);
    L.label(c, `R:R ${nf(rr, 2)}`, (xa + xb) / 2, E.y + (tUp ? 4 : -4), {size: 11, mono: true, pad: 4, bg: 'rgba(19,23,34,.75)', color: '#fff', align: 'center', base: tUp ? 'top' : 'bottom', radius: 4});
    g.rects.push([xa, Math.min(T.y, S.y), xb - xa, Math.abs(S.y - T.y)]);
    g.handles = [
      {x: E.x, y: E.y, set: p => { d.pts[0] = {t: p.t, p: p.p}; }},
      {x: E.x, y: T.y, set: p => { d.pts[1] = {t: d.pts[1].t, p: p.p}; }},
      {x: E.x, y: S.y, set: p => { d.pts[2] = {t: d.pts[2].t, p: p.p}; }},
      {x: T.x, y: E.y, set: p => { d.pts[1] = {t: p.t, p: d.pts[1].p}; d.pts[2] = {t: p.t, p: d.pts[2].p}; }},
    ];
    void k;
  },
  range(L, c, d, P, g) {
    const s = d.st, [a, b] = P, x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
    const up = d.pts[1].p >= d.pts[0].p, col = s.color;
    if (s.fill) { c.fillStyle = rgba(col, s.alpha * 0.8); c.fillRect(x1, y1, x2 - x1, y2 - y1); }
    c.strokeStyle = col; c.lineWidth = 1; c.setLineDash([]);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    c.beginPath(); c.moveTo(mx, a.y); c.lineTo(mx, b.y); c.moveTo(a.x, my); c.lineTo(b.x, my); c.stroke();
    const head = (x, y, ang) => { c.beginPath(); c.moveTo(x - 6 * Math.cos(ang - 0.5), y - 6 * Math.sin(ang - 0.5)); c.lineTo(x, y); c.lineTo(x - 6 * Math.cos(ang + 0.5), y - 6 * Math.sin(ang + 0.5)); c.stroke(); };
    head(mx, b.y, b.y > a.y ? Math.PI / 2 : -Math.PI / 2); head(b.x, my, b.x > a.x ? 0 : Math.PI);
    const r = L.label(c, L.moveTxt(d.pts[0].p, d.pts[1].p, d.pts[0].t, d.pts[1].t), mx, up ? y1 - 6 : y2 + 6, {size: 11, mono: true, pad: 6, bg: rgba(col, 0.9), color: lightColor(col) ? '#131722' : '#fff', align: 'center', base: up ? 'bottom' : 'top', radius: 4});
    g.rects.push([x1, y1, x2 - x1, y2 - y1], r);
  },
};
RENDER.ray = RENDER.ext = RENDER.info = RENDER.arrowline = RENDER.trend;

/* ================================================================ chart settings panel */
function openChartSettings(ws) {
  const cs = ws.cs, col = ws.col;
  const tab = (id, label, on) => `<button type="button" role="tab" id="bt-cst-${id}" aria-controls="bt-csp-${id}" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-cst="${id}">${label}</button>`;
  const colIn = (k, def, label) => `<input type="color" data-csc="${k}" value="${toHex(cs[k] || def)}" aria-label="${esc(label)}">`;
  const chk = (k, label) => `<label class="bt-csk"><input type="checkbox" data-csb="${k}"${cs[k] ? ' checked' : ''}> ${label}</label>`;
  const sel = (k, opts, label) => `<select class="inp sm" data-css="${k}" aria-label="${esc(label)}">${opts.map(([v, n]) => `<option value="${v}"${String(cs[k]) === String(v) ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  const html = `<div class="bt-dlg-head"><h2>Chart-Einstellungen</h2><button type="button" class="btn icon ghost" data-bt="close" aria-label="Schließen">✕</button></div>
    <div class="bt-cs-tabs" role="tablist" aria-label="Bereiche">${tab('sym', 'Kerzen', true)}${tab('look', 'Darstellung', false)}${tab('scale', 'Skalen', false)}</div>
    <div class="bt-cs-p" role="tabpanel" id="bt-csp-sym" aria-labelledby="bt-cst-sym">
      <div class="bt-cs-row"><span>Chart-Typ</span>${sel('type', CS_TYPES, 'Chart-Typ')}</div>
      <div class="bt-cs-c" data-show="candle">
        <div class="bt-cs-row"><span>${chk('body', 'Körper')}</span><span class="bt-cs-pair">${colIn('upBody', col.up, 'Körper steigend')}${colIn('dnBody', col.dn, 'Körper fallend')}</span></div>
        <div class="bt-cs-row"><span>${chk('border', 'Rahmen')}</span><span class="bt-cs-pair">${colIn('upBorder', cs.upBody || col.up, 'Rahmen steigend')}${colIn('dnBorder', cs.dnBody || col.dn, 'Rahmen fallend')}</span></div>
        <div class="bt-cs-row"><span>${chk('wick', 'Docht')}</span><span class="bt-cs-pair">${colIn('upWick', cs.upBody || col.up, 'Docht steigend')}${colIn('dnWick', cs.dnBody || col.dn, 'Docht fallend')}</span></div>
        <p class="bt-cs-hint">Links steigende, rechts fallende Kerzen.</p>
      </div>
      <div class="bt-cs-c" data-show="bar"><div class="bt-cs-row"><span>Balken</span><span class="bt-cs-pair">${colIn('upBody', col.up, 'Balken steigend')}${colIn('dnBody', col.dn, 'Balken fallend')}</span></div></div>
      <div class="bt-cs-c" data-show="line"><div class="bt-cs-row"><span>Linie</span><span class="bt-cs-pair">${colIn('lineColor', '#2962ff', 'Linienfarbe')}${sel('lineWidth', [[1, '1 px'], [2, '2 px'], [3, '3 px'], [4, '4 px']], 'Linienstärke')}</span></div></div>
    </div>
    <div class="bt-cs-p" role="tabpanel" id="bt-csp-look" aria-labelledby="bt-cst-look" hidden>
      <div class="bt-cs-row"><span>Hintergrund</span><span class="bt-cs-pair">${sel('bgMode', [['theme', 'Farbschema'], ['solid', 'Einfarbig'], ['gradient', 'Verlauf']], 'Hintergrund')}<span data-bg1>${colIn('bg', '#0b1222', 'Hintergrundfarbe')}</span><span data-bg2>${colIn('bg2', '#16213d', 'Zweite Hintergrundfarbe')}</span></span></div>
      <div class="bt-cs-row"><span>Gitterlinien</span><span class="bt-cs-pair">${sel('grid', [['both', 'Beide'], ['vert', 'Vertikal'], ['horz', 'Horizontal'], ['none', 'Keine']], 'Gitterlinien')}${colIn('gridColor', toHex(col.grid), 'Farbe der Gitterlinien')}</span></div>
      <div class="bt-cs-row"><span>Fadenkreuz</span><span class="bt-cs-pair">${sel('cross', [[0, 'Durchgezogen'], [2, 'Gestrichelt'], [1, 'Gepunktet']], 'Linienstil des Fadenkreuzes')}${colIn('crossColor', toHex(col.mute), 'Farbe des Fadenkreuzes')}</span></div>
      <div class="bt-cs-row"><span>Anzeigen</span><span class="bt-cs-list">${chk('legend', 'Statuszeile mit OHLC')}${chk('watermark', 'Wasserzeichen')}</span></div>
    </div>
    <div class="bt-cs-p" role="tabpanel" id="bt-csp-scale" aria-labelledby="bt-cst-scale" hidden>
      <div class="bt-cs-row"><span>Preisskala</span>${sel('scale', [[0, 'Normal'], [1, 'Logarithmisch'], [2, 'Prozent']], 'Preisskala')}</div>
      <div class="bt-cs-row"><span>Letzter Kurs</span>${chk('lastPrice', 'Linie und Label anzeigen')}</div>
      <div class="bt-cs-row"><span>Schrift</span><span class="bt-cs-pair">${colIn('textColor', toHex(col.mute), 'Schriftfarbe der Skalen')}${sel('fontSize', [[10, '10'], [11, '11'], [12, '12'], [13, '13'], [14, '14']], 'Schriftgröße der Skalen')}</span></div>
      <div class="bt-cs-row"><span>Freiraum rechts</span><span class="bt-cs-pair"><input type="range" min="0" max="60" step="2" value="${cs.rightOffset}" data-csr="rightOffset" aria-label="Freiraum rechts in Kerzen"><output>${cs.rightOffset}</output></span></div>
    </div>
    <div class="row-btns end"><button type="button" class="btn ghost" id="bt-cs-reset">Standard</button><button type="button" class="btn primary" data-bt="close">Fertig</button></div>`;
  const d = dialog(html, 'wide bt-cs');
  d.closest('.bt-dlg-wrap').classList.add('bt-cs-wrap');
  const sync = () => {
    const k = seriesKind(cs.type);
    $$('[data-show]', d).forEach(x => { x.hidden = x.dataset.show !== (k === 'area' ? 'line' : k); });
    $('[data-bg1]', d).hidden = cs.bgMode === 'theme'; $('[data-bg2]', d).hidden = cs.bgMode !== 'gradient';
  };
  sync();
  const apply = () => { ws.applyStyle(); saveCS(cs); sync(); };
  d.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.csc) { cs[t.dataset.csc] = t.value; if (t.dataset.csc === 'bg' || t.dataset.csc === 'bg2') { if (cs.bgMode === 'theme') cs.bgMode = 'solid'; const s = $('[data-css="bgMode"]', d); if (s) s.value = cs.bgMode; } apply(); }
    else if (t.dataset.csr) { cs[t.dataset.csr] = +t.value; const o = t.nextElementSibling; if (o) o.textContent = t.value; apply(); }
  });
  d.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.csb) { cs[t.dataset.csb] = t.checked; apply(); }
    else if (t.dataset.css) { const k = t.dataset.css, v = t.value; cs[k] = typeof CS_DEF[k] === 'number' ? +v : v; apply(); }
  });
  d.addEventListener('click', e => {
    const tb = e.target.closest('[data-cst]');
    if (tb) {
      $$('[data-cst]', d).forEach(x => { const on = x === tb; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      $$('.bt-cs-p', d).forEach(p => { p.hidden = p.id !== 'bt-csp-' + tb.dataset.cst; });
    }
  });
  d.addEventListener('keydown', e => {
    const tb = e.target.closest && e.target.closest('[data-cst]');
    if (!tb || !/^(ArrowLeft|ArrowRight)$/.test(e.key)) return;
    const tabs = $$('[data-cst]', d), i = tabs.indexOf(tb), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[j].click(); tabs[j].focus();
  });
  $('#bt-cs-reset', d).addEventListener('click', () => {
    const keep = {magnet: cs.magnet, stay: cs.stay};
    for (const k of Object.keys(CS_DEF)) cs[k] = CS_DEF[k];
    Object.assign(cs, keep);
    ws.applyStyle(); saveCS(cs, true);
    closeDialog(); openChartSettings(ws);
  });
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
