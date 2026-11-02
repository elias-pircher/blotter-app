'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MARKUP } from './markup';
import { makeBackend } from './backend';
import { diag } from '@/lib/diag';

export default function Journal({ userId, email }) {
  useEffect(() => {
    if (window.__blotterBooted) return;
    window.__blotterBooted = true;
    diag('app-view');
    window.addEventListener('popstate', (e) => diag('popstate', { st: e.state ? (e.state.__NA ? 'next' : 'other') : 'null' }));
    window.addEventListener('pagehide', (e) => diag('app-pagehide', { persisted: e.persisted }));
    window.BlotterBackend = makeBackend(createClient(), userId, email);
    const s = document.createElement('script');
    s.src = '/journal/journal.js?v=9';
    s.async = false;
    document.body.appendChild(s);
  }, [userId, email]);
  return <div id="journal-root" dangerouslySetInnerHTML={{ __html: MARKUP }} suppressHydrationWarning />;
}
