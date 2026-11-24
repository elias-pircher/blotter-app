// The three subscriptions. Prices live in Stripe; the IDs come from the environment
// (STRIPE_PRICE_ID for the journal, STRIPE_PRICE_ID_BACKTEST for journal + backtesting, STRIPE_PRICE_ID_PRO for Pro).
// The database keeps the plan in subscriptions.plan, which the row level security reads.

export const PLANS = {
  journal: {
    id: 'journal', name: 'Journal', cents: 799, price: '7,99\u00a0€', backtest: false, prop: false,
    short: 'Kalender, Learnings, Outlooks und Screenshots.',
  },
  backtest: {
    id: 'backtest', name: 'Journal + Backtesting', cents: 1499, price: '14,99\u00a0€', backtest: true, prop: false,
    short: 'Alles aus dem Journal, dazu Backtesting mit deinen eigenen Kursdaten.',
  },
  pro: {
    id: 'pro', name: 'Pro', cents: 2299, price: '22,99\u00a0€', backtest: true, prop: true,
    short: 'Journal und Backtesting, dazu Prop-Konten: backteste auf Futures- und CFD-Konten mit Lots, Kontrakten und Prop-Regeln.',
  },
};
// the plans in English (name and cents stay the same)
const EN = {
  journal: { price: '€7.99', short: 'Calendar, learnings, outlooks and screenshots.' },
  backtest: { price: '€14.99', short: 'Everything in the journal, plus backtesting with your own price data.' },
  pro: { price: '€22.99', short: 'Journal and backtesting, plus prop accounts: backtest on futures and CFD accounts with lots, contracts and prop rules.' },
};
// a plan with its texts in the language
export const planIn = (id, lang) => (lang === 'en' && EN[id] ? { ...PLANS[id], ...EN[id] } : PLANS[id]);
// what a plan adds on top of the one below it, for switch texts
export const FEATURE = { backtest: 'das Backtesting', prop: 'die Prop-Konten' };
const FEATURE_EN = { backtest: 'backtesting', prop: 'prop accounts' };
export const PLAN_IDS = Object.keys(PLANS);

// new customers try either plan for free first; the card is charged when the trial ends
export const TRIAL_DAYS = 3;
export const FRIEND = 'freund';

export const isPlan = (p) => PLAN_IDS.includes(p);
export const priceIdFor = (plan) => (plan === 'pro' ? process.env.STRIPE_PRICE_ID_PRO : plan === 'backtest' ? process.env.STRIPE_PRICE_ID_BACKTEST : process.env.STRIPE_PRICE_ID) || '';

// price object (or ID) of a subscription item -> plan
export function planOfPrice(price) {
  const id = typeof price === 'string' ? price : price?.id;
  if (id === FRIEND) return FRIEND;
  if (id && id === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (id && id === process.env.STRIPE_PRICE_ID_BACKTEST) return 'backtest';
  if (id && id === process.env.STRIPE_PRICE_ID) return 'journal';
  const meta = price && typeof price === 'object' ? price.metadata?.plan : null;
  return isPlan(meta) ? meta : 'journal';
}

// the plan of a subscriptions row; older rows without the column fall back to their price
export const planOf = (sub) => (!sub ? null : sub.price_id === FRIEND ? FRIEND : isPlan(sub.plan) ? sub.plan : planOfPrice(sub.price_id));
export const hasBacktest = (sub) => { const p = planOf(sub); return p === 'backtest' || p === 'pro' || p === FRIEND; };
export const hasProp = (sub) => { const p = planOf(sub); return p === 'pro' || p === FRIEND; };

// what changes when switching plans: features gained and lost, as words for a sentence
export function switchGain(from, to, lang = 'de') {
  const a = PLANS[from] || PLANS.journal, b = PLANS[to] || PLANS.journal, F = lang === 'en' ? FEATURE_EN : FEATURE;
  const gain = [], lose = [];
  for (const k of ['backtest', 'prop']) { if (b[k] && !a[k]) gain.push(F[k]); if (a[k] && !b[k]) lose.push(F[k]); }
  return { gain, lose };
}
// "das Backtesting und die Prop-Konten" / "backtesting and prop accounts"
export const andList = (l, lang = 'de') => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + (lang === 'en' ? ' and ' : ' und ') + l[l.length - 1]);

// "7,99 €" / "€7.99"
export const euro = (cents, lang = 'de') => {
  const a = Math.abs(Math.round(cents));
  const n = Math.floor(a / 100) + (lang === 'en' ? '.' : ',') + String(a % 100).padStart(2, '0');
  return (cents < 0 ? '−' : '') + (lang === 'en' ? '€' + n : n + '\u00a0€');
};
const LOC = (lang) => (lang === 'en' ? 'en-GB' : 'de-AT');
export const day = (iso, lang = 'de') => new Date(iso).toLocaleDateString(LOC(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' });
// "Dienstag, 24. November um 18:06 Uhr" / "Tuesday 24 November at 18:06"
export const when = (iso, lang = 'de') => {
  const d = new Date(iso);
  const tz = { timeZone: 'Europe/Vienna' };
  const date = d.toLocaleDateString(LOC(lang), { weekday: 'long', day: 'numeric', month: 'long', ...tz });
  const time = d.toLocaleTimeString(LOC(lang), { hour: '2-digit', minute: '2-digit', hour12: false, ...tz });
  return lang === 'en' ? date.replace(',', '') + ' at ' + time : date + ' um ' + time + ' Uhr';
};
// "24. November" / "24 November"
export const dayShort = (iso, lang = 'de') => new Date(iso).toLocaleDateString(LOC(lang), { day: 'numeric', month: 'long', timeZone: 'Europe/Vienna' });
// what is left of a trial: "noch 3 Tage", "noch 5 Stunden" / "3 days left", "5 hours left"
export function trialLeft(iso, now = Date.now(), lang = 'de') {
  const ms = new Date(iso).getTime() - now;
  const en = lang === 'en';
  if (!(ms > 0)) return en ? 'ends now' : 'endet jetzt';
  const h = Math.ceil(ms / 36e5);
  if (h < 24) return en ? (h === 1 ? '1 hour left' : `${h} hours left`) : h === 1 ? 'noch 1 Stunde' : `noch ${h} Stunden`;
  const d = Math.ceil(ms / 864e5);
  return en ? (d === 1 ? '1 day left' : `${d} days left`) : d === 1 ? 'noch 1 Tag' : `noch ${d} Tage`;
}
