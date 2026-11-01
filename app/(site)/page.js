import { createClient } from '@/lib/supabase/server';
import { Nav, Footer } from './chrome';

export const dynamic = 'force-dynamic';

const I = {
  cal: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  target: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>,
  img: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.6" /></svg>,
  bulb: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></svg>,
  compass: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>,
  wallet: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M3 10h18M16 15h2" /></svg>,
};

const FEATURES = [
  [I.cal, 'Kalender auf einen Blick', 'Jeder Tag zeigt deine Trades als TP, BE oder SL. Grüne und rote Tage siehst du sofort, dazu die Bilanz pro Woche.'],
  [I.target, 'Ergebnis statt Kontostand', 'Win-Rate, Serien und Verteilung von TP, BE und SL. Ohne dich mit Beträgen abzulenken.'],
  [I.wallet, 'Alle Konten in einem Journal', 'Bis zu 10 Konten mit eigenem Namen und eigener Farbe: Broker, Prop-Firm-Challenges, Demo. Filtern mit einem Klick.'],
  [I.img, 'Screenshots dazu', 'Chart einfügen per Drag & Drop oder direkt aus der Zwischenablage. Groß ansehen mit einem Klick.'],
  [I.bulb, 'Learnings als Timeline', 'Schreib auf, was du gelernt hast. Fehler, die du aufschreibst, kosten dich nur einmal Geld.'],
  [I.compass, 'Outlooks mit Trefferquote', 'Plane Bias und Key Levels vor der Session und markiere danach, ob es eingetreten ist.'],
];

const DAYS = [
  ['26', 'pos', ['tp', 'NQ']], ['27', 'neg', ['sl', 'DAX']], ['28', '', ['be', 'ES']], ['29', 'pos', ['tp', 'GOLD'], ['tp', 'NQ']], ['30', '', null], ['31', 'we', null], ['1', 'we', null],
  ['2', 'pos', ['tp', 'NQ'], ['sl', 'DAX']], ['3', 'today', ['tp', 'EURUSD']], ['4', '', null], ['5', '', null], ['6', '', null], ['7', 'we', null], ['8', 'we', null],
];

export default async function Home() {
  let loggedIn = false;
  try { const { data } = await createClient().auth.getUser(); loggedIn = !!data.user; } catch {}
  return (
    <>
      <Nav loggedIn={loggedIn} />
      <main>
        <section className="wrap hero">
          <div>
            <span className="eyebrow">Trading Journal</span>
            <h1>Jeder Trade. <span className="gold-t">Jeder Tag.</span> Auf einen Blick.</h1>
            <p className="lead">Blotter ist das Journal für Trader, die besser werden wollen: ein Kalender mit TP, BE und SL, Screenshots, Learnings und Outlooks. In deinen Farben, auf all deinen Geräten.</p>
            <div className="cta">
              <a className="btn primary" href={loggedIn ? '/app' : '/login?next=/abo'}>{loggedIn ? 'Zum Journal' : 'Für 7,99 € im Monat starten'}</a>
              <small><b>Monatlich kündbar.</b> Keine Mindestlaufzeit.</small>
            </div>
          </div>
          <div className="shot" aria-label="Vorschau des Kalenders">
            <div className="shot-top"><b>November 2026</b><span>KW 44 – 45</span></div>
            <div className="mini">
              {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map((d, i) => <span key={d} className={'h' + (i > 4 ? ' we' : '')}>{d}</span>)}
              {DAYS.map(([n, cls, ...pills]) => (
                <div key={n + cls} className={'d ' + cls}>
                  <span>{n}</span>
                  {pills.filter(Boolean).map(([r, sym], i) => <span key={i} className={'p ' + r}>{r.toUpperCase()} {sym}</span>)}
                </div>
              ))}
            </div>
            <div className="shot-stats">
              <div><small>Win-Rate</small><b>71 %</b></div>
              <div><small>Take Profit</small><b>5</b></div>
              <div><small>Beste Serie</small><b>3× TP</b></div>
            </div>
          </div>
        </section>

        <section className="wrap sec" id="funktionen">
          <span className="eyebrow">Funktionen</span>
          <h2>Alles, was ein Journal braucht. Nichts, was ablenkt.</h2>
          <p className="sub">Du trägst einen Trade in Sekunden ein: Konto, Instrument, Richtung, Ergebnis, Screenshot. Den Rest erledigt Blotter.</p>
          <div className="feat">
            {FEATURES.map(([ic, h, p]) => <div className="f" key={h}><span className="ic">{ic}</span><h3>{h}</h3><p>{p}</p></div>)}
          </div>
          <div className="skins" aria-label="Farbschemen">
            {[['Navy & Gold', '#060F27', '#D9B450'], ['Onyx & Platin', '#0A0B0E', '#C9CED8'], ['Ozean', '#03141B', '#4CC3FF'], ['Royal', '#0F0A1F', '#D9B450'], ['Graphit & Kupfer', '#0E0D0C', '#E0895A'], ['Arctic', '#EEF2F8', '#2B5BE8']].map(([n, a, b]) => (
              <span className="skin" key={n}><i style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />{n}</span>
            ))}
          </div>
        </section>

        <section className="wrap sec" id="preis">
          <div className="price-wrap">
            <div>
              <span className="eyebrow">Preis</span>
              <h2>Ein Preis. Alles drin.</h2>
              <p className="sub">Kein Gratis-Modell mit Werbung, keine Zusatzpakete. Dein Abo verlängert sich monatlich und lässt sich jederzeit mit zwei Klicks kündigen.</p>
            </div>
            <div className="price">
              <span className="eyebrow">Blotter Journal</span>
              <div className="amt"><b>7,99 €</b><span>/ Monat</span></div>
              <p className="note">Endpreis · monatlich kündbar</p>
              <ul>
                <li>Unbegrenzt Trades, Learnings und Outlooks</li>
                <li>Screenshots zu jedem Eintrag</li>
                <li>Bis zu 10 Konten, 6 Farbschemen</li>
                <li>Synchron auf Laptop, Tablet und Handy</li>
                <li>Deine Daten sind nur für dich sichtbar</li>
              </ul>
              <a className="btn primary block" href={loggedIn ? '/abo' : '/login?next=/abo'}>Jetzt starten</a>
            </div>
          </div>
        </section>

        <section className="wrap sec" id="fragen">
          <span className="eyebrow">Fragen</span>
          <h2>Gut zu wissen</h2>
          <div className="faq">
            <details><summary>Wie kündige ich?</summary><p>In deinem Journal unter Einstellungen → „Abo verwalten oder kündigen“. Das Abo läuft dann bis zum Ende des bezahlten Monats.</p></details>
            <details><summary>Wer sieht meine Trades?</summary><p>Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.</p></details>
            <details><summary>Brauche ich eine App?</summary><p>Nein. Blotter läuft im Browser auf Mac, Windows, iPhone und Android. Deine Einträge sind auf allen Geräten gleich.</p></details>
            <details><summary>Geht es um meinen Kontostand?</summary><p>Nein. Blotter erfasst, ob ein Trade in den Take Profit, den Stop Loss oder auf Break Even gelaufen ist. So misst du deine Disziplin und nicht deine Tagesform.</p></details>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
