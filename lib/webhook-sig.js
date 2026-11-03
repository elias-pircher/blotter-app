import crypto from 'node:crypto';

// Checks a signed webhook in the "Standard Webhooks" format. Supabase Auth Hooks use it
// (headers webhook-id/-timestamp/-signature), and so do Resend webhooks via Svix (svix-id/-timestamp/-signature).
// The secret looks like "v1,whsec_<base64>" (Supabase) or "whsec_<base64>" (Resend).
export function verifySignedWebhook({ secret, id, timestamp, signature, body, toleranceSec = 300 }) {
  if (!secret || !id || !timestamp || !signature || typeof body !== 'string') return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  if (!key.length) return false;
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();
  for (const part of String(signature).split(' ')) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    const given = Buffer.from(sig, 'base64');
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return true;
  }
  return false;
}

export function headersFrom(req, prefix) {
  return {
    id: req.headers.get(`${prefix}-id`),
    timestamp: req.headers.get(`${prefix}-timestamp`),
    signature: req.headers.get(`${prefix}-signature`),
  };
}
