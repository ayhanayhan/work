import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './theme/scss/app.scss';
import './theme/commerce.scss';
import { AdminSessionProvider } from './components/AdminSession';

const font = Inter({
  weight: ['400','500','600','700'],
  subsets: ['latin','latin-ext'],
  display: 'swap',
});

export const metadata: Metadata = { title: 'Commerce Admin', description: 'Mağaza yönetimi' };

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="tr" data-bs-theme="light"><body className={font.className} data-sidebar-size="default"><AdminSessionProvider>{children}</AdminSessionProvider></body></html>;
}
