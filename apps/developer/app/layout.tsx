import type {ReactNode} from 'react';
import './globals.css';
export default function RootLayout({children}:{children:ReactNode}){
 const origin='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
 return <html lang="tr" className="tc-page-home tc-page-developer">
  <head>
   <link rel="stylesheet" href={origin+'/assets/css/style.css?v=v2-pricing-payment-footer-1104'}/>
   <link rel="stylesheet" href={origin+'/assets/css/shared-footer.css?v=3'}/>
   <link rel="stylesheet" href={origin+'/assets/css/navigation-tree.css?v=1'}/>
   <link rel="stylesheet" href={origin+'/assets/css/home-react-behavior.css?v=3'}/>
   <link rel="stylesheet" href="/assets/css/marketing-developer.css?v=3"/>
  </head><body>{children}</body>
 </html>;
}
