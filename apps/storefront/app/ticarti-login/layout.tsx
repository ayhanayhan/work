import '../../../marketing/public/assets/css/style.css';
import type {ReactNode} from 'react';
import {cookies} from 'next/headers';
import {AuthLocaleProvider,AUTH_DICTIONARIES} from './auth-locale';
export default async function AuthLayout({children}:{children:ReactNode}){
 const cookie=await cookies();
 const saved=cookie.get('ticarti_login_locale')?.value||'tr';
 return <AuthLocaleProvider initialLocale={saved in AUTH_DICTIONARIES?saved:'tr'}>{children}</AuthLocaleProvider>;
}
