import { stripe } from '@/lib/stripe';
import { MAIL_FROM, sendMail } from '@/lib/mail';
import { logMail } from '@/lib/mail-log';
import { planIn, planOfPrice, when, dayShort } from '@/lib/plans';

// The e-mail about the end of the free trial. Stripe sends customer.subscription.trial_will_end
// (by default 3 days before the end, so for a 3-day trial right when it starts); we answer with
// the exact date, the price after the trial and how to cancel before anything is charged.

const ABO_FROM = process.env.MAIL_FROM_ABO || MAIL_FROM.replace(/<[^@<>]+@/, '<abo@');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildTrialEmail({ planName, price, endIso, link, lang = 'de' }) {
  const en = lang === 'en';
  const subject = en ? `Your Blotter trial runs until ${dayShort(endIso, lang)}` : `Dein Blotter-Test läuft bis ${dayShort(endIso)}`;
  const title = en ? 'Your free trial is running' : 'Dein kostenloser Test läuft';
  const paras = en ? [
    `You are trying ${planName} for free. The trial ends on ${when(endIso, lang)}.`,
    `After that we charge ${price} a month through Stripe. The plan can be cancelled monthly, with no minimum term.`,
    'If Blotter isn’t for you, cancel before the trial ends under “Manage plan”. Then nothing is charged.',
  ] : [
    `Du testest ${planName} gerade kostenlos. Der Test endet am ${when(endIso)}.`,
    `Danach buchen wir ${price.replace(/ /g, ' ')} im Monat über Stripe ab. Das Abo ist monatlich kündbar, ohne Mindestlaufzeit.`,
    'Wenn Blotter nichts für dich ist, kündige vor dem Ende des Tests unter „Abo verwalten“. Dann wird nichts abgebucht.',
  ];
  const why = en ? 'You are getting this e-mail because you started a free trial of Blotter on blotterjournal.com.' : 'Du bekommst diese E-Mail, weil du auf blotterjournal.com einen kostenlosen Test von Blotter gestartet hast.';
  const manage = en ? 'Manage plan' : 'Abo verwalten';
  const html = `<!doctype html>
<html lang="${en ? 'en' : 'de'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${en ? `Trial until ${esc(when(endIso, lang))}, then ${esc(price)} a month.` : `Test bis ${esc(when(endIso))}, danach ${esc(price)} im Monat.`}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;border:1px solid #e3e6ee;">
<tr><td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:13px;font-weight:bold;letter-spacing:3px;color:#9a7426;">BLOTTER</div>
<h1 style="margin:14px 0 10px 0;font-size:22px;line-height:1.3;color:#0b1b42;">${esc(title)}</h1>
${paras.map((p) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:#3b4560;">${esc(p)}</p>`).join('\n')}
</td></tr>
<tr><td align="center" style="padding:10px 28px 4px 28px;">
<a href="${esc(link)}" style="display:inline-block;background:#d9b450;color:#081634;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:10px;">${manage}</a>
</td></tr>
<tr><td style="padding:22px 28px 26px 28px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0;font-size:13px;line-height:1.55;color:#5b6580;">${esc(why)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a93a8;">Blotter Trading Journal · blotterjournal.com</p>
</td></tr></table>
</body></html>`;
  const text = [en ? 'Hi,' : 'Hallo,', '', ...paras.flatMap((p) => [p, '']), manage + ':', link, '', why, '', 'Blotter Trading Journal · blotterjournal.com'].join('\n');
  return { subject, html, text };
}

// sub: the Stripe subscription. Returns true when an e-mail went out.
export async function sendTrialMail(sub, base) {
  if (!sub || sub.status !== 'trialing' || !sub.trial_end || sub.cancel_at_period_end) return false;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const customer = await stripe().customers.retrieve(customerId);
  const to = customer && !customer.deleted ? customer.email : null;
  if (!to) return false;
  // the language the customer checked out in (set as the Stripe customer's preferred locale)
  const lang = (customer.preferred_locales || [])[0] === 'en' ? 'en' : 'de';
  const plan = planIn(planOfPrice(sub.items?.data?.[0]?.price), lang) || planIn('journal', lang);
  const endIso = new Date(sub.trial_end * 1000).toISOString();
  const mail = buildTrialEmail({ planName: plan.name, price: plan.price, endIso, link: base + (lang === 'en' ? '/en/abo' : '/abo'), lang });
  const { id } = await sendMail({ to, ...mail, from: ABO_FROM, tag: 'trial', idempotencyKey: `trial-${sub.id}-${sub.trial_end}`, budgetMs: 6000 });
  await logMail({ email: to, kind: 'trial', resend_id: id, status: 'sent' });
  return true;
}
