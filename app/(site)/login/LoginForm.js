'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { suggestEmail, providerOf } from '@/lib/email-domains';

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

function sendError(error) {
  const code = error?.code || '';
  if (code === 'over_email_send_rate_limit' || error?.status === 429) {
    const secs = Number((error?.message || '').match(/(\d+)\s*seconds?/i)?.[1]);
    return secs
      ? { text: `Bitte warte noch ${secs} Sekunden, bevor du eine weitere E-Mail anforderst.`, wait: secs }
      : { text: 'Gerade wurden zu viele Anmelde-E-Mails verschickt. Warte etwas und versuch es dann erneut.' };
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return { text: 'Diese E-Mail-Adresse ist ungültig. Prüfe sie bitte auf Tippfehler.' };
  }
  if (code === 'email_address_not_authorized') {
    return { text: 'An diese Adresse können noch keine E-Mails verschickt werden.' };
  }
  return { text: 'Die E-Mail konnte nicht verschickt werden. Prüfe die Adresse und versuch es gleich noch einmal.' };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Support() {
  if (!SUPPORT) return null;
  return <> Oder schreib uns an <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>, dann helfen wir dir weiter.</>;
}

// What the login page says about the e-mail it just sent.
function Delivery({ status, reason, spamHint, onOtherAddress }) {
  if (!status || status === 'unbekannt') return null;
  if (status === 'sent' || status === 'queued') {
    return <div className="msg info" role="status"><span className="dot pulse" /> Wird an deinen E-Mail-Anbieter übergeben …</div>;
  }
  if (status === 'delayed') {
    return (
      <div className="msg info" role="status">
        <b>Dein E-Mail-Anbieter nimmt die E-Mail gerade nur verzögert an.</b> Das kommt bei manchen Anbietern vor, sie kommt meist innerhalb weniger Minuten.
        Fordere bitte keine neue an, sonst wird dieser Code ungültig.
      </div>
    );
  }
  if (status === 'delivered' || status === 'complained') {
    return (
      <div className="msg ok" role="status">
        <b>Zugestellt.</b> Dein E-Mail-Anbieter hat die E-Mail angenommen. Nicht im Posteingang? Schau im Ordner {spamHint} nach.
      </div>
    );
  }
  const text = {
    unknown_address: 'Diese E-Mail-Adresse gibt es offenbar nicht. Prüfe sie bitte auf Tippfehler.',
    mailbox_full: 'Dein Postfach ist voll, deshalb kam die E-Mail nicht an. Mach etwas Platz frei oder nimm eine andere Adresse.',
    rejected: 'Dein E-Mail-Anbieter hat die E-Mail abgelehnt. Bitte versuch es mit einer anderen Adresse, zum Beispiel von Gmail, Outlook oder iCloud.',
    suppressed: 'An diese Adresse können wir gerade nicht zustellen, weil frühere E-Mails abgelehnt wurden. Bitte nimm eine andere Adresse.',
    failed: 'Beim Versand ist etwas schiefgegangen. Fordere bitte eine neue E-Mail an.',
  }[reason] || 'Die E-Mail konnte nicht zugestellt werden. Bitte versuch es mit einer anderen Adresse.';
  return (
    <div className="msg err" role="alert">
      <b>Nicht zugestellt.</b> {text}<Support />
      {reason !== 'failed' && (
        <div className="msg-actions"><button type="button" className="btn sm" onClick={onOtherAddress}>Andere Adresse verwenden</button></div>
      )}
    </div>
  );
}

export default function LoginForm({ next, linkError }) {
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
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}&rid=${id}`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      const e = sendError(error);
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
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
    if (token.length < 6) { setErr('Gib den Code aus der E-Mail ein.'); return; }
    setState('verifying');
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token, type: 'email' });
    if (error) {
      setState('sent');
      setErr(error.status === 403 || /expired|invalid/i.test(error.message || '')
        ? 'Der Code stimmt nicht oder ist abgelaufen. Nimm den Code aus der neuesten E-Mail.'
        : 'Die Anmeldung hat nicht geklappt. Versuch es bitte noch einmal.');
      return;
    }
    window.location.assign(next);
  }

  if (sentState) {
    const provider = providerOf(sentTo);
    const spamHint = provider?.spam || '„Spam“ bzw. „Junk“';
    const final = FINAL.includes(delivery.status);
    const left = waitFor(sentTo);
    return (
      <form className="card" onSubmit={verify} noValidate>
        <span className="eyebrow">Fast geschafft</span>
        <h1>Schau in dein Postfach.</h1>
        <p>Wir haben dir {sentCount > 1 ? 'eine neue' : 'eine'} E-Mail an <b className="addr">{sentTo}</b> geschickt. Gib den Code daraus hier ein oder klick auf den Button in der E-Mail.</p>
        {sentCount > 1 && <div className="msg ok">Nur die neueste E-Mail gilt. Codes aus älteren E-Mails funktionieren nicht mehr.</div>}
        <Delivery status={delivery.status} reason={delivery.reason} spamHint={spamHint} onOtherAddress={otherAddress} />
        <div className="fld">
          <label htmlFor="code">Code aus der E-Mail</label>
          <input className="inp code" id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12}
            placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {err && <div className="msg err" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={state !== 'sent'}>{state === 'verifying' ? 'Wird geprüft…' : 'Mit Code anmelden'}</button>
        {!final && (
          <p className="muted small">Nichts angekommen? Das kann ein paar Minuten dauern. Schau auch im Ordner {spamHint} nach.<Support /></p>
        )}
        <div className="row-actions">
          <button type="button" className="btn sm" disabled={left > 0 || state !== 'sent'} onClick={() => doSend(sentTo)}>
            {state === 'resending' ? 'Wird gesendet…' : left > 0 ? `Neue E-Mail in ${mmss(left)}` : 'Neue E-Mail senden'}
          </button>
          <button type="button" className="btn sm ghost" onClick={otherAddress}>Andere Adresse</button>
        </div>
      </form>
    );
  }

  const left = waitFor(email.trim());
  return (
    <form className="card" onSubmit={send} noValidate>
      <span className="eyebrow">Anmelden oder registrieren</span>
      <h1>Willkommen bei Blotter</h1>
      <p>Gib deine E-Mail-Adresse ein. Du bekommst eine E-Mail mit einem Code und einem Button, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.</p>
      {next.startsWith('/freund/') && <div className="msg info">Du wurdest eingeladen. Nach der Anmeldung ist Blotter für dich kostenlos, ganz ohne Abo.</div>}
      {state === 'linkerr' && <div className="msg err">Der Link war abgelaufen oder wurde schon benutzt. Es gilt immer nur die neueste E-Mail. Fordere einfach eine neue an.</div>}
      <div className="fld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input ref={emailRef} className="inp" id="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder="du@beispiel.at" value={email} onChange={(e) => { setEmail(e.target.value); setSuggestion(null); }} required />
      </div>
      {suggestion && (
        <div className="msg info" role="alert">
          Meintest du <b className="addr">{suggestion}</b>?
          <div className="msg-actions">
            <button type="button" className="btn sm primary" onClick={() => { setEmail(suggestion); doSend(suggestion); }}>Ja, korrigieren</button>
            <button type="button" className="btn sm" onClick={() => doSend(email.trim())}>Nein, stimmt so</button>
          </div>
        </div>
      )}
      {err && <div className="msg err" role="alert">{err}</div>}
      {!suggestion && (
        <button className="btn primary block" type="submit" disabled={state === 'sending' || left > 0}>
          {state === 'sending' ? 'Wird gesendet…' : left > 0 ? `Bitte warten (${mmss(left)})` : 'Anmelde-E-Mail senden'}
        </button>
      )}
    </form>
  );
}
