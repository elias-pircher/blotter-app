import { Legal, Ph } from '../legal';
import { getLang } from '@/lib/i18n-server';
export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Legal notice – Blotter' : 'Impressum – Blotter' });
export default function Impressum() {
  if (getLang() === 'en') return (
    <Legal title="Legal notice">
      <p>Information pursuant to § 5 of the Austrian E-Commerce Act and disclosure pursuant to § 25 of the Austrian Media Act.</p>
      <h2>Provider</h2>
      <p><Ph>first and last name or company name</Ph><br /><Ph>street and number</Ph><br /><Ph>postcode, town</Ph>, Austria</p>
      <h2>Contact</h2>
      <p>E-mail: <Ph>contact@your-domain.com</Ph></p>
      <h2>Company details</h2>
      <p>Business purpose: provision of software for trading journals<br />
        VAT ID: <Ph>ATU… or “none”</Ph><br />
        Trade: <Ph>trade licence wording</Ph>, trade authority: <Ph>district authority / magistrate</Ph><br />
        Member of the Austrian Economic Chamber <Ph>federal state</Ph></p>
      <h2>Consumer dispute resolution</h2>
      <p>Consumers can submit complaints to the EU online dispute resolution platform or to the body responsible for the provider. <Ph>check the current wording</Ph></p>
      <h2>No investment advice</h2>
      <p>Blotter is a tool for recording your own trades. It does not provide investment, tax or legal advice.</p>
    </Legal>
  );
  return (
    <Legal title="Impressum">
      <p>Informationen gemäß § 5 E-Commerce-Gesetz und Offenlegung gemäß § 25 Mediengesetz.</p>
      <h2>Anbieter</h2>
      <p><Ph>Vor- und Nachname bzw. Firmenname</Ph><br /><Ph>Straße und Hausnummer</Ph><br /><Ph>PLZ Ort</Ph>, Österreich</p>
      <h2>Kontakt</h2>
      <p>E-Mail: <Ph>kontakt@deine-domain.at</Ph></p>
      <h2>Unternehmensangaben</h2>
      <p>Unternehmensgegenstand: Bereitstellung einer Software für Trading-Journale<br />
        UID-Nummer: <Ph>ATU… oder „keine“</Ph><br />
        Gewerbe: <Ph>Gewerbewortlaut</Ph>, Gewerbebehörde: <Ph>Bezirkshauptmannschaft / Magistrat</Ph><br />
        Mitglied der Wirtschaftskammer <Ph>Bundesland</Ph></p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU oder an die für den Anbieter zuständige Stelle zu richten. <Ph>Aktuellen Hinweis prüfen</Ph></p>
      <h2>Kein Anlageberatungsangebot</h2>
      <p>Blotter ist ein Werkzeug zur Dokumentation eigener Trades. Es gibt keine Anlage-, Steuer- oder Rechtsberatung.</p>
    </Legal>
  );
}
