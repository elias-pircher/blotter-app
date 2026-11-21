import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive } from '@/lib/stripe';
import { PLANS, isPlan, planOf, FRIEND, day } from '@/lib/plans';
import { Nav, Footer } from '../chrome';
import CheckoutButton from './CheckoutButton';
import PlanSwitch from './PlanSwitch';
import PortalButton from './PortalButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abo – Blotter' };

export default async function AboPage({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent('/abo' + (isPlan(searchParams?.plan) ? '?plan=' + searchParams.plan : '')));
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,plan,current_period_end,cancel_at_period_end').eq('user_id', user.id).maybeSingle();
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
    body = (
      <div className="card wide">
        <span className="eyebrow">Dein Abo</span>
        <h1>{cur.name}</h1>
        <p><b className="ink">{cur.price} im Monat.</b> {sub?.cancel_at_period_end && end ? `Gekündigt, läuft bis ${end}.` : end ? `Verlängert sich am ${end}, jederzeit kündbar.` : 'Verlängert sich monatlich, jederzeit kündbar.'}</p>
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
    body = (
      <div className="card wide">
        <span className="eyebrow">Blotter</span>
        <h1>Wähle dein Abo.</h1>
        <p>Angemeldet als <b className="ink">{user.email}</b>. Nach der Zahlung richtest du dein Journal in vier kurzen Schritten ein: Name, Farbschema, Seiten und Kontonamen.</p>
        {searchParams?.abgebrochen && <div className="msg err">Die Zahlung wurde abgebrochen. Es wurde nichts abgebucht.</div>}
        <CheckoutButton initial={want || 'journal'} />
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
