import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { secret } from '@/lib/secrets';
import { SUPABASE_URL } from '@/lib/env';
import dns from 'node:dns/promises';

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
    return { status: 'ungültig', hinweis: supabaseHint(key), http: typeof error.status === 'number' ? error.status : undefined };
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

// ---- e-mail sending -----------------------------------------------------------------------

async function checkResendKey() {
  if (!process.env.RESEND_API_KEY) return { status: 'fehlt' };
  const key = secret('RESEND_API_KEY');
  if (MASKED.test(key)) return { status: 'ungültig', hinweis: 'Nur die verdeckte Anzeige kopiert. Kopier den Schlüssel direkt nach dem Erstellen.' };
  if (/^(v1,)?whsec_/.test(key)) return { status: 'ungültig', hinweis: 'Das ist ein Webhook-Geheimnis. Hier gehört der Resend-API-Schlüssel hin, der mit re_ beginnt.' };
  if (!/^re_[A-Za-z0-9_]{10,}$/.test(key)) return { status: 'ungültig', hinweis: 'Kein Resend-API-Schlüssel erkannt. Er beginnt mit re_.' };
  try {
    const res = await fetch((process.env.RESEND_API_BASE || 'https://api.resend.com') + '/domains', {
      headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return { status: 'ok', recht: 'Vollzugriff' };
    let name = '';
    try { name = String((await res.json())?.name || ''); } catch {}
    if (name === 'restricted_api_key') return { status: 'ok', recht: 'nur Senden' };
    if (res.status === 401 || res.status === 403) return { status: 'ungültig', hinweis: 'Resend lehnt den Schlüssel ab: unvollständig kopiert oder gelöscht.', http: res.status };
    return { status: 'unklar', http: res.status };
  } catch {
    return { status: 'Fehler beim Prüfen' };
  }
}

function checkHookSecret(name, kind) {
  if (!process.env[name]) return { status: 'fehlt' };
  const v = secret(name);
  if (MASKED.test(v)) return { status: 'ungültig', hinweis: 'Nur die verdeckte Anzeige kopiert.' };
  if (/^re_/.test(v)) return { status: 'ungültig', hinweis: 'Das ist der Resend-API-Schlüssel, nicht das Geheimnis.' };
  if (kind === 'supabase' && !/^(v1,)?whsec_[A-Za-z0-9+/=]{20,}$/.test(v)) return { status: 'ungültig', hinweis: 'Das Geheimnis aus Supabase beginnt mit v1,whsec_ und muss vollständig kopiert sein.' };
  if (kind === 'resend' && !/^whsec_[A-Za-z0-9+/=]{20,}$/.test(v)) {
    return { status: 'ungültig', hinweis: /^v1,/.test(v) ? 'Das ist das Geheimnis aus Supabase. Hier gehört das Signing Secret des Resend-Webhooks hin (whsec_…).' : 'Das Signing Secret aus Resend beginnt mit whsec_.' };
  }
  return { status: 'ok' };
}

async function txt(host) {
  try { return (await dns.resolveTxt(host)).map((r) => r.join('')); } catch { return []; }
}

async function checkDns() {
  const [dkim, spf, dmarc, mx] = await Promise.all([
    txt('resend._domainkey.blotterjournal.com'),
    txt('send.blotterjournal.com'),
    txt('_dmarc.blotterjournal.com'),
    dns.resolveMx('send.blotterjournal.com').catch(() => []),
  ]);
  return {
    dkim: dkim.some((r) => r.includes('p=')) ? 'ok' : 'fehlt',
    spf: spf.find((r) => r.startsWith('v=spf1')) || 'fehlt',
    mx_send: mx.map((m) => m.exchange),
    dmarc: dmarc.find((r) => r.startsWith('v=DMARC1')) || 'fehlt',
  };
}

async function deliveryStats() {
  try {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { data, error } = await createAdminClient().from('mail_log').select('status').gte('created_at', since).limit(1000);
    if (error) return 'nicht lesbar';
    return data.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  } catch { return 'nicht lesbar'; }
}

export async function GET() {
  const [supa, str, resendKey, dnsInfo, stats] = await Promise.all([checkSupabase(), checkStripe(), checkResendKey(), checkDns(), deliveryStats()]);
  const out = {
    SUPABASE_SERVICE_ROLE_KEY: supa,
    STRIPE_SECRET_KEY: str,
    STRIPE_WEBHOOK_SECRET: checkWebhook(),
  };
  out.alles_bereit = [supa, str, out.STRIPE_WEBHOOK_SECRET].every((c) => c.status === 'ok');
  const mail = {
    RESEND_API_KEY: resendKey,
    SEND_EMAIL_HOOK_SECRET: checkHookSecret('SEND_EMAIL_HOOK_SECRET', 'supabase'),
    RESEND_WEBHOOK_SECRET: checkHookSecret('RESEND_WEBHOOK_SECRET', 'resend'),
  };
  if (process.env.SEND_EMAIL_HOOK_SECRET && secret('SEND_EMAIL_HOOK_SECRET') === secret('RESEND_WEBHOOK_SECRET')) {
    mail.RESEND_WEBHOOK_SECRET = { status: 'ungültig', hinweis: 'Gleicher Wert wie SEND_EMAIL_HOOK_SECRET. Die beiden Geheimnisse kommen aus verschiedenen Stellen.' };
  }
  out.mail = { ...mail, dns: dnsInfo, zustellungen_24h: stats };
  out.mail_bereit = Object.values(mail).every((c) => c.status === 'ok');
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
