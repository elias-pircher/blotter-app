// Two languages: German (the default, at /…) and English (at /en/…). Safe to import on the client.
export const LANGS = ['de', 'en'];
export const LANG_COOKIE = 'lang';
export const isLang = (l) => l === 'de' || l === 'en';
export const LOCALE = { de: 'de-AT', en: 'en-GB' };

// t('Deutsch', 'English') picks the text for the language
export const tr = (lang) => (de, en) => (lang === 'en' ? en : de);

// The website pages that exist in both languages; the journal (/app) and the API keep one address.
export const SITE_PATHS = ['/', '/abo', '/abo/danke', '/agb', '/datenschutz', '/impressum', '/login', '/login/bestaetigen', '/login/fertig', '/zugang'];
const pathOnly = (p) => p.split(/[?#]/)[0] || '/';
export const isSitePath = (p) => SITE_PATHS.includes(pathOnly(p));

// a link to a website page in the given language: lp('en', '/abo?plan=pro') -> '/en/abo?plan=pro'
export function lp(lang, path) {
  if (lang !== 'en' || !isSitePath(path)) return path;
  return path === '/' ? '/en' : path.startsWith('/?') || path.startsWith('/#') ? '/en' + path.slice(1) : '/en' + path;
}
// the German address of a page, without the /en prefix
export const unprefix = (path) => (path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path.startsWith('/en?') || path.startsWith('/en#') ? '/' + path.slice(3) : path);

// the visitor's language from the Accept-Language header: 'de', 'en', or null when the browser does not say
export function fromAccept(header) {
  if (!header) return null;
  const list = header.split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((x) => x.trim()).find((x) => x.startsWith('q='));
    return { l: tag.trim().toLowerCase().split('-')[0], q: q ? parseFloat(q.slice(2)) : 1, i };
  }).filter((x) => x.l && x.l !== '*' && x.q > 0);
  if (!list.length) return null;
  list.sort((a, b) => b.q - a.q || a.i - b.i);
  return list[0].l === 'de' ? 'de' : 'en';
}

// prices: "7,99 €" / "€7.99"
export function money(lang, cents) {
  const a = Math.abs(Math.round(cents));
  const s = Math.floor(a / 100) + (lang === 'en' ? '.' : ',') + String(a % 100).padStart(2, '0');
  return (cents < 0 ? '−' : '') + (lang === 'en' ? '€' + s : s + ' €');
}
