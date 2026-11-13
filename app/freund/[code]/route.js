import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PREVIEW_COOKIE, previewPassword, previewToken } from '@/lib/preview';
import { grantFriend, isFriendCode } from '@/lib/friends';

export const dynamic = 'force-dynamic';

const plain = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };

// Invite link for friends: /freund/<code>.
// Not signed in yet: opens the access lock and sends the friend to the sign-in, which comes back here.
// Signed in: the account becomes a free friend account and the journal opens.
export async function GET(req, { params }) {
  const url = new URL(req.url);
  const given = plain(String(params?.code || ''));
  if (!(await isFriendCode(given))) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return NextResponse.redirect(new URL('/', url.origin), 303);
  }

  const { data: { user } } = await createClient().auth.getUser();
  let to = '/app';
  if (!user) {
    to = '/login?next=' + encodeURIComponent(url.pathname);
  } else {
    try { await grantFriend(user.id); }
    catch (e) { console.error('Freundeszugang fehlgeschlagen:', e?.code || e?.name || 'unbekannt'); to = '/abo'; }
  }

  const res = NextResponse.redirect(new URL(to, url.origin), 303);
  const lock = previewPassword();
  if (lock) res.cookies.set(PREVIEW_COOKIE, await previewToken(lock), { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 180 });
  res.headers.set('X-Robots-Tag', 'noindex');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
