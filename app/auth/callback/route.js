import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app');
const OTP_TYPES = new Set(['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change']);

// The login link from the e-mail ends up here.
// - token_hash links (our e-mail templates): a plain GET never uses up the one-time link, because
//   mail scanners open links before the customer does. GET shows a page with a button (/login/bestaetigen);
//   the button POSTs back here and only then is the link verified.
// - Standard Supabase e-mails: the session arrives in the URL fragment, which only the browser can read,
//   so we hand over to /login/fertig with the fragment intact.
// - code links (older PKCE e-mails): only work in the browser that requested them.
export async function GET(req) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (tokenHash) {
    const to = new URL('/login/bestaetigen', url.origin);
    to.searchParams.set('token_hash', tokenHash);
    to.searchParams.set('type', OTP_TYPES.has(type) ? type : 'email');
    to.searchParams.set('next', next);
    return NextResponse.redirect(to, 303);
  }

  if (!code) {
    const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Anmelden…</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#07111f">'
      + "<script>location.replace('/login/fertig'+location.search+location.hash)</script>"
      + '<noscript><p style="color:#fff;font-family:system-ui;padding:24px">Bitte aktiviere JavaScript, um dich anzumelden.</p></noscript></body></html>';
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }

  const flowId = url.searchParams.get('sb_flow_id');
  const { error } = await createClient().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error) console.error('Login-Link fehlgeschlagen:', error.code || error.name || 'unbekannt');
  return NextResponse.redirect(new URL(error ? '/login?fehler=link' : next, url.origin));
}

// The button on /login/bestaetigen: verifies the one-time link and signs the customer in.
export async function POST(req) {
  const url = new URL(req.url);
  // only our own confirmation page may submit here (protects against being logged into someone else's account)
  const origin = req.headers.get('origin');
  if (origin && origin !== url.origin) return new NextResponse('Ungültige Anfrage', { status: 403 });
  let form;
  try { form = await req.formData(); } catch (e) { form = new FormData(); }
  const tokenHash = String(form.get('token_hash') || '');
  const type = String(form.get('type') || 'email');
  const next = safeNext(String(form.get('next') || ''));
  let error = null;
  if (!tokenHash || !OTP_TYPES.has(type)) error = { code: 'bad_request' };
  else ({ error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type }));
  if (error) console.error('Login-Link fehlgeschlagen:', error.code || error.name || 'unbekannt');
  return NextResponse.redirect(new URL(error ? '/login?fehler=link' : next, url.origin), 303);
}
