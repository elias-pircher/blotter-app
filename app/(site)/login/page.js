import { Nav, Footer } from '../chrome';
import LoginForm from './LoginForm';

export const metadata = { title: 'Anmelden – Blotter' };

export default function LoginPage({ searchParams }) {
  const next = typeof searchParams?.next === 'string' && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/app';
  return (
    <>
      <Nav />
      <main className="wrap center">
        <LoginForm next={next} linkError={searchParams?.fehler === 'link'} />
      </main>
      <Footer />
    </>
  );
}
