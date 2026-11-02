// Temporary: receives the diagnostics from lib/diag.js and writes them to the server log.
export const dynamic = 'force-dynamic';
const s = (v, n = 120) => String(v == null ? '' : v).slice(0, n);
export async function POST(req) {
  let b = {};
  try { b = JSON.parse(await req.text()); } catch (e) {}
  console.log('[diag] client ' + JSON.stringify({ ev: s(b.ev, 30), nav: s(b.nav, 20), ref: s(b.ref), path: s(b.path, 60), hash: s(b.hash, 30), sb: !!b.sb, st: s(b.st, 20), persisted: !!b.persisted, t: s(b.t, 30), ua: s(req.headers.get('user-agent'), 140) }));
  return new Response(null, { status: 204 });
}
