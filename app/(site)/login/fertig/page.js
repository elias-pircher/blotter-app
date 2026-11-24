import { Nav, Footer } from '../../chrome';
import Finish from './Finish';
import { getLang } from '@/lib/i18n-server';

export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Log in – Blotter' : 'Anmelden – Blotter', robots: { index: false } });

export default function LoginFinishPage() {
  return (
    <>
      <Nav />
      <main className="wrap center">
        <Finish lang={getLang()} />
      </main>
      <Footer />
    </>
  );
}
