import { redirect } from 'next/navigation';
import { previewPassword, safeNext } from '@/lib/preview';
import { Logo } from '../chrome';
import { getLang } from '@/lib/i18n-server';
import { tr } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Blotter – coming soon' : 'Blotter – bald verfügbar', robots: { index: false, follow: false } });


// Shown to everyone until launch while the access lock (PREVIEW_PASSWORD) is active.
export default function AccessPage({ searchParams }) {
  const lang = getLang(), t = tr(lang);
  const next = safeNext(typeof searchParams?.next === 'string' ? searchParams.next : '/');
  if (!previewPassword()) redirect(next);
  return (
    <>
      <header className="nav"><div className="wrap"><span className="logo"><Logo />Blotter</span></div></header>
      <main className="wrap center">
        <form className="card" method="post" action="/api/zugang">
          <span className="eyebrow">{t('Bald verfügbar', 'Coming soon')}</span>
          <h1>{t('Blotter startet bald.', 'Blotter launches soon.')}</h1>
          <p>{t('Das Trading Journal ist gerade in der letzten Testphase. Zugang gibt es im Moment nur mit Passwort.', 'The trading journal is in its final testing phase. For now, access is by password only.')}</p>
          <input type="hidden" name="next" value={next} />
          <div className="fld">
            <label htmlFor="passwort">{t('Passwort', 'Password')}</label>
            <input className="inp" id="passwort" name="passwort" type="password" autoComplete="current-password" required autoFocus />
          </div>
          {searchParams?.fehler && <div className="msg err" role="alert">{t('Das Passwort stimmt nicht.', 'The password is wrong.')}</div>}
          <button className="btn primary block" type="submit">{t('Weiter', 'Continue')}</button>
        </form>
      </main>
      <footer className="foot"><div className="wrap"><span>© {new Date().getFullYear()} Blotter</span></div></footer>
    </>
  );
}
