import crypto from 'node:crypto';
import { secret } from '@/lib/secrets';

// Sign-in e-mails: German text, HTML and plain-text part, sent through the Resend API.

export const MAIL_FROM = process.env.MAIL_FROM || 'Blotter <login@blotterjournal.com>';
const RESEND_API = (process.env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/$/, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COPY = {
  login: {
    subject: (c) => `Dein Blotter-Code: ${c}`,
    title: 'Dein Anmelde-Code',
    intro: 'Gib diesen Code auf blotterjournal.com ein oder klick auf den Button, um dich bei Blotter anzumelden.',
    button: 'Jetzt anmelden',
  },
  signup: {
    subject: (c) => `Willkommen bei Blotter – dein Code: ${c}`,
    title: 'Willkommen bei Blotter',
    intro: 'Bestätige deine E-Mail-Adresse mit diesem Code oder mit dem Button. Danach bist du direkt angemeldet.',
    button: 'E-Mail bestätigen',
  },
  email_change: {
    subject: (c) => `Neue E-Mail-Adresse bestätigen – Code: ${c}`,
    title: 'E-Mail-Adresse bestätigen',
    intro: 'Bestätige die Änderung deiner E-Mail-Adresse bei Blotter mit diesem Code oder mit dem Button.',
    button: 'Änderung bestätigen',
  },
  invite: {
    subject: () => 'Deine Einladung zu Blotter',
    title: 'Du bist eingeladen',
    intro: 'Mit dem Button oder diesem Code legst du dein Blotter-Konto an.',
    button: 'Einladung annehmen',
  },
  reauthentication: {
    subject: (c) => `Bestätigungscode für Blotter: ${c}`,
    title: 'Dein Bestätigungscode',
    intro: 'Bestätige die Aktion in deinem Blotter-Konto mit diesem Code.',
    button: null,
  },
  notice: {
    subject: () => 'Sicherheitshinweis zu deinem Blotter-Konto',
    title: 'Sicherheitshinweis',
    intro: 'In deinem Blotter-Konto wurde gerade eine Sicherheitseinstellung geändert. Wenn du das selbst warst, ist alles in Ordnung.',
    button: null,
  },
};

const NOTE_CODE = 'Wichtig: Es gilt immer nur die neueste E-Mail. Der Code ist nur kurze Zeit gültig.';
const WHY_CODE = 'Du bekommst diese E-Mail, weil auf blotterjournal.com eine Anmeldung mit deiner Adresse angefordert wurde. Wenn das nicht du warst, ignoriere sie einfach. Ohne den Code kann sich niemand anmelden.';
const WHY_NOTICE = 'Wenn du das nicht warst, melde dich bitte sofort auf blotterjournal.com an und prüfe dein Konto.';

export function kindOf(actionType) {
  if (String(actionType || '').endsWith('_notification')) return 'notice';
  if (actionType === 'signup') return 'signup';
  if (actionType === 'email_change') return 'email_change';
  if (actionType === 'invite') return 'invite';
  if (actionType === 'reauthentication') return 'reauthentication';
  return 'login'; // magiclink, email, recovery
}

// The type our /auth/callback hands to verifyOtp. "email" covers both sign-in and first sign-up.
export function verifyTypeOf(actionType) {
  if (actionType === 'recovery' || actionType === 'invite' || actionType === 'email_change') return actionType;
  return 'email';
}

export function buildLoginEmail({ kind, code, link }) {
  const c = COPY[kind] || COPY.login;
  const subject = c.subject(code || '');
  const showButton = Boolean(c.button && link);
  const note = code ? NOTE_CODE : '';
  const why = kind === 'notice' ? WHY_NOTICE : WHY_CODE;
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f7;">
${code ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Code: ${esc(code)} · Es gilt immer nur die neueste E-Mail.</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;border:1px solid #e3e6ee;">
<tr><td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:13px;font-weight:bold;letter-spacing:3px;color:#9a7426;">BLOTTER</div>
<h1 style="margin:14px 0 10px 0;font-size:22px;line-height:1.3;color:#0b1b42;">${esc(c.title)}</h1>
<p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#3b4560;">${esc(c.intro)}</p>
</td></tr>
${code ? `<tr><td align="center" style="padding:0 28px;">
<div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0b1b42;background:#f6f1e3;border:1px solid #e6d7a8;border-radius:10px;padding:14px 10px;">${esc(code)}</div>
</td></tr>` : ''}
${showButton ? `<tr><td align="center" style="padding:22px 28px 4px 28px;">
<a href="${esc(link)}" style="display:inline-block;background:#d9b450;color:#081634;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:10px;">${esc(c.button)}</a>
</td></tr>` : ''}
<tr><td style="padding:22px 28px 26px 28px;font-family:Arial,Helvetica,sans-serif;">
${note ? `<p style="margin:0 0 10px 0;font-size:13px;line-height:1.55;color:#5b6580;">${esc(note)}</p>` : ''}
<p style="margin:0;font-size:13px;line-height:1.55;color:#5b6580;">${esc(why)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a93a8;">Blotter Trading Journal · blotterjournal.com</p>
</td></tr></table>
</body></html>`;
  const lines = [
    'Hallo,',
    '',
    c.intro,
    '',
  ];
  if (code) lines.push(`Dein Code: ${code}`, '');
  if (showButton) lines.push(`${c.button}:`, link, '');
  if (note) lines.push(note, '');
  lines.push(why, '', 'Blotter Trading Journal · blotterjournal.com');
  return { subject, html, text: lines.join('\n') };
}

export class MailError extends Error {
  constructor(message, { status = 0, name = '', retryable = false } = {}) {
    super(message);
    this.status = status;
    this.code = name;
    this.retryable = retryable;
  }
}

// Sends one e-mail via Resend. Retries once on a network hiccup, rate limit or server error;
// the idempotency key makes sure a retry never delivers the same e-mail twice.
export async function sendMail({ to, subject, html, text, idempotencyKey, tag = 'login', budgetMs = 3800 }) {
  const key = secret('RESEND_API_KEY');
  if (!key) throw new MailError('RESEND_API_KEY fehlt');
  const payload = {
    from: MAIL_FROM,
    to: [to],
    subject,
    html,
    text,
    headers: { 'X-Entity-Ref-ID': crypto.randomUUID() }, // keeps every login e-mail as its own message in Gmail
    tags: [{ name: 'category', value: tag }],
  };
  const replyTo = process.env.MAIL_REPLY_TO;
  if (replyTo) payload.reply_to = replyTo;
  const body = JSON.stringify(payload);
  const started = Date.now();
  let last = new MailError('nicht gesendet');
  for (let attempt = 0; attempt < 3; attempt++) {
    const left = budgetMs - (Date.now() - started);
    if (left < 600) break;
    try {
      const res = await fetch(`${RESEND_API}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body,
        signal: AbortSignal.timeout(Math.min(3000, left)),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { id: typeof data.id === 'string' ? data.id : null };
      }
      let name = '';
      try { name = String((await res.json())?.name || ''); } catch {}
      const retryable = res.status === 429 || res.status === 409 || res.status >= 500;
      last = new MailError('Resend hat abgelehnt', { status: res.status, name, retryable });
      if (!retryable) break;
    } catch (e) {
      last = new MailError('Resend nicht erreichbar', { name: e?.name || 'network', retryable: true });
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
  }
  throw last;
}

// ---- delivery status -------------------------------------------------------------------------

export const EVENT_STATUS = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
};

const RANK = { queued: 0, error: 0, sent: 1, delayed: 2, delivered: 3, complained: 4, bounced: 4, failed: 4, suppressed: 4 };
export const statusRank = (s) => RANK[s] ?? 0;
export const FINAL = new Set(['delivered', 'complained', 'bounced', 'failed', 'suppressed', 'error']);

// What the login page may know about a failed delivery (never the raw server text).
export function reasonOf(status, detail) {
  const d = String(detail || '').toLowerCase();
  if (status === 'suppressed' || /suppress/.test(d)) return 'suppressed';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status !== 'bounced') return undefined;
  if (/noemail|does not exist|unknown user|user unknown|no such user|mailbox unavailable|not found|5\.1\.1|invalid recipient/.test(d)) return 'unknown_address';
  if (/mailboxfull|mailbox full|quota|over quota|5\.2\.2/.test(d)) return 'mailbox_full';
  return 'rejected';
}

export const validRid = (r) => typeof r === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(r);

export function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '';
  return `${user.slice(0, 2)}…@${domain}`;
}
