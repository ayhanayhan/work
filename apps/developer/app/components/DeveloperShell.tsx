'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useI18n} from '../../lib/i18n';
export default function DeveloperShell({children}:{children:React.ReactNode}){const path=usePathname();const {locale}=useI18n();const [brand,setBrand]=useState<any>(null);useEffect(()=>{fetch('/api/v1/platform/branding').then(r=>r.ok?r.json():null).then(setBrand).catch(()=>{})},[]);const b=brand?.branding||{};const logo=b.logoUrl||'/brand/ticarti-logo.svg';return <div className="dev-shell"><header className="dev-topbar"><Link href={path==='/apps'?'/apps':'/'} className="dev-brand"><img src={logo} alt="Ticarti"/><span>Developers</span></Link><nav><Link href="/guide">{locale==='tr'?'Geliştirici rehberi':'Developer guide'}</Link><Link href="/apps">{locale==='tr'?'Konsol':'Console'}</Link><Link href="/login">{locale==='tr'?'Giriş':'Sign in'}</Link></nav></header>{children}</div>}
