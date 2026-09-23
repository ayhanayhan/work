'use client';

const iconPaths: Record<string, string[]> = {
  'Ana Sayfa': ['M3 10.75 12 3l9 7.75','M5.25 9.5v10.25h5v-6h3.5v6h5V9.5'],
  'Siparişler': ['M6 3.75h12l1.5 4.5-1.5 4.5H6L4.5 8.25 6 3.75Z','M7 12.75v7.5m10-7.5v7.5M4 20.25h16'],
  'Katalog': ['M4.5 5.25h15v13.5h-15z','M8 9h8M8 12h8M8 15h5'],
  'Müşteriler': ['M8.25 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.75 19.5a4.5 4.5 0 0 1 9 0','M16.5 9a2.25 2.25 0 1 0 0-4.5M15 15.25a4 4 0 0 1 5.25 3.8'],
  'Yorumlar': ['M4 5.25h16v10.5H9l-5 4v-14.5Z','M8 9h8M8 12h5'],
  'Sorular': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z','M9.75 9a2.3 2.3 0 1 1 3.8 1.75c-.75.55-1.55 1.05-1.55 2.25M12 16.75h.01'],
  'Promosyonlar': ['M4 12.25 12.25 4H20v7.75L11.75 20 4 12.25Z','M15.75 8.25h.01'],
  'Pazarlama': ['M4 17.75V10l12-5v14l-12-5','M16 10.5h3.5a1.5 1.5 0 0 1 0 3H16M6.5 16l1.25 4'],
  'Sadakat': ['M12 20.5 4.75 13.7A5.1 5.1 0 0 1 12 6.5a5.1 5.1 0 0 1 7.25 7.2L12 20.5Z'],
  'Tasarım & İçerik': ['M4 4h16v16H4z','M4 9h16M9 9v11'],
  'SEO': ['M10.75 17.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z','m15.75 15.75 4.25 4.25'],
  'Entegrasyonlar': ['M8.25 3.75v4.5H3.75M15.75 20.25v-4.5h4.5','M5.25 8.25A7.5 7.5 0 0 1 18.5 6M18.75 15.75A7.5 7.5 0 0 1 5.5 18'],
  'Pazaryerleri': ['M4.5 8.25 6 4.5h12l1.5 3.75','M5.25 8.25v11.25h13.5V8.25','M9 12h6v7.5'],
  'Raporlar': ['M4.5 19.5V12h3v7.5m3-0V7.5h3v12m3 0V4.5h3v15'],
  'Ekip': ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19.5a4.5 4.5 0 0 1 9 0','M17 11.5a2.5 2.5 0 1 0 0-5M15.5 16a4 4 0 0 1 5 3.5'],
  'Destek': ['M5 14v-2a7 7 0 1 1 14 0v2','M5 14h2v4H5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2Zm14 0h-2v4h2a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2ZM17 18c0 1.1-1.35 2-3 2h-2'],
  'Ayarlar': ['M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z','M19.2 13.6a7.8 7.8 0 0 0 0-3.2l2-1.55-2-3.45-2.5 1a7.6 7.6 0 0 0-2.75-1.6L13.6 2h-4l-.35 2.8A7.6 7.6 0 0 0 6.5 6.4L4 5.4 2 8.85l2 1.55a7.8 7.8 0 0 0 0 3.2L2 15.15l2 3.45 2.5-1a7.6 7.6 0 0 0 2.75 1.6L9.6 22h4l.35-2.8a7.6 7.6 0 0 0 2.75-1.6l2.5 1 2-3.45-2-1.55Z'],
};

export function AdminIcon({name,size=20,className=''}:{name:string;size?:number;className?:string}){
  const paths=iconPaths[name]||['M4 12h16M12 4v16'];
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths.map((d,i)=><path d={d} key={i}/>)}</svg>
}

export function UiIcon({name,size=20}:{name:'menu'|'search'|'chevron'|'logout'|'refresh'|'arrow'|'trend'|'box'|'users'|'cart'|'money'|'alert'|'check';size?:number}){
  const paths:Record<string,string[]>={
    menu:['M4 7h16M4 12h16M4 17h16'],
    search:['M10.75 17.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z','m15.75 15.75 4.25 4.25'],
    chevron:['m9 6 6 6-6 6'],
    logout:['M10 5H5v14h5','m14 8 4 4-4 4M18 12H9'],
    refresh:['M20 6v5h-5','M4 18v-5h5','M6.1 9A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-3'],
    arrow:['m9 5 7 7-7 7'],
    trend:['M4 17 10 11l4 4 6-8','M15 7h5v5'],
    box:['M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z','M4 7.5V17l8 4 8-4V7.5M12 12v9'],
    users:['M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5 5 0 0 1 10 0','M17 11a2.5 2.5 0 1 0 0-5M15.5 16a4 4 0 0 1 5 3'],
    cart:['M4 5h2l2 10h9l2-7H7','M10 19h.01M17 19h.01'],
    money:['M4 6.5h16v11H4z','M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM7 9h.01M17 15h.01'],
    alert:['M12 3 2.8 20h18.4L12 3Z','M12 9v4M12 17h.01'],
    check:['m5 12 4 4L19 6'],
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(paths[name]||[]).map((d,i)=><path d={d} key={i}/>)}</svg>
}
