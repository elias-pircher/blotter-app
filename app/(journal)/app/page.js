import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive } from '@/lib/stripe';
import { isFriendPlan } from '@/lib/friends';
import { planOf, when } from '@/lib/plans';
import { getLang, langChosen } from '@/lib/i18n-server';
import { lp } from '@/lib/i18n';
import { MARKUP } from './markup';
import { MARKUP_EN } from './markup.en';
import Journal from './Journal';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // the language: the visitor's choice in this browser, else the account's, else the browser's
  const meta = user?.user_metadata?.lang;
  const lang = !langChosen() && (meta === 'en' || meta === 'de') ? meta : getLang();
  if (!user) redirect(lp(lang, '/login') + '?next=/app');
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,plan,trial_end,cancel_at_period_end').eq('user_id', user.id).maybeSingle();
  if (!isActive(sub)) redirect(lp(lang, '/abo'));
  const trial = sub.status === 'trialing' && sub.trial_end
    ? { end: sub.trial_end, until: when(sub.trial_end, lang), canceled: !!sub.cancel_at_period_end }
    : null;
  return <Journal userId={user.id} email={user.email} friend={isFriendPlan(sub)} plan={planOf(sub)} trial={trial} lang={lang} markup={lang === 'en' ? MARKUP_EN : MARKUP} />;
}
