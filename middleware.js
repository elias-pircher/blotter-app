import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
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
  const { data: { user }, error } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith('/app') || path.startsWith('/abo'))) {
    console.log('[diag] mw-redirect ' + JSON.stringify({
      path, rsc: request.headers.get('rsc') || '', purpose: request.headers.get('purpose') || request.headers.get('sec-purpose') || '',
      cookies: request.cookies.getAll().filter((c) => c.name.startsWith('sb-')).map((c) => c.name.replace(/^sb-[^-]+-/, '') + ':' + c.value.length),
      err: error ? String(error.code || error.name || error.status || '') : '', ua: (request.headers.get('user-agent') || '').slice(0, 140),
    }));
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|journal/|api/stripe/webhook|api/health|api/diag|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt)$).*)'],
};
