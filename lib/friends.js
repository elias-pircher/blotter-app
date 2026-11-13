// Free accounts for friends: whoever opens the invite link /freund/<FRIEND_CODE> and signs in gets the journal
// for free, without a subscription. Active only while the env var FRIEND_CODE is set; changing the code
// retires the old link (accounts already set up keep their access).
import { createAdminClient } from '@/lib/supabase/admin';
import { sameToken } from '@/lib/preview';

// marks a friend account in subscriptions.price_id (status stays 'active', so the database rules need no change)
export const FRIEND_PLAN = 'freund';
export const isFriendPlan = (sub) => !!sub && sub.price_id === FRIEND_PLAN;

export function friendCode() {
  const v = process.env.FRIEND_CODE;
  return v ? v.trim() : '';
}

async function digest(s) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode('blotter-friend-v1'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(s));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// constant-time check of a code from an invite link
export async function isFriendCode(given) {
  const code = friendCode();
  if (!code || typeof given !== 'string' || !given.trim()) return false;
  return sameToken(await digest(given.trim()), await digest(code));
}

// Turns the signed-in user's account into a free friend account. A running paid subscription is left alone.
export async function grantFriend(userId) {
  const admin = createAdminClient();
  const { data, error: readErr } = await admin.from('subscriptions').select('status').eq('user_id', userId).maybeSingle();
  if (readErr) throw readErr;
  if (data && ['active', 'trialing', 'past_due'].includes(data.status)) return;
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    status: 'active',
    price_id: FRIEND_PLAN,
    current_period_end: null,
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}
