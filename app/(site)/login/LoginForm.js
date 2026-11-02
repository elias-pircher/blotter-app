'use client';
import { useState } from 'react';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

// Login links are sent without a browser-bound PKCE secret, so the link in the e-mail
// works in any browser and on any device. /login/fertig turns it into a session.
const mailer = () => createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

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
  const [state, setState] = useState(linkError ? 'linkerr' : 'idle');
  const [err, setErr] = useState('');

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
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <div className="card">
        <span className="eyebrow">Fast geschafft</span>
        <h1>Schau in dein Postfach.</h1>
        <p>Wir haben einen Anmelde-Link an <b>{email}</b> geschickt. Klick in der E-Mail auf den Link, dann bist du angemeldet. Das klappt in jedem Browser.</p>
        <p className="muted">Nichts angekommen? Prüfe den Spam-Ordner oder <button type="button" className="btn sm" onClick={() => { setErr(''); setState('idle'); }}>neue E-Mail anfordern</button></p>
      </div>
    );
  }
  return (
    <form className="card" onSubmit={send} noValidate>
      <span className="eyebrow">Anmelden oder registrieren</span>
      <h1>Willkommen bei Blotter</h1>
      <p>Gib deine E-Mail-Adresse ein. Du bekommst einen Link, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.</p>
      {state === 'linkerr' && <div className="msg err">Der Anmelde-Link war abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.</div>}
      <div className="fld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input className="inp" id="email" type="email" autoComplete="email" inputMode="email" placeholder="du@beispiel.at" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Wird gesendet…' : 'Anmelde-Link senden'}</button>
    </form>
  );
}
