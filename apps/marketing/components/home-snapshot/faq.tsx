import {moduleById,fieldFor,safePageUrl,textFor,type HomeContent} from '@/lib/home-cms';
/* Static React snapshot of original Ticarti homepage: faq.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function FaqSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
  const module=moduleById(home,'faq');
  const items=(module?.items||[]).filter(x=>x.enabled!==false&&textFor(x.fields?.question,locale)&&textFor(x.fields?.answer,locale));
  if(home?.disabledModuleIds?.includes('faq'))return null;
  return (
    <section className={"tc-faq"} id={"tc-faq"}>
      <div className={"tc-faq__inner"}>
        <div className={"tc-faq__intro"}>
          <h2 className={"tc-faq__title"} data-tc-content-key={"h2-181"}>
            {fieldFor(module,'heading',locale)||"Sıkça sorulan sorular"}
          </h2>
          <p className={"tc-faq__subtitle"} data-tc-content-key={"p-182"}>
            {fieldFor(module,'description',locale)||"Paketler, mağaza kurulumu ve Ticarti hakkında başka soruların varsa bizimle iletişime geçebilirsin."}
          </p>
          <a className={"tc-faq__button"} href={safePageUrl(fieldFor(module,"buttonUrl",locale),"/contacto.html")} data-tc-content-key={"a-183"}>
            {fieldFor(module,'button',locale)||"Ekibimizle iletişime geç"}
          </a>
        </div>
        {items.length||module?.configured?(<div className="tc-faq__list">
    {items.map((item,i)=><div key={item.id} className={'tc-faq__item'+(i===0?' is-open':'')}>
      <button aria-controls={'tc-faq-panel-'+item.id} aria-expanded={i===0} className="tc-faq__question" id={'tc-faq-head-'+item.id} type="button">
        <span className="tc-faq__q-text">{textFor(item.fields?.question,locale)}</span>
        <span aria-hidden="true" className="tc-faq__icon"><svg fill="none" height={20} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={20}><polyline points="6 9 12 15 18 9"/></svg></span>
      </button>
      <div aria-labelledby={'tc-faq-head-'+item.id} className="tc-faq__panel" id={'tc-faq-panel-'+item.id} role="region">
        <div className="tc-faq__answer"><p style={{whiteSpace:'pre-line'}}>{textFor(item.fields?.answer,locale)}</p></div>
      </div>
    </div>)}
  </div>):(<div className={"tc-faq__list"}>
          <div className={"tc-faq__item is-open"}>
            <button aria-controls={"tc-faq-panel-1"} aria-expanded={"true"} className={"tc-faq__question"} id={"tc-faq-head-1"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-184"}>
                {"E-ticaret paketi nedir?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-1"} className={"tc-faq__panel"} id={"tc-faq-panel-1"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-185"}>
                  {"E-ticaret paketi, çevrim içi satış için mağaza yönetimi, ürün kataloğu, sipariş, ödeme ve pazarlama araçlarını bir arada sunan yazılım hizmetidir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-2"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-2"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-186"}>
                {"Hazır e-ticaret paketi ile mağaza nasıl kurulur?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-2"} className={"tc-faq__panel"} id={"tc-faq-panel-2"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-187"}>
                  {"Önce hesap ve mağaza bilgileri oluşturulur; ardından ürünler, ödeme yöntemleri, kargo ve mağaza görünümü yapılandırılır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-3"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-3"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-188"}>
                {"Paket seçerken nelere dikkat etmeliyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-3"} className={"tc-faq__panel"} id={"tc-faq-panel-3"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-189"}>
                  {"Ürün ve sipariş hacmi, depo sayısı, satış yapılan ülkeler, ihtiyaç duyulan entegrasyonlar ve ekibin yetki yapısı birlikte değerlendirilmelidir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-4"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-4"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-190"}>
                {"Ticarti Start, Grow ve Scale arasındaki fark nedir?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-4"} className={"tc-faq__panel"} id={"tc-faq-panel-4"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-191"}>
                  {"Start temel mağaza yönetimi, Grow çoklu depo ve gelişmiş pazarlama, Scale daha kapsamlı operasyon ihtiyaçları için konumlandırılmış örnek paketlerdir. Kesin sınırlar sözleşmede açıklanmalıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-5"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-5"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-192"}>
                {"Plus paketi hangi işletmeler için uygundur?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-5"} className={"tc-faq__panel"} id={"tc-faq-panel-5"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-193"}>
                  {"Birden fazla marka, ülke, depo, mağaza ve özel ERP/WMS bağlantısı bulunan büyük ölçekli işletmeler için ihtiyaç analiziyle şekillenen özel bir çözümdür."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-6"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-6"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-194"}>
                {"Paketimi sonradan yükseltebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-6"} className={"tc-faq__panel"} id={"tc-faq-panel-6"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-195"}>
                  {"Paket yükseltme ve ücretlendirme koşulları sözleşmeye göre belirlenir; mağaza büyürken daha kapsamlı paketler değerlendirilebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-7"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-7"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-196"}>
                {"Aylık ve yıllık ödeme yapılabilir mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-7"} className={"tc-faq__panel"} id={"tc-faq-panel-7"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-197"}>
                  {"Ödeme dönemleri ve yenileme koşulları satış öncesinde netleştirilmelidir. Sayfada gösterilen aylık tutarlar örnek fiyatlardır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-8"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-8"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-198"}>
                {"Fiyatlara KDV dahil mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-8"} className={"tc-faq__panel"} id={"tc-faq-panel-8"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-199"}>
                  {"Sayfada gösterilen örnek paket fiyatları KDV dahil olarak etiketlenmiştir. Nihai fiyat ve ödeme koşulları satış öncesinde doğrulanmalıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-9"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-9"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-200"}>
                {"Ücretsiz deneme süresi var mı?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-9"} className={"tc-faq__panel"} id={"tc-faq-panel-9"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-201"}>
                  {"Ticarti’yi 14 gün ücretsiz deneyebilirsin. Deneme kapsamı ve süre sonunda geçerli olacak paket koşulları kayıt adımında paylaşılır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-10"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-10"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-202"}>
                {"Ticarti ile e-ticaret sitemi ücretsiz deneyebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-10"} className={"tc-faq__panel"} id={"tc-faq-panel-10"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-203"}>
                  {"Mağazanı oluşturup Ticarti’yi 14 gün ücretsiz deneyebilirsin. Kalıcı ücretsiz paket vaadi bulunmuyor; deneme sonunda uygun bir paket seçebilirsin."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-11"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-11"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-204"}>
                {"Paketlere alan adı dahil mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-11"} className={"tc-faq__panel"} id={"tc-faq-panel-11"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-205"}>
                  {"Özel alan adı bağlama ile alan adının satın alınması farklı işlemlerdir. Alan adı ücretinin dahil olup olmadığı satın alma şartlarında belirtilmelidir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-12"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-12"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-206"}>
                {"SSL sertifikası ve barındırma dahil mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-12"} className={"tc-faq__panel"} id={"tc-faq-panel-12"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-207"}>
                  {"Barındırma, SSL ve yenileme kapsamı planın hizmet koşullarında açıklanmalıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-13"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-13"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-208"}>
                {"Tema değiştirebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-13"} className={"tc-faq__panel"} id={"tc-faq-panel-13"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-209"}>
                  {"Tema özelleştirme kapsamı kullanılan pakete ve özel tasarım ihtiyacına göre değişebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-14"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-14"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-210"}>
                {"Sanal POS kurulumu nasıl yapılır?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-14"} className={"tc-faq__panel"} id={"tc-faq-panel-14"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-211"}>
                  {"Ödeme sağlayıcısına bağlı olarak başvuru, doğrulama ve teknik bağlantı adımları izlenir. Onay süreleri sağlayıcıya göre değişebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-15"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-15"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-212"}>
                {"Kendi sanal POS hesabımı bağlayabilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-15"} className={"tc-faq__panel"} id={"tc-faq-panel-15"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-213"}>
                  {"Desteklenen ödeme sağlayıcıları ve hesap bağlama koşulları entegrasyon listesine göre belirlenir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-16"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-16"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-214"}>
                {"Taksitli ödeme seçeneği bulunuyor mu?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-16"} className={"tc-faq__panel"} id={"tc-faq-panel-16"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-215"}>
                  {"Taksit seçenekleri ödeme sağlayıcısına, sözleşmeye ve satıcı hesabının yetkilerine bağlıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-17"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-17"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-216"}>
                {"Ürün ekleme veya trafik sınırı var mı?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-17"} className={"tc-faq__panel"} id={"tc-faq-panel-17"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-217"}>
                  {"Ürün ve trafik limitleri her paketin güncel teknik koşullarında belirtilmelidir. Sayfadaki etiketler taslak sunum amaçlıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-18"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-18"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-218"}>
                {"Kargo entegrasyonları nasıl çalışır?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-18"} className={"tc-faq__panel"} id={"tc-faq-panel-18"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-219"}>
                  {"Kargo sağlayıcılarıyla bağlantı kurulduğunda siparişten gönderime uzanan iş akışları tek panelden izlenebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-19"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-19"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-220"}>
                {"Pazaryeri entegrasyonları dahil mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-19"} className={"tc-faq__panel"} id={"tc-faq-panel-19"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-221"}>
                  {"Pazaryeri bağlantılarının kullanılabilirliği ve entegrasyon kapsamı pakete göre değişebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-20"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-20"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-222"}>
                {"Birden fazla depo yönetebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-20"} className={"tc-faq__panel"} id={"tc-faq-panel-20"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-223"}>
                  {"Grow ve üstü örnek planlarda birden fazla depo ve stok aktarımı seçenekleri gösterilmiştir. Kesin limitler yayın öncesi doğrulanmalıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-21"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-21"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-224"}>
                {"E-ihracat ve çoklu para birimi kullanabilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-21"} className={"tc-faq__panel"} id={"tc-faq-panel-21"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-225"}>
                  {"Çoklu dil, para birimi ve ülke bazlı mağaza ayarlarının kapsamı seçilen plana göre değerlendirilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-22"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-22"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-226"}>
                {"Başka bir altyapıdan Ticarti’ye geçebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-22"} className={"tc-faq__panel"} id={"tc-faq-panel-22"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-227"}>
                  {"Taşıma çalışmaları ürün, müşteri ve sipariş verilerinin alınabildiği formatlara bağlıdır. Önce teknik kapsam analizi yapılır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-23"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-23"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-228"}>
                {"Altyapı geçişi ücretli mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-23"} className={"tc-faq__panel"} id={"tc-faq-panel-23"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-229"}>
                  {"Veri miktarı, tema, entegrasyonlar ve özel geliştirmeler maliyeti etkileyebilir. Nihai kapsam teklif aşamasında netleştirilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-24"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-24"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-230"}>
                {"Kurulum için yazılım bilmek gerekir mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-24"} className={"tc-faq__panel"} id={"tc-faq-panel-24"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-231"}>
                  {"Temel mağaza ayarları yönetim panelinden yapılabilir. Özel tema veya entegrasyon projelerinde teknik çalışma gerekebilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-25"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-25"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-232"}>
                {"7/24 destek her pakette var mı?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-25"} className={"tc-faq__panel"} id={"tc-faq-panel-25"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-233"}>
                  {"Destek saatleri ve kanalları paket sözleşmesine göre değişebilir. “7/24” etiketi onaylı bir hizmet taahhüdü değildir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-26"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-26"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-234"}>
                {"E-ticaret yazılım güncellemeleri ücretli mi?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-26"} className={"tc-faq__panel"} id={"tc-faq-panel-26"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-235"}>
                  {"Standart güncelleme ve özel geliştirme ücretlendirmesi hizmet sözleşmesinde açıklanmalıdır."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-27"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-27"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-236"}>
                {"İlk üç ay ücretsiz kampanyası var mı?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-27"} className={"tc-faq__panel"} id={"tc-faq-panel-27"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-237"}>
                  {"“İlk 3 ay ücretsiz” etiketi taslak kampanya örneğidir; etkinliği ve koşulları resmî teklif yayınlandığında kesinleşir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-28"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-28"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-238"}>
                {"Paket satın almadan demo görebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-28"} className={"tc-faq__panel"} id={"tc-faq-panel-28"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-239"}>
                  {"Demo ve deneme erişimiyle ilgili seçenekler satış ekibinin sunduğu güncel koşullara göre belirlenir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-29"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-29"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-240"}>
                {"Ticarti büyük perakende zincirleri için uygun mu?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-29"} className={"tc-faq__panel"} id={"tc-faq-panel-29"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-241"}>
                  {"Çok markalı, çok mağazalı veya çok ülkeli perakende operasyonları Plus kapsamındaki özel entegrasyon ve süreç analiziyle değerlendirilir."}
                </p>
              </div>
            </div>
          </div>
          <div className={"tc-faq__item"}>
            <button aria-controls={"tc-faq-panel-30"} aria-expanded={"false"} className={"tc-faq__question"} id={"tc-faq-head-30"} type={"button"}>
              <span className={"tc-faq__q-text"} data-tc-content-key={"span-242"}>
                {"Ödemelerimi ve siparişlerimi tek panelden yönetebilir miyim?"}
              </span>
              <span aria-hidden={true} className={"tc-faq__icon"}>
                <svg fill={"none"} height={20} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"} viewBox={"0 0 24 24"} width={20}>
                  <polyline points={"6 9 12 15 18 9"}></polyline>
                </svg>
              </span>
            </button>
            <div aria-labelledby={"tc-faq-head-30"} className={"tc-faq__panel"} id={"tc-faq-panel-30"} role={"region"}>
              <div className={"tc-faq__answer"}>
                <p data-tc-content-key={"p-243"}>
                  {"Ticarti mağaza paneli ödeme ve sipariş süreçlerinin tek yerden yönetilmesini hedefler. Kullanılabilir entegrasyonlar ayrıca kontrol edilmelidir."}
                </p>
              </div>
            </div>
          </div>
        </div>)}
      </div>
    </section>
  );
}
