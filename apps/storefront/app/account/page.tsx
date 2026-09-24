import {Suspense} from 'react';
import AccountPage from '../../themes/ticarti/pages/AccountPage';
export default function Page(){return <Suspense fallback={<main className="page-width top-spacing-normal">Hesap yükleniyor…</main>}><AccountPage/></Suspense>}
