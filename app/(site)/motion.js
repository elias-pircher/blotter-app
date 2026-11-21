'use client';
// Landing page scenes: every section plays with the scroll. Pinned stages report a progress from 0 to 1,
// the CSS turns it into motion; the month, the phone and the replay also change their content.
import { useEffect, useRef } from 'react';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ease = (t) => 1 - (1 - t) ** 3;

export function Scenes() {
  useEffect(() => {
    const reduce = reduced();
    const nav = document.querySelector('.nav');
    const root = document.documentElement;

    // entrances for what is not a scene: rises once when it comes into view
    let io = null;
    if (!reduce && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -8% 0px' });
      const vh = innerHeight;
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add('rv'); io.observe(el); }
      });
    }

    const scenes = [...document.querySelectorAll('[data-scene]')].map((el) => ({ el, kind: el.dataset.scene, stage: el.querySelector('.stage'), pinned: false, last: null }));
    const measure = () => scenes.forEach((s) => { s.pinned = !!s.stage && getComputedStyle(s.stage).position === 'sticky'; s.top = s.stage ? parseFloat(getComputedStyle(s.stage).top) || 0 : 0; });

    // the month: days in trading order, their results, the numbers beside them
    const cal = scenes.find((s) => s.kind === 'cal');
    const days = cal ? [...cal.el.querySelectorAll('.cd[data-k]')].sort((a, b) => a.dataset.k - b.dataset.k) : [];
    const sums = days.reduce((a, d) => { const l = a[a.length - 1]; a.push({ tp: l.tp + +d.dataset.tp, be: l.be + +d.dataset.be, sl: l.sl + +d.dataset.sl }); return a; }, [{ tp: 0, be: 0, sl: 0 }]);
    const v = (k) => cal && cal.el.querySelector(`[data-v="${k}"]`);
    const out = { n: v('n'), tp: v('tp'), be: v('be'), sl: v('sl'), wr: v('wr') };
    const dial = cal && cal.el.querySelector('.d1');

    const steps = scenes.find((s) => s.kind === 'steps');
    const stepLis = steps ? [...steps.el.querySelectorAll('.steps li')] : [];
    const stepImgs = steps ? [...steps.el.querySelectorAll('.phone2 img')] : [];

    const H = {
      // the hero text drifts up and fades as the journal comes in
      hero(s, vh) {
        const r = s.el.getBoundingClientRect(), q = reduce ? 0 : clamp(-r.top / Math.max(1, r.height * 0.9), 0, 1);
        s.el.style.setProperty('--q', q.toFixed(4));
      },
      // the journal rises from below, straightens and grows to full size
      shot(s, vh, p) {
        const r = s.el.getBoundingClientRect(), come = clamp((vh - r.top) / Math.max(1, vh - s.top), 0, 1);
        const e = reduce || !s.pinned ? 1 : ease(clamp(come * 0.3 + clamp(p / 0.65, 0, 1) * 0.7, 0, 1));
        s.el.style.setProperty('--e', e.toFixed(4));
      },
      words(s, vh, p) { s.el.style.setProperty('--p', clamp(p * 1.12, 0, 1).toFixed(4)); },
      cal(s, vh, p) {
        const k = Math.round(clamp(p / 0.88, 0, 1) * days.length);
        if (k === s.last) return; s.last = k;
        days.forEach((d, i) => { d.classList.toggle('on', i < k); d.classList.toggle('now', i === k - 1 && k < days.length); });
        const t = sums[k], n = t.tp + t.be + t.sl, wr = t.tp + t.sl ? Math.round(t.tp / (t.tp + t.sl) * 100) : 0;
        out.n.textContent = n; out.tp.textContent = t.tp; out.be.textContent = t.be; out.sl.textContent = t.sl; out.wr.textContent = wr + ' %';
        if (dial) dial.style.strokeDashoffset = String(100 - wr);
      },
      steps(s, vh, p) {
        s.el.style.setProperty('--p', p.toFixed(4));
        const i = Math.min(stepLis.length - 1, Math.floor(p * stepLis.length * 0.999));
        if (i === s.last) return;
        const back = s.last != null && i < s.last; s.last = i;
        s.el.classList.toggle('back', back);
        stepLis.forEach((li, j) => li.classList.toggle('on', j === i));
        stepImgs.forEach((im, j) => { im.classList.toggle('on', j === i); im.classList.toggle('past', j < i); });
      },
      // the closing line: wide and faint far down, tight and bright in the middle of the screen
      close(s, vh) {
        const r = s.el.getBoundingClientRect(), t = reduce ? 1 : clamp((vh - r.top) / (vh * 0.75), 0, 1);
        s.el.style.setProperty('--p', ease(t).toFixed(4));
      },
    };

    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', scrollY > 8);
      for (const s of scenes) {
        const f = H[s.kind]; if (!f) continue;
        if (reduce) { f(s, vh, 1); continue; }
        const r = s.el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        let p = 1;
        if (s.pinned) p = clamp((s.top - r.top) / Math.max(1, r.height - s.stage.offsetHeight), 0, 1);
        f(s, vh, p);
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const resize = () => { measure(); on(); };
    measure(); tick();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', resize);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', resize); if (raf) cancelAnimationFrame(raf); if (io) io.disconnect(); };
  }, []);
  return null;
}

/* ---------------------------------------------------------------- backtesting replay
   48 five-minute candles of the Nasdaq 100. 26 stand at the start; scrolling plays the rest:
   a long entry at candle 30, a dip toward the stop, then the run into the target at candle 45. */
const N = 48, START = 26, ENTRY_I = 30, HIT_I = 45, PLOT_W = 700, STEP = PLOT_W / N, BODY = 8;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PATH = [[0, 262], [6, 244], [11, 268], [16, 250], [21, 236], [25, 246], [29, 238], [31, 250], [34, 266], [36, 258], [39, 222], [42, 178], [45, 136], [47, 126]];
const target = (i) => { for (let k = 1; k < PATH.length; k++) { const [a, ya] = PATH[k - 1], [b, yb] = PATH[k]; if (i <= b) return ya + (yb - ya) * (i - a) / (b - a); } return PATH[PATH.length - 1][1]; };
const C = (() => {
  const r = rng(11), out = [];
  let prev = 258;
  for (let i = 0; i < N; i++) {
    const o = prev + (r() - 0.5) * 2;
    const c = target(i) + (r() - 0.5) * 16;
    const h = Math.min(o, c) - 2 - r() * 9, l = Math.max(o, c) + 2 + r() * 9;
    out.push({ o, c, h, l }); prev = c;
  }
  return out;
})();
const EN = C[ENTRY_I].o, SL = EN + 36, TP = EN - 86;           // y grows downward: the stop sits below, the target above
for (let i = ENTRY_I; i < HIT_I; i++) { C[i].h = Math.max(C[i].h, TP + 4); C[i].l = Math.min(C[i].l, SL - 4); C[i].c = clamp(C[i].c, TP + 6, SL - 6); C[i].o = clamp(C[i].o, TP + 6, SL - 6); }
C[HIT_I].h = TP - 5; C[HIT_I].c = Math.min(C[HIT_I].c, TP + 4);
const RR = (SL - EN) ? (EN - TP) / (SL - EN) : 0;
const price = (y) => 21600 - y * 0.5;
// numbers formatted by hand, so the server and every browser write exactly the same text
const de = (v, dec) => { const [i, f] = Math.abs(v).toFixed(dec).split('.'); return (v < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : ''); };
const fmtP = (y) => de(Math.round(price(y) * 4) / 4, 2);
const fmtR = (r) => (r > 0 ? '+' : '') + de(r, 1) + ' R';
const timeOf = (i) => { const m = 14 * 60 + i * 5; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const cx = (i) => i * STEP + STEP / 2;
const Y0 = 95, YH = 210;
const pY = (y) => ((y - Y0) / YH * 100).toFixed(2) + '%', pX = (x) => (x / 760 * 100).toFixed(2) + '%';
const AXIS = [120, 200, 300];
// the session's earlier trades, then this one
// 13 earlier trades: 8 in the target, 5 stopped out, +9,6 R together
const PREV = [1.2, -1, 2.4, -1, 2.4, 1.4, -1, 2.0, -1, 1.8, 2.4, -1, 1.0];
const EQ0 = PREV.reduce((a, r) => a.concat(Math.round((a[a.length - 1] + r) * 10) / 10), [0]);
const EQ1 = EQ0.concat(Math.round((EQ0[EQ0.length - 1] + RR) * 10) / 10);
const spark = (pts, n) => pts.map((v, i) => `${(i / (n - 1) * 200).toFixed(1)},${(52 - v / 12.5 * 46).toFixed(1)}`).join(' ');

export function Replay() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const stick = root.querySelector('.rp-stick'), win = root.querySelector('.rp-win');
    const g = [...root.querySelectorAll('.rp-c')];
    const pos = root.querySelector('.rp-pos'), zTp = root.querySelector('.rp-ztp'), zSl = root.querySelector('.rp-zsl');
    const lines = [...root.querySelectorAll('.rp-pl')];
    const q = (s) => root.querySelector(s);
    const live = q('.rp-live'), state = q('.rp-state'), time = q('.rp-hm'), bar = q('.rp-bar i'), hint = q('.rp-hint');
    const reduce = reduced();
    let last = -1, raf = 0;
    const draw = (p) => {
      const r = START + p * (N - START);               // candles shown, the last one still forming
      const k = Math.min(N - 1, Math.floor(r)), f = r >= N ? 1 : r - k;
      if (Math.abs(r - last) < 0.002) return; last = r;
      for (let i = 0; i < N; i++) {
        const el = g[i], d = C[i];
        if (i < k || (i === k && f > 0.02) || r >= N) {
          el.style.opacity = '1';
          const ff = i < k || r >= N ? 1 : f, e = 1 - (1 - ff) ** 2;
          const c = d.o + (d.c - d.o) * e;
          const hi = Math.min(d.o, c, d.o + (d.h - d.o) * Math.min(1, e * 1.3)), lo = Math.max(d.o, c, d.o + (d.l - d.o) * Math.min(1, e * 1.6));
          const up = c <= d.o, b = el.firstChild, w = el.lastChild;
          el.setAttribute('class', 'rp-c ' + (up ? 'up' : 'dn'));
          w.setAttribute('y1', hi.toFixed(1)); w.setAttribute('y2', lo.toFixed(1));
          b.setAttribute('y', Math.min(d.o, c).toFixed(1)); b.setAttribute('height', Math.max(1.2, Math.abs(c - d.o)).toFixed(1));
        } else el.style.opacity = '0';
      }
      // the position: placed at candle 30, closed in the target at candle 45
      const placed = r >= ENTRY_I + 0.15, hit = r >= HIT_I + 0.55;
      pos.classList.toggle('on', placed); root.classList.toggle('is-placed', placed); root.classList.toggle('is-hit', hit); root.classList.toggle('is-open', placed && !hit);
      const xEnd = hit ? cx(HIT_I) + STEP / 2 : Math.max(cx(ENTRY_I), cx(k) + STEP / 2);
      const w = Math.max(0, xEnd - cx(ENTRY_I) + STEP / 2);
      zTp.setAttribute('width', w.toFixed(1)); zSl.setAttribute('width', w.toFixed(1));
      lines.forEach((l) => l.setAttribute('x2', (cx(ENTRY_I) - STEP / 2 + w).toFixed(1)));
      const cur = C[k], cNow = cur.o + (cur.c - cur.o) * (1 - (1 - (r >= N ? 1 : f)) ** 2);
      const rNow = hit ? RR : placed ? (EN - cNow) / (SL - EN) : 0;
      live.textContent = placed ? fmtR(Math.round(rNow * 10) / 10) : '–';
      live.className = 'rp-live ' + (!placed ? '' : rNow > 0.05 ? 'pos' : rNow < -0.05 ? 'neg' : '');
      state.textContent = hit ? 'Geschlossen im Take Profit' : placed ? 'Long offen' : 'Warte auf dein Setup';
      time.textContent = timeOf(k);
      bar.style.transform = `scaleX(${(0.18 + p * 0.82).toFixed(4)})`;
      if (hint) hint.classList.toggle('gone', p > 0.04);
    };
    const tick = () => {
      raf = 0;
      if (reduce || getComputedStyle(stick).position !== 'sticky') { draw(1); return; }
      const tr = root.getBoundingClientRect(), top = parseFloat(getComputedStyle(stick).top) || 0;
      const span = tr.height - stick.offsetHeight;
      draw(clamp((top - tr.top) / Math.max(1, span) * 1.12 - 0.04, 0, 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    win.classList.add('ready');
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const yEN = EN.toFixed(1), xEN = (cx(ENTRY_I) - STEP / 2).toFixed(1);
  return (
    <div className="rp-track" ref={ref}>
      <div className="rp-stick">
        <div className="wrap">
          <div className="rp-win" role="img" aria-label="Backtesting in Blotter: Der Nasdaq 100 läuft Kerze für Kerze, ein Long-Trade wird eröffnet und schließt im Take Profit mit plus 2,4 R. Die Statistik der Session steigt danach auf 14 Trades, 64 Prozent Win-Rate und plus 12 R.">
            <div className="rp-top" aria-hidden="true">
              <span className="rp-tag">NQ</span><b>Nasdaq 100</b>
              <span className="rp-tfs"><i>1m</i><i className="on">5m</i><i>15m</i><i>1h</i><i>4h</i></span>
              <span className="rp-sp" />
              <span className="rp-time"><span className="rp-day">Do 16. Okt, </span><span className="rp-hm">{timeOf(START - 1)}</span></span>
            </div>
            <div className="rp-main" aria-hidden="true">
              <div className="rp-chart">
                <div className="rp-plot">
                  <svg viewBox={`0 ${Y0} 760 ${YH}`} preserveAspectRatio="none">
                    {AXIS.map((y) => <line key={y} className="rp-grid" x1="0" x2={PLOT_W} y1={y} y2={y} />)}
                    <g className="rp-pos">
                      <rect className="rp-ztp" x={xEN} y={TP.toFixed(1)} width="0" height={(EN - TP).toFixed(1)} />
                      <rect className="rp-zsl" x={xEN} y={yEN} width="0" height={(SL - EN).toFixed(1)} />
                      <line className="rp-pl tp" x1={xEN} x2={xEN} y1={TP.toFixed(1)} y2={TP.toFixed(1)} />
                      <line className="rp-pl en" x1={xEN} x2={xEN} y1={yEN} y2={yEN} />
                      <line className="rp-pl sl" x1={xEN} x2={xEN} y1={SL.toFixed(1)} y2={SL.toFixed(1)} />
                    </g>
                    {C.map((d, i) => (
                      <g key={i} className={'rp-c ' + (d.c <= d.o ? 'up' : 'dn')} style={{ opacity: i < START ? 1 : 0 }}>
                        <rect x={(cx(i) - BODY / 2).toFixed(1)} y={Math.min(d.o, d.c).toFixed(1)} width={BODY} height={Math.max(1.2, Math.abs(d.c - d.o)).toFixed(1)} rx="1" />
                        <line x1={cx(i).toFixed(1)} x2={cx(i).toFixed(1)} y1={d.h.toFixed(1)} y2={d.l.toFixed(1)} />
                      </g>
                    ))}
                  </svg>
                  <div className="rp-ov">
                    {AXIS.map((y) => <span key={y} className="rp-ax" style={{ top: pY(y) }}>{fmtP(y)}</span>)}
                    <span className="rp-tg tp" style={{ top: pY(TP) }}>TP</span>
                    <span className="rp-tg en" style={{ top: pY(EN) }}>Entry</span>
                    <span className="rp-tg sl" style={{ top: pY(SL) }}>SL</span>
                    <span className="rp-mk" style={{ left: pX(cx(ENTRY_I)), top: pY(C[ENTRY_I].l + 10) }}>Long</span>
                    <span className="rp-won" style={{ left: pX((cx(ENTRY_I) + cx(HIT_I)) / 2), top: pY(TP + 12) }}>{fmtR(Math.round(RR * 10) / 10)}</span>
                  </div>
                </div>
              </div>
              <div className="rp-side">
                <div className="rp-card">
                  <div className="rp-ch"><span className="rp-long">Long</span><span className="rp-state">Warte auf dein Setup</span></div>
                  <b className="rp-live">–</b>
                  <div className="rp-lv">
                    <span><small>Entry</small>{fmtP(EN)}</span><span><small>Stop</small>{fmtP(SL)}</span><span><small>Ziel</small>{fmtP(TP)}</span>
                  </div>
                </div>
                <div className="rp-card rp-stats">
                  <div className="rp-sg">
                    <span><small>Trades</small><b><i className="a">13</i><i className="b">14</i></b></span>
                    <span><small>Win-Rate</small><b><i className="a">62 %</i><i className="b">64 %</i></b></span>
                    <span className="pos"><small>Summe</small><b><i className="a">+9,6 R</i><i className="b">+12,0 R</i></b></span>
                  </div>
                  <svg className="rp-eq" viewBox="0 0 200 56" preserveAspectRatio="none">
                    <polyline className="b" points={spark(EQ1, EQ1.length)} />
                    <polyline className="a" points={spark(EQ0, EQ1.length)} />
                  </svg>
                </div>
                <div className="rp-card rp-list">
                  <small className="rp-lh">Trades dieser Session</small>
                  <ul>
                    <li className="new"><span className="rp-res tp">TP</span><span className="rp-tn">#14 Long</span><b className="pos">{fmtR(Math.round(RR * 10) / 10)}</b></li>
                    {PREV.slice(-3).reverse().map((r, i) => (
                      <li key={i}><span className={'rp-res ' + (r > 0 ? 'tp' : 'sl')}>{r > 0 ? 'TP' : 'SL'}</span><span className="rp-tn">#{13 - i} {i === 1 ? 'Short' : 'Long'}</span><b className={r > 0 ? 'pos' : 'neg'}>{fmtR(r)}</b></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="rp-ctrl" aria-hidden="true">
              <span className="rp-play"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg></span>
              <span className="rp-speed"><i>1×</i><i>2×</i><i className="on">5×</i><i>10×</i></span>
              <span className="rp-bar"><i /></span>
            </div>
          </div>
          <p className="rp-hint">Scroll weiter, der Markt läuft Kerze für Kerze.</p>
        </div>
      </div>
    </div>
  );
}
