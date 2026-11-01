import { Nav, Footer } from '../../chrome';
import Finish from './Finish';

export const metadata = { title: 'Anmelden – Blotter', robots: { index: false } };

export default function LoginFinishPage() {
  return (
    <>
      <Nav />
      <main className="wrap center">
        <Finish />
      </main>
      <Footer />
    </>
  );
}
