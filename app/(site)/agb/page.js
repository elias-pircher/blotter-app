import { Legal, Ph } from '../legal';
import { getLang } from '@/lib/i18n-server';
export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Terms – Blotter' : 'AGB – Blotter' });
export default function AGB() {
  if (getLang() === 'en') return (
    <Legal title="Terms and conditions">
      <h2>1. Scope</h2>
      <p>These terms apply to the use of Blotter, offered by <Ph>name/company</Ph>.</p>
      <h2>2. Service</h2>
      <p>Blotter is an online trading journal. It records your own trades, learnings and outlooks and does not provide investment advice. The “Journal + Backtesting” plan adds backtesting: replaying historical price movements with price data the customer imports themselves. The “Pro” plan adds prop accounts: simulated futures and CFD accounts on which backtesting is calculated with contract sizes, costs and rules as is common with brokers and prop firms. This is a simulation with a fictitious balance; no real orders are placed, and the results say nothing about future results with a broker or a prop firm.</p>
      <h2>3. Price and payment</h2>
      <p>There are three plans: “Journal” for €7.99 a month, “Journal + Backtesting” for €14.99 a month and “Pro” for €22.99 a month <Ph>incl. VAT or note on the small business scheme</Ph>. The plan is billed monthly in advance through Stripe.</p>
      <p>New customers can try Blotter free for 3 days, once per customer. At the start of the trial a payment method is added; nothing is charged during the trial. If the trial ends without cancellation, the chosen plan starts automatically and the first monthly amount is charged at the end of the trial. Anyone who cancels during the trial pays nothing; access ends when the trial ends. Blotter informs you of the exact end date by e-mail.</p>
      <p>Switching between plans is possible at any time and takes effect immediately. During the trial a switch is free and does not change the end date of the trial. When switching to a more expensive plan, the price difference for the rest of the current billing month is charged pro rata right away. When switching to a cheaper plan, the unused part is credited pro rata on the next invoice; saved backtesting data and prop accounts are kept.</p>
      <h2>4. Term and cancellation</h2>
      <p>The plan renews for one month at a time and can be cancelled at any time with effect from the end of the current billing month, directly in the journal under Settings. During the free trial, cancellation is possible until the end of the trial.</p>
      <h2>5. Right of withdrawal for consumers</h2>
      <p><Ph>Insert information on the right of withdrawal under FAGG including the model withdrawal form</Ph></p>
      <p>If the consumer expressly requests that the service start immediately and confirms their knowledge of losing the right of withdrawal, the right of withdrawal expires when the service begins. <Ph>have the wording checked</Ph></p>
      <h2>6. Availability</h2>
      <p><Ph>Provisions on availability and maintenance</Ph></p>
      <h2>7. Liability</h2>
      <p><Ph>Liability provisions</Ph></p>
      <h2>8. Data after cancellation</h2>
      <p><Ph>e.g. data is kept for 30 days and can be exported, then deleted</Ph></p>
      <h2>9. Final provisions</h2>
      <p>Austrian law applies, excluding its conflict-of-law rules; mandatory consumer protection provisions remain unaffected. <Ph>check</Ph></p>
    </Legal>
  );
  return (
    <Legal title="Allgemeine Geschäftsbedingungen">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung von Blotter, angeboten von <Ph>Name/Firma</Ph>.</p>
      <h2>2. Leistung</h2>
      <p>Blotter ist ein Online-Trading-Journal. Es dokumentiert eigene Trades, Learnings und Outlooks und bietet keine Anlageberatung. Im Abo „Journal + Backtesting“ kommt das Backtesting hinzu: das Nachspielen historischer Kursverläufe mit vom Kunden selbst importierten Kursdaten. Im Abo „Pro“ kommen Prop-Konten hinzu: simulierte Futures- und CFD-Konten, auf denen das Backtesting mit Kontraktgrößen, Kosten und Regeln gerechnet wird, wie sie bei Brokern und Prop-Firmen üblich sind. Es handelt sich um eine Simulation mit fiktivem Guthaben; es werden keine echten Orders ausgeführt, und die Ergebnisse sagen nichts über künftige Ergebnisse bei einem Broker oder einer Prop-Firma aus.</p>
      <h2>3. Preis und Zahlung</h2>
      <p>Es gibt drei Abos: „Journal“ für 7,99 € pro Monat, „Journal + Backtesting“ für 14,99 € pro Monat und „Pro“ für 22,99 € pro Monat <Ph>inkl. USt. oder Hinweis Kleinunternehmerregelung</Ph>. Das Abo wird monatlich im Voraus über Stripe abgerechnet.</p>
      <p>Neukunden können Blotter 3 Tage kostenlos testen, einmal pro Kunde. Zu Beginn des Tests wird eine Zahlungsmethode hinterlegt; während des Tests wird nichts abgebucht. Endet der Test ohne Kündigung, beginnt das gewählte Abo automatisch, und der erste Monatsbetrag wird am Ende des Tests abgebucht. Wer während des Tests kündigt, zahlt nichts; der Zugang endet mit dem Ende des Tests. Über das genaue Enddatum informiert Blotter per E-Mail.</p>
      <p>Ein Wechsel zwischen den Abos ist jederzeit möglich und gilt sofort. Während des Tests ist der Wechsel kostenlos und ändert das Enddatum des Tests nicht. Beim Wechsel zu einem teureren Abo wird die Preisdifferenz für den Rest des laufenden Abrechnungsmonats sofort anteilig berechnet. Beim Wechsel zu einem günstigeren Abo wird der nicht genutzte Teil anteilig mit der nächsten Abrechnung verrechnet; gespeicherte Backtesting-Daten und Prop-Konten bleiben erhalten.</p>
      <h2>4. Laufzeit und Kündigung</h2>
      <p>Das Abo verlängert sich jeweils um einen Monat und kann jederzeit zum Ende des laufenden Abrechnungsmonats gekündigt werden, direkt im Journal unter Einstellungen. Während des kostenlosen Tests ist eine Kündigung bis zum Ende des Tests möglich.</p>
      <h2>5. Rücktrittsrecht für Verbraucher</h2>
      <p><Ph>Belehrung über das Rücktrittsrecht nach FAGG einschließlich Muster-Rücktrittsformular einfügen</Ph></p>
      <p>Verlangt der Verbraucher ausdrücklich den sofortigen Beginn der Leistung und bestätigt er seine Kenntnis vom Verlust des Rücktrittsrechts, erlischt das Rücktrittsrecht mit Beginn der Leistung. <Ph>Formulierung prüfen lassen</Ph></p>
      <h2>6. Verfügbarkeit</h2>
      <p><Ph>Regelung zur Verfügbarkeit und Wartung</Ph></p>
      <h2>7. Haftung</h2>
      <p><Ph>Haftungsregelung</Ph></p>
      <h2>8. Daten nach Kündigung</h2>
      <p><Ph>z. B. Daten bleiben 30 Tage erhalten und können exportiert werden, danach Löschung</Ph></p>
      <h2>9. Schlussbestimmungen</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen; zwingende Verbraucherschutzbestimmungen bleiben unberührt. <Ph>prüfen</Ph></p>
    </Legal>
  );
}
