'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function sendError(error) {
  const code = error?.code || '';
  if (code === 'over_email_send_rate_limit' || error?.status === 429) {
    return 'Gerade wurden zu viele Anmelde-E-Mails verschickt. Warte etwas und versuch es dann erneut.';
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

  async function send(e) {
    e.preventDefault();
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    setState('sending');
    const origin = window.location.origin;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: origin + '/auth/callback?next=' + encodeURIComponent(next), shouldCreateUser: true },
    });
    if (error) { setState('idle'); setErr(sendError(error)); return; }
    setCode('');
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
      setErr(/expired|invalid/i.test(error.message || '') || error.status === 403
        ? 'Der Code stimmt nicht oder ist abgelaufen. Prüfe ihn oder fordere einen neuen an.'
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
        <p>Wir haben dir eine E-Mail an <b>{email}</b> geschickt. Gib den Code daraus hier ein oder klick auf den Link in der E-Mail.</p>
        <div className="fld">
          <label htmlFor="code">Code aus der E-Mail</label>
          <input className="inp code" id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12}
            placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        </div>
        {err && <div className="msg err" role="alert">{err}</div>}
        <button className="btn primary block" type="submit" disabled={state === 'verifying'}>{state === 'verifying' ? 'Wird geprüft…' : 'Anmelden'}</button>
        <p className="muted">Nichts angekommen? Prüfe den Spam-Ordner oder <button type="button" className="btn sm" onClick={() => { setErr(''); setState('idle'); }}>neue E-Mail anfordern</button></p>
      </form>
    );
  }
  return (
    <form className="card" onSubmit={send} noValidate>
      <span className="eyebrow">Anmelden oder registrieren</span>
      <h1>Willkommen bei Blotter</h1>
      <p>Gib deine E-Mail-Adresse ein. Du bekommst einen Code, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.</p>
      {state === 'linkerr' && <div className="msg err">Der Anmelde-Link hat nicht funktioniert. Fordere eine neue E-Mail an und gib den Code daraus ein.</div>}
      <div className="fld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input className="inp" id="email" type="email" autoComplete="email" inputMode="email" placeholder="du@beispiel.at" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Wird gesendet…' : 'Code per E-Mail senden'}</button>
    </form>
  );
}
