import type {Metadata} from 'next';
import './globals.css';
import './theme/source/scss/app.scss';

export const metadata:Metadata={title:'Ticarti Admin · Super Admin',description:'Ticarti Platform'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr" data-bs-theme="light"><body data-sidebar-size="default">{children}</body></html>}
