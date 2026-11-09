import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';

export const metadata:Metadata={
  metadataBase:new URL('https://dev.ticarti.com'),
  title:{default:'Ticarti Developer | Geliştirici Merkezi',template:'%s | Ticarti Developer'},
  description:'Ticarti için uygulamalar ve entegrasyonlar geliştirmeye başlayın. API, webhook ve güvenlik kaynaklarını keşfedin.',
  alternates:{canonical:'/'},
  robots:{index:true,follow:true}
};

export default function RootLayout({children}:{children:ReactNode}){
  return <html lang="tr"><body>{children}</body></html>;
}
