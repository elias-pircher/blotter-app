import { NextResponse } from 'next/server';
import { secret } from '@/lib/secrets';
import { verifySignedWebhook, headersFrom } from '@/lib/webhook-sig';
import { buildLoginEmail, kindOf, verifyTypeOf, sendMail, validRid } from '@/lib/mail';
import { logMail } from '@/lib/mail-log';

// Supabase "Send Email" Auth Hook: Supabase hands every sign-in e-mail to this route instead of
// sending it via SMTP. We send it through the Resend API (HTML + plain text) and note the Resend id,
// so the login page can show whether the e-mail was delivered, delayed or rejected.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const maxDuration = 10;

const hookError = (status, message) =>
  NextResponse.json({ error: { http_code: status, message } }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req) {
  const body = await req.text();
  const hookSecret = secret('SEND_EMAIL_HOOK_SECRET');
  if (!hookSecret) {
    console.error('Mail-Hook: SEND_EMAIL_HOOK_SECRET fehlt');
    return hookError(500, 'Der E-Mail-Versand ist noch nicht eingerichtet.');
  }
  if (!verifySignedWebhook({ secret: hookSecret, ...headersFrom(req, 'webhook'), body })) {
    console.error('Mail-Hook: Signatur ungültig');
    return hookError(401, 'Ungültige Signatur');
  }

  let event;
  try { event = JSON.parse(body); } catch { return hookError(400, 'Ungültige Anfrage'); }
  const user = event?.user || {};
  const d = event?.email_data || {};
  const action = String(d.email_action_type || '');
  const kind = kindOf(action);

  const site = (process.env.NEXT_PUBLIC_SITE_URL || d.site_url || 'https://blotterjournal.com').replace(/\/$/, '');
  let rid = null;
  let next = '/app';
  try {
    const r = new URL(d.redirect_to);
    const n = r.searchParams.get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) next = n;
    if (validRid(r.searchParams.get('rid'))) rid = r.searchParams.get('rid');
  } catch {}

  // who gets which code (e-mail change may need two e-mails; Supabase names the hashes the other way round)
  const jobs = [];
  if (action === 'email_change') {
    if (d.token_hash_new) {
      jobs.push({ to: user.email, code: d.token, hash: d.token_hash_new });
      if (user.new_email) jobs.push({ to: user.new_email, code: d.token_new, hash: d.token_hash });
    } else {
      jobs.push({ to: user.new_email || user.email, code: d.token_new || d.token, hash: d.token_hash });
    }
  } else {
    jobs.push({ to: user.email, code: kind === 'notice' ? '' : d.token, hash: d.token_hash });
  }

  const hookId = req.headers.get('webhook-id') || crypto.randomUUID();
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (!job.to) continue;
    const link = job.hash && kind !== 'reauthentication' && kind !== 'notice'
      ? `${site}/auth/callback?token_hash=${encodeURIComponent(job.hash)}&type=${verifyTypeOf(action)}&next=${encodeURIComponent(next)}`
      : null;
    const mail = buildLoginEmail({ kind, code: job.code, link });
    try {
      const { id } = await sendMail({ to: job.to, ...mail, idempotencyKey: `${hookId}-${i}`, tag: kind });
      await logMail({ rid, email: job.to, kind, resend_id: id, status: 'sent' });
    } catch (e) {
      console.error('Mail-Hook: Versand fehlgeschlagen', e?.status || '', e?.code || e?.message || '');
      await logMail({ rid, email: job.to, kind, status: 'error', detail: `${e?.status || ''} ${e?.code || e?.message || ''}`.trim() });
      return hookError(500, 'Die E-Mail konnte gerade nicht verschickt werden. Bitte versuch es gleich noch einmal.');
    }
  }
  return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
}
