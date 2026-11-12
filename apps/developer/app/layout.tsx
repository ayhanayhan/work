import './globals.css';
import './developer-theme.css';
import './developer-auth.css';
import DeveloperShell from './components/DeveloperShell';
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body><DeveloperShell>{children}</DeveloperShell></body></html>}
