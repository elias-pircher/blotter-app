import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Screenshots live in a private bucket. This hands the signed-in owner a short-lived link.
export async function GET(req) {
  const path = new URL(req.url).searchParams.get('p') || '';
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|gif|webp)$/.test(path)) return new NextResponse(null, { status: 404 });
  const supabase = createClient();
  const { data, error } = await supabase.storage.from('shots').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return new NextResponse(null, { status: 404 });
  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set('Cache-Control', 'private, max-age=3000');
  return res;
}
