import './globals.css';
import './core-commerce.css';
import StorefrontGate from '../components/StorefrontGate';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className="js"><body><StorefrontGate>{children}</StorefrontGate></body></html>}
