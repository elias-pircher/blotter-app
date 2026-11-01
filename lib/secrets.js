// Reads a secret from the environment and forgives common copy-paste slips:
// spaces or line breaks (also inside the value; keys never contain any) and surrounding quotes.
export function secret(name) {
  const v = process.env[name];
  if (!v) return '';
  return v.replace(/\s+/g, '').replace(/^["'`]+|["'`]+$/g, '');
}
