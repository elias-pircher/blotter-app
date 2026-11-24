import { Nav, Footer } from '../chrome';
import LoginForm from './LoginForm';
import { getLang } from '@/lib/i18n-server';

export const generateMetadata = () => ({ title: getLang() === 'en' ? 'Log in – Blotter' : 'Anmelden – Blotter' });

export default function LoginPage({ searchParams }) {
  const next = typeof searchParams?.next === 'string' && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/app';
  return (
    <>
      <Nav />
      <main className="wrap center">
        <LoginForm next={next} linkError={searchParams?.fehler === 'link'} lang={getLang()} />
      </main>
      <Footer />
    </>
  );
}
