import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TOPICS, mailTeam, mailCustomer } from '@/lib/support';
import { planOf, PLANS, FRIEND } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// POST /api/support {topic, subject, message, meta}
// Stores the request (support_tickets), e-mails it to SUPPORT_EMAIL with the customer as reply-to,
// and sends the customer a confirmation with the ticket number. At most 5 requests per hour per account.

const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const clean = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const META_KEYS = ['browser', 'screen', 'window', 'page', 'scheme', 'sync', 'lang'];
const PER_HOUR = 5;

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('not_logged_in', 401);

  const body = await req.json().catch(() => ({}));
  const topic = Object.hasOwn(TOPICS, body.topic) ? body.topic : null;
  const subject = clean(body.subject, 140).replace(/\n+/g, ' ');
  const message = clean(body.message, 5000);
  if (!topic) return fail('bad_topic');
  if (subject.length < 3) return fail('subject_short');
  if (message.length < 10) return fail('message_short');
  let meta = null;
  if (body.meta && typeof body.meta === 'object') {
    meta = {};
    for (const k of META_KEYS) if (body.meta[k] != null) meta[k] = clean(body.meta[k], 300);
  }

  const db = createAdminClient();
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count, error: cErr } = await db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  if (cErr) { console.error('Support: Zählen fehlgeschlagen', cErr.code || ''); return fail('unavailable', 500); }
  if ((count || 0) >= PER_HOUR) return fail('too_many', 429);

  const { data: sub } = await db.from('subscriptions').select('status,price_id,plan,trial_end').eq('user_id', user.id).maybeSingle();
  const p = planOf(sub);
  const account = !sub ? 'kein Abo' : p === FRIEND ? 'Freundeszugang' : `${PLANS[p]?.name || p}, ${sub.status}${sub.status === 'trialing' && sub.trial_end ? ' bis ' + new Date(sub.trial_end).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' }) : ''}`;

  const { data: row, error } = await db.from('support_tickets')
    .insert({ user_id: user.id, email: user.email, topic, subject, message, meta })
    .select('id,created_at').single();
  if (error || !row) { console.error('Support: Speichern fehlgeschlagen', error?.code || ''); return fail('unavailable', 500); }

  const lang = req.headers.get('x-lang') === 'en' ? 'en' : 'de';
  const ticket = { id: row.id, topic, subject, message, email: user.email, account, meta, at: row.created_at, lang };
  // the request is saved; the e-mails are best effort and never turn a saved request into an error
  let mailed = false, confirm = false;
  try { mailed = await mailTeam(ticket); } catch (e) { console.error('Support: Mail ans Team', e?.status || '', e?.code || ''); }
  if (mailed) await db.from('support_tickets').update({ mailed: true }).eq('id', row.id);
  else console.warn('Support: Ticket #' + row.id + ' nur gespeichert (SUPPORT_EMAIL fehlt oder Versand fehlgeschlagen)');
  try { confirm = await mailCustomer(ticket); } catch (e) { console.error('Support: Bestätigung', e?.status || '', e?.code || ''); }

  return NextResponse.json({ ok: true, id: row.id, confirm });
}
