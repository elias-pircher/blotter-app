'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MARKUP } from './markup';
import { makeBackend } from './backend';
import { trialLeft } from '@/lib/plans';

export default function Journal({ userId, email, friend, plan, trial }) {
  useEffect(() => {
    if (window.__blotterBooted) return;
    window.__blotterBooted = true;
    window.BlotterBackend = makeBackend(createClient(), userId, email, { friend: !!friend, plan, trial });
    // the free trial in the top bar: how much is left, a link to the subscription page
    const pill = document.getElementById('trial-pill');
    if (pill && trial) {
      const left = trialLeft(trial.end);
      // "noch 3 Tage"; on a phone the "noch" goes, so the top bar stays on one line
      const v = pill.querySelector('.tp-v');
      const m = /^noch (.+)$/.exec(left);
      v.textContent = '';
      if (m) { const n = document.createElement('span'); n.className = 'tp-n'; n.textContent = 'noch '; v.append(n, m[1]); } else v.textContent = left;
      pill.setAttribute('aria-label', `Kostenloser Test, ${left}, bis ${trial.until}. Zum Abo`);
      pill.title = trial.canceled ? `Gekündigt. Dein Test endet am ${trial.until}.` : `Kostenlos bis ${trial.until}`;
      pill.hidden = false;
    }
    const s = document.createElement('script');
    s.src = '/journal/journal.js?v=29';
    s.async = false;
    document.body.appendChild(s);
  }, [userId, email, friend, plan, trial]);
  return <div id="journal-root" dangerouslySetInnerHTML={{ __html: MARKUP }} suppressHydrationWarning />;
}
