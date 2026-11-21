import { redirect } from 'next/navigation';
import { previewPassword, safeNext } from '@/lib/preview';
import { Logo } from '../chrome';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blotter – bald verfügbar', robots: { index: false, follow: false } };


// Shown to everyone until launch while the access lock (PREVIEW_PASSWORD) is active.
export default function AccessPage({ searchParams }) {
  const next = safeNext(typeof searchParams?.next === 'string' ? searchParams.next : '/');
  if (!previewPassword()) redirect(next);
  return (
    <>
      <header className="nav"><div className="wrap"><span className="logo"><Logo />Blotter</span></div></header>
      <main className="wrap center">
        <form className="card" method="post" action="/api/zugang">
          <span className="eyebrow">Bald verfügbar</span>
          <h1>Blotter startet bald.</h1>
          <p>Das Trading Journal ist gerade in der letzten Testphase. Zugang gibt es im Moment nur mit Passwort.</p>
          <input type="hidden" name="next" value={next} />
          <div className="fld">
            <label htmlFor="passwort">Passwort</label>
            <input className="inp" id="passwort" name="passwort" type="password" autoComplete="current-password" required autoFocus />
          </div>
          {searchParams?.fehler && <div className="msg err" role="alert">Das Passwort stimmt nicht.</div>}
          <button className="btn primary block" type="submit">Weiter</button>
        </form>
      </main>
      <footer className="foot"><div className="wrap"><span>© {new Date().getFullYear()} Blotter</span></div></footer>
    </>
  );
}
