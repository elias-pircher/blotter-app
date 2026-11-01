export function Logo({ size = 24 }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 15v9M14 9v14M22 2v15" /></g>
      <g fill="currentColor"><rect x="3.5" y="17" width="5" height="5" rx="1" /><rect x="11.5" y="11" width="5" height="8" rx="1" /><rect x="19.5" y="4" width="5" height="10" rx="1" /></g>
    </svg>
  );
}

export function Nav({ loggedIn }) {
  return (
    <header className="nav">
      <div className="wrap">
        <a className="logo" href="/"><Logo />Blotter</a>
        <span className="sp" />
        <a className="link hide-sm" href="/#preis">Preis</a>
        <a className="link hide-sm" href="/#fragen">Fragen</a>
        {loggedIn
          ? <a className="btn sm primary" href="/app">Zum Journal</a>
          : <><a className="link" href="/login">Anmelden</a><a className="btn sm primary" href="/login?next=/abo">Starten</a></>}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <span>© {new Date().getFullYear()} Blotter</span>
        <nav aria-label="Rechtliches">
          <a href="/impressum">Impressum</a>
          <a href="/datenschutz">Datenschutz</a>
          <a href="/agb">AGB</a>
        </nav>
      </div>
    </footer>
  );
}
