import { NextResponse } from 'next/server';
import { reasonOf, validRid } from '@/lib/mail';
import { statusForRid } from '@/lib/mail-log';

// The login page asks here whether its e-mail arrived. It only knows its own random request id,
// and the answer never contains the address or the receiving server's text.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req) {
  const rid = new URL(req.url).searchParams.get('rid');
  if (!validRid(rid)) return json({ status: 'unbekannt' }, 400);
  try {
    const row = await statusForRid(rid);
    if (!row) return json({ status: 'unbekannt' });
    return json({ status: row.status, grund: reasonOf(row.status, row.detail) });
  } catch {
    return json({ status: 'unbekannt' });
  }
}
