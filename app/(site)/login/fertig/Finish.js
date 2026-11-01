'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app');

// Supabase sends the login back as #access_token=…&refresh_token=… (or #error=…).
// The fragment never reaches a server; here it becomes the normal cookie session.
export default function Finish() {
  const [state, setState] = useState('working');
  const [next, setNext] = useState('/app');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const target = safeNext(query.get('next'));
    setNext(target);
    // remove the tokens from the address bar and history right away
    window.history.replaceState(null, '', window.location.pathname + (query.get('next') ? '?next=' + encodeURIComponent(target) : ''));

    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) {
      const code = hash.get('error_code') || query.get('error_code') || '';
      setState(code === 'otp_expired' ? 'expired' : 'failed');
      return;
    }
    const sb = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: false } });
    sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) setState('failed');
      else window.location.replace(target);
    }, () => setState('failed'));
  }, []);

  if (state === 'working') {
    return (
      <div className="card">
        <span className="eyebrow">Einen Moment</span>
        <h1>Du wirst angemeldet…</h1>
      </div>
    );
  }
  return (
    <div className="card">
      <span className="eyebrow">Anmeldung</span>
      <h1>Das hat nicht geklappt.</h1>
      <div className="msg err">
        {state === 'expired'
          ? 'Der Anmelde-Link ist abgelaufen oder wurde schon benutzt. Jeder Link funktioniert nur einmal.'
          : 'Der Anmelde-Link konnte nicht verwendet werden.'}
      </div>
      <a className="btn primary block" href={'/login?next=' + encodeURIComponent(next)}>Neuen Link anfordern</a>
    </div>
  );
}
