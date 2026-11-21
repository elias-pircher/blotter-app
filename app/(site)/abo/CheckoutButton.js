'use client';
import { useState } from 'react';
import { PLANS, PLAN_IDS, TRIAL_DAYS } from '@/lib/plans';

// trial: whether this customer starts with the free trial; trialEnd: its last day, e.g. "24. November"
export default function CheckoutButton({ initial = 'journal', trial = false, trialEnd = null }) {
  const [plan, setPlan] = useState(PLANS[initial] ? initial : 'journal');
  const [terms, setTerms] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const p = PLANS[plan];

  async function go() {
    setErr('');
    if (!terms || !waiver) { setErr('Bitte bestätige beide Punkte, um fortzufahren.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, plan }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'checkout');
      window.location.href = j.url;
    } catch (e) {
      setBusy(false);
      setErr(trial ? 'Der Test konnte nicht gestartet werden. Versuch es in einem Moment erneut.' : 'Die Zahlungsseite konnte nicht geöffnet werden. Versuch es in einem Moment erneut.');
    }
  }

  return (
    <>
      <fieldset className="plans">
        <legend className="sr">Abo</legend>
        {PLAN_IDS.map((id) => {
          const x = PLANS[id];
          return (
            <label key={id} className="plan">
              <input type="radio" name="plan" value={id} checked={plan === id} onChange={() => setPlan(id)} />
              <span className="rd" aria-hidden="true" />
              <b>{x.name}</b>
              <span className="pr">{x.price}<small> / Monat</small></span>
              <span className="pd">{x.short}</span>
            </label>
          );
        })}
      </fieldset>
      {trial && (
        <ol className="trial-tl" aria-label="So läuft der Test">
          <li><b>Heute</b><span>Voller Zugang zu {p.name}. Es wird nichts abgebucht.</span></li>
          <li><b>{trialEnd || `In ${TRIAL_DAYS} Tagen`}</b><span>Der Test endet. Ab dann {p.price} im Monat, außer du kündigst vorher.</span></li>
        </ol>
      )}
      <label className="chk"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>Ich akzeptiere die <a href="/agb" target="_blank">AGB</a> und habe die <a href="/datenschutz" target="_blank">Datenschutzerklärung</a> gelesen.</span></label>
      <label className="chk"><input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} /><span>Ich verlange ausdrücklich, dass Blotter sofort mit der Leistung beginnt, und nehme zur Kenntnis, dass ich dadurch mein Rücktrittsrecht verliere.</span></label>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button type="button" className="btn primary block" onClick={go} disabled={busy}>{busy ? (trial ? 'Test wird vorbereitet…' : 'Zahlungsseite wird geöffnet…') : trial ? `${TRIAL_DAYS} Tage kostenlos testen` : `Weiter zur Zahlung · ${p.price} / Monat`}</button>
      <p className="muted" style={{ fontSize: 13 }}>{trial
        ? 'Stripe fragt deine Zahlungsmethode ab, abgebucht wird erst nach dem Test. Du bekommst eine E-Mail mit dem genauen Enddatum. Monatlich kündbar, keine Mindestlaufzeit.'
        : 'Die Zahlung läuft sicher über Stripe. Monatlich kündbar, keine Mindestlaufzeit. Du kannst jederzeit zwischen den Abos wechseln.'}</p>
    </>
  );
}
