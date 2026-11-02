'use client';
// Temporary diagnostics for the Safari login issue: tells the server how a page was reached
// and whether a login cookie exists (yes/no only, never its value).
export function diag(ev, extra) {
  try {
    const nav = (performance.getEntriesByType('navigation')[0] || {}).type || '';
    let ref = '';
    try { ref = document.referrer ? new URL(document.referrer).origin === location.origin ? new URL(document.referrer).pathname : new URL(document.referrer).host : ''; } catch (e) {}
    const body = JSON.stringify(Object.assign({ ev, nav, ref, path: location.pathname, hash: location.hash, sb: /(^|; )sb-[^=]*-auth-token/.test(document.cookie), t: new Date().toISOString() }, extra || {}));
    if (navigator.sendBeacon) navigator.sendBeacon('/api/diag', body); else fetch('/api/diag', { method: 'POST', body, keepalive: true });
  } catch (e) { /* diagnostics must never break the page */ }
}
