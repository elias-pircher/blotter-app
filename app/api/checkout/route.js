import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, isActive, trialEligible } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';
import { isPlan, priceIdFor, TRIAL_DAYS } from '@/lib/plans';
import { lp } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.consent !== true) return NextResponse.json({ error: 'consent_required' }, { status: 400 });

  const plan = isPlan(body.plan) ? body.plan : 'journal';
  const lang = req.headers.get('x-lang') === 'en' ? 'en' : 'de';
  const priceId = priceIdFor(plan);
  if (!priceId) return NextResponse.json({ error: 'not_configured' }, { status: 500 });

  const base = siteUrl(req);
  const admin = createAdminClient();
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id,stripe_subscription_id,status,price_id,trial_end').eq('user_id', user.id).maybeSingle();
  // already subscribed: a different plan is a switch, which the subscription page handles
  if (isActive(sub)) return NextResponse.json({ url: base + lp(lang, '/abo') + '?plan=' + plan });

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id }, preferred_locales: [lang] });
    customerId = customer.id;
  } else {
    // Stripe's own e-mails and our trial e-mail follow the language of the last checkout
    try { await stripe().customers.update(customerId, { preferred_locales: [lang] }); } catch (e) { /* keeps the old language */ }
  }
  const { error } = await admin.from('subscriptions').upsert({
    user_id: user.id,
    stripe_customer_id: customerId,
    status: sub?.status || 'none',
    consent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  // new customers start with a free trial; Stripe still takes the card, and charges it when the trial ends
  let trial = false;
  try { trial = await trialEligible(sub, customerId); } catch (e) { trial = false; }

  const tax = process.env.STRIPE_AUTOMATIC_TAX === 'true'
    ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' } }
    : {};
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: user.id },
      ...(trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } } : {}),
    },
    payment_method_collection: 'always',
    metadata: { plan, trial: trial ? 'yes' : 'no' },
    allow_promotion_codes: true,
    locale: lang,
    success_url: base + lp(lang, '/abo/danke') + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: base + lp(lang, '/abo') + '?abgebrochen=1&plan=' + plan,
    ...tax,
  });
  return NextResponse.json({ url: session.url, trial });
}
