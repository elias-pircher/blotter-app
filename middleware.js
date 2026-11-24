import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PREVIEW_COOKIE, PREVIEW_OPEN, previewPassword, previewToken, sameToken } from '@/lib/preview';
import { LANG_COOKIE, fromAccept, isLang, isSitePath, lp } from '@/lib/i18n';

// sign-in steps between the login e-mail and the invite route
const INVITE_STEPS = ['/login', '/auth/callback', '/login/bestaetigen', '/login/fertig'];
const YEAR = 60 * 60 * 24 * 365;

export async function middleware(request) {
  // Language: English pages live under /en and are served by the same routes (rewrite, x-lang: en).
  // A page without the prefix is German, unless the visitor chose English or their browser asks for
  // English on the first visit (then: redirect to /en). Everything else (journal, API) follows the choice.
  const full = request.nextUrl.pathname;
  const prefixed = full === '/en' || full.startsWith('/en/');
  const p0 = prefixed ? full.slice(3) || '/' : full;
  const chosen = request.cookies.get(LANG_COOKIE)?.value;
  const accept = fromAccept(request.headers.get('accept-language'));
  let lang;
  if (prefixed) lang = 'en';
  else if (isSitePath(p0)) {
    const want = isLang(chosen) ? chosen : accept;
    if (want === 'en') {
      const url = request.nextUrl.clone();
      url.pathname = lp('en', p0);
      const res = NextResponse.redirect(url, 307);
      res.headers.set('Vary', 'Accept-Language, Cookie');
      if (!isLang(chosen)) res.cookies.set(LANG_COOKIE, 'en', { path: '/', maxAge: YEAR, sameSite: 'lax' });
      return res;
    }
    lang = 'de';
  } else lang = isLang(chosen) ? chosen : accept || 'de';
  const at = (path) => (lang === 'en' ? lp('en', path) : path);

  // Access lock until launch: without the right cookie every page leads to /zugang.
  // Friends with an invite link pass, also when they finish signing in from the e-mail in another browser
  // (those steps carry next=/freund/…; the invite route itself checks the code).
  const lock = previewPassword();
  const invite = p0.startsWith('/freund/')
    || (INVITE_STEPS.includes(p0) && (request.nextUrl.searchParams.get('next') || '').startsWith('/freund/'));
  if (lock && !PREVIEW_OPEN.includes(p0) && !invite) {
    const ok = sameToken(request.cookies.get(PREVIEW_COOKIE)?.value || '', await previewToken(lock));
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = at('/zugang');
      url.search = '';
      url.searchParams.set('next', full + request.nextUrl.search);
      const res = NextResponse.redirect(url);
      res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }
  }

  // the request as the routes see it: without the prefix, with the language in a header
  const make = () => {
    const h = new Headers(request.headers);
    h.set('x-lang', lang);
    h.set('x-lang-set', isLang(chosen) ? '1' : '0');
    h.set('x-path', p0);
    let res;
    if (prefixed) {
      const url = request.nextUrl.clone();
      url.pathname = p0;
      res = NextResponse.rewrite(url, { request: { headers: h } });
    } else res = NextResponse.next({ request: { headers: h } });
    if (prefixed && !isLang(chosen)) res.cookies.set(LANG_COOKIE, 'en', { path: '/', maxAge: YEAR, sameSite: 'lax' });
    return res;
  };
  let response = make();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = make();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (p0.startsWith('/app') || p0.startsWith('/abo'))) {
    const url = request.nextUrl.clone();
    url.pathname = at('/login');
    url.search = '';
    url.searchParams.set('next', full + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|journal/|api/stripe/webhook|api/auth/send-email|api/resend/webhook|api/mail-status|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|woff2)$).*)'],
};
