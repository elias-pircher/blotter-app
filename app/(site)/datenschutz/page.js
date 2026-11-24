import { Legal, Ph } from '../legal';
import { getLang } from '@/lib/i18n-server';
export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Privacy – Blotter' : 'Datenschutz – Blotter' });
export default function Datenschutz() {
  if (getLang() === 'en') return (
    <Legal title="Privacy policy">
      <h2>Controller</h2>
      <p><Ph>name, address, e-mail as in the legal notice</Ph></p>
      <h2>What data we process</h2>
      <ul>
        <li>Account: e-mail address, login times.</li>
        <li>Journal content: trades, learnings, outlooks, screenshots and your settings. This content is visible only to you.</li>
        <li>Plan: subscription status and payment references. Card details are processed only by Stripe; we never see them.</li>
      </ul>
      <h2>Purpose and legal basis</h2>
      <p>We process this data to provide the journal to you and to bill the plan (performance of a contract, Art. 6(1)(b) GDPR). <Ph>check and complete</Ph></p>
      <h2>Processors</h2>
      <ul>
        <li>Supabase (database, login, file storage), server location <Ph>Frankfurt, EU</Ph></li>
        <li>Stripe (payment processing)</li>
        <li>Vercel (website hosting)</li>
        <li><Ph>e-mail delivery service, e.g. Resend</Ph></li>
      </ul>
      <p><Ph>Add information on data transfers to third countries and the respective safeguards</Ph></p>
      <h2>Storage period</h2>
      <p><Ph>e.g. until the account is deleted; billing data according to statutory retention obligations</Ph></p>
      <h2>Your rights</h2>
      <p>You have the right to access, rectification, erasure, restriction, data portability and objection, as well as the right to lodge a complaint with the Austrian Data Protection Authority. Write to us at <Ph>contact@your-domain.com</Ph>.</p>
      <h2>Cookies</h2>
      <p>We only use technically necessary cookies for logging in and for remembering your language. No advertising or tracking cookies.</p>
    </Legal>
  );
  return (
    <Legal title="Datenschutzerklärung">
      <h2>Verantwortlicher</h2>
      <p><Ph>Name, Anschrift, E-Mail wie im Impressum</Ph></p>
      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse, Anmeldezeitpunkte.</li>
        <li>Journal-Inhalte: Trades, Learnings, Outlooks, Screenshots und deine Einstellungen. Diese Inhalte sind nur für dich sichtbar.</li>
        <li>Abo: Abo-Status und Zahlungsreferenzen. Kartendaten verarbeitet ausschließlich Stripe, wir sehen sie nicht.</li>
      </ul>
      <h2>Zweck und Rechtsgrundlage</h2>
      <p>Wir verarbeiten diese Daten, um dir das Journal bereitzustellen und das Abo abzurechnen (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO). <Ph>prüfen und ergänzen</Ph></p>
      <h2>Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase (Datenbank, Anmeldung, Dateispeicher), Serverstandort <Ph>Frankfurt, EU</Ph></li>
        <li>Stripe (Zahlungsabwicklung)</li>
        <li>Vercel (Hosting der Website)</li>
        <li><Ph>E-Mail-Versanddienst, z. B. Resend</Ph></li>
      </ul>
      <p><Ph>Hinweise zu Datenübermittlungen in Drittländer und den jeweiligen Garantien ergänzen</Ph></p>
      <h2>Speicherdauer</h2>
      <p><Ph>z. B. bis zur Löschung des Kontos; Rechnungsdaten nach gesetzlicher Aufbewahrungspflicht</Ph></p>
      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht, dich bei der Österreichischen Datenschutzbehörde zu beschweren. Schreib uns an <Ph>kontakt@deine-domain.at</Ph>.</p>
      <h2>Cookies</h2>
      <p>Wir verwenden nur technisch notwendige Cookies für die Anmeldung und um deine Sprache zu merken. Keine Werbe- oder Tracking-Cookies.</p>
    </Legal>
  );
}
