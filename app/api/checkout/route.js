import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, isActive } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.consent !== true) return NextResponse.json({ error: 'consent_required' }, { status: 400 });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: 'not_configured' }, { status: 500 });

  const base = siteUrl(req);
  const admin = createAdminClient();
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id,status').eq('user_id', user.id).maybeSingle();
  if (isActive(sub)) return NextResponse.json({ url: base + '/app' });

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
  }
  const { error } = await admin.from('subscriptions').upsert({
    user_id: user.id,
    stripe_customer_id: customerId,
    status: sub?.status || 'none',
    consent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  const tax = process.env.STRIPE_AUTOMATIC_TAX === 'true'
    ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' } }
    : {};
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    locale: 'de',
    success_url: base + '/abo/danke?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: base + '/abo?abgebrochen=1',
    ...tax,
  });
  return NextResponse.json({ url: session.url });
}
