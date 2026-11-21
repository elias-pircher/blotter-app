import { NextResponse } from 'next/server';
import { stripe, syncSubscription } from '@/lib/stripe';
import { secret as readSecret } from '@/lib/secrets';
import { sendTrialMail } from '@/lib/trial-mail';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
]);

export async function POST(req) {
  const signature = req.headers.get('stripe-signature');
  const secret = readSecret('STRIPE_WEBHOOK_SECRET');
  if (!signature || !secret) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }
  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') {
      if (obj.mode === 'subscription' && obj.subscription) {
        await syncSubscription(typeof obj.subscription === 'string' ? obj.subscription : obj.subscription.id, obj.client_reference_id);
      }
    } else {
      const r = await syncSubscription(obj.id, obj.metadata?.user_id);
      if (event.type === 'customer.subscription.trial_will_end') {
        // the e-mail must never make Stripe resend the event: the subscription is already in sync
        try { await sendTrialMail(r.sub, siteUrl(req)); } catch (e) { console.error('Test-Mail', e?.status || '', e?.code || e?.message || ''); }
      }
    }
  } catch (err) {
    // nothing to sync for subscriptions without a Blotter account; answering 200 stops Stripe from retrying for days
    if (err?.code === 'no_user') { console.warn('Stripe webhook: Abo ohne Blotter-Konto ignoriert', event.type); return NextResponse.json({ received: true, ignored: true }); }
    console.error('Stripe webhook', event.type, err);
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
