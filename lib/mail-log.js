import { createAdminClient } from '@/lib/supabase/admin';
import { statusRank } from '@/lib/mail';

// Delivery log for sign-in e-mails (table public.mail_log, only reachable with the service key).
// Logging must never break sending, so errors in logMail are swallowed.

export async function logMail(row) {
  try {
    const db = createAdminClient();
    const { error } = await db.from('mail_log').insert(row);
    // Resend's webhook was faster and already created the row: just attach our request id.
    if (error?.code === '23505' && row.resend_id) {
      await db.from('mail_log').update({ rid: row.rid, kind: row.kind }).eq('resend_id', row.resend_id);
    } else if (error) {
      console.error('mail_log: Eintrag fehlgeschlagen', error.code || '');
    }
    if (Math.random() < 0.05) {
      await db.from('mail_log').delete().lt('created_at', new Date(Date.now() - 30 * 864e5).toISOString());
    }
  } catch (e) {
    console.error('mail_log: Eintrag fehlgeschlagen', e?.code || '');
  }
}

// Applies a Resend event. Never moves a status backwards (e.g. "delivered" stays when a late "sent" arrives).
// E-mails that are not in the log yet (e.g. sent via SMTP) are added, so every delivery problem shows up.
export async function applyMailEvent({ resendId, status, detail, email, kind }) {
  const db = createAdminClient();
  const { data: row, error } = await db.from('mail_log').select('id,status').eq('resend_id', resendId).maybeSingle();
  if (error) throw error;
  const clipped = detail ? String(detail).slice(0, 500) : null;
  if (!row) {
    const { error: e1 } = await db.from('mail_log').insert({ resend_id: resendId, status, detail: clipped, email: email || '', kind: kind || 'smtp' });
    if (e1 && e1.code !== '23505') throw e1;
    if (!e1) return;
    return applyMailEvent({ resendId, status, detail });
  }
  if (statusRank(status) < statusRank(row.status)) return;
  const patch = { status, updated_at: new Date().toISOString() };
  if (clipped) patch.detail = clipped;
  const { error: e2 } = await db.from('mail_log').update(patch).eq('id', row.id);
  if (e2) throw e2;
}

export async function statusForRid(rid) {
  const db = createAdminClient();
  const { data, error } = await db.from('mail_log').select('status,detail,created_at').eq('rid', rid)
    .order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}
