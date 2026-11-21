import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { secret } from '@/lib/secrets';
import { planOfPrice, FRIEND } from '@/lib/plans';

let client;
export function stripe() {
  if (!client) {
    const key = secret('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY fehlt');
    // STRIPE_API_BASE points the client at a local stand-in for tests; production never sets it
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = base
      ? new Stripe(key, { host: base.hostname, port: base.port, protocol: base.protocol.replace(':', ''), maxNetworkRetries: 0 })
      : new Stripe(key);
  }
  return client;
}

const ACTIVE = ['active', 'trialing', 'past_due'];
export const isActive = (sub) => !!sub && ACTIVE.includes(sub.status);

// Copy the current state of a Stripe subscription into our database.
export async function syncSubscription(subscriptionId, userIdHint) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const admin = createAdminClient();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  let userId = sub.metadata?.user_id || userIdHint;
  if (!userId && customerId) {
    const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error('Kein Benutzer zu Abo ' + sub.id);
  const item = sub.items?.data?.[0];
  const end = item?.current_period_end ?? sub.current_period_end;
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: item?.price?.id ?? null,
    plan: planOfPrice(item?.price),
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return { userId, status: sub.status, plan: planOfPrice(item?.price), sub };
}

// The free trial is for new customers: nobody who had a subscription (or a trial) before.
// hadSubscription() only reads our database row; checkout additionally asks Stripe.
export const hadSubscription = (row) => !!row && (!!row.stripe_subscription_id || !!row.trial_end || row.price_id === FRIEND);
export async function trialEligible(row, customerId) {
  if (hadSubscription(row)) return false;
  if (!customerId) return true;
  const list = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
  return !list.data?.length;
}
