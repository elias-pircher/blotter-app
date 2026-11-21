import { MAIL_FROM, sendMail } from '@/lib/mail';
import { logMail } from '@/lib/mail-log';

// Support requests from the help page: one e-mail to the team (reply goes straight to the customer)
// and a confirmation with the ticket number to the customer.

export const TOPICS = {
  nutzung: 'Frage zur Nutzung',
  fehler: 'Fehler melden',
  abo: 'Abo & Zahlung',
  konto: 'Konto & Daten',
  idee: 'Idee oder Wunsch',
  sonstiges: 'Sonstiges',
};
// where requests go; set in Vercel. Without it the request is only stored in support_tickets.
export const supportInbox = () => (process.env.SUPPORT_EMAIL || '').trim();
const DOMAIN = (MAIL_FROM.match(/@([^>\s]+)/) || [])[1] || 'blotterjournal.com';
const FROM = process.env.MAIL_FROM_SUPPORT || `Blotter Support <support@${DOMAIN}>`;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const when = (d) => new Date(d).toLocaleString('de-AT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Vienna' });

function frame(subject, inner) {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e3e6ee;">
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:13px;font-weight:bold;letter-spacing:3px;color:#9a7426;">BLOTTER</div>
${inner}
</td></tr></table>
<p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a93a8;">Blotter Trading Journal · blotterjournal.com</p>
</td></tr></table></body></html>`;
}
const P = (t, extra = '') => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:#3b4560;${extra}">${t}</p>`;
const quote = (msg) => `<div style="margin:0 0 16px 0;padding:14px 16px;border-left:3px solid #d9b450;background:#faf7ee;border-radius:6px;font-size:15px;line-height:1.55;color:#1d2640;white-space:pre-wrap;">${esc(msg)}</div>`;

// to the team: everything needed to answer, the reply goes to the customer
export function buildTeamEmail({ id, topic, subject, message, email, account, meta, at }) {
  const subj = `[#${id}] ${TOPICS[topic] || topic}: ${subject}`;
  const rows = [
    ['Ticket', '#' + id],
    ['Thema', TOPICS[topic] || topic],
    ['Von', email],
    ['Eingegangen', when(at)],
    ['Abo', account],
    ...(meta ? Object.entries(meta).map(([k, v]) => [k, String(v)]) : [['Technik', 'nicht mitgesendet']]),
  ];
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;line-height:1.5;color:#3b4560;border-top:1px solid #e3e6ee;">${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8a93a8;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;word-break:break-word;">${esc(v)}</td></tr>`).join('')}</table>`;
  const html = frame(subj, `<h1 style="margin:14px 0 6px 0;font-size:20px;line-height:1.3;color:#0b1b42;">${esc(subject)}</h1>
${P(esc(TOPICS[topic] || topic) + ' · Ticket #' + esc(id), 'font-size:13px;color:#8a93a8;')}
${quote(message)}
${P('Antworte einfach auf diese E-Mail, die Antwort geht direkt an ' + esc(email) + '.', 'font-size:13px;')}
${table}`);
  const text = [`Ticket #${id} · ${TOPICS[topic] || topic}`, `Betreff: ${subject}`, `Von: ${email}`, '', message, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
  return { subject: subj, html, text };
}

// to the customer: the ticket number and a copy of the request
export function buildConfirmEmail({ id, topic, subject, message }, canReply = true) {
  const subj = `Deine Anfrage ist angekommen (#${id})`;
  const html = frame(subj, `<h1 style="margin:14px 0 10px 0;font-size:22px;line-height:1.3;color:#0b1b42;">Danke für deine Nachricht</h1>
${P('Wir haben deine Anfrage erhalten und melden uns per E-Mail bei dir. Deine Ticketnummer ist <b style="color:#0b1b42;">#' + esc(id) + '</b>.')}
${P('<b style="color:#0b1b42;">' + esc(subject) + '</b> · ' + esc(TOPICS[topic] || topic), 'margin-bottom:8px;font-size:14px;')}
${quote(message)}
${P(canReply ? 'Willst du noch etwas ergänzen? Antworte einfach auf diese E-Mail.' : 'Bitte antworte nicht auf diese E-Mail. Für Ergänzungen schick uns im Journal unter Hilfe eine neue Anfrage.', 'font-size:13px;color:#5b6580;')}`);
  const text = ['Hallo,', '', `wir haben deine Anfrage erhalten und melden uns per E-Mail bei dir. Deine Ticketnummer ist #${id}.`, '', `${subject} · ${TOPICS[topic] || topic}`, '', message, '', canReply ? 'Willst du noch etwas ergänzen? Antworte einfach auf diese E-Mail.' : 'Bitte antworte nicht auf diese E-Mail. Für Ergänzungen schick uns im Journal unter Hilfe eine neue Anfrage.', '', 'Blotter Trading Journal · blotterjournal.com'].join('\n');
  return { subject: subj, html, text };
}

export async function mailTeam(ticket) {
  const to = supportInbox();
  if (!to) return false;
  const mail = buildTeamEmail(ticket);
  const { id } = await sendMail({ to, ...mail, from: FROM, replyTo: ticket.email, tag: 'support', idempotencyKey: `ticket-${ticket.id}-team`, budgetMs: 4000 });
  await logMail({ email: to, kind: 'support', resend_id: id, status: 'sent' });
  return true;
}

export async function mailCustomer(ticket) {
  const inbox = supportInbox();
  const mail = buildConfirmEmail(ticket, !!inbox);
  const { id } = await sendMail({ to: ticket.email, ...mail, from: FROM, replyTo: inbox || undefined, tag: 'support', idempotencyKey: `ticket-${ticket.id}-confirm`, budgetMs: 4000 });
  await logMail({ email: ticket.email, kind: 'support', resend_id: id, status: 'sent' });
  return true;
}
