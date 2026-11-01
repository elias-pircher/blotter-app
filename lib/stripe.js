import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

let client;
export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY fehlt');
    client = new Stripe(key);
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
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return { userId, status: sub.status };
}
