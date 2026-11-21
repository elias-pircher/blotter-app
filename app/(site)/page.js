import { createClient } from '@/lib/supabase/server';
import { Nav, Footer } from './chrome';
import { Scenes, Replay } from './motion';

export const dynamic = 'force-dynamic';

// the small candles before the breakout: [open, close, high, low] in % of the chart height (0 = top)
const HIST = [[71, 75, 69, 78], [75, 72, 70, 77], [72, 74, 68.5, 76], [74, 70, 68, 75.5], [70, 73, 67.5, 74.5], [73, 76, 71, 79], [76, 72.5, 71, 77.5], [72.5, 74, 70, 75.5]];

function Trade() {
  return (
    <div className="trade" aria-hidden="true">
      <div className="lv tp"><i /><b>TP</b></div>
      <div className="lv en"><i /><b>Entry</b></div>
      <div className="lv sl"><i /><b>SL</b></div>
      <div className="hist">
        {HIST.map(([o, c, h, l], i) => (
          <span key={i} className={c < o ? 'up' : 'dn'} style={{ '--h': h + '%', '--l': l + '%', '--t': Math.min(o, c) + '%', '--b': Math.max(o, c) + '%', '--i': i }}><u /><s /></span>
        ))}
      </div>
      <div className="stage3">
        <div className="rig">
          <div className="grow">
            <div className="wick hi"><i /><i /></div>
            <div className="body"><i className="f4" /><i className="f3" /><i className="f2" /><i className="f1" /><i className="f6" /></div>
            <div className="wick lo"><i /><i /></div>
          </div>
        </div>
      </div>
      <span className="ring" /><span className="ring two" />
      <b className="r">+4R</b>
    </div>
  );
}

/* ---- the sentence that lights up word by word */
const SAY = [
  'Blotter', 'fragt', 'nicht,', 'wie', 'viel', 'du', 'verdient', 'hast.', 'Sondern,', 'ob', 'du', 'deinem', 'System', 'gefolgt', 'bist.',
  'Jeder', 'Trade', 'endet', 'auf', 'eine', 'von', 'drei', 'Arten:', ['Take', 'tp'], ['Profit,', 'tp'], ['Break', 'be'], ['Even', 'be'], 'oder', ['Stop', 'sl'], ['Loss.', 'sl'],
];

/* ---- the month that fills itself: November 2026, the trades of each trading day */
const MONTH = {
  2: [['TP', 'NQ'], ['SL', 'DAX']], 3: [['TP', 'NQ']], 4: [['BE', 'GOLD'], ['TP', 'ES']], 6: [['TP', 'DAX'], ['TP', 'NQ']],
  9: [['SL', 'ES']], 10: [['TP', 'NQ']], 11: [['TP', 'EURUSD'], ['BE', 'NQ']], 12: [['SL', 'DAX'], ['TP', 'DAX']], 13: [['TP', 'NQ'], ['TP', 'GOLD']],
  17: [['TP', 'ES']], 18: [['SL', 'NQ']], 19: [['TP', 'DAX'], ['TP', 'NQ']], 20: [['BE', 'GOLD']],
  23: [['TP', 'NQ']], 24: [['TP', 'ES'], ['SL', 'DAX']], 25: [['TP', 'NQ']], 27: [['TP', 'DAX']], 30: [['TP', 'NQ'], ['BE', 'ES']],
};
function monthCells() {
  // weeks start on Monday; 1 November 2026 is a Sunday
  const cells = [];
  let k = 0;
  for (let d = -5; d <= 37; d++) {
    const date = new Date(Date.UTC(2026, 10, d));
    const inMonth = date.getUTCMonth() === 10, wd = (date.getUTCDay() + 6) % 7;
    const trading = inMonth && wd < 5;
    cells.push({ n: date.getUTCDate(), inMonth, weekend: wd >= 5, trades: trading ? (MONTH[date.getUTCDate()] || []) : null, k: trading ? k++ : null });
    if (cells.length === 42) break;
  }
  return cells;
}

/* ---- the phone that stays while its screen changes */
const STEPS = [
  ['phone-start', 'Die Startseite von Blotter mit Win-Rate, Trade-Tape und Serie', 'Deine Bilanz, ehrlich.', 'Win-Rate, Trade-Tape und deine aktuelle Serie zeigen sofort, wie konsequent du gerade tradest.'],
  ['phone-day', 'Ein Handelstag mit zwei Trades und Chart-Screenshots', 'Der Chart gehört zum Trade.', 'Konto, Instrument, Richtung, Ergebnis: in Sekunden eingetragen. Den Screenshot fügst du direkt aus der Zwischenablage ein.'],
  ['phone-learnings', 'Learnings als Timeline', 'Fehler kosten nur einmal Geld.', 'Halte fest, was du gelernt hast, als Timeline mit Kategorien und Suche. Was aufgeschrieben ist, passiert seltener ein zweites Mal.'],
  ['phone-outlooks', 'Outlooks mit HTF- und LTF-Bias', 'Erst der Plan, dann der Trade.', 'Notiere vor der Session deinen Bias und die Levels, die zählen. Danach markierst du, ob es eingetreten ist.'],
];

const BT_POINTS = [
  ['Sechs Märkte', 'Nasdaq 100, S&P 500, DAX 40, Gold, EUR/USD und GBP/USD.'],
  ['Deine eigenen Kursdaten', 'Du lädst 1-Minuten-Daten einmal kostenlos herunter und importierst sie. Die Anleitung ist dabei.'],
  ['Statistik pro Session', 'Win-Rate, Summe in R, Profit Factor, Drawdown und Equity-Kurve.'],
];

// the two plans: the journal, and the journal with backtesting on top
const TIERS = [
  {
    id: 'journal', name: 'Journal', amt: '7,99 €',
    lead: 'Alles, um deine Live-Trades festzuhalten und auszuwerten.',
    list: [
      'Unbegrenzt Trades, Learnings und Outlooks',
      'Kalender mit Win-Rate und Wochenbilanz',
      'Screenshots zu jedem Eintrag',
      'Bis zu 10 Konten, gefiltert mit einem Klick',
      'Laptop, Tablet und Handy, immer synchron',
      '12 Farbschemen, dunkel oder hell',
    ],
  },
  {
    id: 'backtest', name: 'Journal + Backtesting', amt: '14,99 €',
    lead: 'Alles aus dem Journal, dazu der Markt zum Nachspielen.',
    list: [
      'Das komplette Journal',
      'Backtesting Kerze für Kerze, von 1 Minute bis Monthly',
      'Sechs Märkte mit deinen eigenen Kursdaten',
      'Entry, Stop und Ziel, jeder Trade in R',
      'Statistik und Equity-Kurve pro Session',
    ],
  },
];

const FAQ = [
  ['Wer sieht meine Trades?', 'Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.'],
  ['Geht es um meinen Kontostand?', 'Nein. Blotter hält fest, ob ein Trade im Take Profit, im Stop Loss oder auf Break Even endete. So misst du, wie gut du deinem System folgst, und nicht deine Tagesform.'],
  ['Woher kommen die Kursdaten fürs Backtesting?', 'Du lädst 1-Minuten-Daten einmal selbst herunter, zum Beispiel kostenlos bei HistData, und importierst sie in Blotter. Eine Schritt-für-Schritt-Anleitung steht direkt auf der Backtesting-Seite. Danach liegen die Daten privat in deinem Konto.'],
  ['Brauche ich eine App?', 'Nein. Blotter läuft im Browser auf Mac, Windows, iPhone und Android. Deine Einträge sind auf allen Geräten gleich.'],
  ['Welches Abo passt zu mir?', 'Wenn du deine Live-Trades festhalten und auswerten willst, reicht das Journal. Willst du dein Setup vorher auf vergangenen Kursen testen, nimm Journal + Backtesting. Alles andere ist in beiden Abos gleich.'],
  ['Kann ich später wechseln?', 'Ja, jederzeit unter Einstellungen im Journal. Beim Wechsel zu Journal + Backtesting zahlst du nur die Differenz für die restlichen Tage des Monats. Wechselst du zurück, wird der nicht genutzte Teil mit deiner nächsten Rechnung verrechnet, und deine Backtests bleiben gespeichert.'],
  ['Wie kündige ich?', 'Im Journal unter Einstellungen → „Abo verwalten oder kündigen“. Das Abo läuft dann bis zum Ende des bezahlten Monats.'],
];

export default async function Home() {
  let loggedIn = false;
  try { const { data } = await createClient().auth.getUser(); loggedIn = !!data.user; } catch {}
  const start = loggedIn ? '/app' : '/login?next=/abo';
  const choose = (plan) => (loggedIn ? '/abo?plan=' + plan : '/login?next=' + encodeURIComponent('/abo?plan=' + plan));
  const cells = monthCells();
  const days = cells.filter((c) => c.k != null).length;
  return (
    <>
      <Nav loggedIn={loggedIn} />
      <main className="lp">
        {/* 1 · the claim, the trade runs into its target once */}
        <section className="s-hero" data-scene="hero">
          <div className="wrap hero">
            <div className="hero-txt">
              <h1><span>Miss deine Disziplin.</span> <span>Nicht deinen Kontostand.</span></h1>
              <p className="lead">Blotter ist das Trading Journal, das festhält, wie jeder Trade endet: Take Profit, Break Even oder Stop Loss. Mit Kalender, Screenshots, Learnings, Outlooks und Backtesting.</p>
              <div className="cta">
                <a className="btn primary" href={start}>{loggedIn ? 'Zum Journal' : 'Ab 7,99 € im Monat starten'}</a>
                <a className="btn quiet" href="#journal">Ansehen</a>
              </div>
              <p className="fine">Monatlich kündbar. Keine Mindestlaufzeit.</p>
            </div>
            <Trade />
          </div>
        </section>

        {/* 2 · the journal rises and straightens up */}
        <section className="s-shot" data-scene="shot" id="journal">
          <div className="track">
            <div className="stage">
              <figure className="shot-fig">
                <picture>
                  <source media="(max-width: 700px)" srcSet="/landing/phone-calendar.webp" width="780" height="1328" />
                  <img src="/landing/journal-desktop.webp" width="2400" height="1500" alt="Das Journal: Kalender mit Bilanz, Win-Rate und den Trades des Monats" fetchPriority="high" />
                </picture>
              </figure>
            </div>
          </div>
        </section>

        {/* 3 · one sentence, word by word */}
        <section className="s-words" data-scene="words" style={{ '--n': SAY.length }}>
          <div className="track">
            <div className="stage">
              <p className="wrap say">
                {SAY.map((w, i) => {
                  const [t, c] = Array.isArray(w) ? w : [w, ''];
                  return <span key={i} className={'w ' + c} style={{ '--i': i }}>{t} </span>;
                })}
              </p>
            </div>
          </div>
        </section>

        {/* 4 · the month fills itself, the numbers follow */}
        <section className="s-cal" data-scene="cal" id="funktionen">
          <div className="track">
            <div className="stage">
              <div className="wrap cal-in">
                <div className="cal-txt">
                  <h2>Der Monat auf einen Blick.</h2>
                  <p>Jeder Tag zeigt, wie deine Trades endeten. Darüber deine Win-Rate, darunter die Bilanz jeder Woche.</p>
                  <div className="cal-nums" aria-hidden="true">
                    <svg className="dial" viewBox="0 0 120 120"><circle className="d0" cx="60" cy="60" r="52" /><circle className="d1" cx="60" cy="60" r="52" pathLength="100" /></svg>
                    <div className="dial-v"><b data-v="wr">0</b><small>Win-Rate</small></div>
                    <dl>
                      <div><dt>Trades</dt><dd data-v="n">0</dd></div>
                      <div className="tp"><dt>Take Profit</dt><dd data-v="tp">0</dd></div>
                      <div className="be"><dt>Break Even</dt><dd data-v="be">0</dd></div>
                      <div className="sl"><dt>Stop Loss</dt><dd data-v="sl">0</dd></div>
                    </dl>
                  </div>
                </div>
                <div className="cal" aria-label="Beispielmonat November 2026 mit den Ergebnissen jedes Handelstags" role="img" data-days={days}>
                  <div className="cal-h"><b>November 2026</b></div>
                  <div className="cal-g">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => <span key={d} className="cw">{d}</span>)}
                    {cells.map((c, i) => (
                      <div key={i} className={'cd' + (c.inMonth ? '' : ' out') + (c.weekend ? ' we' : '')} data-k={c.k ?? undefined}
                        data-tp={c.trades ? c.trades.filter((t) => t[0] === 'TP').length : undefined}
                        data-be={c.trades ? c.trades.filter((t) => t[0] === 'BE').length : undefined}
                        data-sl={c.trades ? c.trades.filter((t) => t[0] === 'SL').length : undefined}>
                        <span className="cn">{c.n}</span>
                        {c.trades && c.trades.length > 0 && <span className="ct">{c.trades.map(([r, m], j) => <i key={j} className={r.toLowerCase()}>{r} {m}</i>)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 · the phone stays, its screen changes */}
        <section className="s-steps" data-scene="steps">
          <div className="track">
            <div className="stage">
              <div className="wrap steps-in">
                <ol className="steps">
                  {STEPS.map(([img, alt, h, p], i) => <li key={img} className={i === 0 ? 'on' : ''}><h3>{h}</h3><p>{p}</p></li>)}
                </ol>
                <figure className="phone2">
                  <div className="ph-in">
                    {STEPS.map(([img, alt], i) => <img key={img} className={i === 0 ? 'on' : ''} src={`/landing/${img}.webp`} width="780" height="1328" alt={alt} loading={i ? 'lazy' : 'eager'} decoding="async" />)}
                  </div>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* 6 · backtesting: the replay runs with the scroll */}
        <section className="bts" id="backtesting">
          <div className="wrap bts-head">
            <h2 data-reveal>Teste dein Setup, bevor es Geld kostet.</h2>
            <p data-reveal style={{ '--d': '.08s' }}>Mit dem Backtesting spielst du den Markt Kerze für Kerze nach. Du setzt Entry, Stop und Ziel, und Blotter rechnet jeden Trade in R. So siehst du schwarz auf weiß, ob dein Setup trägt, bevor echtes Geld im Spiel ist.</p>
          </div>
          <Replay />
          <div className="wrap">
            <ul className="pts">
              {BT_POINTS.map(([h, p], i) => <li key={h} data-reveal style={{ '--d': i * 0.08 + 's' }}><b>{h}</b><span>{p}</span></li>)}
            </ul>
            <div className="bts-cta" data-reveal>
              <p>Backtesting ist im Abo <b>Journal + Backtesting</b> enthalten, für 14,99 € im Monat.</p>
              <a className="btn quiet" href={choose('backtest')}>Mit Backtesting starten</a>
            </div>
          </div>
        </section>

        {/* 7 · price */}
        <section className="wrap s-price" id="preis">
          <div className="price-h">
            <h2 data-reveal>Journal allein oder mit Backtesting.</h2>
            <p data-reveal style={{ '--d': '.06s' }}>Beide Abos sind monatlich kündbar. Du kannst jederzeit wechseln, abgerechnet wird tagesgenau.</p>
          </div>
          <div className="tiers">
            {TIERS.map((t, k) => (
              <article key={t.id} className={'tier' + (t.id === 'backtest' ? ' plus' : '')} data-reveal style={{ '--d': k * 0.1 + 's' }} aria-labelledby={'tier-' + t.id}>
                <h3 id={'tier-' + t.id}>{t.name}</h3>
                <p className="amt"><b>{t.amt}</b><span>im Monat</span></p>
                <p className="tl">{t.lead}</p>
                <a className={'btn ' + (t.id === 'backtest' ? 'primary' : 'quiet')} href={choose(t.id)}>{t.id === 'backtest' ? 'Mit Backtesting starten' : 'Mit dem Journal starten'}</a>
                <ul className="incl">
                  {t.list.map((x, i) => <li key={x} data-reveal style={{ '--d': k * 0.1 + 0.15 + i * 0.04 + 's' }}>{x}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <p className="fine price-f" data-reveal>Endpreise. Keine Mindestlaufzeit, keine Werbung, und deine Daten sieht nur du.</p>
        </section>

        {/* 8 · questions */}
        <section className="wrap faq-sec" id="fragen">
          <h2 data-reveal>Gut zu wissen</h2>
          <div className="faq" data-reveal style={{ '--d': '.08s' }}>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        {/* 9 · the closing line pulls itself together */}
        <section className="s-close" data-scene="close">
          <p className="mantra"><span>Halte dich an</span> <span>das System.</span></p>
          <a className="btn primary" data-reveal href={start}>{loggedIn ? 'Zum Journal' : 'Blotter starten'}</a>
        </section>
      </main>
      <Footer />
      <Scenes />
    </>
  );
}
