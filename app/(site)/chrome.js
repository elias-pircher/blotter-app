import { getLang, getPath } from '@/lib/i18n-server';
import { lp, tr } from '@/lib/i18n';

export function Logo({ size = 26, id = 'bm' }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset=".55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect width="26" height="26" rx="8" fill={`url(#${id})`} />
      <rect x="6" y="12" width="3.5" height="7" rx="1" fill="#05070F" />
      <rect x="11.25" y="8" width="3.5" height="9" rx="1" fill="#05070F" />
      <rect x="16.5" y="5" width="3.5" height="8" rx="1" fill="#05070F" />
    </svg>
  );
}

// the link that opens this page in the other language
export const switchHref = (to, path) => `/api/lang?to=${to}&next=${encodeURIComponent(path)}`;

export function Nav({ loggedIn }) {
  const lang = getLang(), t = tr(lang), L = (p) => lp(lang, p), other = lang === 'en' ? 'de' : 'en';
  return (
    <header className="nav">
      <div className="wrap">
        <a className="logo" href={L('/')}><Logo />Blotter</a>
        <nav className="links glass" aria-label={t('Seiten', 'Pages')}>
          <a href={L('/#funktionen')}>{t('Funktionen', 'Features')}</a>
          <a href={L('/#backtesting')}>Backtesting</a>
          <a href={L('/#prop')}>{t('Prop-Konten', 'Prop accounts')}</a>
          <a href={L('/#preis')}>{t('Preis', 'Pricing')}</a>
          <a href={L('/#fragen')}>{t('Fragen', 'FAQ')}</a>
        </nav>
        <span className="sp" />
        <a className="link lang-sw" href={switchHref(other, getPath())} hrefLang={other} lang={other}
          aria-label={other === 'en' ? 'English version' : 'Deutsche Version'} title={other === 'en' ? 'English' : 'Deutsch'}>{other.toUpperCase()}</a>
        {loggedIn
          ? <a className="btn sm primary" href="/app">{t('Zum Journal', 'Open journal')}</a>
          : <><a className="link hide-xs" href={L('/login')}>{t('Anmelden', 'Log in')}</a><a className="btn sm primary" href={L('/login') + '?next=' + L('/abo')}>{t('Kostenlos testen', 'Try it free')}</a></>}
      </div>
    </header>
  );
}

export function Footer() {
  const lang = getLang(), t = tr(lang), L = (p) => lp(lang, p), path = getPath();
  return (
    <footer className="foot">
      <div className="wrap">
        <a className="logo" href={L('/')} style={{ fontSize: 15, color: 'var(--muted)' }}><Logo size={22} id="bm-foot" />Blotter</a>
        <nav aria-label={t('Rechtliches', 'Legal')}>
          <a href={L('/impressum')}>{t('Impressum', 'Legal notice')}</a>
          <a href={L('/datenschutz')}>{t('Datenschutz', 'Privacy')}</a>
          <a href={L('/agb')}>{t('AGB', 'Terms')}</a>
        </nav>
        <span className="foot-lang" aria-label={t('Sprache', 'Language')}>
          {lang === 'de' ? <b>Deutsch</b> : <a href={switchHref('de', path)} hrefLang="de" lang="de">Deutsch</a>}
          {lang === 'en' ? <b>English</b> : <a href={switchHref('en', path)} hrefLang="en" lang="en">English</a>}
        </span>
        <span>© {new Date().getFullYear()} Blotter</span>
      </div>
    </footer>
  );
}
