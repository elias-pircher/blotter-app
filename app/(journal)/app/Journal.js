'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MARKUP } from './markup';
import { makeBackend } from './backend';

export default function Journal({ userId, email }) {
  useEffect(() => {
    if (window.__blotterBooted) return;
    window.__blotterBooted = true;
    window.BlotterBackend = makeBackend(createClient(), userId, email);
    const s = document.createElement('script');
    s.src = '/journal/journal.js?v=7';
    s.async = false;
    document.body.appendChild(s);
  }, [userId, email]);
  return <div id="journal-root" dangerouslySetInnerHTML={{ __html: MARKUP }} suppressHydrationWarning />;
}
