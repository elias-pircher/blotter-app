import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive } from '@/lib/stripe';
import { isFriendPlan } from '@/lib/friends';
import { planOf, when } from '@/lib/plans';
import Journal from './Journal';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/app');
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,plan,trial_end,cancel_at_period_end').eq('user_id', user.id).maybeSingle();
  if (!isActive(sub)) redirect('/abo');
  const trial = sub.status === 'trialing' && sub.trial_end
    ? { end: sub.trial_end, until: when(sub.trial_end), canceled: !!sub.cancel_at_period_end }
    : null;
  return <Journal userId={user.id} email={user.email} friend={isFriendPlan(sub)} plan={planOf(sub)} trial={trial} />;
}
