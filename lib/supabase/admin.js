import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';
import { secret } from '@/lib/secrets';

// Server-only client with full rights. Used for subscription records written by Stripe.
export function createAdminClient() {
  const key = secret('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
