import { createClient } from '@/lib/supabase/server';
import { isActive, hadSubscription } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/plans';
import { Nav, Footer } from './chrome';
import { Scenes, Replay } from './motion';

export const dynamic = 'force-dynamic';

const CHECK = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ICON = (d, color) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

const OUTCOMES = [
  { k: 'TP', name: 'Take Profit', color: '#34D399', glow: '#34D399', text: 'Wie geplant ins Ziel. Gezählt wird, dass der Plan aufging, nicht wie viel.', path: 'M2 34 C20 32 30 26 44 22 S70 8 88 4', end: [88, 4] },
  { k: 'BE', name: 'Break Even', color: '#CBD5E1', glow: '#94A3B8', text: 'Stop auf Einstieg gezogen, kein Verlust. Disziplin, die man oft vergisst.', path: 'M2 26 C18 12 30 10 44 20 S70 22 88 20', end: [88, 20] },
  { k: 'SL', name: 'Stop Loss', color: '#FB7185', glow: '#FB7185', text: 'Der Stop griff, so wie geplant. Auch das ist ein sauberer Trade.', path: 'M2 14 C20 10 30 12 44 18 S70 30 88 36', end: [88, 36] },
];

const FEATURES = [
  ['Screenshots', 'Mit ⌘V aus der Zwischenablage, direkt am Eintrag.', ICON(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M21 15l-5-5-9 9" /></>, '#F5F7FF')],
  ['Learnings', 'Was du gelernt hast, als Timeline mit Kategorien und Suche.', ICON(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />, '#5EEAD4')],
  ['Outlooks', 'HTF- und LTF-Bias vor der Session, danach der Abgleich.', ICON(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>, '#C4B5FD')],
  ['Bis zu 10 Konten', 'Live, Funded, Demo. Gefiltert mit einem Klick, auf jedem Gerät synchron.', ICON(<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>, '#A5B4FC')],
];

const BT_POINTS = [
  ['Sechs Märkte', 'Nasdaq 100, S&P 500, DAX 40, Gold, EUR/USD und GBP/USD.'],
  ['Von 1 Minute bis Monthly', 'Zehn Zeiteinheiten, gewechselt mit einem Klick.'],
  ['Deine eigenen Kursdaten', 'Einmal kostenlos herunterladen und importieren. Die Anleitung ist dabei.'],
];

// the two plans: the journal, and the journal with backtesting on top
const TIERS = [
  {
    id: 'journal', name: 'Journal', amt: '7,99 €',
    lead: 'Alles, um deine Live-Trades festzuhalten und auszuwerten.',
    list: ['Unbegrenzt Trades, Learnings und Outlooks', 'Kalender mit Win-Rate und Wochenbilanz', 'Screenshots zu jedem Eintrag', 'Bis zu 10 Konten, alle Geräte synchron', '12 Farbschemen, dunkel oder hell'],
  },
  {
    id: 'backtest', name: 'Journal + Backtesting', amt: '14,99 €',
    lead: 'Alles aus dem Journal, dazu der Markt zum Nachspielen.',
    list: ['Das komplette Journal', 'Backtesting Kerze für Kerze, von 1 Minute bis Monthly', 'Sechs Märkte mit deinen eigenen Kursdaten', 'Entry, Stop und Ziel, jeder Trade in R', 'Statistik und Equity-Kurve pro Session'],
  },
];

const FAQ = [
  ['Wer sieht meine Trades?', 'Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.'],
  ['Geht es um meinen Kontostand?', 'Nein. Blotter hält fest, ob ein Trade im Take Profit, im Stop Loss oder auf Break Even endete. So misst du, wie gut du deinem System folgst, und nicht deine Tagesform.'],
  ['Wie funktioniert der kostenlose Test?', `Du wählst ein Abo und hinterlegst bei Stripe eine Zahlungsmethode. Die ersten ${TRIAL_DAYS} Tage hast du vollen Zugang, und es wird nichts abgebucht. Danach läuft dein Abo zum Monatspreis weiter. Kündigst du vorher, zahlst du nichts. Den Test gibt es einmal pro Konto.`],
  ['Welches Abo passt zu mir?', 'Wenn du deine Live-Trades festhalten und auswerten willst, reicht das Journal. Willst du dein Setup vorher auf vergangenen Kursen testen, nimm Journal + Backtesting. Alles andere ist in beiden Abos gleich.'],
  ['Kann ich später wechseln?', 'Ja, jederzeit unter Einstellungen im Journal. Während des kostenlosen Tests kostet ein Wechsel nichts. Danach gilt: Beim Wechsel zu Journal + Backtesting zahlst du nur die Differenz für die restlichen Tage des Monats. Wechselst du zurück, wird der nicht genutzte Teil mit deiner nächsten Rechnung verrechnet, und deine Backtests bleiben gespeichert.'],
  ['Woher kommen die Kursdaten fürs Backtesting?', 'Du lädst 1-Minuten-Daten einmal selbst herunter, zum Beispiel kostenlos bei HistData, und importierst sie in Blotter. Eine Schritt-für-Schritt-Anleitung steht direkt auf der Backtesting-Seite. Danach liegen die Daten privat in deinem Konto.'],
  ['Brauche ich eine App?', 'Nein. Blotter läuft im Browser auf Mac, Windows, iPhone und Android. Deine Einträge sind auf allen Geräten gleich.'],
  ['Wie kündige ich?', 'Im Journal unter Einstellungen → „Abo verwalten oder kündigen“. Das Abo läuft dann bis zum Ende des bezahlten Monats. Kündigst du während des Tests, endet dein Zugang mit dem letzten Testtag und es wird nichts abgebucht.'],
];

const RING = (
  <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
    <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#34D399" strokeWidth="8" strokeDasharray="125.7 188.5" strokeLinecap="round" transform="rotate(-90 37 37)" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#94A3B8" strokeWidth="8" strokeDasharray="20 188.5" strokeDashoffset="-131" transform="rotate(-90 37 37)" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#FB7185" strokeWidth="8" strokeDasharray="26 188.5" strokeDashoffset="-156" transform="rotate(-90 37 37)" />
  </svg>
);

export default async function Home() {
  let loggedIn = false;
  let sub = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = !!data.user;
    if (loggedIn) sub = (await supabase.from('subscriptions').select('status,price_id,stripe_subscription_id,trial_end').eq('user_id', data.user.id).maybeSingle()).data;
  } catch {}
  const active = isActive(sub);
  // the free trial is offered to everyone who has not had a subscription yet
  const trial = !active && !hadSubscription(sub);
  const start = active ? '/app' : loggedIn ? '/abo' : '/login?next=/abo';
  const startLabel = active ? 'Zum Journal' : trial ? `${TRIAL_DAYS} Tage kostenlos testen` : 'Abo wählen';
  const choose = (plan) => (loggedIn ? '/abo?plan=' + plan : '/login?next=' + encodeURIComponent('/abo?plan=' + plan));
  return (
    <>
      <Nav loggedIn={loggedIn} />
      <main className="lp">
        <div className="blob" aria-hidden="true" style={{ width: 760, height: 540, left: '46%', top: -180, background: 'radial-gradient(closest-side, #6366F1, transparent)', opacity: 0.55 }} />
        <div className="blob" aria-hidden="true" style={{ width: 560, height: 460, left: '68%', top: 120, background: 'radial-gradient(closest-side, #2DD4BF, transparent)', opacity: 0.35 }} />

        {/* 1 · the claim, a phone with its numbers floating around it */}
        <section className="wrap hero" data-scene="hero">
          <h1><span className="in" style={{ '--t': '.05s' }}>Miss deine Disziplin.</span><span className="in g" style={{ '--t': '.18s' }}>Nicht deinen Kontostand.</span></h1>
          <p className="lead in" style={{ '--t': '.32s' }}>Blotter ist das Trading Journal, das festhält, wie jeder Trade endet: Take Profit, Break Even oder Stop Loss. Mit Kalender, Screenshots, Learnings, Outlooks und Backtesting.</p>
          <div className="cta in" style={{ '--t': '.44s' }}>
            <a className="btn primary" href={start}>{startLabel}</a>
            <a className="btn" href="#funktionen">Ansehen</a>
          </div>
          <p className="fine in" style={{ '--t': '.52s' }}>{trial ? 'Danach ab 7,99 € im Monat. Monatlich kündbar, keine Mindestlaufzeit.' : 'Ab 7,99 € im Monat. Monatlich kündbar, keine Mindestlaufzeit.'}</p>
          <div className="comp" aria-hidden="true">
            <div className="aur" />
            <div className="hphone in" style={{ '--t': '.5s' }}><img src="/landing/phone-start.webp" width="780" height="1328" alt="" fetchPriority="high" /></div>
            <div className="wg wg1 glass in" style={{ '--t': '.75s' }}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{RING}<span><small>Win-Rate, November</small><b className="big">67 %</b><small><span style={{ color: '#34D399' }}>18 TP</span>  4 BE  <span style={{ color: '#FB7185' }}>5 SL</span></small></span></div></div>
            <div className="wg wg2 glass in" style={{ '--t': '.9s' }}><div style={{ '--fd': '-2s' }}><span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><small>NQ, Long</small><span className="pill" style={{ color: '#05070F', background: '#34D399' }}>TP</span></span><b className="big" style={{ color: '#34D399', marginTop: 6 }}>+2,4 R</b><small>London Open Break, 9:42 Uhr</small></div></div>
            <div className="wg wg3 glass in" style={{ '--t': '1.05s' }}><div style={{ '--fd': '-4s' }}><small>KW 47</small><span className="days"><i className="tp" /><i className="sl" /><i className="tp" /><i className="be" /><i className="no" /></span></div></div>
            <div className="wg wg4 glass in" style={{ '--t': '1.2s' }}><div style={{ '--fd': '-1s' }}><small>Learning gespeichert</small><b style={{ display: 'block', fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>Nicht vor 9:30 in den NQ</b><span className="pill" style={{ marginTop: 8, color: '#C4B5FD', background: 'rgba(168,85,247,.16)' }}>Disziplin</span></div></div>
          </div>
        </section>

        <div className="wrap strip" data-reveal><em>Backtesting auf</em><span className="glass">Nasdaq 100</span><span className="glass">S&amp;P 500</span><span className="glass">DAX 40</span><span className="glass">Gold</span><span className="glass">EUR/USD</span><span className="glass">GBP/USD</span></div>

        {/* 2 · three ways a trade ends */}
        <section className="wrap sec mid">
          <h2 data-reveal>Jeder Trade endet auf eine von drei Arten.</h2>
          <p className="sub" data-reveal style={{ '--d': '.06s' }}>Blotter misst nicht, wie viel du verdient hast, sondern ob du deinem System gefolgt bist.</p>
          <div className="three">
            {OUTCOMES.map((o, i) => (
              <div key={o.k} className="oc glass" data-reveal style={{ '--d': i * 0.1 + 's', '--glow': o.glow }}>
                <svg width="90" height="40" viewBox="0 0 90 40" aria-hidden="true"><path className="sp" d={o.path} fill="none" stroke={o.color} strokeWidth="2.5" strokeLinecap="round" /><circle cx={o.end[0]} cy={o.end[1]} r="3.5" fill={o.color} /></svg>
                <b className="big" style={{ color: o.color }}>{o.k}</b>
                <h3>{o.name}</h3>
                <p>{o.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 · the month: the journal swings into place */}
        <section className="wrap sec row" id="funktionen">
          <div>
            <h2 data-reveal>Der Monat auf einen Blick.</h2>
            <p className="sub" data-reveal style={{ '--d': '.06s' }}>Jeder Tag zeigt, wie deine Trades endeten. Darüber deine Win-Rate, darunter die Bilanz jeder Woche. Ein Konto-Filter zeigt nur, was zu einem Konto gehört.</p>
          </div>
          <div className="tilt" data-scene="tilt"><img src="/landing/journal-desktop.webp" width="2400" height="1500" alt="Das Journal: Kalender mit Bilanz, Win-Rate und den Trades des Monats" loading="lazy" decoding="async" /></div>
        </section>

        {/* 4 · two phones drift apart while the list comes in */}
        <section className="wrap sec row rev">
          <div className="duo" data-scene="duo" aria-hidden="true">
            <img className="a" src="/landing/phone-day.webp" width="780" height="1328" alt="" loading="lazy" decoding="async" />
            <img className="b" src="/landing/phone-learnings.webp" width="780" height="1328" alt="" loading="lazy" decoding="async" />
          </div>
          <div>
            <h2 data-reveal>Der Chart gehört zum Trade.</h2>
            <div className="list">
              {FEATURES.map(([h, p, ic], i) => (
                <div key={h} data-reveal style={{ '--d': i * 0.08 + 's' }}><span className="ic glass">{ic}</span><span><b>{h}</b>{p}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · backtesting: the replay runs with the scroll */}
        <section className="sec" id="backtesting">
          <div className="blob" aria-hidden="true" style={{ width: 900, height: 520, left: '20%', top: 160, background: 'radial-gradient(closest-side, #2DD4BF, transparent)', opacity: 0.18 }} />
          <div className="wrap mid">
            <h2 data-reveal>Teste dein Setup, bevor es Geld kostet.</h2>
            <p className="sub" data-reveal style={{ '--d': '.06s' }}>Mit dem Backtesting spielst du den Markt Kerze für Kerze nach. Du setzt Entry, Stop und Ziel, und Blotter rechnet jeden Trade in R.</p>
          </div>
          <Replay />
          <div className="wrap">
            <ul className="pts">
              {BT_POINTS.map(([h, p], i) => <li key={h} className="glass" data-reveal style={{ '--d': i * 0.08 + 's' }}><b>{h}</b><span>{p}</span></li>)}
            </ul>
            <div className="bts-cta glass" data-reveal>
              <p>Backtesting ist im Abo <b>Journal + Backtesting</b> enthalten, für 14,99 € im Monat.{trial ? ` Die ersten ${TRIAL_DAYS} Tage sind kostenlos.` : ''}</p>
              <a className="btn primary" href={choose('backtest')}>{trial ? 'Backtesting kostenlos testen' : 'Mit Backtesting starten'}</a>
            </div>
          </div>
        </section>

        {/* 6 · price */}
        <section className="wrap sec mid" id="preis">
          <div className="blob" aria-hidden="true" style={{ width: 700, height: 420, left: '30%', top: 260, background: 'radial-gradient(closest-side, #6366F1, transparent)', opacity: 0.3 }} />
          <h2 data-reveal>Journal allein oder mit Backtesting.</h2>
          <p className="sub" data-reveal style={{ '--d': '.06s' }}>{trial ? `Die ersten ${TRIAL_DAYS} Tage sind kostenlos, danach gelten diese Endpreise. Monatlich kündbar, und du kannst jederzeit wechseln.` : 'Endpreise, monatlich kündbar. Du kannst jederzeit wechseln, abgerechnet wird tagesgenau.'}</p>
          <div className="tiers">
            {TIERS.map((t, k) => (
              <article key={t.id} className={'tier ' + (t.id === 'backtest' ? 'plus' : 'glass')} data-reveal style={{ '--d': k * 0.1 + 's' }} aria-labelledby={'tier-' + t.id}>
                <div className="th"><h3 id={'tier-' + t.id}>{t.name}</h3>{trial && <span className="free">{TRIAL_DAYS} Tage kostenlos</span>}</div>
                <p className="amt"><b>{t.amt}</b><span>im Monat</span></p>
                <p className="tl">{t.lead}</p>
                <a className={'btn' + (t.id === 'backtest' ? ' primary' : '')} href={choose(t.id)}>{trial ? `${TRIAL_DAYS} Tage kostenlos testen` : t.id === 'backtest' ? 'Mit Backtesting starten' : 'Mit dem Journal starten'}</a>
                <ul>{t.list.map((x) => <li key={x}>{CHECK}{x}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* 7 · questions */}
        <section className="wrap sec mid" id="fragen">
          <h2 data-reveal>Gut zu wissen</h2>
          <div className="faq" data-reveal style={{ '--d': '.08s' }}>
            {FAQ.map(([q, a]) => <details key={q} className="glass"><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        {/* 8 · the closing line, the aurora comes up behind it */}
        <section className="end" data-scene="end">
          <div className="glow" aria-hidden="true" />
          <div className="wrap">
            <h2>Halte dich an das System.</h2>
            <div className="cta"><a className="btn primary" href={start}>{startLabel}</a></div>
            {trial && <p className="fine">Danach ab 7,99 € im Monat. Kündigst du im Test, zahlst du nichts.</p>}
          </div>
        </section>
      </main>
      <Footer />
      <Scenes />
    </>
  );
}
