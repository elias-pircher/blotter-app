// Access lock until launch. Active only while the env var PREVIEW_PASSWORD is set.
// The browser keeps a cookie with a keyed hash of the password (never the password itself).
export const PREVIEW_COOKIE = 'blotter_zugang';
export const PREVIEW_OPEN = ['/zugang', '/api/zugang'];

export function previewPassword() {
  const v = process.env.PREVIEW_PASSWORD;
  return v ? v.trim() : '';
}

export async function previewToken(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('blotter-preview-v1'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// constant-time comparison of two hex strings
export function sameToken(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/zugang') ? n : '/');
