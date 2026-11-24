'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { suggestEmail, providerOf } from '@/lib/email-domains';
import { tr } from '@/lib/i18n';

// Login e-mails are requested without a browser-bound PKCE secret, so the button in the e-mail
// works in any browser and on any device. The e-mail also carries a code that can be typed in here.
const mailer = () => createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
const COOLDOWN_S = 60;
const FINAL = ['delivered', 'complained', 'bounced', 'failed', 'suppressed', 'error'];

function newRid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function sendError(error, t) {
  const code = error?.code || '';
  if (code === 'over_email_send_rate_limit' || error?.status === 429) {
    const secs = Number((error?.message || '').match(/(\d+)\s*seconds?/i)?.[1]);
    return secs
      ? { text: t(`Bitte warte noch ${secs} Sekunden, bevor du eine weitere E-Mail anforderst.`, `Please wait ${secs} more seconds before you request another e-mail.`), wait: secs }
      : { text: t('Gerade wurden zu viele Anmelde-E-Mails verschickt. Warte etwas und versuch es dann erneut.', 'Too many login e-mails were sent just now. Wait a little and try again.') };
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return { text: t('Diese E-Mail-Adresse ist ungültig. Prüfe sie bitte auf Tippfehler.', 'This e-mail address is invalid. Please check it for typos.') };
  }
  if (code === 'email_address_not_authorized') {
    return { text: t('An diese Adresse können noch keine E-Mails verschickt werden.', 'E-mails cannot be sent to this address yet.') };
  }
  return { text: t('Die E-Mail konnte nicht verschickt werden. Prüfe die Adresse und versuch es gleich noch einmal.', 'The e-mail could not be sent. Check the address and try again in a moment.') };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Support({ t }) {
  if (!SUPPORT) return null;
  return <>{t(' Oder schreib uns an ', ' Or write to us at ')}<a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>{t(', dann helfen wir dir weiter.', ' and we will help you.')}</>;
}

// What the login page says about the e-mail it just sent.
function Delivery({ status, reason, spamHint, onOtherAddress, t }) {
  if (!status || status === 'unbekannt') return null;
  if (status === 'sent' || status === 'queued') {
    return <div className="msg info" role="status"><span className="dot pulse" /> {t('Wird an deinen E-Mail-Anbieter übergeben …', 'Handing over to your e-mail provider …')}</div>;
  }
  if (status === 'delayed') {
    return (
      <div className="msg info" role="status">
        <b>{t('Dein E-Mail-Anbieter nimmt die E-Mail gerade nur verzögert an.', 'Your e-mail provider is accepting the e-mail with a delay.')}</b> {t('Das kommt bei manchen Anbietern vor, sie kommt meist innerhalb weniger Minuten.', 'This happens with some providers; it usually arrives within a few minutes.')}
        {' '}{t('Fordere bitte keine neue an, sonst wird dieser Code ungültig.', 'Please don’t request a new one, otherwise this code stops working.')}
      </div>
    );
  }
  if (status === 'delivered' || status === 'complained') {
    return (
      <div className="msg ok" role="status">
        <b>{t('Zugestellt.', 'Delivered.')}</b> {t('Dein E-Mail-Anbieter hat die E-Mail angenommen. Nicht im Posteingang? Schau im Ordner', 'Your e-mail provider accepted the e-mail. Not in your inbox? Check the folder')} {spamHint}{t(' nach.', '.')}
      </div>
    );
  }
  const text = {
    unknown_address: t('Diese E-Mail-Adresse gibt es offenbar nicht. Prüfe sie bitte auf Tippfehler.', 'This e-mail address does not seem to exist. Please check it for typos.'),
    mailbox_full: t('Dein Postfach ist voll, deshalb kam die E-Mail nicht an. Mach etwas Platz frei oder nimm eine andere Adresse.', 'Your mailbox is full, so the e-mail did not arrive. Free up some space or use another address.'),
    rejected: t('Dein E-Mail-Anbieter hat die E-Mail abgelehnt. Bitte versuch es mit einer anderen Adresse, zum Beispiel von Gmail, Outlook oder iCloud.', 'Your e-mail provider rejected the e-mail. Please try another address, for example from Gmail, Outlook or iCloud.'),
    suppressed: t('An diese Adresse können wir gerade nicht zustellen, weil frühere E-Mails abgelehnt wurden. Bitte nimm eine andere Adresse.', 'We can’t deliver to this address right now because earlier e-mails were rejected. Please use another address.'),
    failed: t('Beim Versand ist etwas schiefgegangen. Fordere bitte eine neue E-Mail an.', 'Something went wrong while sending. Please request a new e-mail.'),
  }[reason] || t('Die E-Mail konnte nicht zugestellt werden. Bitte versuch es mit einer anderen Adresse.', 'The e-mail could not be delivered. Please try another address.');
  return (
    <div className="msg err" role="alert">
      <b>{t('Nicht zugestellt.', 'Not delivered.')}</b> {text}<Support t={t} />
      {reason !== 'failed' && (
        <div className="msg-actions"><button type="button" className="btn sm" onClick={onOtherAddress}>{t('Andere Adresse verwenden', 'Use another address')}</button></div>
      )}
    </div>
  );
}

export default function LoginForm({ next, linkError, lang = 'de' }) {
  const t = tr(lang);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState(linkError ? 'linkerr' : 'idle');
  const [err, setErr] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [sentCount, setSentCount] = useState(0);
  const [rid, setRid] = useState('');
  const [delivery, setDelivery] = useState({ status: '', reason: '' });
  const [cool, setCool] = useState({ addr: '', until: 0 }); // Supabase allows one e-mail per address per minute
  const [now, setNow] = useState(() => Date.now());
  const emailRef = useRef(null);

  const waitFor = (addr) => (addr && addr.toLowerCase() === cool.addr ? Math.max(0, Math.ceil((cool.until - now) / 1000)) : 0);
  const sentState = state === 'sent' || state === 'verifying' || state === 'resending';
  const ticking = cool.until > now;

  // countdown for "Neue E-Mail senden"
  useEffect(() => {
    if (!ticking) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  // ask the server whether the e-mail was delivered (only known once our own mail sending is active)
  useEffect(() => {
    if (!rid || !sentState) return undefined;
    let stop = false;
    let timer;
    const started = Date.now();
    async function poll() {
      try {
        const res = await fetch(`/api/mail-status?rid=${encodeURIComponent(rid)}`, { cache: 'no-store' });
        const data = await res.json();
        if (stop) return;
        if (data?.status && data.status !== 'unbekannt') setDelivery({ status: data.status, reason: data.grund || '' });
        if (FINAL.includes(data?.status)) return;
      } catch {}
      if (stop || Date.now() - started > 8 * 60 * 1000) return;
      const age = Date.now() - started;
      timer = setTimeout(poll, age < 20000 ? 1500 : age < 120000 ? 4000 : 10000);
    }
    timer = setTimeout(poll, 1200);
    return () => { stop = true; clearTimeout(timer); };
  }, [rid, sentState]);

  async function doSend(address) {
    setErr('');
    setSuggestion(null);
    const resend = sentState;
    setState(resend ? 'resending' : 'sending');
    const id = newRid();
    const origin = window.location.origin;
    const { error } = await mailer().auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}&rid=${id}&lang=${lang}`,
        shouldCreateUser: true,
        data: { lang },
      },
    });
    if (error) {
      const e = sendError(error, t);
      setState(resend ? 'sent' : 'idle');
      setErr(e.text);
      if (e.wait) { setCool({ addr: address.toLowerCase(), until: Date.now() + e.wait * 1000 }); setNow(Date.now()); }
      return;
    }
    setSentTo(address);
    setRid(id);
    setDelivery({ status: '', reason: '' });
    setCode('');
    setSentCount((n) => n + 1);
    setCool({ addr: address.toLowerCase(), until: Date.now() + COOLDOWN_S * 1000 });
    setNow(Date.now());
    setState('sent');
  }

  function send(e) {
    e.preventDefault();
    setErr('');
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) { setErr(t('Bitte gib eine gültige E-Mail-Adresse ein.', 'Please enter a valid e-mail address.')); return; }
    const s = suggestEmail(address);
    if (s && s !== address) { setSuggestion(s); return; }
    doSend(address);
  }

  function otherAddress() {
    setErr('');
    setRid('');
    setDelivery({ status: '', reason: '' });
    setState('idle');
    setTimeout(() => emailRef.current?.select(), 0);
  }

  async function verify(e) {
    e.preventDefault();
    setErr('');
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setErr(t('Gib den Code aus der E-Mail ein.', 'Enter the code from the e-mail.')); return; }
    setState('verifying');
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token, type: 'email' });
    if (error) {
      setState('sent');
      setErr(error.status === 403 || /expired|invalid/i.test(error.message || '')
        ? t('Der Code stimmt nicht oder ist abgelaufen. Nimm den Code aus der neuesten E-Mail.', 'The code is wrong or has expired. Use the code from the newest e-mail.')
        : t('Die Anmeldung hat nicht geklappt. Versuch es bitte noch einmal.', 'Logging in did not work. Please try again.'));
      return;
    }
    window.location.assign(next);
  }

  if (sentState) {
    const provider = providerOf(sentTo);
    const spamHint = (lang === 'en' ? provider?.spamEn : provider?.spam) || t('„Spam“ bzw. „Junk“', '“Spam” or “Junk”');
    const final = FINAL.includes(delivery.status);
    const left = waitFor(sentTo);
    return (
      <form className="card" onSubmit={verify} noValidate>
        <span className="eyebrow">{t('Fast geschafft', 'Almost there')}</span>
        <h1>{t('Schau in dein Postfach.', 'Check your inbox.')}</h1>
        {lang === 'en'
          ? <p>We sent {sentCount > 1 ? 'a new' : 'an'} e-mail to <b className="addr">{sentTo}</b>. Enter the code from it here or click the button in the e-mail.</p>
          : <p>Wir haben dir {sentCount > 1 ? 'eine neue' : 'eine'} E-Mail an <b className="addr">{sentTo}</b> geschickt. Gib den Code daraus hier ein oder klick auf den Button in der E-Mail.</p>}
        {sentCount > 1 && <div className="msg ok">{t('Nur die neueste E-Mail gilt. Codes aus älteren E-Mails funktionieren nicht mehr.', 'Only the newest e-mail counts. Codes from older e-mails no longer work.')}</div>}
        <Delivery status={delivery.status} reason={delivery.reason} spamHint={spamHint} onOtherAddress={otherAddress} t={t} />
        <div className="fld">
          <label htmlFor="code">{t('Code aus der E-Mail', 'Code from the e-mail')}</label>
          <input className="inp code" id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12}
            placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {err && <div className="msg err" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={state !== 'sent'}>{state === 'verifying' ? t('Wird geprüft…', 'Checking…') : t('Mit Code anmelden', 'Log in with code')}</button>
        {!final && (
          <p className="muted small">{t('Nichts angekommen? Das kann ein paar Minuten dauern. Schau auch im Ordner', 'Nothing arrived? It can take a few minutes. Also check the folder')} {spamHint}{t(' nach.', '.')}<Support t={t} /></p>
        )}
        <div className="row-actions">
          <button type="button" className="btn sm" disabled={left > 0 || state !== 'sent'} onClick={() => doSend(sentTo)}>
            {state === 'resending' ? t('Wird gesendet…', 'Sending…') : left > 0 ? t(`Neue E-Mail in ${mmss(left)}`, `New e-mail in ${mmss(left)}`) : t('Neue E-Mail senden', 'Send a new e-mail')}
          </button>
          <button type="button" className="btn sm ghost" onClick={otherAddress}>{t('Andere Adresse', 'Other address')}</button>
        </div>
      </form>
    );
  }

  const left = waitFor(email.trim());
  return (
    <form className="card" onSubmit={send} noValidate>
      <span className="eyebrow">{t('Anmelden oder registrieren', 'Log in or sign up')}</span>
      <h1>{t('Willkommen bei Blotter', 'Welcome to Blotter')}</h1>
      <p>{t('Gib deine E-Mail-Adresse ein. Du bekommst eine E-Mail mit einem Code und einem Button, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.', 'Enter your e-mail address. You get an e-mail with a code and a button that logs you in without a password. New accounts are created automatically.')}</p>
      {next.startsWith('/freund/') && <div className="msg info">{t('Du wurdest eingeladen. Nach der Anmeldung ist Blotter für dich kostenlos, ganz ohne Abo.', 'You have been invited. Once you log in, Blotter is free for you, without a subscription.')}</div>}
      {state === 'linkerr' && <div className="msg err">{t('Der Link war abgelaufen oder wurde schon benutzt. Es gilt immer nur die neueste E-Mail. Fordere einfach eine neue an.', 'The link had expired or was already used. Only the newest e-mail counts. Just request a new one.')}</div>}
      <div className="fld">
        <label htmlFor="email">{t('E-Mail-Adresse', 'E-mail address')}</label>
        <input ref={emailRef} className="inp" id="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder={t('du@beispiel.at', 'you@example.com')} value={email} onChange={(e) => { setEmail(e.target.value); setSuggestion(null); }} required />
      </div>
      {suggestion && (
        <div className="msg info" role="alert">
          {t('Meintest du', 'Did you mean')} <b className="addr">{suggestion}</b>?
          <div className="msg-actions">
            <button type="button" className="btn sm primary" onClick={() => { setEmail(suggestion); doSend(suggestion); }}>{t('Ja, korrigieren', 'Yes, fix it')}</button>
            <button type="button" className="btn sm" onClick={() => doSend(email.trim())}>{t('Nein, stimmt so', 'No, it’s correct')}</button>
          </div>
        </div>
      )}
      {err && <div className="msg err" role="alert">{err}</div>}
      {!suggestion && (
        <button className="btn primary block" type="submit" disabled={state === 'sending' || left > 0}>
          {state === 'sending' ? t('Wird gesendet…', 'Sending…') : left > 0 ? t(`Bitte warten (${mmss(left)})`, `Please wait (${mmss(left)})`) : t('Anmelde-E-Mail senden', 'Send login e-mail')}
        </button>
      )}
    </form>
  );
}
