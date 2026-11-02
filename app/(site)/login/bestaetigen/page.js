import { Nav, Footer } from '../../chrome';

export const metadata = { title: 'Anmelden – Blotter', robots: { index: false } };
export const dynamic = 'force-dynamic';

const OTP_TYPES = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'];
const str = (v) => (typeof v === 'string' ? v : '');

// Landing page for the button in the login e-mail. Opening it (as mail scanners do) changes nothing;
// only the click on "Jetzt anmelden" uses the one-time link.
export default function ConfirmLoginPage({ searchParams }) {
  const tokenHash = str(searchParams?.token_hash).slice(0, 200);
  const type = OTP_TYPES.includes(str(searchParams?.type)) ? str(searchParams.type) : 'email';
  const n = str(searchParams?.next);
  const next = n.startsWith('/') && !n.startsWith('//') ? n : '/app';
  const signup = type === 'signup';
  return (
    <>
      <Nav />
      <main className="wrap center">
        {tokenHash ? (
          <form className="card" method="post" action="/auth/callback">
            <span className="eyebrow">Fast geschafft</span>
            <h1>{signup ? 'E-Mail bestätigen' : 'Anmeldung abschließen'}</h1>
            <p>Klick auf den Button, dann bist du in deinem Trading Journal angemeldet.</p>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button className="btn primary block" type="submit" autoFocus>Jetzt anmelden</button>
            <p className="muted">Dieser Zwischenschritt schützt deinen Link: Manche E-Mail-Programme öffnen Links vorab automatisch und würden ihn sonst verbrauchen.</p>
          </form>
        ) : (
          <div className="card">
            <span className="eyebrow">Anmeldung</span>
            <h1>Der Link ist unvollständig.</h1>
            <p>Öffne den Button in der E-Mail nochmal oder fordere eine neue E-Mail an.</p>
            <a className="btn primary block" href="/login">Neue E-Mail anfordern</a>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
