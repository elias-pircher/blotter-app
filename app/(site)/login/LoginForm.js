'use client';
import { useState } from 'react';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

// Login e-mails are requested without a browser-bound PKCE secret, so the button in the e-mail
// works in any browser and on any device. The e-mail also carries a code that can be typed in here.
const mailer = () => createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function sendError(error) {
  const code = error?.code || '';
  if (code === 'over_email_send_rate_limit' || error?.status === 429) {
    return /seconds?/i.test(error?.message || '')
      ? 'Bitte warte kurz, bevor du eine weitere E-Mail anforderst.'
      : 'Gerade wurden zu viele Anmelde-E-Mails verschickt. Warte etwas und versuch es dann erneut.';
  }
  if (code === 'email_address_not_authorized') {
    return 'An diese Adresse können noch keine E-Mails verschickt werden.';
  }
  return 'Die E-Mail konnte nicht verschickt werden. Prüfe die Adresse und versuch es erneut.';
}

export default function LoginForm({ next, linkError }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState(linkError ? 'linkerr' : 'idle');
  const [err, setErr] = useState('');
  const [sentCount, setSentCount] = useState(0);

  async function send(e) {
    e.preventDefault();
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    setState('sending');
    const origin = window.location.origin;
    const { error } = await mailer().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: origin + '/auth/callback?next=' + encodeURIComponent(next), shouldCreateUser: true },
    });
    if (error) { setState('idle'); setErr(sendError(error)); return; }
    setCode('');
    setSentCount((n) => n + 1);
    setState('sent');
  }

  async function verify(e) {
    e.preventDefault();
    setErr('');
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setErr('Gib den Code aus der E-Mail ein.'); return; }
    setState('verifying');
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    if (error) {
      setState('sent');
      setErr(error.status === 403 || /expired|invalid/i.test(error.message || '')
        ? 'Der Code stimmt nicht oder ist abgelaufen. Nimm den Code aus der neuesten E-Mail.'
        : 'Die Anmeldung hat nicht geklappt. Versuch es bitte noch einmal.');
      return;
    }
    window.location.assign(next);
  }

  if (state === 'sent' || state === 'verifying') {
    return (
      <form className="card" onSubmit={verify} noValidate>
        <span className="eyebrow">Fast geschafft</span>
        <h1>Schau in dein Postfach.</h1>
        <p>Wir haben {sentCount > 1 ? 'dir eine neue' : 'dir eine'} E-Mail an <b>{email}</b> geschickt. Klick auf den Button darin oder gib hier den Code aus der E-Mail ein.</p>
        {sentCount > 1 && <div className="msg ok">Nur die neueste E-Mail gilt. Links und Codes aus älteren E-Mails funktionieren nicht mehr.</div>}
        <div className="fld">
          <label htmlFor="code">Code aus der E-Mail</label>
          <input className="inp code" id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12}
            placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {err && <div className="msg err" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={state === 'verifying'}>{state === 'verifying' ? 'Wird geprüft…' : 'Mit Code anmelden'}</button>
        <p className="muted">Nichts angekommen? Schau im Spam-Ordner nach oder <button type="button" className="btn sm" onClick={() => { setErr(''); setState('idle'); }}>neue E-Mail anfordern</button></p>
      </form>
    );
  }
  return (
    <form className="card" onSubmit={send} noValidate>
      <span className="eyebrow">Anmelden oder registrieren</span>
      <h1>Willkommen bei Blotter</h1>
      <p>Gib deine E-Mail-Adresse ein. Du bekommst eine E-Mail mit einem Button und einem Code, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.</p>
      {state === 'linkerr' && <div className="msg err">Der Link war abgelaufen oder wurde schon benutzt. Es gilt immer nur die neueste E-Mail. Fordere einfach eine neue an.</div>}
      <div className="fld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input className="inp" id="email" type="email" autoComplete="email" inputMode="email" placeholder="du@beispiel.at" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Wird gesendet…' : 'Anmelde-E-Mail senden'}</button>
    </form>
  );
}
