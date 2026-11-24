import { Nav, Footer } from './chrome';
import { getLang, getPath } from '@/lib/i18n-server';

export function Legal({ title, children }) {
  const en = getLang() === 'en';
  return (
    <>
      <Nav />
      <main className="wrap legal">
        <h1>{title}</h1>
        {en
          ? <div className="draft"><b>Draft.</b> Parts marked in red are placeholders. Before launch, fill them in completely and have them checked by a professional (e.g. a lawyer or WKO advice).</div>
          : <div className="draft"><b>Entwurf.</b> Rot markierte Stellen sind Platzhalter. Vor dem Start bitte vollständig ausfüllen und von einer Fachperson (z. B. Rechtsanwalt oder WKO-Beratung) prüfen lassen.</div>}
        {en && <p className="binding">This is a translation for your convenience. Only the <a href={getPath()} hrefLang="de" lang="de">German version</a> is legally binding.</p>}
        {children}
      </main>
      <Footer />
    </>
  );
}
export const Ph = ({ children }) => <span className="ph">[{children}]</span>;
