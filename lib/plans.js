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
// what a plan adds on top of the one below it, for switch texts
export const FEATURE = { backtest: 'das Backtesting', prop: 'die Prop-Konten' };
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
export function switchGain(from, to) {
  const a = PLANS[from] || PLANS.journal, b = PLANS[to] || PLANS.journal;
  const gain = [], lose = [];
  for (const k of ['backtest', 'prop']) { if (b[k] && !a[k]) gain.push(FEATURE[k]); if (a[k] && !b[k]) lose.push(FEATURE[k]); }
  return { gain, lose };
}
// "das Backtesting und die Prop-Konten"
export const andList = (l) => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' und ' + l[l.length - 1]);

export const euro = (cents) => {
  const a = Math.abs(Math.round(cents));
  return (cents < 0 ? '−' : '') + Math.floor(a / 100) + ',' + String(a % 100).padStart(2, '0') + '\u00a0€';
};
export const day = (iso) => new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' });
// "Dienstag, 24. November um 18:06 Uhr"
export const when = (iso) => {
  const d = new Date(iso);
  const tz = { timeZone: 'Europe/Vienna' };
  return d.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', ...tz }) + ' um ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', ...tz }) + ' Uhr';
};
// "24. November"
export const dayShort = (iso) => new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', timeZone: 'Europe/Vienna' });
// what is left of a trial: "noch 3 Tage", "noch 5 Stunden"
export function trialLeft(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  if (!(ms > 0)) return 'endet jetzt';
  const h = Math.ceil(ms / 36e5);
  if (h < 24) return h === 1 ? 'noch 1 Stunde' : `noch ${h} Stunden`;
  const d = Math.ceil(ms / 864e5);
  return d === 1 ? 'noch 1 Tag' : `noch ${d} Tage`;
}
