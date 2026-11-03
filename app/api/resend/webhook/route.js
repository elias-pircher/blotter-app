import { NextResponse } from 'next/server';
import { secret } from '@/lib/secrets';
import { verifySignedWebhook, headersFrom } from '@/lib/webhook-sig';
import { EVENT_STATUS } from '@/lib/mail';
import { applyMailEvent } from '@/lib/mail-log';

// Resend reports here what happened to each e-mail (delivered, delayed, bounced, …).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

function detailOf(type, d) {
  if (type === 'email.bounced') {
    const b = d?.bounce || {};
    const diag = Array.isArray(b.diagnosticCode) ? b.diagnosticCode.join(' | ') : b.diagnosticCode || '';
    return [b.type, b.subType, b.message, diag].filter(Boolean).join(' · ');
  }
  if (type === 'email.failed') return d?.failed?.reason || '';
  if (type === 'email.suppressed') return [d?.suppressed?.type, d?.suppressed?.message].filter(Boolean).join(' · ');
  if (type === 'email.delivery_delayed') return d?.delivery_delayed?.message || d?.delay?.message || '';
  return '';
}

export async function POST(req) {
  const body = await req.text();
  const whSecret = secret('RESEND_WEBHOOK_SECRET');
  if (!whSecret) {
    console.error('Resend-Webhook: RESEND_WEBHOOK_SECRET fehlt');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!verifySignedWebhook({ secret: whSecret, ...headersFrom(req, 'svix'), body })) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const status = EVENT_STATUS[event?.type];
  const d = event?.data || {};
  if (!status || typeof d.email_id !== 'string') return NextResponse.json({ ok: true, ignoriert: true });
  try {
    await applyMailEvent({
      resendId: d.email_id,
      status,
      detail: detailOf(event.type, d),
      email: Array.isArray(d.to) ? d.to[0] : '',
      kind: typeof d.tags?.category === 'string' ? d.tags.category : undefined,
    });
  } catch (e) {
    console.error('Resend-Webhook: Speichern fehlgeschlagen', e?.code || '');
    return NextResponse.json({ ok: false }, { status: 500 }); // Resend tries again later
  }
  return NextResponse.json({ ok: true });
}
