import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PREVIEW_COOKIE, PREVIEW_OPEN, previewPassword, previewToken, sameToken } from '@/lib/preview';

export async function middleware(request) {
  // Access lock until launch: without the right cookie every page leads to /zugang.
  const lock = previewPassword();
  if (lock && !PREVIEW_OPEN.includes(request.nextUrl.pathname)) {
    const ok = sameToken(request.cookies.get(PREVIEW_COOKIE)?.value || '', await previewToken(lock));
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = '/zugang';
      url.search = '';
      url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      const res = NextResponse.redirect(url);
      res.headers.set('X-Robots-Tag', 'noindex');
      return res;
    }
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith('/app') || path.startsWith('/abo'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|journal/|api/stripe/webhook|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt)$).*)'],
};
