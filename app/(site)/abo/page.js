import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive, hadSubscription } from '@/lib/stripe';
import { PLANS, isPlan, planOf, FRIEND, day, when, dayShort, trialLeft, TRIAL_DAYS } from '@/lib/plans';
import { Nav, Footer } from '../chrome';
import CheckoutButton from './CheckoutButton';
import PlanSwitch from './PlanSwitch';
import PortalButton from './PortalButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abo – Blotter' };

// how much of the free trial is left, as a bar that empties
function TrialMeter({ end, canceled }) {
  const total = TRIAL_DAYS * 864e5;
  const left = Math.max(0, Math.min(total, new Date(end).getTime() - Date.now()));
  return (
    <div className={'trial-meter' + (canceled ? ' off' : '')}>
      <div className="tm-top"><b>{trialLeft(end)}</b><span>bis {dayShort(end)}</span></div>
      <div className="tm-bar" role="progressbar" aria-label="Verbleibende Testzeit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((left / total) * 100)}><i style={{ width: (left / total) * 100 + '%' }} /></div>
    </div>
  );
}

export default async function AboPage({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent('/abo' + (isPlan(searchParams?.plan) ? '?plan=' + searchParams.plan : '')));
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,plan,current_period_end,cancel_at_period_end,stripe_subscription_id,trial_end').eq('user_id', user.id).maybeSingle();
  const active = isActive(sub);
  const plan = active ? planOf(sub) : null;
  const want = isPlan(searchParams?.plan) ? searchParams.plan : null;
  const switched = searchParams?.gewechselt === '1';

  let body;
  if (plan === FRIEND) {
    body = (
      <div className="card">
        <span className="eyebrow">Freundeszugang</span>
        <h1>Blotter ist für dich kostenlos.</h1>
        <p>Du nutzt Blotter mit einem Freundeszugang, Backtesting inklusive. Es läuft kein Abo und es wird nichts abgebucht.</p>
        <a className="btn primary block" href="/app">Zum Journal</a>
      </div>
    );
  } else if (active) {
    const cur = PLANS[plan];
    const other = PLANS[plan === 'backtest' ? 'journal' : 'backtest'];
    const end = sub?.current_period_end ? day(sub.current_period_end) : null;
    const trial = sub?.status === 'trialing' && sub?.trial_end ? sub.trial_end : null;
    body = (
      <div className="card wide">
        <span className="eyebrow">{trial ? 'Kostenloser Test' : 'Dein Abo'}</span>
        <h1>{cur.name}</h1>
        {trial ? <TrialMeter end={trial} canceled={!!sub?.cancel_at_period_end} /> : null}
        {trial
          ? <p>{sub?.cancel_at_period_end
              ? <><b className="ink">Gekündigt.</b> Dein Test endet am {when(trial)}. Es wird nichts abgebucht.</>
              : <>Kostenlos bis {when(trial)}. <b className="ink">Danach {cur.price} im Monat</b>, jederzeit kündbar. Kündigst du vorher, wird nichts abgebucht.</>}</p>
          : <p><b className="ink">{cur.price} im Monat.</b> {sub?.cancel_at_period_end && end ? `Gekündigt, läuft bis ${end}.` : end ? `Verlängert sich am ${end}, jederzeit kündbar.` : 'Verlängert sich monatlich, jederzeit kündbar.'}</p>}
        {switched && <div className="msg ok" role="status">Erledigt. Du hast jetzt {cur.name}.{cur.backtest ? ' Das Backtesting ist ab sofort freigeschaltet.' : ''}</div>}
        {sub?.status === 'past_due' && <div className="msg err">Die letzte Zahlung ist fehlgeschlagen. Aktualisiere deine Zahlungsmethode unter „Abo verwalten“.</div>}
        <PlanSwitch to={other.id} toName={other.name} toPrice={other.price} toShort={other.short} upgrade={other.cents > cur.cents} quiet={switched} focus={want === other.id && !switched} blocked={sub?.status === 'past_due'} />
        <div className="row-actions acts">
          <a className={'btn' + (switched ? ' primary' : '')} href={cur.backtest && switched ? '/app#backtest' : '/app'}>{cur.backtest && switched ? 'Zum Backtesting' : 'Zum Journal'}</a>
          <PortalButton />
        </div>
      </div>
    );
  } else {
    const trial = !hadSubscription(sub);
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString();
    body = (
      <div className="card wide">
        <span className="eyebrow">{trial ? `${TRIAL_DAYS} Tage kostenlos` : 'Blotter'}</span>
        <h1>{trial ? `Teste Blotter ${TRIAL_DAYS} Tage kostenlos.` : 'Wähle dein Abo.'}</h1>
        <p>Angemeldet als <b className="ink">{user.email}</b>. {trial ? 'Wähle dein Abo. Danach' : 'Nach der Zahlung'} richtest du dein Journal in vier kurzen Schritten ein: Name, Farbschema, Seiten und Kontonamen.</p>
        {!trial && <p className="muted" style={{ fontSize: 14 }}>Den kostenlosen Test gibt es einmal pro Konto. Dein Abo startet deshalb direkt mit der ersten Zahlung.</p>}
        {searchParams?.abgebrochen && <div className="msg err">{trial ? 'Der Test wurde nicht gestartet. Es wurde nichts abgebucht.' : 'Die Zahlung wurde abgebrochen. Es wurde nichts abgebucht.'}</div>}
        <CheckoutButton initial={want || 'journal'} trial={trial} trialEnd={trial ? dayShort(trialEnd) : null} />
        <form action="/auth/signout" method="post"><button className="btn sm" type="submit">Abmelden</button></form>
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
