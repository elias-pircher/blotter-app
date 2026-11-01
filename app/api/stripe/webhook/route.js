import { NextResponse } from 'next/server';
import { stripe, syncSubscription } from '@/lib/stripe';
import { secret as readSecret } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
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
      await syncSubscription(obj.id, obj.metadata?.user_id);
    }
  } catch (err) {
    console.error('Stripe webhook', event.type, err);
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
