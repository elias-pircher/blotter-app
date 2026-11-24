'use client';
import { useEffect, useRef, useState } from 'react';
import { euro } from '@/lib/plans';

const date = (iso) => { try { return new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' }); } catch (e) { return ''; } };

const ERR = {
  past_due: 'Es ist noch eine Zahlung offen. Begleiche sie zuerst unter „Abo verwalten“, dann kannst du wechseln.',
  same_plan: 'Du hast dieses Abo bereits. Lade die Seite neu.',
  not_logged_in: 'Du bist nicht mehr angemeldet. Lade die Seite neu und melde dich an.',
};
const errText = (code) => ERR[code] || 'Der Wechsel ist gerade nicht möglich. Versuch es in einem Moment erneut.';

// One of the other plans, what switching to it costs, and the button that does it.
// gain / lose: what the switch adds or takes away, e.g. "das Backtesting und die Prop-Konten"
export default function PlanSwitch({ to, toName, toPrice, toShort, upgrade, gain = '', lose = '', quiet, focus, blocked }) {
  const [pv, setPv] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (blocked) return;
    let off = false;
    fetch('/api/plan?to=' + to, { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (off) return; if (ok) setPv(j); else setErr(errText(j.error)); })
      .catch(() => { if (!off) setErr(errText()); });
    return () => { off = true; };
  }, [to, blocked]);

  useEffect(() => { if (focus && box.current) box.current.scrollIntoView({ block: 'center' }); }, [focus]);

  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, prorationDate: pv && pv.prorationDate }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.status === 'ok') { window.location.href = '/abo?gewechselt=1'; return; }
      if (r.ok && j.status === 'pay') {
        if (j.url) { window.location.href = j.url; return; }
        throw { code: 'pay' };
      }
      throw { code: j.error };
    } catch (e) {
      setBusy(false);
      setErr(e && e.code === 'pay' ? 'Die Zahlung braucht noch deine Bestätigung. Öffne „Abo verwalten“, um sie abzuschließen.' : errText(e && e.code));
    }
  }

  const when = pv && pv.next ? date(pv.next) : '';
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // "die Prop-Konten" and two features take the plural
  const verb = (t) => (/ und |Prop-Konten/.test(t) ? 'sind' : 'ist');
  const gainTxt = gain ? ` ${cap(gain)} ${verb(gain)} sofort freigeschaltet.` : '';
  const loseTxt = lose ? ` ${cap(lose)} ${verb(lose)} dann nicht mehr verfügbar, deine Daten bleiben aber gespeichert.` : '';
  return (
    <section ref={box} className={'switch' + (focus ? ' focus' : '')} aria-labelledby={'sw-h-' + to}>
      <div className="sw-top">
        <h2 id={'sw-h-' + to}>Wechseln zu {toName}</h2>
        <span className="pr">{toPrice}<small> / Monat</small></span>
      </div>
      <p className="sw-d">{toShort}</p>
      {!blocked && !pv && !err && <p className="sw-note muted" aria-live="polite"><span className="dot pulse" />Kosten werden berechnet…</p>}
      {pv && (
        <p className="sw-note">
          {pv.trial
            ? <>Du testest gerade kostenlos, deshalb kostet der Wechsel nichts. Dein Test läuft{when ? ` bis ${when}` : ''} weiter, danach {euro(pv.monthly)} im Monat.{upgrade ? gainTxt : loseTxt}</>
            : upgrade
            ? <>Heute zahlst du <b>{euro(pv.now)}</b> für die restlichen Tage{when ? ` bis ${when}` : ''}, danach {euro(pv.monthly)} im Monat.{gainTxt}</>
            : <>Ab sofort {euro(pv.monthly)} im Monat.{loseTxt} {pv.credit > 0 ? <>Für die restlichen Tage bekommst du <b>{euro(pv.credit)}</b> gutgeschrieben{when ? `, die wir von deiner nächsten Rechnung am ${when} abziehen` : ''}.</> : null}</>}
          {pv.canceling ? ' Dein Abo bleibt gekündigt und endet wie geplant.' : ''}
        </p>
      )}
      {err && <div className="msg err" role="alert">{err}</div>}
      {!blocked && (
        <button type="button" className={'btn block' + (upgrade && !quiet ? ' primary' : '')} onClick={go} disabled={busy || !pv}>
          {busy ? 'Wird gewechselt…' : pv && pv.trial ? `Zu ${toName} wechseln` : upgrade ? `Jetzt wechseln · ${pv ? euro(pv.now) : '…'} heute` : `Zu ${toName} wechseln`}
        </button>
      )}
    </section>
  );
}
