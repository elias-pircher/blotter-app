import { Nav, Footer } from '../../chrome';
import { getLang } from '@/lib/i18n-server';
import { lp, tr } from '@/lib/i18n';

export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Log in – Blotter' : 'Anmelden – Blotter', robots: { index: false } });
export const dynamic = 'force-dynamic';

const OTP_TYPES = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'];
const str = (v) => (typeof v === 'string' ? v : '');

// Landing page for the button in the login e-mail. Opening it (as mail scanners do) changes nothing;
// only the click on "Jetzt anmelden" uses the one-time link.
export default function ConfirmLoginPage({ searchParams }) {
  const lang = getLang(), t = tr(lang);
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
          <form className="card" method="post" action={next.startsWith('/freund/') ? '/auth/callback?next=' + encodeURIComponent(next) : '/auth/callback'}>
            <span className="eyebrow">{t('Fast geschafft', 'Almost there')}</span>
            <h1>{signup ? t('E-Mail bestätigen', 'Confirm your e-mail') : t('Anmeldung abschließen', 'Finish logging in')}</h1>
            <p>{t('Klick auf den Button, dann bist du in deinem Trading Journal angemeldet.', 'Click the button and you are logged in to your trading journal.')}</p>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="lang" value={lang} />
            <button className="btn primary block" type="submit" autoFocus>{t('Jetzt anmelden', 'Log in now')}</button>
            <p className="muted">{t('Dieser Zwischenschritt schützt deinen Link: Manche E-Mail-Programme öffnen Links vorab automatisch und würden ihn sonst verbrauchen.', 'This extra step protects your link: some e-mail programs open links automatically in advance and would otherwise use it up.')}</p>
          </form>
        ) : (
          <div className="card">
            <span className="eyebrow">{t('Anmeldung', 'Log in')}</span>
            <h1>{t('Der Link ist unvollständig.', 'The link is incomplete.')}</h1>
            <p>{t('Öffne den Button in der E-Mail nochmal oder fordere eine neue E-Mail an.', 'Open the button in the e-mail again or request a new e-mail.')}</p>
            <a className="btn primary block" href={lp(lang, '/login')}>{t('Neue E-Mail anfordern', 'Request a new e-mail')}</a>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
