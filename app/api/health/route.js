import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Einrichtungs-Check: meldet nur ok / fehlt / ungültig, niemals einen Wert.
export async function GET() {
  const out = {};

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) out.SUPABASE_SERVICE_ROLE_KEY = 'fehlt';
  else {
    try {
      const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
      out.SUPABASE_SERVICE_ROLE_KEY = error ? 'ungültig (falscher Schlüssel kopiert?)' : 'ok';
    } catch { out.SUPABASE_SERVICE_ROLE_KEY = 'ungültig (falscher Schlüssel kopiert?)'; }
  }

  if (!process.env.STRIPE_SECRET_KEY) out.STRIPE_SECRET_KEY = 'fehlt';
  else if (!/^(sk|rk)_(test|live)_/.test(process.env.STRIPE_SECRET_KEY)) out.STRIPE_SECRET_KEY = 'falsches Format (muss mit sk_test_ beginnen)';
  else {
    try {
      const price = await stripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
      out.STRIPE_SECRET_KEY = 'ok';
      out.stripe_modus = price.livemode ? 'live' : 'test';
      out.stripe_preis = price.unit_amount === 799 && price.recurring?.interval === 'month' ? 'ok (7,99 € / Monat)' : 'unerwartet';
    } catch (e) {
      out.STRIPE_SECRET_KEY = e?.type === 'StripeAuthenticationError' ? 'ungültig (falscher Schlüssel kopiert?)'
        : e?.code === 'resource_missing' ? 'passt nicht zum Konto mit dem 7,99-€-Preis (Sandbox?)' : 'Fehler beim Prüfen';
    }
  }

  const wh = process.env.STRIPE_WEBHOOK_SECRET;
  out.STRIPE_WEBHOOK_SECRET = !wh ? 'fehlt' : /^whsec_[A-Za-z0-9]{20,}$/.test(wh.trim()) ? 'ok' : 'falsches Format (muss mit whsec_ beginnen)';

  out.alles_bereit = Object.entries(out).every(([k, v]) => k.startsWith('stripe_') ? true : v === 'ok');
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
