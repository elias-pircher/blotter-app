'use client';
import { useState } from 'react';
import { PLANS, PLAN_IDS, TRIAL_DAYS, planIn } from '@/lib/plans';
import { lp, tr } from '@/lib/i18n';

// trial: whether this customer starts with the free trial; trialEnd: its last day, e.g. "24. November"
export default function CheckoutButton({ initial = 'journal', trial = false, trialEnd = null, lang = 'de' }) {
  const t = tr(lang);
  const [plan, setPlan] = useState(PLANS[initial] ? initial : 'journal');
  const [terms, setTerms] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const p = planIn(plan, lang);

  async function go() {
    setErr('');
    if (!terms || !waiver) { setErr(t('Bitte bestätige beide Punkte, um fortzufahren.', 'Please confirm both points to continue.')); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, plan }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'checkout');
      window.location.href = j.url;
    } catch (e) {
      setBusy(false);
      setErr(trial ? t('Der Test konnte nicht gestartet werden. Versuch es in einem Moment erneut.', 'The trial could not be started. Try again in a moment.') : t('Die Zahlungsseite konnte nicht geöffnet werden. Versuch es in einem Moment erneut.', 'The payment page could not be opened. Try again in a moment.'));
    }
  }

  return (
    <>
      <fieldset className="plans">
        <legend className="sr">{t('Abo', 'Plan')}</legend>
        {PLAN_IDS.map((id) => {
          const x = planIn(id, lang);
          return (
            <label key={id} className="plan">
              <input type="radio" name="plan" value={id} checked={plan === id} onChange={() => setPlan(id)} />
              <span className="rd" aria-hidden="true" />
              <b>{x.name}</b>
              <span className="pr">{x.price}<small> / {t('Monat', 'month')}</small></span>
              <span className="pd">{x.short}</span>
            </label>
          );
        })}
      </fieldset>
      {trial && (
        <ol className="trial-tl" aria-label={t('So läuft der Test', 'How the trial works')}>
          <li><b>{t('Heute', 'Today')}</b><span>{t(`Voller Zugang zu ${p.name}. Es wird nichts abgebucht.`, `Full access to ${p.name}. Nothing is charged.`)}</span></li>
          <li><b>{trialEnd || t(`In ${TRIAL_DAYS} Tagen`, `In ${TRIAL_DAYS} days`)}</b><span>{t(`Der Test endet. Ab dann ${p.price} im Monat, außer du kündigst vorher.`, `The trial ends. From then on ${p.price} a month, unless you cancel before.`)}</span></li>
        </ol>
      )}
      <label className="chk"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />{lang === 'en'
        ? <span>I accept the <a href={lp(lang, '/agb')} target="_blank">terms</a> and have read the <a href={lp(lang, '/datenschutz')} target="_blank">privacy policy</a>.</span>
        : <span>Ich akzeptiere die <a href="/agb" target="_blank">AGB</a> und habe die <a href="/datenschutz" target="_blank">Datenschutzerklärung</a> gelesen.</span>}</label>
      <label className="chk"><input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} /><span>{t('Ich verlange ausdrücklich, dass Blotter sofort mit der Leistung beginnt, und nehme zur Kenntnis, dass ich dadurch mein Rücktrittsrecht verliere.', 'I expressly ask Blotter to start the service right away and acknowledge that I thereby lose my right of withdrawal.')}</span></label>
      {err && <div className="msg err" role="alert">{err}</div>}
      <button type="button" className="btn primary block" onClick={go} disabled={busy}>{busy ? (trial ? t('Test wird vorbereitet…', 'Preparing your trial…') : t('Zahlungsseite wird geöffnet…', 'Opening the payment page…')) : trial ? t(`${TRIAL_DAYS} Tage kostenlos testen`, `Try ${TRIAL_DAYS} days free`) : t(`Weiter zur Zahlung · ${p.price} / Monat`, `Continue to payment · ${p.price} / month`)}</button>
      <p className="muted" style={{ fontSize: 13 }}>{trial
        ? t('Stripe fragt deine Zahlungsmethode ab, abgebucht wird erst nach dem Test. Du bekommst eine E-Mail mit dem genauen Enddatum. Monatlich kündbar, keine Mindestlaufzeit.', 'Stripe asks for your payment method, but nothing is charged until the trial ends. You get an e-mail with the exact end date. Cancel monthly, no minimum term.')
        : t('Die Zahlung läuft sicher über Stripe. Monatlich kündbar, keine Mindestlaufzeit. Du kannst jederzeit zwischen den Abos wechseln.', 'Payment runs securely through Stripe. Cancel monthly, no minimum term. You can switch between plans at any time.')}</p>
    </>
  );
}
