import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive } from '@/lib/stripe';
import { isFriendPlan } from '@/lib/friends';
import Journal from './Journal';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/app');
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id').eq('user_id', user.id).maybeSingle();
  if (!isActive(sub)) redirect('/abo');
  return <Journal userId={user.id} email={user.email} friend={isFriendPlan(sub)} />;
}
