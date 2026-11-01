import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app');
const OTP_TYPES = new Set(['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change']);

// The login link from the e-mail ends up here.
// - Standard Supabase e-mails (our login form): the session arrives in the URL fragment,
//   which only the browser can read, so we hand over to /login/fertig with the fragment intact.
// - token_hash links (custom e-mail templates, later with own SMTP): verified here, any browser.
// - code links (older PKCE e-mails): only work in the browser that requested them.
export async function GET(req) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (!code && !tokenHash) {
    const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Anmelden…</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#07111f">'
      + "<script>location.replace('/login/fertig'+location.search+location.hash)</script>"
      + '<noscript><p style="color:#fff;font-family:system-ui;padding:24px">Bitte aktiviere JavaScript, um dich anzumelden.</p></noscript></body></html>';
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }

  const supabase = createClient();
  let error = null;
  if (tokenHash && OTP_TYPES.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    const flowId = url.searchParams.get('sb_flow_id');
    ({ error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined));
  } else {
    error = { code: 'bad_type' };
  }
  if (error) console.error('Login-Link fehlgeschlagen:', error.code || error.name || 'unbekannt');
  return NextResponse.redirect(new URL(error ? '/login?fehler=link' : next, url.origin));
}
