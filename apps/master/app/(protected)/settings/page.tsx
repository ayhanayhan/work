'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

type SettingsModule={href:string;icon:string;title:string;description:string};
type SettingsGroup={title:string;subtitle:string;items:SettingsModule[]};

const settingsGroups:SettingsGroup[]=[
  {title:'PLATFORM & MARKA',subtitle:'Kimlik, dil ve para birimi',items:[
    {href:'/settings/general',icon:'iconoir:shop',title:'Genel Ayarlar',description:'Firma bilgileri, iletişim bilgileri ve marka görselleri.'},
    {href:'/settings/languages',icon:'iconoir:language',title:'Diller',description:'Platform dilleri, varsayılan dil ve kullanım durumları.'},
    {href:'/settings/currencies',icon:'iconoir:coins',title:'Para Birimleri',description:'Platform para birimleri ve varsayılan para birimi.'},
  ]},
  {title:'GİRİŞ & HESAPLAR',subtitle:'Müşteri giriş sağlayıcıları',items:[
    {href:'/settings/social-auth',icon:'iconoir:log-in',title:'Sosyal Giriş',description:'Google ve Facebook müşteri giriş ayarları.'},
  ]},
];

export default function SettingsPage(){
  return <div className="settings-v15-home">
    {settingsGroups.map(group=><section key={group.title} className="settings-v15-group">
      <div className="settings-v15-group-title"><b>{group.title}</b><span>{group.subtitle}</span></div>
      <div className="settings-v15-grid">
        {group.items.map(item=><Link href={item.href} className="settings-v15-card" key={item.href}>
          <span className="setting-module-icon"><Icon icon={item.icon}/></span>
          <div><b>{item.title}</b><p>{item.description}</p></div>
          <Icon icon="iconoir:nav-arrow-right" className="settings-v15-arrow"/>
        </Link>)}
      </div>
    </section>)}
  </div>;
}
