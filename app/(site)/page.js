import { createClient } from '@/lib/supabase/server';
import { Nav, Footer } from './chrome';

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
      <div className="stage">
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

const ROWS = [
  ['phone-calendar', 'Kalender von Blotter auf dem Handy', 'Der Monat auf einen Blick.', 'Jeder Tag zeigt, ob deine Trades im Take Profit, auf Break Even oder im Stop Loss endeten. Dazu die Bilanz jeder Woche und deine Win-Rate auf dem Zifferblatt.'],
  ['phone-day', 'Ein Handelstag mit zwei Trades und Chart-Screenshots', 'Der Chart gehört zum Trade.', 'Ein Trade ist in Sekunden eingetragen: Konto, Instrument, Richtung, Ergebnis. Den Screenshot ziehst du hinein oder fügst ihn direkt aus der Zwischenablage ein.'],
  ['phone-learnings', 'Learnings als Timeline', 'Fehler kosten nur einmal Geld.', 'Halte fest, was du gelernt hast, als Timeline mit Kategorien und Suche. Was aufgeschrieben ist, passiert seltener ein zweites Mal.'],
  ['phone-outlooks', 'Outlooks mit HTF- und LTF-Bias', 'Erst der Plan, dann der Trade.', 'Notiere vor der Session deinen HTF- und LTF-Bias und die Levels, die zählen. Danach markierst du, ob es eingetreten ist, und siehst deine Trefferquote.'],
];

const FACTS = [
  ['Ergebnis statt Kontostand', 'TP, BE und SL statt Beträgen, die dich ablenken.'],
  ['Bis zu 10 Konten', 'Broker, Prop-Firm und Demo, mit einem Klick gefiltert.'],
  ['Auf jedem Gerät', 'Laptop, Tablet und Handy, immer auf demselben Stand.'],
  ['12 Farbschemen', 'Dunkel oder hell, so wie du am liebsten arbeitest.'],
];

const FAQ = [
  ['Wer sieht meine Trades?', 'Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.'],
  ['Geht es um meinen Kontostand?', 'Nein. Blotter hält fest, ob ein Trade im Take Profit, im Stop Loss oder auf Break Even endete. So misst du, wie gut du deinem System folgst, und nicht deine Tagesform.'],
  ['Brauche ich eine App?', 'Nein. Blotter läuft im Browser auf Mac, Windows, iPhone und Android. Deine Einträge sind auf allen Geräten gleich.'],
  ['Wie kündige ich?', 'Im Journal unter Einstellungen → „Abo verwalten oder kündigen“. Das Abo läuft dann bis zum Ende des bezahlten Monats.'],
];

export default async function Home() {
  let loggedIn = false;
  try { const { data } = await createClient().auth.getUser(); loggedIn = !!data.user; } catch {}
  const start = loggedIn ? '/app' : '/login?next=/abo';
  return (
    <>
      <Nav loggedIn={loggedIn} />
      <main className="lp">
        <section className="wrap hero">
          <div className="hero-txt">
            <h1><span>Miss deine Disziplin.</span> <span>Nicht deinen Kontostand.</span></h1>
            <p className="lead">Blotter ist das Trading Journal, das festhält, wie jeder Trade endet: Take Profit, Break Even oder Stop Loss. Mit Kalender, Screenshots, Learnings und Outlooks, auf all deinen Geräten.</p>
            <div className="cta">
              <a className="btn primary" href={start}>{loggedIn ? 'Zum Journal' : 'Für 7,99 € im Monat starten'}</a>
              <a className="btn quiet" href="#journal">Ansehen</a>
            </div>
            <p className="fine">Monatlich kündbar. Keine Mindestlaufzeit.</p>
          </div>
          <Trade />
        </section>

        <section className="wrap shot" id="journal">
          <figure className="screen">
            <picture>
              <source media="(max-width: 700px)" srcSet="/landing/phone-start.webp" width="780" height="1328" />
              <img src="/landing/journal-desktop.webp" width="2400" height="1500" alt="Das Journal: Kalender mit Bilanz, Win-Rate und den Trades des Monats" fetchPriority="high" />
            </picture>
          </figure>
          <ul className="facts">
            {FACTS.map(([h, p]) => <li key={h}><b>{h}</b><span>{p}</span></li>)}
          </ul>
        </section>

        <section className="wrap rows" id="funktionen">
          {ROWS.map(([img, alt, h, p]) => (
            <article className="row" key={img}>
              <div className="row-txt"><h2>{h}</h2><p>{p}</p></div>
              <figure className="phone"><img src={`/landing/${img}.webp`} width="780" height="1328" alt={alt} loading="lazy" decoding="async" /></figure>
            </article>
          ))}
        </section>

        <section className="wrap price-sec" id="preis">
          <div className="price">
            <div className="price-main">
              <h2>Ein Preis. Alles drin.</h2>
              <p className="amt"><b>7,99 €</b><span>im Monat</span></p>
              <a className="btn primary" href={loggedIn ? '/abo' : '/login?next=/abo'}>Jetzt starten</a>
              <p className="fine">Endpreis. Monatlich kündbar, mit zwei Klicks.</p>
            </div>
            <ul className="incl">
              <li>Unbegrenzt Trades, Learnings und Outlooks</li>
              <li>Screenshots zu jedem Eintrag</li>
              <li>Bis zu 10 Konten und 12 Farbschemen</li>
              <li>Synchron auf Laptop, Tablet und Handy</li>
              <li>Deine Daten sieht nur du</li>
              <li>Keine Werbung, keine Zusatzpakete</li>
            </ul>
          </div>
        </section>

        <section className="wrap faq-sec" id="fragen">
          <h2>Gut zu wissen</h2>
          <div className="faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="wrap close">
          <p className="mantra">Halte dich an das System.</p>
          <a className="btn primary" href={start}>{loggedIn ? 'Zum Journal' : 'Blotter starten'}</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
