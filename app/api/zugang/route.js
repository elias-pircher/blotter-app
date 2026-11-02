import { NextResponse } from 'next/server';
import { PREVIEW_COOKIE, previewPassword, previewToken, sameToken, safeNext } from '@/lib/preview';

export const dynamic = 'force-dynamic';

// Password form on /zugang. Sets the access cookie for half a year.
export async function POST(req) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (origin && origin !== url.origin) return new NextResponse('Ungültige Anfrage', { status: 403 });
  let form;
  try { form = await req.formData(); } catch (e) { form = new FormData(); }
  const next = safeNext(String(form.get('next') || '/'));
  const lock = previewPassword();
  if (!lock) return NextResponse.redirect(new URL(next, url.origin), 303);
  const given = String(form.get('passwort') || '').trim();
  const ok = given && sameToken(await previewToken(given), await previewToken(lock));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    const back = new URL('/zugang', url.origin);
    back.searchParams.set('next', next);
    back.searchParams.set('fehler', '1');
    return NextResponse.redirect(back, 303);
  }
  const res = NextResponse.redirect(new URL(next, url.origin), 303);
  res.cookies.set(PREVIEW_COOKIE, await previewToken(lock), { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 180 });
  return res;
}
