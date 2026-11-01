'use client';
import { useState } from 'react';

export default function CheckoutButton() {
  const [terms, setTerms] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function go() {
    setErr('');
    if (!terms || !waiver) { setErr('Bitte bestätige beide Punkte, um fortzufahren.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'checkout');
      window.location.href = j.url;
    } catch (e) {
      setBusy(false);
      setErr('Die Zahlungsseite konnte nicht geöffnet werden. Versuch es in einem Moment erneut.');
    }
  }

  return (
    <>
      <label className="chk"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>Ich akzeptiere die <a href="/agb" target="_blank">AGB</a> und habe die <a href="/datenschutz" target="_blank">Datenschutzerklärung</a> gelesen.</span></label>
      <label className="chk"><input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} /><span>Ich verlange ausdrücklich, dass Blotter sofort mit der Leistung beginnt, und nehme zur Kenntnis, dass ich dadurch mein Rücktrittsrecht verliere.</span></label>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button type="button" className="btn primary block" onClick={go} disabled={busy}>{busy ? 'Zahlungsseite wird geöffnet…' : 'Weiter zur Zahlung · 7,99 € / Monat'}</button>
      <p className="muted" style={{ fontSize: 13 }}>Die Zahlung läuft sicher über Stripe. Monatlich kündbar, keine Mindestlaufzeit.</p>
    </>
  );
}
