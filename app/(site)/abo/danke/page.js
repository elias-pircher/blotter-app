import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { stripe, syncSubscription, isActive } from '@/lib/stripe';
import { Nav, Footer } from '../../chrome';

export const dynamic = 'force-dynamic';

// Stripe sends the customer here after paying. We confirm the payment directly with Stripe,
// so the journal opens right away even if the webhook arrives a few seconds later.
export default async function Danke({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/abo');
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
          <span className="eyebrow">Danke</span>
          <h1>Deine Zahlung wird bestätigt.</h1>
          <p>Das dauert meist nur ein paar Sekunden.</p>
          <a className="btn primary block" href="/app">Journal öffnen</a>
        </div>
      </main>
      <Footer />
    </>
  );
}
