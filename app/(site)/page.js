import { createClient } from '@/lib/supabase/server';
import { isActive, hadSubscription } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/plans';
import { Nav, Footer } from './chrome';
import { getLang } from '@/lib/i18n-server';
import { lp } from '@/lib/i18n';
import { Scenes, Replay } from './motion';

export const dynamic = 'force-dynamic';

const CHECK = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ICON = (d, color) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

// the visual of each outcome; the words are in COPY
const OUTCOME_ART = [
  { k: 'TP', name: 'Take Profit', color: '#34D399', glow: '#34D399', path: 'M2 34 C20 32 30 26 44 22 S70 8 88 4', end: [88, 4] },
  { k: 'BE', name: 'Break Even', color: '#CBD5E1', glow: '#94A3B8', path: 'M2 26 C18 12 30 10 44 20 S70 22 88 20', end: [88, 20] },
  { k: 'SL', name: 'Stop Loss', color: '#FB7185', glow: '#FB7185', path: 'M2 14 C20 10 30 12 44 18 S70 30 88 36', end: [88, 36] },
];
const FEATURE_ICONS = [
  ICON(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M21 15l-5-5-9 9" /></>, '#F5F7FF'),
  ICON(<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />, '#5EEAD4'),
  ICON(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>, '#C4B5FD'),
  ICON(<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>, '#A5B4FC'),
];
const PROP_ICONS = [
  ICON(<><path d="M4 19V5M4 19h16" /><path d="M7 15l4-5 3 3 5-7" /></>, '#5EEAD4'),
  ICON(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 15V9M12 17V7M17 13v-3" /></>, '#A5B4FC'),
  ICON(<><path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>, '#C4B5FD'),
  ICON(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3M21 12h-3" /></>, '#F5F7FF'),
];
const METER_ART = [[41, 'var(--up)'], [12.5, 'var(--down)'], [0, 'var(--down)']];

// all words of the page, German and English
const COPY = {
  de: {
    outcomes: ['Wie geplant ins Ziel. Gezählt wird, dass der Plan aufging, nicht wie viel.', 'Stop auf Einstieg gezogen, kein Verlust. Disziplin, die man oft vergisst.', 'Der Stop griff, so wie geplant. Auch das ist ein sauberer Trade.'],
    features: [
      ['Screenshots', 'Mit ⌘V aus der Zwischenablage, direkt am Eintrag.'],
      ['Learnings', 'Was du gelernt hast, als Timeline mit Kategorien und Suche.'],
      ['Outlooks', 'HTF- und LTF-Bias vor der Session, danach der Abgleich.'],
      ['Bis zu 10 Konten', 'Live, Funded, Demo. Gefiltert mit einem Klick, auf jedem Gerät synchron.'],
    ],
    btPoints: [
      ['Sechs Märkte', 'Nasdaq 100, S&P 500, DAX 40, Gold, EUR/USD und GBP/USD.'],
      ['Von 1 Minute bis Monthly', 'Zehn Zeiteinheiten, gewechselt mit einem Klick.'],
      ['Deine eigenen Kursdaten', 'Einmal kostenlos herunterladen und importieren. Die Anleitung ist dabei.'],
    ],
    propPoints: [
      ['Futures wie bei Tradesea', '25K, 50K, 100K oder 150K. NQ, ES, Gold, Euro und Pfund in ganzen Kontrakten, als Mini oder Micro.'],
      ['CFDs wie in MetaTrader 5', '10K, 25K, 50K oder 100K. Lots ab 0,01, Bid und Ask, Spread, Kommission und Margin.'],
      ['Die Regeln deiner Prop-Firma', 'Gewinnziel, Tagesverlust und maximaler Verlust, statisch oder trailing. Vorlagen wie bei Lucid und FTMO, frei anpassbar.'],
      ['Größe nach Risiko', 'Sag, wie viel du riskieren willst. Blotter rechnet Lots oder Kontrakte aus deinem Stop, Kommission eingerechnet.'],
    ],
    meters: [['Gewinnziel', '+1.240 $ von 3.000 $'], ['Tagesverlust', '−150 $ von 1.200 $'], ['Max. Verlust', 'Grenze 49.240 $']],
    tiers: [
      { id: 'journal', name: 'Journal', amt: '7,99 €', lead: 'Alles, um deine Live-Trades festzuhalten und auszuwerten.',
        list: ['Unbegrenzt Trades, Learnings und Outlooks', 'Kalender mit Win-Rate und Wochenbilanz', 'Screenshots zu jedem Eintrag', 'Bis zu 10 Konten, alle Geräte synchron', '12 Farbschemen, dunkel oder hell'] },
      { id: 'backtest', name: 'Journal + Backtesting', amt: '14,99 €', lead: 'Alles aus dem Journal, dazu der Markt zum Nachspielen.',
        list: ['Das komplette Journal', 'Backtesting Kerze für Kerze, von 1 Minute bis Monthly', 'Sechs Märkte mit deinen eigenen Kursdaten', 'Zeichnen wie bei TradingView, jeder Trade in R', 'Statistik und Equity-Kurve pro Session'] },
      { id: 'pro', name: 'Pro', amt: '22,99 €', lead: 'Journal und Backtesting, dazu Prop-Konten für Futures und CFDs.',
        list: ['Alles aus Journal + Backtesting', 'Futures-Konten von 25K bis 150K, in Kontrakten', 'CFD-Konten von 10K bis 100K, in Lots wie in MT5', 'Gewinnziel, Tagesverlust und Max. Verlust', 'Kontostand und Statistik in Dollar'] },
    ],
    faq: (days) => [
      ['Wer sieht meine Trades?', 'Nur du. Jedes Konto hat einen eigenen, getrennten Datenbereich, und Screenshots liegen in einem privaten Speicher.'],
      ['Geht es um meinen Kontostand?', 'Im Journal nicht. Blotter hält fest, ob ein Trade im Take Profit, im Stop Loss oder auf Break Even endete. So misst du, wie gut du deinem System folgst, und nicht deine Tagesform. Nur auf den Prop-Konten im Backtesting rechnest du in Dollar, weil dort die Regeln der Prop-Firma zählen.'],
      ['Wie funktioniert der kostenlose Test?', `Du wählst ein Abo und hinterlegst bei Stripe eine Zahlungsmethode. Die ersten ${days} Tage hast du vollen Zugang, und es wird nichts abgebucht. Danach läuft dein Abo zum Monatspreis weiter. Kündigst du vorher, zahlst du nichts. Den Test gibt es einmal pro Konto.`],
      ['Welches Abo passt zu mir?', 'Wenn du deine Live-Trades festhalten und auswerten willst, reicht das Journal. Willst du dein Setup vorher auf vergangenen Kursen testen, nimm Journal + Backtesting. Tradest du bei einer Prop-Firma, nimm Pro: Dann backtestest du auf einem Konto mit deiner Kontogröße, deinen Lots oder Kontrakten und den Regeln der Firma. Das Journal ist in allen drei Abos gleich.'],
      ['Was sind Prop-Konten?', 'Simulierte Konten fürs Backtesting, enthalten in Pro. Futures-Konten mit 25K, 50K, 100K oder 150K handeln ganze Kontrakte wie bei Tradesea, CFD-Konten mit 10K, 25K, 50K oder 100K handeln Lots ab 0,01 wie in MetaTrader 5. Blotter rechnet Spread, Kommission und Margin, prüft Gewinnziel, Tagesverlust und maximalen Verlust und schließt die Position am Limit, wie es die Firma tun würde. Es ist eine Simulation: Es werden keine echten Orders ausgeführt.'],
      ['Kann ich später wechseln?', 'Ja, jederzeit unter Einstellungen im Journal. Während des kostenlosen Tests kostet ein Wechsel nichts. Danach gilt: Beim Wechsel zu einem größeren Abo zahlst du nur die Differenz für die restlichen Tage des Monats. Wechselst du zurück, wird der nicht genutzte Teil mit deiner nächsten Rechnung verrechnet, und deine Backtests und Konten bleiben gespeichert.'],
      ['Woher kommen die Kursdaten fürs Backtesting?', 'Du lädst 1-Minuten-Daten einmal selbst herunter, zum Beispiel kostenlos bei HistData, und importierst sie in Blotter. Eine Schritt-für-Schritt-Anleitung steht direkt auf der Backtesting-Seite. Danach liegen die Daten privat in deinem Konto.'],
      ['Brauche ich eine App?', 'Nein. Blotter läuft im Browser auf Mac, Windows, iPhone und Android. Deine Einträge sind auf allen Geräten gleich.'],
      ['Wie kündige ich?', 'Im Journal unter Einstellungen → „Abo verwalten oder kündigen“. Das Abo läuft dann bis zum Ende des bezahlten Monats. Kündigst du während des Tests, endet dein Zugang mit dem letzten Testtag und es wird nichts abgebucht.'],
    ],
    toJournal: 'Zum Journal', tryDays: (d) => `${d} Tage kostenlos testen`, choosePlan: 'Abo wählen',
    h1a: 'Miss deine Disziplin.', h1b: 'Nicht deinen Kontostand.',
    lead: 'Blotter ist das Trading Journal, das festhält, wie jeder Trade endet: Take Profit, Break Even oder Stop Loss. Mit Kalender, Screenshots, Learnings, Outlooks, Backtesting und Prop-Konten.',
    look: 'Ansehen',
    fineTrial: 'Danach ab 7,99 € im Monat. Monatlich kündbar, keine Mindestlaufzeit.', fineNew: (d) => `Neu bei Blotter: ${d} Tage kostenlos, danach ab 7,99 € im Monat. Monatlich kündbar.`,
    wgWin: 'Win-Rate, November', wgWinV: '67 %', wgLong: 'NQ, Long', wgR: '+2,4 R', wgSetup: 'London Open Break, 9:42 Uhr', wgWeek: 'KW 47', wgSaved: 'Learning gespeichert', wgLearn: 'Nicht vor 9:30 in den NQ', wgCat: 'Disziplin',
    stripOn: 'Backtesting auf',
    threeH: 'Jeder Trade endet auf eine von drei Arten.', threeSub: 'Blotter misst nicht, wie viel du verdient hast, sondern ob du deinem System gefolgt bist.',
    monthH: 'Der Monat auf einen Blick.', monthSub: 'Jeder Tag zeigt, wie deine Trades endeten. Darüber deine Win-Rate, darunter die Bilanz jeder Woche. Ein Konto-Filter zeigt nur, was zu einem Konto gehört.',
    monthAlt: 'Das Journal: Kalender mit Bilanz, Win-Rate und den Trades des Monats',
    chartH: 'Der Chart gehört zum Trade.',
    btH: 'Teste dein Setup, bevor es Geld kostet.', btSub: 'Mit dem Backtesting spielst du den Markt Kerze für Kerze nach. Du setzt Entry, Stop und Ziel, und Blotter rechnet jeden Trade in R.',
    btCta: (d) => <>Backtesting ist im Abo <b>Journal + Backtesting</b> enthalten, für 14,99 € im Monat. Die ersten {d} Tage sind kostenlos.</>,
    btTry: 'Backtesting kostenlos testen', btStart: 'Mit Backtesting starten',
    proTag: 'Neu in Pro', proH: 'Backteste wie auf deinem Prop-Konto.',
    proSub: 'Wähl ein Futures- oder CFD-Konto mit deiner Kontogröße. Blotter rechnet jeden Trade in Dollar, mit deinen Lots oder Kontrakten, und prüft die Regeln deiner Prop-Firma, Minute für Minute.',
    mt: { sellP: ['1,08', '42'], buyP: ['1,08', '43'], lots: '0,50', risk: 'Risiko', riskV: '−102,50 $', ofAcct: 'vom Konto', ofAcctV: '0,21 %', margin: 'Margin', marginV: '542,16 $' },
    fuActive: 'Aktiv', fuBal: '51.240,00 $',
    proCta: (d) => <>Prop-Konten sind im Abo <b>Pro</b> enthalten, für 22,99 € im Monat. Die ersten {d} Tage sind kostenlos.</>,
    proTry: 'Pro kostenlos testen', proStart: 'Mit Pro starten',
    priceH: 'Drei Abos, jederzeit wechselbar.', priceSub: (d) => `Die ersten ${d} Tage sind kostenlos, danach gelten diese Endpreise. Monatlich kündbar, und du kannst jederzeit wechseln.`,
    free: (d) => `${d} Tage kostenlos`, perMonth: 'im Monat', journalStart: 'Mit dem Journal starten',
    faqH: 'Gut zu wissen', endH: 'Halte dich an das System.',
    endFineTrial: 'Danach ab 7,99 € im Monat. Kündigst du im Test, zahlst du nichts.', endFineNew: (d) => `Neu bei Blotter: ${d} Tage kostenlos, danach ab 7,99 € im Monat.`,
  },
  en: {
    outcomes: ['Into the target, as planned. What counts is that the plan worked, not how much it made.', 'Stop moved to entry, no loss. The discipline people tend to forget.', 'The stop did its job, as planned. That is a clean trade too.'],
    features: [
      ['Screenshots', 'Paste from the clipboard with ⌘V, right on the entry.'],
      ['Learnings', 'What you learned, as a timeline with categories and search.'],
      ['Outlooks', 'HTF and LTF bias before the session, the check afterwards.'],
      ['Up to 10 accounts', 'Live, funded, demo. Filtered with one click, in sync on every device.'],
    ],
    btPoints: [
      ['Six markets', 'Nasdaq 100, S&P 500, DAX 40, gold, EUR/USD and GBP/USD.'],
      ['From 1 minute to monthly', 'Ten timeframes, switched with one click.'],
      ['Your own price data', 'Download it once for free and import it. The guide is included.'],
    ],
    propPoints: [
      ['Futures like on Tradesea', '25K, 50K, 100K or 150K. NQ, ES, gold, euro and pound in whole contracts, as mini or micro.'],
      ['CFDs like in MetaTrader 5', '10K, 25K, 50K or 100K. Lots from 0.01, bid and ask, spread, commission and margin.'],
      ['Your prop firm’s rules', 'Profit target, daily loss and max loss, static or trailing. Presets like Lucid and FTMO, fully adjustable.'],
      ['Size by risk', 'Say how much you want to risk. Blotter works out the lots or contracts from your stop, commission included.'],
    ],
    meters: [['Profit target', '+$1,240 of $3,000'], ['Daily loss', '−$150 of $1,200'], ['Max loss', 'Limit $49,240']],
    tiers: [
      { id: 'journal', name: 'Journal', amt: '€7.99', lead: 'Everything you need to record and review your live trades.',
        list: ['Unlimited trades, learnings and outlooks', 'Calendar with win rate and weekly summary', 'Screenshots on every entry', 'Up to 10 accounts, all devices in sync', '12 colour themes, dark or light'] },
      { id: 'backtest', name: 'Journal + Backtesting', amt: '€14.99', lead: 'Everything in the journal, plus the market to replay.',
        list: ['The complete journal', 'Candle-by-candle backtesting, from 1 minute to monthly', 'Six markets with your own price data', 'Drawing like on TradingView, every trade in R', 'Stats and equity curve per session'] },
      { id: 'pro', name: 'Pro', amt: '€22.99', lead: 'Journal and backtesting, plus prop accounts for futures and CFDs.',
        list: ['Everything in Journal + Backtesting', 'Futures accounts from 25K to 150K, in contracts', 'CFD accounts from 10K to 100K, in lots like MT5', 'Profit target, daily loss and max loss', 'Balance and stats in dollars'] },
    ],
    faq: (days) => [
      ['Who can see my trades?', 'Only you. Every account has its own separate data area, and screenshots are kept in private storage.'],
      ['Is it about my account balance?', 'Not in the journal. Blotter records whether a trade ended at take profit, stop loss or break even. That way you measure how well you follow your system, not how your day went. Only on the prop accounts in backtesting do you count in dollars, because that is where the prop firm’s rules apply.'],
      ['How does the free trial work?', `You pick a plan and add a payment method with Stripe. For the first ${days} days you have full access and nothing is charged. After that your plan continues at the monthly price. Cancel before then and you pay nothing. The trial is available once per account.`],
      ['Which plan is right for me?', 'If you want to record and review your live trades, the journal is enough. If you want to test your setup on past prices first, take Journal + Backtesting. If you trade with a prop firm, take Pro: you backtest on an account with your account size, your lots or contracts and the firm’s rules. The journal is the same in all three plans.'],
      ['What are prop accounts?', 'Simulated accounts for backtesting, included in Pro. Futures accounts with 25K, 50K, 100K or 150K trade whole contracts like on Tradesea, CFD accounts with 10K, 25K, 50K or 100K trade lots from 0.01 like in MetaTrader 5. Blotter calculates spread, commission and margin, checks the profit target, daily loss and max loss, and closes the position at the limit, just as the firm would. It is a simulation: no real orders are placed.'],
      ['Can I switch later?', 'Yes, at any time under Settings in the journal. During the free trial a switch costs nothing. After that, when you move to a bigger plan you only pay the difference for the rest of the month. If you move back, the unused part is credited on your next invoice, and your backtests and accounts stay saved.'],
      ['Where does the price data for backtesting come from?', 'You download 1-minute data once yourself, for example for free from HistData, and import it into Blotter. A step-by-step guide is right on the backtesting page. After that the data sits privately in your account.'],
      ['Do I need an app?', 'No. Blotter runs in the browser on Mac, Windows, iPhone and Android. Your entries are the same on every device.'],
      ['How do I cancel?', 'In the journal under Settings → “Manage or cancel plan”. Your plan then runs until the end of the paid month. If you cancel during the trial, your access ends with the last trial day and nothing is charged.'],
    ],
    toJournal: 'Open journal', tryDays: (d) => `Try ${d} days free`, choosePlan: 'Choose a plan',
    h1a: 'Measure your discipline.', h1b: 'Not your account balance.',
    lead: 'Blotter is the trading journal that records how every trade ends: take profit, break even or stop loss. With a calendar, screenshots, learnings, outlooks, backtesting and prop accounts.',
    look: 'Take a look',
    fineTrial: 'Then from €7.99 a month. Cancel monthly, no minimum term.', fineNew: (d) => `New to Blotter: ${d} days free, then from €7.99 a month. Cancel monthly.`,
    wgWin: 'Win rate, November', wgWinV: '67%', wgLong: 'NQ, long', wgR: '+2.4 R', wgSetup: 'London open break, 9:42', wgWeek: 'Week 47', wgSaved: 'Learning saved', wgLearn: 'No NQ before 9:30', wgCat: 'Discipline',
    stripOn: 'Backtesting on',
    threeH: 'Every trade ends in one of three ways.', threeSub: 'Blotter doesn’t measure how much you made, but whether you followed your system.',
    monthH: 'The month at a glance.', monthSub: 'Every day shows how your trades ended. Above it your win rate, below it the summary of each week. An account filter shows only what belongs to one account.',
    monthAlt: 'The journal: calendar with summary, win rate and the trades of the month',
    chartH: 'The chart belongs to the trade.',
    btH: 'Test your setup before it costs money.', btSub: 'With backtesting you replay the market candle by candle. You set entry, stop and target, and Blotter counts every trade in R.',
    btCta: (d) => <>Backtesting is included in the <b>Journal + Backtesting</b> plan, for €14.99 a month. The first {d} days are free.</>,
    btTry: 'Try backtesting free', btStart: 'Start with backtesting',
    proTag: 'New in Pro', proH: 'Backtest as if on your prop account.',
    proSub: 'Pick a futures or CFD account with your account size. Blotter counts every trade in dollars, with your lots or contracts, and checks your prop firm’s rules minute by minute.',
    mt: { sellP: ['1.08', '42'], buyP: ['1.08', '43'], lots: '0.50', risk: 'Risk', riskV: '−$102.50', ofAcct: 'of account', ofAcctV: '0.21%', margin: 'Margin', marginV: '$542.16' },
    fuActive: 'Active', fuBal: '$51,240.00',
    proCta: (d) => <>Prop accounts are included in the <b>Pro</b> plan, for €22.99 a month. The first {d} days are free.</>,
    proTry: 'Try Pro free', proStart: 'Start with Pro',
    priceH: 'Three plans, switch any time.', priceSub: (d) => `The first ${d} days are free, after that these final prices apply. Cancel monthly, and switch whenever you like.`,
    free: (d) => `${d} days free`, perMonth: 'a month', journalStart: 'Start with the journal',
    faqH: 'Good to know', endH: 'Stick to the system.',
    endFineTrial: 'Then from €7.99 a month. Cancel during the trial and you pay nothing.', endFineNew: (d) => `New to Blotter: ${d} days free, then from €7.99 a month.`,
  },
};

const RING = (
  <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
    <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#34D399" strokeWidth="8" strokeDasharray="125.7 188.5" strokeLinecap="round" transform="rotate(-90 37 37)" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#94A3B8" strokeWidth="8" strokeDasharray="20 188.5" strokeDashoffset="-131" transform="rotate(-90 37 37)" />
    <circle cx="37" cy="37" r="30" fill="none" stroke="#FB7185" strokeWidth="8" strokeDasharray="26 188.5" strokeDashoffset="-156" transform="rotate(-90 37 37)" />
  </svg>
);

export default async function Home() {
  const lang = getLang(), c = COPY[lang], L = (p) => lp(lang, p);
  const IMG = lang === 'en' ? '/landing/en/' : '/landing/';   // screenshots of the journal in the page's language
  let loggedIn = false;
  let sub = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = !!data.user;
    if (loggedIn) sub = (await supabase.from('subscriptions').select('status,price_id,stripe_subscription_id,trial_end').eq('user_id', data.user.id).maybeSingle()).data;
  } catch {}
  const active = isActive(sub);
  // the offer (3 days free) is always on the page; the buttons only say "testen" to whoever can still start a trial
  const trial = !active && !hadSubscription(sub);
  const start = active ? '/app' : loggedIn ? L('/abo') : L('/login') + '?next=' + L('/abo');
  const startLabel = active ? c.toJournal : trial ? c.tryDays(TRIAL_DAYS) : c.choosePlan;
  const choose = (plan) => (loggedIn ? L('/abo') + '?plan=' + plan : L('/login') + '?next=' + encodeURIComponent(L('/abo') + '?plan=' + plan));
  return (
    <>
      <Nav loggedIn={loggedIn} />
      <main className="lp">
        <div className="blob" aria-hidden="true" style={{ width: 760, height: 540, left: '46%', top: -180, background: 'radial-gradient(closest-side, #6366F1, transparent)', opacity: 0.55 }} />
        <div className="blob" aria-hidden="true" style={{ width: 560, height: 460, left: '68%', top: 120, background: 'radial-gradient(closest-side, #2DD4BF, transparent)', opacity: 0.35 }} />

        {/* 1 · the claim, a phone with its numbers floating around it */}
        <section className="wrap hero" data-scene="hero">
          <h1><span className="in" style={{ '--t': '.05s' }}>{c.h1a}</span><span className="in g" style={{ '--t': '.18s' }}>{c.h1b}</span></h1>
          <p className="lead in" style={{ '--t': '.32s' }}>{c.lead}</p>
          <div className="cta in" style={{ '--t': '.44s' }}>
            <a className="btn primary" href={start}>{startLabel}</a>
            <a className="btn" href="#funktionen">{c.look}</a>
          </div>
          <p className="fine in" style={{ '--t': '.52s' }}>{trial ? c.fineTrial : c.fineNew(TRIAL_DAYS)}</p>
          <div className="comp" aria-hidden="true">
            <div className="aur" />
            <div className="hphone in" style={{ '--t': '.5s' }}><img src={IMG + 'phone-start.webp'} width="780" height="1328" alt="" fetchPriority="high" /></div>
            <div className="wg wg1 glass in" style={{ '--t': '.75s' }}><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{RING}<span><small>{c.wgWin}</small><b className="big">{c.wgWinV}</b><small><span style={{ color: '#34D399' }}>18 TP</span>  4 BE  <span style={{ color: '#FB7185' }}>5 SL</span></small></span></div></div>
            <div className="wg wg2 glass in" style={{ '--t': '.9s' }}><div style={{ '--fd': '-2s' }}><span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><small>{c.wgLong}</small><span className="pill" style={{ color: '#05070F', background: '#34D399' }}>TP</span></span><b className="big" style={{ color: '#34D399', marginTop: 6 }}>{c.wgR}</b><small>{c.wgSetup}</small></div></div>
            <div className="wg wg3 glass in" style={{ '--t': '1.05s' }}><div style={{ '--fd': '-4s' }}><small>{c.wgWeek}</small><span className="days"><i className="tp" /><i className="sl" /><i className="tp" /><i className="be" /><i className="no" /></span></div></div>
            <div className="wg wg4 glass in" style={{ '--t': '1.2s' }}><div style={{ '--fd': '-1s' }}><small>{c.wgSaved}</small><b style={{ display: 'block', fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>{c.wgLearn}</b><span className="pill" style={{ marginTop: 8, color: '#C4B5FD', background: 'rgba(168,85,247,.16)' }}>{c.wgCat}</span></div></div>
          </div>
        </section>

        <div className="wrap strip" data-reveal><em>{c.stripOn}</em><span className="glass">Nasdaq 100</span><span className="glass">S&amp;P 500</span><span className="glass">DAX 40</span><span className="glass">Gold</span><span className="glass">EUR/USD</span><span className="glass">GBP/USD</span></div>

        {/* 2 · three ways a trade ends */}
        <section className="wrap sec mid">
          <h2 data-reveal>{c.threeH}</h2>
          <p className="sub" data-reveal style={{ '--d': '.06s' }}>{c.threeSub}</p>
          <div className="three">
            {OUTCOME_ART.map((o, i) => (
              <div key={o.k} className="oc glass" data-reveal style={{ '--d': i * 0.1 + 's', '--glow': o.glow }}>
                <svg width="90" height="40" viewBox="0 0 90 40" aria-hidden="true"><path className="sp" d={o.path} fill="none" stroke={o.color} strokeWidth="2.5" strokeLinecap="round" /><circle cx={o.end[0]} cy={o.end[1]} r="3.5" fill={o.color} /></svg>
                <b className="big" style={{ color: o.color }}>{o.k}</b>
                <h3>{o.name}</h3>
                <p>{c.outcomes[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 · the month: the journal swings into place */}
        <section className="wrap sec row" id="funktionen">
          <div>
            <h2 data-reveal>{c.monthH}</h2>
            <p className="sub" data-reveal style={{ '--d': '.06s' }}>{c.monthSub}</p>
          </div>
          <div className="tilt" data-scene="tilt"><img src={IMG + 'journal-desktop.webp'} width="2400" height="1500" alt={c.monthAlt} loading="lazy" decoding="async" /></div>
        </section>

        {/* 4 · two phones drift apart while the list comes in */}
        <section className="wrap sec row rev">
          <div className="duo" data-scene="duo" aria-hidden="true">
            <img className="a" src={IMG + 'phone-day.webp'} width="780" height="1328" alt="" loading="lazy" decoding="async" />
            <img className="b" src={IMG + 'phone-learnings.webp'} width="780" height="1328" alt="" loading="lazy" decoding="async" />
          </div>
          <div>
            <h2 data-reveal>{c.chartH}</h2>
            <div className="list">
              {c.features.map(([h, p], i) => (
                <div key={h} data-reveal style={{ '--d': i * 0.08 + 's' }}><span className="ic glass">{FEATURE_ICONS[i]}</span><span><b>{h}</b>{p}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · backtesting: the replay runs with the scroll */}
        <section className="sec" id="backtesting">
          <div className="blob" aria-hidden="true" style={{ width: 900, height: 520, left: '20%', top: 160, background: 'radial-gradient(closest-side, #2DD4BF, transparent)', opacity: 0.18 }} />
          <div className="wrap mid">
            <h2 data-reveal>{c.btH}</h2>
            <p className="sub" data-reveal style={{ '--d': '.06s' }}>{c.btSub}</p>
          </div>
          <Replay lang={lang} />
          <div className="wrap">
            <ul className="pts">
              {c.btPoints.map(([h, p], i) => <li key={h} className="glass" data-reveal style={{ '--d': i * 0.08 + 's' }}><b>{h}</b><span>{p}</span></li>)}
            </ul>
            <div className="bts-cta glass" data-reveal>
              <p>{c.btCta(TRIAL_DAYS)}</p>
              <a className="btn primary" href={choose('backtest')}>{trial ? c.btTry : c.btStart}</a>
            </div>
          </div>
        </section>

        {/* 6 · Pro: prop accounts, a MetaTrader ticket and a futures account as the picture */}
        <section className="wrap sec row" id="prop">
          <div>
            <span className="pro-tag" data-reveal>{c.proTag}</span>
            <h2 data-reveal>{c.proH}</h2>
            <p className="sub" data-reveal style={{ '--d': '.06s' }}>{c.proSub}</p>
            <div className="list">
              {c.propPoints.map(([h, p], i) => (
                <div key={h} data-reveal style={{ '--d': i * 0.08 + 's' }}><span className="ic glass">{PROP_ICONS[i]}</span><span><b>{h}</b>{p}</span></div>
              ))}
            </div>
          </div>
          <div className="pa-vis" aria-hidden="true">
            <div className="pa-mt glass" data-reveal>
              <div className="pa-h"><span className="pa-tg cfd">CFD 50K</span><b>EURUSD</b><small>Euro vs US Dollar</small></div>
              <div className="pa-oc"><span className="s"><small>SELL</small><span>{c.mt.sellP[0]}<big>{c.mt.sellP[1]}</big><sup>3</sup></span></span><em>{c.mt.lots}<small>Lots</small></em><span className="b"><small>BUY</small><span>{c.mt.buyP[0]}<big>{c.mt.buyP[1]}</big><sup>1</sup></span></span></div>
              <div className="pa-kv"><span><small>{c.mt.risk}</small><b className="dn">{c.mt.riskV}</b></span><span><small>{c.mt.ofAcct}</small><b>{c.mt.ofAcctV}</b></span><span><small>{c.mt.margin}</small><b>{c.mt.marginV}</b></span></div>
            </div>
            <div className="pa-fu glass" data-reveal style={{ '--d': '.12s' }}>
              <div className="pa-h"><span className="pa-tg fut">Futures 50K</span><span className="pa-ok">{c.fuActive}</span></div>
              <b className="pa-bal">{c.fuBal}</b>
              {c.meters.map(([l, v], i) => <div key={l} className="pa-m"><span>{l}<b>{v}</b></span><i style={{ '--w': METER_ART[i][0] + '%', '--c': METER_ART[i][1] }} /></div>)}
              <div className="pa-ct"><span>MNQ</span>{[1, 2, 3, 5, 10].map((n) => <i key={n} className={n === 2 ? 'on' : ''}>{n}</i>)}</div>
            </div>
          </div>
        </section>
        <div className="wrap">
          <div className="bts-cta glass" data-reveal>
            <p>{c.proCta(TRIAL_DAYS)}</p>
            <a className="btn primary" href={choose('pro')}>{trial ? c.proTry : c.proStart}</a>
          </div>
        </div>

        {/* 7 · price */}
        <section className="wrap sec mid" id="preis">
          <div className="blob" aria-hidden="true" style={{ width: 700, height: 420, left: '30%', top: 260, background: 'radial-gradient(closest-side, #6366F1, transparent)', opacity: 0.3 }} />
          <h2 data-reveal>{c.priceH}</h2>
          <p className="sub" data-reveal style={{ '--d': '.06s' }}>{c.priceSub(TRIAL_DAYS)}</p>
          <div className="tiers">
            {c.tiers.map((t, k) => (
              <article key={t.id} className={'tier ' + (t.id === 'pro' ? 'plus' : 'glass')} data-reveal style={{ '--d': k * 0.1 + 's' }} aria-labelledby={'tier-' + t.id}>
                <div className="th"><h3 id={'tier-' + t.id}>{t.name}</h3><span className="free">{c.free(TRIAL_DAYS)}</span></div>
                <p className="amt"><b>{t.amt}</b><span>{c.perMonth}</span></p>
                <p className="tl">{t.lead}</p>
                <a className={'btn' + (t.id === 'pro' ? ' primary' : '')} href={choose(t.id)}>{trial ? c.tryDays(TRIAL_DAYS) : t.id === 'pro' ? c.proStart : t.id === 'backtest' ? c.btStart : c.journalStart}</a>
                <ul>{t.list.map((x) => <li key={x}>{CHECK}{x}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* 8 · questions */}
        <section className="wrap sec mid" id="fragen">
          <h2 data-reveal>{c.faqH}</h2>
          <div className="faq" data-reveal style={{ '--d': '.08s' }}>
            {c.faq(TRIAL_DAYS).map(([q, a]) => <details key={q} className="glass"><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        {/* 9 · the closing line, the aurora comes up behind it */}
        <section className="end" data-scene="end">
          <div className="glow" aria-hidden="true" />
          <div className="wrap">
            <h2>{c.endH}</h2>
            <div className="cta"><a className="btn primary" href={start}>{startLabel}</a></div>
            <p className="fine">{trial ? c.endFineTrial : c.endFineNew(TRIAL_DAYS)}</p>
          </div>
        </section>
      </main>
      <Footer />
      <Scenes />
    </>
  );
}
