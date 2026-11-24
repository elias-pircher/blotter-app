'use client';
import { useEffect, useRef, useState } from 'react';
import { euro } from '@/lib/plans';
import { lp } from '@/lib/i18n';

const date = (iso, lang) => { try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-AT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' }); } catch (e) { return ''; } };

const ERR = {
  de: {
    past_due: 'Es ist noch eine Zahlung offen. Begleiche sie zuerst unter „Abo verwalten“, dann kannst du wechseln.',
    same_plan: 'Du hast dieses Abo bereits. Lade die Seite neu.',
    not_logged_in: 'Du bist nicht mehr angemeldet. Lade die Seite neu und melde dich an.',
    other: 'Der Wechsel ist gerade nicht möglich. Versuch es in einem Moment erneut.',
    pay: 'Die Zahlung braucht noch deine Bestätigung. Öffne „Abo verwalten“, um sie abzuschließen.',
  },
  en: {
    past_due: 'A payment is still open. Settle it under “Manage plan” first, then you can switch.',
    same_plan: 'You already have this plan. Reload the page.',
    not_logged_in: 'You are no longer logged in. Reload the page and log in.',
    other: 'Switching is not possible right now. Try again in a moment.',
    pay: 'The payment still needs your confirmation. Open “Manage plan” to complete it.',
  },
};
const errText = (code, lang) => { const E = ERR[lang === 'en' ? 'en' : 'de']; return (code && code !== 'other' && E[code]) || E.other; };

// One of the other plans, what switching to it costs, and the button that does it.
// gain / lose: what the switch adds or takes away, e.g. "das Backtesting und die Prop-Konten"
export default function PlanSwitch({ to, toName, toPrice, toShort, upgrade, gain = '', lose = '', quiet, focus, blocked, lang = 'de' }) {
  const en = lang === 'en';
  const [pv, setPv] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (blocked) return;
    let off = false;
    fetch('/api/plan?to=' + to, { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (off) return; if (ok) setPv(j); else setErr(errText(j.error, lang)); })
      .catch(() => { if (!off) setErr(errText(null, lang)); });
    return () => { off = true; };
  }, [to, blocked]);

  useEffect(() => { if (focus && box.current) box.current.scrollIntoView({ block: 'center' }); }, [focus]);

  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, prorationDate: pv && pv.prorationDate }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.status === 'ok') { window.location.href = lp(lang, '/abo') + '?gewechselt=1'; return; }
      if (r.ok && j.status === 'pay') {
        if (j.url) { window.location.href = j.url; return; }
        throw { code: 'pay' };
      }
      throw { code: j.error };
    } catch (e) {
      setBusy(false);
      setErr(errText(e && e.code, lang));
    }
  }

  const when = pv && pv.next ? date(pv.next, lang) : '';
  const eu = (c) => euro(c, lang);
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // "die Prop-Konten" / "prop accounts" and two features take the plural
  const verb = (t) => (en ? (/ and |prop accounts/.test(t) ? 'are' : 'is') : / und |Prop-Konten/.test(t) ? 'sind' : 'ist');
  const gainTxt = gain ? (en ? ` ${cap(gain)} ${verb(gain)} unlocked right away.` : ` ${cap(gain)} ${verb(gain)} sofort freigeschaltet.`) : '';
  const loseTxt = lose ? (en ? ` ${cap(lose)} ${verb(lose)} then no longer available, but your data stays saved.` : ` ${cap(lose)} ${verb(lose)} dann nicht mehr verfügbar, deine Daten bleiben aber gespeichert.`) : '';
  return (
    <section ref={box} className={'switch' + (focus ? ' focus' : '')} aria-labelledby={'sw-h-' + to}>
      <div className="sw-top">
        <h2 id={'sw-h-' + to}>{en ? 'Switch to' : 'Wechseln zu'} {toName}</h2>
        <span className="pr">{toPrice}<small> / {en ? 'month' : 'Monat'}</small></span>
      </div>
      <p className="sw-d">{toShort}</p>
      {!blocked && !pv && !err && <p className="sw-note muted" aria-live="polite"><span className="dot pulse" />{en ? 'Working out the cost…' : 'Kosten werden berechnet…'}</p>}
      {pv && (
        <p className="sw-note">
          {en
            ? (pv.trial
              ? <>You are on a free trial, so switching costs nothing. Your trial continues{when ? ` until ${when}` : ''}, then {eu(pv.monthly)} a month.{upgrade ? gainTxt : loseTxt}</>
              : upgrade
              ? <>Today you pay <b>{eu(pv.now)}</b> for the remaining days{when ? ` until ${when}` : ''}, then {eu(pv.monthly)} a month.{gainTxt}</>
              : <>From now on {eu(pv.monthly)} a month.{loseTxt} {pv.credit > 0 ? <>For the remaining days you get <b>{eu(pv.credit)}</b> credited{when ? `, which we take off your next invoice on ${when}` : ''}.</> : null}</>)
            : (pv.trial
              ? <>Du testest gerade kostenlos, deshalb kostet der Wechsel nichts. Dein Test läuft{when ? ` bis ${when}` : ''} weiter, danach {eu(pv.monthly)} im Monat.{upgrade ? gainTxt : loseTxt}</>
              : upgrade
              ? <>Heute zahlst du <b>{eu(pv.now)}</b> für die restlichen Tage{when ? ` bis ${when}` : ''}, danach {eu(pv.monthly)} im Monat.{gainTxt}</>
              : <>Ab sofort {eu(pv.monthly)} im Monat.{loseTxt} {pv.credit > 0 ? <>Für die restlichen Tage bekommst du <b>{eu(pv.credit)}</b> gutgeschrieben{when ? `, die wir von deiner nächsten Rechnung am ${when} abziehen` : ''}.</> : null}</>)}
          {pv.canceling ? (en ? ' Your plan stays cancelled and ends as planned.' : ' Dein Abo bleibt gekündigt und endet wie geplant.') : ''}
        </p>
      )}
      {err && <div className="msg err" role="alert">{err}</div>}
      {!blocked && (
        <button type="button" className={'btn block' + (upgrade && !quiet ? ' primary' : '')} onClick={go} disabled={busy || !pv}>
          {busy ? (en ? 'Switching…' : 'Wird gewechselt…') : pv && pv.trial ? (en ? `Switch to ${toName}` : `Zu ${toName} wechseln`) : upgrade ? (en ? `Switch now · ${pv ? eu(pv.now) : '…'} today` : `Jetzt wechseln · ${pv ? eu(pv.now) : '…'} heute`) : (en ? `Switch to ${toName}` : `Zu ${toName} wechseln`)}
        </button>
      )}
    </section>
  );
}
