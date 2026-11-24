// Builds the English journal from the German source: every text run (see runs.js) that has a pair in the
// language file is replaced by its English version; runs without a pair stay as they are.
//
// usage: node scripts/i18n/apply.js <lang file> <in> <out> [--html] [--report]
// Language file, one entry per two lines:
//   = German run              (exactly as in the source, ⏎ for a line break)
//   > English run
// Raw code swaps, applied first, anywhere in the file (the count must match, default 1):
//   != old code
//   !# 3
//   !> new code
// Lines starting with # are comments. --report lists the pairs that matched nothing.
const fs = require('fs');
const path = require('path');
const { findRuns } = require('./runs');

function readLang(file) {
  const pairs = new Map(), code = [];
  const nl = (s) => s.replace(/⏎/g, '\n');
  let k = null, ck = null, cn = 1;
  fs.readFileSync(file, 'utf8').split('\n').forEach((l, i) => {
    const at = `${path.basename(file)}:${i + 1}`;
    if (l.startsWith('= ')) { if (k != null) throw new Error(`${at}: no translation for ${JSON.stringify(k)}`); k = nl(l.slice(2)); }
    else if (l.startsWith('> ')) {
      if (k == null) throw new Error(`${at}: translation without a source line`);
      const v = nl(l.slice(2));
      if (pairs.has(k) && pairs.get(k) !== v) throw new Error(`${at}: two translations for ${JSON.stringify(k)}`);
      pairs.set(k, v); k = null;
    }
    else if (l.startsWith('!= ')) { ck = nl(l.slice(3)); cn = 1; }
    else if (l.startsWith('!# ')) { cn = +l.slice(3); }
    else if (l.startsWith('!> ')) { if (ck == null) throw new Error(`${at}: code swap without a source`); code.push([ck, nl(l.slice(3)), cn, at]); ck = null; }
  });
  if (k != null) throw new Error(`${file}: no translation for ${JSON.stringify(k)}`);
  return { pairs, code };
}

function esc(s, quote, attr) {
  if (attr) s = s.replace(/"/g, '&quot;');
  if (quote === "'") return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  if (quote === '"') return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  if (quote === '`') return s.replace(/`/g, '\\`');
  return s;
}

function apply(langFiles, src, html, { code: withCode = true } = {}) {
  const pairs = new Map(), code = [];
  for (const f of [].concat(langFiles)) {
    const l = readLang(f);
    for (const [k, v] of l.pairs) { if (pairs.has(k) && pairs.get(k) !== v) throw new Error(`${f}: two translations for ${JSON.stringify(k)}`); pairs.set(k, v); }
    code.push(...l.code);
  }
  for (const [a, b, n, at] of withCode ? code : []) {
    const c = src.split(a).length - 1;
    if (c !== n) throw new Error(`${at}: code swap expected ${n}, found ${c}: ${JSON.stringify(a.slice(0, 90))}`);
    src = src.split(a).join(b);
  }
  const used = new Set();
  const edits = [];
  for (const r of findRuns(src, html)) {
    if (!pairs.has(r.key)) continue;
    used.add(r.key);
    edits.push([r.s, r.e, esc(pairs.get(r.key), r.quote, r.attr)]);
  }
  edits.sort((x, y) => y[0] - x[0]);
  let out = src;
  for (const [s, e, t] of edits) out = out.slice(0, s) + t + out.slice(e);
  return { out, edits: edits.length, unused: [...pairs.keys()].filter((k) => !used.has(k)), total: pairs.size };
}
module.exports = { apply };

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const outFile = args.pop(), inFile = args.pop();
  const r = apply(args, fs.readFileSync(inFile, 'utf8'), process.argv.includes('--html'));
  fs.writeFileSync(outFile, r.out);
  console.log(`${path.basename(outFile)}: ${r.edits} runs translated, ${r.total - r.unused.length}/${r.total} pairs used`);
  if (process.argv.includes('--report') && r.unused.length) console.log('unused:\n' + r.unused.map((k) => '  ' + JSON.stringify(k)).join('\n'));
}
