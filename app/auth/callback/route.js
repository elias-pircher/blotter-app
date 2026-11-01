import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app');
const OTP_TYPES = new Set(['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change']);

// Finishes a login from the e-mail link.
// token_hash links (our e-mail template) work in any browser or device;
// code links (Supabase's default template) only in the browser that requested the e-mail.
export async function GET(req) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const supabase = createClient();
  let error = null;
  if (tokenHash && OTP_TYPES.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    const flowId = url.searchParams.get('sb_flow_id');
    ({ error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined));
  } else {
    error = { code: 'no_token' };
  }
  if (error) console.error('Login-Link fehlgeschlagen:', error.code || error.name || 'unbekannt');
  return NextResponse.redirect(new URL(error ? '/login?fehler=link' : next, url.origin));
}
