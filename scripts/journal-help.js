/* ---------- help & support (added for the web app by scripts/extract-journal.py) ---------- */
// Answers to the common questions, searchable and by topic, and a support request that goes out by e-mail.
const HELP_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
const HELP_CATS = [
  ['start', 'Erste Schritte'],
  ['set', 'Einstellungen'],
  ['pages', 'Learnings & Outlooks'],
  ['bt', 'Backtesting'],
  ['abo', 'Abo & Zahlung'],
  ['data', 'Daten & Sicherheit'],
];
const HELP_FAQ = [
  ['start', 'Wie trage ich einen Trade ein?', 'Tippe im Kalender auf „Trade eintragen“ oder wähle einen Tag und trag ihn dort ein. Nötig sind nur Konto, Datum und Ergebnis. Instrument, Uhrzeit, Setup, Notizen und Screenshots ergänzt du, wenn du willst. Am Computer öffnet die Taste N das Formular.'],
  ['start', 'Was bedeuten TP, BE und SL?', 'Take Profit: Der Trade hat sein Ziel erreicht. Break Even: Du hast den Stop auf den Einstieg gezogen und ohne Verlust geschlossen. Stop Loss: Der Stop wurde getroffen. Die Win-Rate rechnet TP ÷ (TP + SL), Break Evens zählen also nicht gegen dich.'],
  ['start', 'Wie füge ich Screenshots hinzu?', 'Am Computer ziehst du Bilder ins Formular oder fügst sie mit ' + (HELP_MAC ? '⌘V' : 'Strg+V') + ' ein. Am Handy wählst du sie aus deinen Fotos. Möglich sind PNG, JPG, GIF und WebP bis 20 MB pro Bild.'],
  ['start', 'Gibt es Tastenkürzel?', 'Ja, am Computer: N trägt etwas Neues ein, ← und → wechseln den Monat, T springt zu heute, die Zahlen öffnen deine Seiten in ihrer Reihenfolge und ? öffnet diese Hilfe.'],
  ['start', 'Kann ich die Einführung noch einmal sehen?', 'Ja. In den Einstellungen startest du unter „Hilfe“ die Tour neu. Sie zeigt dir in einer Minute alle Bereiche.'],
  ['set', 'Wie lege ich weitere Konten an?', 'In den Einstellungen unter „Konten“ mit „Konto hinzufügen“, bis zu 10 Stück, jedes mit eigenem Namen und eigener Farbe. Im Kalender filterst du dann nach einem Konto.'],
  ['set', 'Kann ich Seiten ausblenden?', 'Ja. Unter Einstellungen → „Seiten“ schaltest du Learnings, Outlooks und Backtesting ein oder aus. Was du dort schon eingetragen hast, bleibt gespeichert.'],
  ['set', 'Wie ändere ich Farben und meinen Namen?', 'In den Einstellungen wählst du eines von 12 Farbschemen, dunkel oder hell, und änderst den Namen, mit dem Blotter dich begrüßt.'],
  ['pages', 'Wofür sind Outlooks?', 'Du planst vor der Session: HTF und LTF jeweils bullish oder bearish, dazu dein Szenario. Danach markierst du, ob es eingetreten ist, und siehst deine Trefferquote.'],
  ['pages', 'Wie finde ich alte Learnings wieder?', 'Über die Suche oben auf der Seite Learnings oder über die Kategorien darunter. Die Kategorie vergibst du beim Eintragen.'],
  ['bt', 'Warum ist das Backtesting bei mir gesperrt?', 'Das Backtesting gehört zum Abo „Journal + Backtesting“ für 14,99 € im Monat. In den Einstellungen wechselst du mit „Backtesting dazunehmen“, danach ist es sofort frei. Im kostenlosen Test kostet der Wechsel nichts.'],
  ['bt', 'Woher bekomme ich Kursdaten?', 'Du lädst 1-Minuten-Daten einmal selbst herunter, zum Beispiel kostenlos bei HistData, und importierst sie auf der Backtesting-Seite. Dort steht eine Schritt-für-Schritt-Anleitung. Exporte aus MetaTrader und von Dukascopy gehen auch. Es gibt Nasdaq 100, S&P 500, DAX 40, Gold, EUR/USD und GBP/USD.'],
  ['bt', 'Kann ich im Backtesting-Chart zeichnen?', 'Ja. Links neben dem Chart findest du die Werkzeuge: Trendlinien, horizontale und vertikale Linien, Kanäle, Fibonacci, Rechtecke, Text, Pfeile, Long- und Short-Position und mehr. Ein Klick auf eine Zeichnung zeigt oben Farbe, Stärke und Stil. Die Zeichnungen gehören zur Session und bleiben auf jedem Zeitrahmen an ihrer Stelle. Mit ' + (HELP_MAC ? '⌘Z' : 'Strg+Z') + ' machst du einen Schritt rückgängig.'],
  ['bt', 'Wie ändere ich Kerzenfarben und Hintergrund?', 'Über das Zahnrad oben rechts im Backtesting öffnest du die Chart-Einstellungen: Chart-Typ (auch Heikin Ashi, Balken, Linie), Farben für Körper, Rahmen und Docht, Hintergrund, Gitter, Fadenkreuz und Preisskala. Die Einstellungen gelten für alle deine Sessions.'],
  ['abo', 'Wie funktioniert der kostenlose Test?', 'Neue Kunden testen 3 Tage kostenlos. Die Zahlungsmethode hinterlegst du bei Stripe, abgebucht wird erst, wenn der Test endet. Kündigst du vorher, zahlst du nichts. Den Test gibt es einmal pro Konto.'],
  ['abo', 'Wie wechsle ich mein Abo?', 'In den Einstellungen unter „Konto & Abo“. Beim Wechsel zu Journal + Backtesting zahlst du nur die Differenz für die restlichen Tage des Monats. Wechselst du zurück, wird der nicht genutzte Teil mit der nächsten Rechnung verrechnet. Deine Backtests bleiben gespeichert.'],
  ['abo', 'Wie kündige ich, und wo finde ich meine Rechnungen?', 'In den Einstellungen öffnet „Abo verwalten oder kündigen“ das Kundenportal von Stripe. Dort kündigst du, änderst deine Zahlungsmethode und lädst deine Rechnungen herunter. Nach der Kündigung läuft das Abo bis zum Ende des bezahlten Monats.'],
  ['data', 'Wer sieht meine Einträge?', 'Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.'],
  ['data', 'Was bedeutet der Punkt oben rechts?', 'Grün heißt: Alles ist in deinem Konto gespeichert und auf all deinen Geräten gleich. Steht dort „Nur dieser Browser“, ist die Verbindung gerade unterbrochen, und neue Einträge liegen vorerst nur in diesem Browser. Lade die Seite neu, sobald du wieder online bist. Bleibt die Meldung, schreib uns.'],
  ['data', 'Wie melde ich mich an?', 'Mit deiner E-Mail-Adresse. Du bekommst einen Code per E-Mail, ein Passwort gibt es nicht. Es gilt immer nur der Code aus der neuesten E-Mail.'],
  ['data', 'Kann ich mein Konto löschen?', 'Ja. Schreib uns unten mit dem Thema „Konto & Daten“. Wir löschen dein Konto mit allen Einträgen und Screenshots und bestätigen es dir per E-Mail. Ein laufendes Abo kündigst du vorher im Kundenportal.'],
];
const HELP_TOPICS = [
  ['nutzung', 'Frage zur Nutzung', 'Wobei können wir dir helfen?'],
  ['fehler', 'Fehler melden', 'Was hast du gemacht, was ist passiert, und was hättest du erwartet?'],
  ['abo', 'Abo & Zahlung', 'Worum geht es bei deinem Abo oder deiner Zahlung?'],
  ['konto', 'Konto & Daten', 'Was sollen wir an deinem Konto oder deinen Daten tun?'],
  ['idee', 'Idee oder Wunsch', 'Was fehlt dir in Blotter?'],
  ['sonstiges', 'Sonstiges', 'Was möchtest du uns sagen?'],
];
const HelpState = {q: '', cat: '', topic: 'nutzung', subject: '', message: '', meta: true, sent: null};
const helpCatName = k => (HELP_CATS.find(c => c[0] === k) || ['', ''])[1];
const helpTopic = k => HELP_TOPICS.find(t => t[0] === k) || HELP_TOPICS[0];
const HELP_ICON = {
  q: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2h.01"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>',
  ok: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

function helpFormHtml(){
  const H = HelpState, t = helpTopic(H.topic);
  const mail = window.BlotterBackend ? window.BlotterBackend.email : '';
  if (H.sent) return `
    <div class="sup-done" role="status">
      <span class="sup-ok">${HELP_ICON.ok}</span>
      <h2>Danke, deine Anfrage ist angekommen.</h2>
      <p>Deine Ticketnummer ist <b>#${esc(H.sent.id)}</b>. ${H.sent.confirm ? 'Eine Bestätigung ist an <b>' + esc(mail) + '</b> unterwegs. ' : ''}Wir antworten dir per E-Mail.</p>
      <button type="button" class="btn" data-help="again">Weitere Anfrage schreiben</button>
    </div>`;
  return `
    <form class="sup-form" id="tk-form" novalidate>
      <div class="sup-head"><span class="sup-ic">${HELP_ICON.mail}</span><div><h2 id="tk-h">Support-Anfrage</h2><p>Deine Frage ist nicht dabei? Schreib uns. Wir antworten per E-Mail${mail ? ' an <b>' + esc(mail) + '</b>' : ''}.</p></div></div>
      <div class="fld"><span class="lbl" id="tk-topic-l">Thema</span>
        <div class="chips sup-topics" role="radiogroup" aria-labelledby="tk-topic-l">${HELP_TOPICS.map(([k, n]) => `<button type="button" class="chip" role="radio" data-topic="${k}" aria-checked="${H.topic === k}">${esc(n)}</button>`).join('')}</div></div>
      <label class="fld" for="tk-subject"><span class="lbl">Betreff</span><input class="inp" id="tk-subject" type="text" maxlength="140" autocomplete="off" placeholder="Worum geht es in einem Satz?" value="${esc(H.subject)}"></label>
      <label class="fld" for="tk-message"><span class="lbl">Nachricht</span><textarea class="inp" id="tk-message" rows="6" maxlength="5000" placeholder="${esc(t[2])}">${esc(H.message)}</textarea></label>
      <label class="sup-meta"><input type="checkbox" id="tk-meta"${H.meta ? ' checked' : ''}><span>Technische Angaben mitsenden (Browser, Bildschirmgröße, Seite). Das hilft uns bei Fehlern.</span></label>
      <p class="form-err" id="tk-err" role="alert" hidden></p>
      <div class="sup-foot"><button type="submit" class="btn primary" id="tk-send">${HELP_ICON.mail}Anfrage senden</button></div>
    </form>`;
}

function helpFaqHtml(){
  const H = HelpState, q = H.q.trim().toLowerCase();
  const hits = HELP_FAQ.filter(([c, qu, a]) => (!H.cat || c === H.cat) && (!q || (qu + ' ' + a + ' ' + helpCatName(c)).toLowerCase().includes(q)));
  if (!hits.length) return `<div class="empty sm"><p>Dazu haben wir noch keine Antwort. Schreib uns, wir helfen dir direkt weiter.</p><button type="button" class="btn" data-help="to-form">Anfrage schreiben</button></div>`;
  return HELP_CATS.filter(([k]) => hits.some(h => h[0] === k)).map(([k, name]) => `
    <section class="hf-group" aria-label="${esc(name)}">
      <h3 class="sec">${esc(name)}</h3>
      ${hits.filter(h => h[0] === k).map(([, qu, a]) => `<details class="hf-qa"${q ? ' open' : ''}><summary>${esc(qu)}<span class="hf-chev" aria-hidden="true">${ICON.next}</span></summary><p>${esc(a)}</p></details>`).join('')}
    </section>`).join('');
}

function helpSync(root){
  const H = HelpState;
  const s = $('#tk-subject', root), m = $('#tk-message', root), c = $('#tk-meta', root);
  if (s) H.subject = s.value;
  if (m) H.message = m.value;
  if (c) H.meta = c.checked;
}

async function helpSend(root){
  const H = HelpState;
  helpSync(root);
  const err = $('#tk-err', root), btn = $('#tk-send', root);
  const fail = (t, focus) => { err.textContent = t; err.hidden = false; if (focus) focus.focus(); };
  err.hidden = true;
  if (H.subject.trim().length < 3) return fail('Gib einen Betreff mit mindestens 3 Zeichen ein.', $('#tk-subject', root));
  if (H.message.trim().length < 10) return fail('Beschreib dein Anliegen in mindestens 10 Zeichen.', $('#tk-message', root));
  if (!window.BlotterBackend || !window.BlotterBackend.support) return fail('Anfragen gehen nur, wenn du angemeldet bist. Lade die Seite neu.');
  const meta = H.meta ? {
    browser: navigator.userAgent,
    screen: screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1),
    window: innerWidth + '×' + innerHeight,
    page: S.view,
    scheme: S.settings && S.settings.theme || '',
    sync: S.mode || '',
    lang: navigator.language || '',
  } : null;
  btn.disabled = true; btn.classList.add('busy');
  try {
    const r = await window.BlotterBackend.support({topic: H.topic, subject: H.subject.trim(), message: H.message.trim(), meta});
    H.sent = {id: r.id, confirm: r.confirm !== false};
    H.subject = ''; H.message = '';
    const box = $('#tk-box', root);
    box.innerHTML = helpFormHtml();
    const b = $('[data-help="again"]', box); if (b) b.focus({preventScroll: true});
    box.scrollIntoView({block: 'nearest', behavior: reduce ? 'auto' : 'smooth'});
  } catch (e) {
    btn.disabled = false; btn.classList.remove('busy');
    const c = e && e.code;
    fail(c === 'too_many' ? 'Du hast in der letzten Stunde schon mehrere Anfragen geschickt. Wir melden uns, bitte warte auf unsere Antwort.'
      : c === 'not_logged_in' ? 'Du bist nicht mehr angemeldet. Lade die Seite neu und melde dich an.'
      : 'Die Anfrage konnte gerade nicht gesendet werden. Versuch es in einem Moment noch einmal.');
  }
}

Views.hilfe = {
  mount(el){
    const M = S.mountN, H = HelpState;
    el.innerHTML = `
    <section class="help" aria-label="Hilfe und Support">
      <div class="page-head" data-rv="${M}:ph">
        <div class="grow"><h1>Hilfe</h1><p>Antworten auf die häufigsten Fragen. Ist deine nicht dabei, schreib uns.</p></div>
        <button type="button" class="btn" data-help="to-form">${HELP_ICON.mail}Anfrage schreiben</button>
      </div>
      <div class="toolbar" data-rv="${M}:tb" style="--rd:120ms">
        <input type="search" class="search" id="h-search" placeholder="Fragen durchsuchen" aria-label="Fragen durchsuchen" value="${esc(H.q)}">
        <div class="chips" id="h-cats">${[['', 'Alle']].concat(HELP_CATS).map(([k, n]) => `<button type="button" class="chip" data-hcat="${k}" aria-pressed="${H.cat === k}">${esc(n)}</button>`).join('')}</div>
      </div>
      <div class="help-grid">
        <div class="hf-list" id="h-faq" data-rv="${M}:faq" style="--rd:180ms">${helpFaqHtml()}</div>
        <aside class="sup-card" id="tk-box" aria-labelledby="tk-h" data-rv="${M}:tk" style="--rd:240ms">${helpFormHtml()}</aside>
      </div>
    </section>`;
    const root = el.firstElementChild;
    root.addEventListener('input', e => {
      if (e.target.id === 'h-search') { H.q = e.target.value; $('#h-faq', root).innerHTML = helpFaqHtml(); }
      else helpSync(root);
    });
    root.addEventListener('change', e => { if (e.target.id === 'tk-meta') helpSync(root); });
    root.addEventListener('submit', e => { e.preventDefault(); helpSend(root); });
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-hcat],[data-topic],[data-help]');
      if (!t) return;
      if (t.dataset.hcat != null) {
        H.cat = t.dataset.hcat;
        $$('[data-hcat]', root).forEach(b => b.setAttribute('aria-pressed', String(b === t)));
        $('#h-faq', root).innerHTML = helpFaqHtml();
      } else if (t.dataset.topic) {
        helpSync(root);
        H.topic = t.dataset.topic;
        $$('[data-topic]', root).forEach(b => { const on = b === t; b.setAttribute('aria-checked', String(on)); });
        $('#tk-message', root).placeholder = helpTopic(H.topic)[2];
      } else if (t.dataset.help === 'to-form') {
        const box = $('#tk-box', root);
        box.scrollIntoView({block: 'start', behavior: reduce ? 'auto' : 'smooth'});
        const f = $('#tk-subject', box); if (f) setTimeout(() => f.focus({preventScroll: true}), reduce ? 0 : 420);
      } else if (t.dataset.help === 'again') {
        H.sent = null;
        $('#tk-box', root).innerHTML = helpFormHtml();
        $('#tk-subject', root).focus();
      }
    });
  },
  update(){}
};
