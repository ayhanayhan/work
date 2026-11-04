export const ADMIN_NAV = [
  'Ana Sayfa','Siparişler','Katalog','Müşteriler','KVKK Talepleri','Müşteri Grupları','Yorumlar','Sorular','Sadakat','Paketler','POS','Canlı Takip','Promosyonlar','Pazarlama','Tasarım & İçerik','Sayfalar','Blog','Medya','SEO','Eklentiler','Raporlar','Ekip','Destek','Ayarlar'
] as const;

export type AdminTab = typeof ADMIN_NAV[number];

export const ADMIN_ROUTES: Record<AdminTab,string> = {
  'Ana Sayfa':'/dashboard','Siparişler':'/orders','Katalog':'/catalog','Müşteriler':'/customers','KVKK Talepleri':'/customers/privacy-requests','Müşteri Grupları':'/customers/groups','Paketler':'/plans','POS':'/pos','Canlı Takip':'/live','Yorumlar':'/reviews','Sorular':'/questions','Sadakat':'/loyalty','Promosyonlar':'/promotions','Pazarlama':'/marketing','Tasarım & İçerik':'/design-content','Sayfalar':'/pages','Blog':'/blog','Medya':'/media','SEO':'/seo','Eklentiler':'/plugins/store','Raporlar':'/reports','Ekip':'/team','Destek':'/support','Ayarlar':'/settings',
};

export function adminTabFromPath(pathname:string):AdminTab{
  if(pathname==='/plugins'||pathname.startsWith('/plugins/'))return 'Eklentiler';
  const entries=(Object.entries(ADMIN_ROUTES) as [AdminTab,string][]).sort((a,b)=>b[1].length-a[1].length);
  const exact=entries.find(([,href])=>pathname===href||pathname.startsWith(href+'/'));
  return exact?.[0] ?? 'Ana Sayfa';
}
