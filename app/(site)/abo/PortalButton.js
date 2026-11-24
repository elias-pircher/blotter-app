'use client';
import { useState } from 'react';
import { tr } from '@/lib/i18n';

// Stripe's customer portal: payment method, invoices, cancelling.
export default function PortalButton({ lang = 'de' }) {
  const t = tr(lang);
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
      <button type="button" className="btn" onClick={go} disabled={busy}>{busy ? t('Wird geöffnet…', 'Opening…') : t('Abo verwalten oder kündigen', 'Manage or cancel plan')}</button>
      {err && <div className="msg err" role="alert" style={{ flexBasis: '100%' }}>{t('Die Abo-Verwaltung konnte nicht geöffnet werden. Versuch es in einem Moment erneut.', 'Plan management could not be opened. Try again in a moment.')}</div>}
    </>
  );
}
