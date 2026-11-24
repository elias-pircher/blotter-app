'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { makeBackend } from './backend';
import { trialLeft } from '@/lib/plans';

// lang: 'de' or 'en'; markup: the journal's HTML in that language (picked on the server)
export default function Journal({ userId, email, friend, plan, trial, lang = 'de', markup }) {
  useEffect(() => {
    if (window.__blotterBooted) return;
    window.__blotterBooted = true;
    const en = lang === 'en';
    document.documentElement.lang = en ? 'en' : 'de';
    window.BlotterBackend = makeBackend(createClient(), userId, email, { friend: !!friend, plan, trial, lang });
    // the free trial in the top bar: how much is left, a link to the subscription page
    const pill = document.getElementById('trial-pill');
    if (pill && trial) {
      const left = trialLeft(trial.end, undefined, lang);
      // "noch 3 Tage" / "3 days left"; on a phone the "noch" / "left" goes, so the top bar stays on one line
      const v = pill.querySelector('.tp-v');
      const n = document.createElement('span');
      n.className = 'tp-n';
      v.textContent = '';
      const m = en ? /^(.+) left$/.exec(left) : /^noch (.+)$/.exec(left);
      if (m && en) { n.textContent = ' left'; v.append(m[1], n); }
      else if (m) { n.textContent = 'noch '; v.append(n, m[1]); }
      else v.textContent = left;
      if (en) pill.querySelector('.tp-l').textContent = 'Trial';
      if (en) pill.setAttribute('href', '/en/abo');
      pill.setAttribute('aria-label', en ? `Free trial, ${left}, until ${trial.until}. Open plan` : `Kostenloser Test, ${left}, bis ${trial.until}. Zum Abo`);
      pill.title = trial.canceled
        ? (en ? `Cancelled. Your trial ends on ${trial.until}.` : `Gekündigt. Dein Test endet am ${trial.until}.`)
        : (en ? `Free until ${trial.until}` : `Kostenlos bis ${trial.until}`);
      pill.hidden = false;
    }
    const s = document.createElement('script');
    s.src = en ? '/journal/journal.en.js?v=32' : '/journal/journal.js?v=32';
    s.async = false;
    document.body.appendChild(s);
  }, [userId, email, friend, plan, trial, lang]);
  return <div id="journal-root" dangerouslySetInnerHTML={{ __html: markup }} suppressHydrationWarning />;
}
