// The two subscriptions. Prices live in Stripe; the IDs come from the environment
// (STRIPE_PRICE_ID for the journal, STRIPE_PRICE_ID_BACKTEST for journal + backtesting).
// The database keeps the plan in subscriptions.plan, which the row level security reads.

export const PLANS = {
  journal: {
    id: 'journal', name: 'Journal', cents: 799, price: '7,99\u00a0€', backtest: false,
    short: 'Kalender, Learnings, Outlooks und Screenshots.',
  },
  backtest: {
    id: 'backtest', name: 'Journal + Backtesting', cents: 1499, price: '14,99\u00a0€', backtest: true,
    short: 'Alles aus dem Journal, dazu Backtesting mit deinen eigenen Kursdaten.',
  },
};
export const PLAN_IDS = Object.keys(PLANS);
export const FRIEND = 'freund';

export const isPlan = (p) => PLAN_IDS.includes(p);
export const priceIdFor = (plan) => (plan === 'backtest' ? process.env.STRIPE_PRICE_ID_BACKTEST : process.env.STRIPE_PRICE_ID) || '';

// price object (or ID) of a subscription item -> plan
export function planOfPrice(price) {
  const id = typeof price === 'string' ? price : price?.id;
  if (id === FRIEND) return FRIEND;
  if (id && id === process.env.STRIPE_PRICE_ID_BACKTEST) return 'backtest';
  if (id && id === process.env.STRIPE_PRICE_ID) return 'journal';
  const meta = price && typeof price === 'object' ? price.metadata?.plan : null;
  return isPlan(meta) ? meta : 'journal';
}

// the plan of a subscriptions row; older rows without the column fall back to their price
export const planOf = (sub) => (!sub ? null : sub.price_id === FRIEND ? FRIEND : isPlan(sub.plan) ? sub.plan : planOfPrice(sub.price_id));
export const hasBacktest = (sub) => { const p = planOf(sub); return p === 'backtest' || p === FRIEND; };

export const euro = (cents) => {
  const a = Math.abs(Math.round(cents));
  return (cents < 0 ? '−' : '') + Math.floor(a / 100) + ',' + String(a % 100).padStart(2, '0') + '\u00a0€';
};
export const day = (iso) => new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' });
