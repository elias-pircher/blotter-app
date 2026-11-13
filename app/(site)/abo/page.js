import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActive } from '@/lib/stripe';
import { isFriendPlan } from '@/lib/friends';
import { Nav, Footer } from '../chrome';
import CheckoutButton from './CheckoutButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abo – Blotter' };

export default async function AboPage({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/abo');
  const { data: sub } = await supabase.from('subscriptions').select('status,price_id,current_period_end,cancel_at_period_end').eq('user_id', user.id).maybeSingle();
  const active = isActive(sub);
  const friend = active && isFriendPlan(sub);
  return (
    <>
      <Nav loggedIn />
      <main className="wrap center">
        {friend ? (
          <div className="card">
            <span className="eyebrow">Freundeszugang</span>
            <h1>Blotter ist für dich kostenlos.</h1>
            <p>Du nutzt das Journal mit einem Freundeszugang. Es läuft kein Abo und es wird nichts abgebucht.</p>
            <a className="btn primary block" href="/app">Zum Journal</a>
          </div>
        ) : active ? (
          <div className="card">
            <span className="eyebrow">Dein Abo</span>
            <h1>Dein Abo ist aktiv.</h1>
            <p>{sub?.cancel_at_period_end && sub?.current_period_end ? `Gekündigt, läuft bis ${new Date(sub.current_period_end).toLocaleDateString('de-AT')}.` : 'Es verlängert sich monatlich und ist jederzeit kündbar.'}</p>
            <a className="btn primary block" href="/app">Zum Journal</a>
          </div>
        ) : (
          <div className="card wide">
            <span className="eyebrow">Blotter Journal</span>
            <h1>Starte dein Journal für 7,99 € im Monat.</h1>
            <p>Angemeldet als <b style={{ color: 'var(--ink)' }}>{user.email}</b>. Nach der Zahlung richtest du dein Journal in vier kurzen Schritten ein: Name, Farbschema, Seiten und Kontonamen.</p>
            {searchParams?.abgebrochen && <div className="msg err">Die Zahlung wurde abgebrochen. Es wurde nichts abgebucht.</div>}
            <CheckoutButton />
            <form action="/auth/signout" method="post"><button className="btn sm" type="submit">Abmelden</button></form>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
