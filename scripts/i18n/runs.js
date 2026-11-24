// The user-visible text runs of a JS file or of the journal markup, with their exact source ranges.
// A run is the trimmed text between tags inside a string or template literal; ${…} expressions that hold
// markup or other literals split a run, simple ones (${n}, ${esc(x)}) stay inside it. The visible
// attributes of tags (title, aria-label, placeholder, alt) are runs of their own.
// CLI: node scripts/i18n/runs.js <file> [--html]   -> one run per line (unique, in source order)
const fs = require('fs');
const path = require('path');
let acorn;
try { acorn = require('acorn'); } catch (e) { acorn = require(path.join(process.env.ACORN_DIR || '', 'acorn')); }

const ATTR = /\b(title|aria-label|placeholder|alt)="([^"\u0001]*)"/g;

// pieces of src[a, b) outside tags and masked ranges; masks are sorted [s, e) ranges
function scan(src, a, b, masks, out, quote) {
  const chars = src.slice(a, b).split('');
  for (const [s, e] of masks) for (let i = Math.max(s, a); i < Math.min(e, b); i++) chars[i - a] = '\u0001';
  const text = chars.join('');
  const cuts = [];
  for (const m of text.matchAll(/<[^>]*>/g)) {
    cuts.push([a + m.index, a + m.index + m[0].length]);
    for (const t of m[0].matchAll(ATTR)) {
      const s = a + m.index + t.index + t[1].length + 2;
      push(src, s, s + t[2].length, out, quote, true);
    }
  }
  for (const m of text.matchAll(/\u0001+/g)) cuts.push([a + m.index, a + m.index + m[0].length]);
  cuts.sort((x, y) => x[0] - y[0]);
  let p = a;
  for (const [s, e] of cuts) { if (s < p) { p = Math.max(p, e); continue; } push(src, p, s, out, quote); p = e; }
  push(src, p, b, out, quote);
}
function push(src, s, e, out, quote, attr) {
  while (s < e && /\s/.test(src[s])) s++;
  while (e > s && /\s/.test(src[e - 1])) e--;
  if (e > s) out.push({ s, e, key: src.slice(s, e), quote, attr: !!attr });
}

function findRuns(src, html) {
  const out = [];
  if (html) {
    const masks = [];
    for (const m of src.matchAll(/<(script|style|svg)\b[\s\S]*?<\/\1>/g)) masks.push([m.index, m.index + m[0].length]);
    scan(src, 0, src.length, masks, out, '');
    return out;
  }
  const ast = acorn.parse(src, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowHashBang: true, sourceType: /^\s*(import|export)\b/m.test(src) ? 'module' : 'script' });
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      scan(src, n.start + 1, n.end - 1, [], out, src[n.start]);
    } else if (n.type === 'TemplateLiteral') {
      const masks = [];
      n.expressions.forEach((e) => { if (/[`<'"]/.test(src.slice(e.start, e.end))) masks.push([e.start - 2, e.end + 1]); });
      scan(src, n.start + 1, n.end - 1, masks, out, '`');
    }
    for (const k of Object.keys(n)) {
      if (k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(ast);
  return out;
}

module.exports = { findRuns };

if (require.main === module) {
  const file = process.argv[2];
  const seen = new Set();
  for (const r of findRuns(fs.readFileSync(file, 'utf8'), process.argv.includes('--html'))) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    console.log(r.key.replace(/\n/g, '⏎'));
  }
}
