import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LANG_COOKIE, isLang, isSitePath, lp, unprefix } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// The language switch: /api/lang?to=en&next=/abo remembers the choice (cookie, and the account for
// e-mails) and opens the page in that language.
export async function GET(req) {
  const url = new URL(req.url);
  const to = url.searchParams.get('to');
  let next = url.searchParams.get('next') || '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/api/')) next = '/';
  const lang = isLang(to) ? to : 'de';
  const plain = unprefix(next);
  const dest = isSitePath(plain) ? lp(lang, plain) : plain;
  const res = NextResponse.redirect(new URL(dest, url.origin), 303);
  res.cookies.set(LANG_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  res.headers.set('Cache-Control', 'no-store');
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.lang !== lang) await supabase.auth.updateUser({ data: { lang } });
  } catch (e) { /* the cookie is enough to switch; the account keeps its old language for e-mails */ }
  return res;
}
