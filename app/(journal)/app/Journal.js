'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MARKUP } from './markup';
import { makeBackend } from './backend';

export default function Journal({ userId, email, friend, plan }) {
  useEffect(() => {
    if (window.__blotterBooted) return;
    window.__blotterBooted = true;
    window.BlotterBackend = makeBackend(createClient(), userId, email, { friend: !!friend, plan });
    const s = document.createElement('script');
    s.src = '/journal/journal.js?v=27';
    s.async = false;
    document.body.appendChild(s);
  }, [userId, email, friend, plan]);
  return <div id="journal-root" dangerouslySetInnerHTML={{ __html: MARKUP }} suppressHydrationWarning />;
}
