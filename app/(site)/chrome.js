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

export function Nav({ loggedIn }) {
  return (
    <header className="nav">
      <div className="wrap">
        <a className="logo" href="/"><Logo />Blotter</a>
        <nav className="links glass" aria-label="Seiten">
          <a href="/#funktionen">Funktionen</a>
          <a href="/#backtesting">Backtesting</a>
          <a href="/#preis">Preis</a>
          <a href="/#fragen">Fragen</a>
        </nav>
        <span className="sp" />
        {loggedIn
          ? <a className="btn sm primary" href="/app">Zum Journal</a>
          : <><a className="link hide-xs" href="/login">Anmelden</a><a className="btn sm primary" href="/login?next=/abo">Starten</a></>}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <a className="logo" href="/" style={{ fontSize: 15, color: 'var(--muted)' }}><Logo size={22} id="bm-foot" />Blotter</a>
        <nav aria-label="Rechtliches">
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
          <a href="/agb">AGB</a>
        </nav>
        <span>© {new Date().getFullYear()} Blotter</span>
      </div>
    </footer>
  );
}
