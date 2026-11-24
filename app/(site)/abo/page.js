import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive, hadSubscription } from '@/lib/stripe';
import { PLANS, PLAN_IDS, isPlan, planOf, planIn, FRIEND, day, when, dayShort, trialLeft, TRIAL_DAYS, switchGain, andList } from '@/lib/plans';
import { getLang } from '@/lib/i18n-server';
import { lp, tr } from '@/lib/i18n';
import { Nav, Footer } from '../chrome';
import CheckoutButton from './CheckoutButton';
import PlanSwitch from './PlanSwitch';
import PortalButton from './PortalButton';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Plan – Blotter' : 'Abo – Blotter' });

// how much of the free trial is left, as a bar that empties
function TrialMeter({ end, canceled, lang }) {
  const t = tr(lang);
  const total = TRIAL_DAYS * 864e5;
  const left = Math.max(0, Math.min(total, new Date(end).getTime() - Date.now()));
  return (
    <div className={'trial-meter' + (canceled ? ' off' : '')}>
      <div className="tm-top"><b>{trialLeft(end, undefined, lang)}</b><span>{t('bis', 'until')} {dayShort(end, lang)}</span></div>
      <div className="tm-bar" role="progressbar" aria-label={t('Verbleibende Testzeit', 'Trial time left')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((left / total) * 100)}><i style={{ width: (left / total) * 100 + '%' }} /></div>
    </div>
  );
}

export default async function AboPage({ searchParams }) {
  const lang = getLang(), t = tr(lang), L = (p) => lp(lang, p);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(L('/login') + '?next=' + encodeURIComponent(L('/abo') + (isPlan(searchParams?.plan) ? '?plan=' + searchParams.plan : '')));
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,plan,current_period_end,cancel_at_period_end,stripe_subscription_id,trial_end').eq('user_id', user.id).maybeSingle();
  const active = isActive(sub);
  const plan = active ? planOf(sub) : null;
  const want = isPlan(searchParams?.plan) ? searchParams.plan : null;
  const switched = searchParams?.gewechselt === '1';

  let body;
  if (plan === FRIEND) {
    body = (
      <div className="card">
        <span className="eyebrow">{t('Freundeszugang', 'Friend access')}</span>
        <h1>{t('Blotter ist für dich kostenlos.', 'Blotter is free for you.')}</h1>
        <p>{t('Du nutzt Blotter mit einem Freundeszugang, Backtesting und Prop-Konten inklusive. Es läuft kein Abo und es wird nichts abgebucht.', 'You use Blotter with friend access, backtesting and prop accounts included. There is no subscription and nothing is charged.')}</p>
        <a className="btn primary block" href="/app">{t('Zum Journal', 'Open journal')}</a>
      </div>
    );
  } else if (active) {
    const cur = planIn(plan, lang);
    // the other plans, the one asked for (?plan=…) first, otherwise the bigger ones first
    const others = PLAN_IDS.filter((id) => id !== plan).sort((a, b) => (a === want ? -1 : b === want ? 1 : PLANS[b].cents - PLANS[a].cents));
    const gained = switched ? andList([cur.backtest ? t('Das Backtesting', 'Backtesting') : '', cur.prop ? t('die Prop-Konten', 'prop accounts') : ''].filter(Boolean), lang) : '';
    const home = cur.prop ? '/app#prop' : cur.backtest ? '/app#backtest' : '/app';
    const end = sub?.current_period_end ? day(sub.current_period_end, lang) : null;
    const trial = sub?.status === 'trialing' && sub?.trial_end ? sub.trial_end : null;
    body = (
      <div className="card wide">
        <span className="eyebrow">{trial ? t('Kostenloser Test', 'Free trial') : t('Dein Abo', 'Your plan')}</span>
        <h1>{cur.name}</h1>
        {trial ? <TrialMeter end={trial} canceled={!!sub?.cancel_at_period_end} lang={lang} /> : null}
        {trial
          ? <p>{sub?.cancel_at_period_end
              ? (lang === 'en'
                ? <><b className="ink">Cancelled.</b> Your trial ends on {when(trial, lang)}. Nothing will be charged.</>
                : <><b className="ink">Gekündigt.</b> Dein Test endet am {when(trial)}. Es wird nichts abgebucht.</>)
              : (lang === 'en'
                ? <>Free until {when(trial, lang)}. <b className="ink">Then {cur.price} a month</b>, cancel any time. Cancel before then and nothing is charged.</>
                : <>Kostenlos bis {when(trial)}. <b className="ink">Danach {cur.price} im Monat</b>, jederzeit kündbar. Kündigst du vorher, wird nichts abgebucht.</>)}</p>
          : <p><b className="ink">{cur.price} {t('im Monat', 'a month')}.</b> {sub?.cancel_at_period_end && end ? t(`Gekündigt, läuft bis ${end}.`, `Cancelled, runs until ${end}.`) : end ? t(`Verlängert sich am ${end}, jederzeit kündbar.`, `Renews on ${end}, cancel any time.`) : t('Verlängert sich monatlich, jederzeit kündbar.', 'Renews monthly, cancel any time.')}</p>}
        {switched && <div className="msg ok" role="status">{t(`Erledigt. Du hast jetzt ${cur.name}.`, `Done. You now have ${cur.name}.`)}{gained ? (lang === 'en' ? ` ${gained.charAt(0).toUpperCase() + gained.slice(1)} ${cur.prop ? 'are' : 'is'} unlocked right away.` : ` ${gained} ${cur.prop && cur.backtest ? 'sind' : 'ist'} ab sofort freigeschaltet.`) : ''}</div>}
        {sub?.status === 'past_due' && <div className="msg err">{t('Die letzte Zahlung ist fehlgeschlagen. Aktualisiere deine Zahlungsmethode unter „Abo verwalten“.', 'The last payment failed. Update your payment method under “Manage plan”.')}</div>}
        {others.map((id) => {
          const o = planIn(id, lang), ch = switchGain(plan, id, lang);
          return <PlanSwitch key={id} lang={lang} to={o.id} toName={o.name} toPrice={o.price} toShort={o.short} upgrade={o.cents > cur.cents} gain={andList(ch.gain, lang)} lose={andList(ch.lose, lang)} quiet={switched} focus={want === o.id && !switched} blocked={sub?.status === 'past_due'} />;
        })}
        <div className="row-actions acts">
          <a className={'btn' + (switched ? ' primary' : '')} href={switched ? home : '/app'}>{switched && cur.prop ? t('Zu den Prop-Konten', 'Open prop accounts') : switched && cur.backtest ? t('Zum Backtesting', 'Open backtesting') : t('Zum Journal', 'Open journal')}</a>
          <PortalButton lang={lang} />
        </div>
      </div>
    );
  } else {
    const trial = !hadSubscription(sub);
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString();
    body = (
      <div className="card wide">
        <span className="eyebrow">{trial ? t(`${TRIAL_DAYS} Tage kostenlos`, `${TRIAL_DAYS} days free`) : 'Blotter'}</span>
        <h1>{trial ? t(`Teste Blotter ${TRIAL_DAYS} Tage kostenlos.`, `Try Blotter free for ${TRIAL_DAYS} days.`) : t('Wähle dein Abo.', 'Choose your plan.')}</h1>
        {lang === 'en'
          ? <p>Signed in as <b className="ink">{user.email}</b>. {trial ? 'Choose your plan. Then' : 'After payment'} you set up your journal in four short steps: name, colour theme, pages and account names.</p>
          : <p>Angemeldet als <b className="ink">{user.email}</b>. {trial ? 'Wähle dein Abo. Danach' : 'Nach der Zahlung'} richtest du dein Journal in vier kurzen Schritten ein: Name, Farbschema, Seiten und Kontonamen.</p>}
        {!trial && <p className="muted" style={{ fontSize: 14 }}>{t('Den kostenlosen Test gibt es einmal pro Konto. Dein Abo startet deshalb direkt mit der ersten Zahlung.', 'The free trial is available once per account, so your plan starts right away with the first payment.')}</p>}
        {searchParams?.abgebrochen && <div className="msg err">{trial ? t('Der Test wurde nicht gestartet. Es wurde nichts abgebucht.', 'The trial was not started. Nothing was charged.') : t('Die Zahlung wurde abgebrochen. Es wurde nichts abgebucht.', 'The payment was cancelled. Nothing was charged.')}</div>}
        <CheckoutButton lang={lang} initial={want || 'journal'} trial={trial} trialEnd={trial ? dayShort(trialEnd, lang) : null} />
        <form action="/auth/signout" method="post"><button className="btn sm" type="submit">{t('Abmelden', 'Log out')}</button></form>
      </div>
    );
  }

  return (
    <>
      <Nav loggedIn />
      <main className="wrap center">{body}</main>
      <Footer />
    </>
  );
}
