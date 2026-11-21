import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, syncSubscription, isActive } from '@/lib/stripe';
import { PLANS, isPlan, planOf, planOfPrice, priceIdFor, FRIEND } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// Switching between "Journal" and "Journal + Backtesting" on a running subscription.
// GET  /api/plan?to=backtest  what the switch costs (nothing changes)
// POST /api/plan {to, prorationDate}  switches; an upgrade charges the difference for the rest of the month right away,
//      a downgrade credits the unused part to the next invoice. During the free trial a switch costs nothing
//      and the trial keeps its end date.

const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const isProration = (l) => l.proration === true || l.parent?.subscription_item_details?.proration === true || l.parent?.invoice_item_details?.proration === true;

async function load(to) {
  if (!isPlan(to)) return { err: fail('bad_plan') };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: fail('not_logged_in', 401) };
  const { data: row } = await supabase.from('subscriptions').select('status,price_id,plan,stripe_customer_id,stripe_subscription_id').eq('user_id', user.id).maybeSingle();
  if (!isActive(row)) return { err: fail('no_sub', 409) };
  if (planOf(row) === FRIEND) return { err: fail('friend', 409) };
  if (row.status === 'past_due') return { err: fail('past_due', 409) };
  if (!row.stripe_subscription_id) return { err: fail('no_sub', 409) };
  const newPrice = priceIdFor(to);
  if (!newPrice) return { err: fail('not_configured', 500) };
  const sub = await stripe().subscriptions.retrieve(row.stripe_subscription_id);
  const item = sub.items?.data?.[0];
  if (!item || !isActive(sub)) return { err: fail('no_sub', 409) };
  const from = planOfPrice(item.price);
  if (from === to) return { err: fail('same_plan', 409) };
  const end = item.current_period_end ?? sub.current_period_end;
  const start = item.current_period_start ?? sub.current_period_start;
  const trialing = sub.status === 'trialing' && !!sub.trial_end;
  return { user, sub, item, from, to, newPrice, upgrade: PLANS[to].cents > PLANS[from].cents, start, end, trialing };
}

export async function GET(req) {
  try {
    const c = await load(new URL(req.url).searchParams.get('to'));
    if (c.err) return c.err;
    if (c.trialing) {
      return NextResponse.json({
        from: c.from, to: c.to, upgrade: c.upgrade, trial: true,
        now: 0, credit: 0, monthly: PLANS[c.to].cents,
        next: new Date(c.sub.trial_end * 1000).toISOString(),
        canceling: !!c.sub.cancel_at_period_end,
        prorationDate: Math.floor(Date.now() / 1000),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const prorationDate = Math.floor(Date.now() / 1000);
    const inv = await stripe().invoices.createPreview({
      customer: typeof c.sub.customer === 'string' ? c.sub.customer : c.sub.customer?.id,
      subscription: c.sub.id,
      subscription_details: {
        items: [{ id: c.item.id, price: c.newPrice }],
        proration_date: prorationDate,
        proration_behavior: c.upgrade ? 'always_invoice' : 'create_prorations',
      },
    });
    const prorated = (inv.lines?.data || []).filter(isProration).reduce((a, l) => a + (l.amount || 0), 0);
    return NextResponse.json({
      from: c.from,
      to: c.to,
      upgrade: c.upgrade,
      now: c.upgrade ? Math.max(0, prorated) : 0,          // charged today
      credit: c.upgrade ? 0 : Math.max(0, -prorated),      // taken off the next invoice
      monthly: PLANS[c.to].cents,
      next: c.end ? new Date(c.end * 1000).toISOString() : null,
      canceling: !!c.sub.cancel_at_period_end,
      prorationDate,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Plan-Vorschau', e?.type || e?.code || 'Fehler');
    return fail('unavailable', 502);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const c = await load(body.to);
    if (c.err) return c.err;
    if (c.trialing) {
      // nothing has been charged yet, so there is nothing to prorate; the trial runs on to its end date
      const updated = await stripe().subscriptions.update(c.sub.id, {
        items: [{ id: c.item.id, price: c.newPrice }],
        proration_behavior: 'none',
      });
      const r = await syncSubscription(updated.id, c.user.id);
      return NextResponse.json({ status: 'ok', plan: r.plan });
    }
    // the same moment as the preview, so the charge matches what the customer saw (within the last hour, inside this period)
    const now = Math.floor(Date.now() / 1000);
    let pd = Number(body.prorationDate);
    if (!Number.isInteger(pd) || pd > now || pd < now - 3600 || (c.start && pd < c.start)) pd = now;
    const updated = await stripe().subscriptions.update(c.sub.id, {
      items: [{ id: c.item.id, price: c.newPrice }],
      proration_behavior: c.upgrade ? 'always_invoice' : 'create_prorations',
      proration_date: pd,
      // an upgrade only takes effect once the difference is paid
      payment_behavior: c.upgrade ? 'pending_if_incomplete' : 'allow_incomplete',
      expand: ['latest_invoice'],
    });
    if (updated.pending_update) {
      const url = updated.latest_invoice && typeof updated.latest_invoice === 'object' ? updated.latest_invoice.hosted_invoice_url : null;
      return NextResponse.json({ status: 'pay', url: url || null });
    }
    const r = await syncSubscription(updated.id, c.user.id);
    return NextResponse.json({ status: 'ok', plan: r.plan });
  } catch (e) {
    console.error('Planwechsel', e?.type || e?.code || 'Fehler');
    return fail('unavailable', 502);
  }
}
