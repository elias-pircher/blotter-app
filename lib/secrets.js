// Reads a secret from the environment and forgives common copy-paste slips:
// spaces or line breaks around the value and surrounding quotes.
export function secret(name) {
  const v = process.env[name];
  if (!v) return '';
  return v.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
}
