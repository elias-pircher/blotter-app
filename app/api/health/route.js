import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { secret } from '@/lib/secrets';
import { SUPABASE_URL } from '@/lib/env';

// Setup check: says for each secret whether it is missing, the wrong kind of key, or ok.
// It never returns any part of a key.
export const dynamic = 'force-dynamic';

const MASKED = /[•●*…]|\.\.\./;

function projectRef() {
  try { return new URL(SUPABASE_URL).hostname.split('.')[0]; } catch { return ''; }
}

function jwtPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
  } catch { return null; }
}

function supabaseHint(key) {
  if (MASKED.test(key)) return 'Du hast nur die verdeckte Anzeige (mit Punkten) kopiert. Nimm den Kopier-Knopf neben dem Schlüssel.';
  if (key.startsWith('sb_publishable_')) return 'Das ist der öffentliche Schlüssel (publishable). Du brauchst den geheimen Schlüssel, der mit sb_secret_ beginnt.';
  if (key.startsWith('sb_secret_')) return key.length < 38
    ? 'Beginnt richtig mit sb_secret_, ist aber unvollständig kopiert.'
    : 'Sieht richtig aus, wird aber abgelehnt: evtl. aus einem anderen Supabase-Projekt oder inzwischen gelöscht.';
  if (key.startsWith('eyJ')) {
    const p = jwtPayload(key);
    if (!p) return 'Beginnt wie ein Schlüssel (eyJ…), ist aber unvollständig kopiert.';
    if (p.role === 'anon') return 'Das ist der anon-Schlüssel (öffentlich). Du brauchst service_role bzw. den sb_secret_-Schlüssel.';
    if (p.ref && p.ref !== projectRef()) return 'Der Schlüssel gehört zu einem anderen Supabase-Projekt, nicht zu „blotter“.';
    return 'Sieht nach dem service_role-Schlüssel aus, wird aber abgelehnt: evtl. ein alter, ersetzter Schlüssel.';
  }
  return 'Kein Supabase-API-Schlüssel erkannt (beginnt weder mit sb_secret_ noch mit eyJ). Evtl. das „JWT Secret“, ein Passwort oder die Projekt-ID kopiert.';
}

async function checkSupabase() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) return { status: 'fehlt' };
  const key = secret('SUPABASE_SERVICE_ROLE_KEY');
  try {
    const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) return { status: 'ok' };
    return { status: 'ungültig', hinweis: supabaseHint(key), antwort: `${error.status || ''} ${error.message || ''}`.trim().slice(0, 80) };
  } catch (e) {
    return { status: 'ungültig', hinweis: supabaseHint(key) };
  }
}

async function checkStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return { status: 'fehlt' };
  const key = secret('STRIPE_SECRET_KEY');
  if (MASKED.test(key)) return { status: 'ungültig', hinweis: 'Nur die verdeckte Anzeige kopiert. Klicke erst auf „Testschlüssel anzeigen“ bzw. das Auge und kopiere dann.' };
  if (/^pk_/.test(key)) return { status: 'ungültig', hinweis: 'Das ist der öffentliche Schlüssel (pk_…). Du brauchst den geheimen Schlüssel, der mit sk_test_ beginnt.' };
  if (/^whsec_/.test(key)) return { status: 'ungültig', hinweis: 'Das ist das Webhook-Signaturgeheimnis. Das gehört in STRIPE_WEBHOOK_SECRET, hier brauchst du sk_test_….' };
  if (!/^(sk|rk)_(test|live)_/.test(key)) return { status: 'ungültig', hinweis: 'Kein Stripe-Geheimschlüssel erkannt. Er muss mit sk_test_ beginnen.' };
  try {
    const price = await stripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
    return {
      status: 'ok',
      modus: price.livemode ? 'live' : 'test',
      preis: price.unit_amount === 799 && price.recurring?.interval === 'month' ? 'ok (7,99 € / Monat)' : 'unerwartet',
    };
  } catch (e) {
    if (e?.type === 'StripeAuthenticationError') return { status: 'ungültig', hinweis: 'Stripe lehnt den Schlüssel ab: unvollständig kopiert oder inzwischen ersetzt.' };
    if (e?.code === 'resource_missing') return { status: 'ungültig', hinweis: 'Der Schlüssel gehört zu einem anderen Stripe-Konto als der 7,99-€-Preis. Nimm den Schlüssel aus der Sandbox, in der „Blotter Journal“ angelegt ist.' };
    return { status: 'Fehler beim Prüfen' };
  }
}

function checkWebhook() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return { status: 'fehlt' };
  const wh = secret('STRIPE_WEBHOOK_SECRET');
  if (MASKED.test(wh)) return { status: 'ungültig', hinweis: 'Nur die verdeckte Anzeige kopiert. Erst „Einblenden“ klicken, dann kopieren.' };
  if (/^we_/.test(wh)) return { status: 'ungültig', hinweis: 'Das ist die Ziel-ID (we_…). Du brauchst das Signaturgeheimnis, das mit whsec_ beginnt.' };
  if (/^(sk|pk|rk)_/.test(wh)) return { status: 'ungültig', hinweis: 'Das ist ein API-Schlüssel. Hier gehört das Signaturgeheimnis hin, das mit whsec_ beginnt.' };
  if (!/^whsec_[A-Za-z0-9]{20,}$/.test(wh)) return { status: 'ungültig', hinweis: 'Muss mit whsec_ beginnen und vollständig kopiert sein.' };
  return { status: 'ok' };
}

export async function GET() {
  const [supa, str] = await Promise.all([checkSupabase(), checkStripe()]);
  const out = {
    SUPABASE_SERVICE_ROLE_KEY: supa,
    STRIPE_SECRET_KEY: str,
    STRIPE_WEBHOOK_SECRET: checkWebhook(),
  };
  out.alles_bereit = [supa, str, out.STRIPE_WEBHOOK_SECRET].every((c) => c.status === 'ok');
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
