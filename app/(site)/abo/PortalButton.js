'use client';
import { useState } from 'react';

// Stripe's customer portal: payment method, invoices, cancelling.
export default function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  async function go() {
    setBusy(true); setErr(false);
    try {
      const r = await fetch('/api/portal', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error('portal');
      window.location.href = j.url;
    } catch (e) { setBusy(false); setErr(true); }
  }
  return (
    <>
      <button type="button" className="btn" onClick={go} disabled={busy}>{busy ? 'Wird geöffnet…' : 'Abo verwalten oder kündigen'}</button>
      {err && <div className="msg err" role="alert" style={{ flexBasis: '100%' }}>Die Abo-Verwaltung konnte nicht geöffnet werden. Versuch es in einem Moment erneut.</div>}
    </>
  );
}
