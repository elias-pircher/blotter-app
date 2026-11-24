import { headers } from 'next/headers';
import { isLang } from '@/lib/i18n';

// The language the middleware picked for this request (x-lang), and the page's German address (x-path).
export function getLang() {
  const l = headers().get('x-lang');
  return isLang(l) ? l : 'de';
}
export const langChosen = () => headers().get('x-lang-set') === '1';
export const getPath = () => headers().get('x-path') || '/';
