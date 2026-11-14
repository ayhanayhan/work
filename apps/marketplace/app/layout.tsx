import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ticarti Uygulama Mağazası',
  description: 'Ticarti mağazanız için kargo, ödeme, pazaryeri, muhasebe ve pazarlama uygulamalarını keşfedin.',
  alternates: { canonical: 'https://apps.ticarti.com/' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
