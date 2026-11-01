'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ next, linkError }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState(linkError ? 'linkerr' : 'idle');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    setState('sending');
    const origin = window.location.origin;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: origin + '/auth/callback?next=' + encodeURIComponent(next), shouldCreateUser: true },
    });
    if (error) { setState('idle'); setErr(/rate|limit/i.test(error.message) ? 'Zu viele Versuche. Warte ein paar Minuten und versuch es erneut.' : 'Der Link konnte nicht verschickt werden. Prüfe die Adresse und versuch es erneut.'); return; }
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <div className="card">
        <span className="eyebrow">Fast geschafft</span>
        <h1>Schau in dein Postfach.</h1>
        <p>Wir haben einen Anmelde-Link an <b>{email}</b> geschickt. Öffne ihn im selben Browser, dann bist du direkt angemeldet.</p>
        <p className="muted">Nichts angekommen? Prüfe den Spam-Ordner oder <button type="button" className="btn sm" onClick={() => setState('idle')}>versuch es nochmal</button></p>
      </div>
    );
  }
  return (
    <form className="card" onSubmit={submit} noValidate>
      <span className="eyebrow">Anmelden oder registrieren</span>
      <h1>Willkommen bei Blotter</h1>
      <p>Gib deine E-Mail-Adresse ein. Du bekommst einen Link, mit dem du dich ohne Passwort anmeldest. Neue Konten werden dabei automatisch angelegt.</p>
      {state === 'linkerr' && <div className="msg err">Der Anmelde-Link ist abgelaufen oder wurde in einem anderen Browser geöffnet. Fordere einfach einen neuen an.</div>}
      <div className="fld">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input className="inp" id="email" type="email" autoComplete="email" inputMode="email" placeholder="du@beispiel.at" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button className="btn primary block" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Wird gesendet…' : 'Anmelde-Link senden'}</button>
    </form>
  );
}
