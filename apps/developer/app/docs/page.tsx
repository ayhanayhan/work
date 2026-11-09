import DevPage from '@/components/dev-page';
const links=[['Başlangıç','/guide','İlk API isteği ve entegrasyon akışı'],['API referansı','/docs/api','Uç noktalar ve erişim koşulları'],['Webhook’lar','/docs/webhooks','Olay bildirimi ve teslimat'],['Güvenlik','/docs/security','Kimlik, izinler ve veri ayrımı'],['Tema geliştirme','/docs/themes','Tema paket standardı ve yükleme süreci'],['Uygulama geliştirme','/apps','Uygulama alanı ve geliştirici hesabı']];
export const metadata={title:'Dokümantasyon | Ticarti Developer'};
export default function Page(){return <DevPage title="Dokümantasyon" description="Ticarti uygulama, API ve tema geliştirme kaynakları. Konuları bağımsız sayfalarda inceleyin.">
 <h2>Kaynaklar</h2><div className="dev-doc__cards">{links.map(([title,url,desc])=><div className="dev-doc__card" key={url}><strong>{title}</strong><span>{desc}</span><a href={url}>İncele →</a></div>)}</div>
 <h2>Hangi yoldan başlamalısınız?</h2><p>Bir mağazayla entegrasyon kuruyorsanız başlangıç ve API referansından devam edin. Tema geliştiriyorsanız tema paketinin yapısını ve dağıtım esaslarını inceleyin.</p>
 </DevPage>}