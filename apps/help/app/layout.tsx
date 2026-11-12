import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://help.ticarti.com'),title:{default:'Ticarti Help',template:'%s | Ticarti Help'},description:'Ticarti çok dilli yardım merkezi',robots:{index:true,follow:true}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
