import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { stripe, syncSubscription, isActive } from '@/lib/stripe';
import { Nav, Footer } from '../../chrome';
import { getLang } from '@/lib/i18n-server';
import { lp, tr } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Stripe sends the customer here after paying. We confirm the payment directly with Stripe,
// so the journal opens right away even if the webhook arrives a few seconds later.
export default async function Danke({ searchParams }) {
  const lang = getLang(), t = tr(lang);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(lp(lang, '/login') + '?next=' + lp(lang, '/abo'));
  let ok = false;
  try {
    const id = String(searchParams?.session_id || '');
    if (id.startsWith('cs_')) {
      const session = await stripe().checkout.sessions.retrieve(id);
      if (session.client_reference_id === user.id && session.subscription) {
        const r = await syncSubscription(typeof session.subscription === 'string' ? session.subscription : session.subscription.id, user.id);
        ok = isActive({ status: r.status });
      }
    }
  } catch (e) { ok = false; }
  if (ok) redirect('/app');
  return (
    <>
      <Nav loggedIn />
      <main className="wrap center">
        <div className="card">
          <span className="eyebrow">{t('Danke', 'Thank you')}</span>
          <h1>{t('Dein Zugang wird freigeschaltet.', 'Your access is being unlocked.')}</h1>
          <p>{t('Stripe bestätigt gerade deine Anmeldung. Das dauert meist nur ein paar Sekunden.', 'Stripe is confirming your sign-up. This usually takes just a few seconds.')}</p>
          <a className="btn primary block" href="/app">{t('Journal öffnen', 'Open journal')}</a>
        </div>
      </main>
      <Footer />
    </>
  );
}
