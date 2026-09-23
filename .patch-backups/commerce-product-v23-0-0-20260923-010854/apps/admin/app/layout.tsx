import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import './theme/scss/app.scss';
import './theme/commerce.scss';
import { AdminSessionProvider } from './components/AdminSession';

const font = Be_Vietnam_Pro({
  weight: ['300','400','500','600'],
  subsets: ['latin','vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = { title: 'Commerce Admin', description: 'Mağaza yönetimi' };

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="tr" data-bs-theme="light"><body className={font.className} data-sidebar-size="default"><AdminSessionProvider>{children}</AdminSessionProvider></body></html>;
}
