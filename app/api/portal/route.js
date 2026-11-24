import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: 'no_customer' }, { status: 404 });
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: siteUrl(req) + '/app',
    locale: req.headers.get('x-lang') === 'en' ? 'en' : 'de',
  });
  return NextResponse.json({ url: session.url });
}
