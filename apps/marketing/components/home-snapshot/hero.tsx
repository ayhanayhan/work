import HeroCallback from './hero-callback';
import HeroCards from './hero-cards';
import HeroLogoGroup from './hero-logo-group';
import {moduleById,fieldFor,safePageUrl,type HomeContent} from '@/lib/home-cms';
/* Static React snapshot of original Ticarti homepage: hero.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function HeroSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
  const module=moduleById(home,'hero');
  const heading=fieldFor(module,'heading',locale);
  const items=module?.items;
  const logos=module?.logos?.filter(x=>x.enabled!==false&&x.assets?.image)||[];
  return (
    <section aria-label={"La casa del mejor talento tech de Europa"} className={"tc-site-hero is-armed"} data-kpi-replay={"false"} data-kpi-stagger={"0"}>
      {"\n"}
      <div className={"tc-site-hero__intro"}>
        {"\n"}
        <h1 className={"tc-site-hero__h1"}>
          {heading?heading.split(/\n/).map((line,i)=><span key={i}>{i>0?<br/>:null}{line}</span>):<>E-ticaret siteni oluştur.<br/>14 gün ücretsiz dene.</>}
        </h1>
        {"\n"}
        <p className={"tc-site-hero__sub"} data-tc-content-key={"p-056"}>
          {fieldFor(module,'description',locale)||"Mağazanı dakikalar içinde kur; ürünlerini, siparişlerini, stoklarını ve pazaryeri bağlantılarını tek panelden kolayca yönet."}
        </p>
        {"\n"}
        <p className={"tc-hero-offer"} data-tc-content-key={"p-057"}>
          {fieldFor(module,'offer',locale)||"Lansmana özel %50 indirimi kaçırma."}
        </p>
        {"\n"}
        {module?.ctaEnabled!==false?<HeroCallback module={module} locale={locale} consentHref={safePageUrl(home?.consentContract?.href,'/kvkk.html')}/>:null}
        {"\n"}
        <div className={"tc-site-hero__ctas"}>
          {"\n"}
          <a className={"tc-site-hero__cta tc-site-hero__cta--1"} href={safePageUrl(fieldFor(module,"buttonUrl",locale),"/paketler.html")}>
            <span data-tc-content-key={"span-061"}>
              {fieldFor(module,'button',locale)||"E-ticaret siteni oluştur"}
            </span>
          </a>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"tc-site-hero__carousel"}>
        {"\n"}
        <span aria-hidden={true} className={"tc-site-hero__fade tc-site-hero__fade--l"}></span>
        {"\n"}
        <span aria-hidden={true} className={"tc-site-hero__fade tc-site-hero__fade--r"}></span>
        {"\n"}
        <button aria-label={"Perfil anterior"} className={"tc-site-hero__arrow tc-site-hero__arrow--prev"} data-dir={"prev"} type={"button"}>
          {"\n"}
          <svg aria-hidden={true} fill={"none"} height={16} viewBox={"0 0 24 24"} width={16}>
            {"\n"}
            <path d={"M15 6l-6 6 6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
            {"\n"}
          </svg>
          {"\n"}
        </button>
        {"\n"}
        <button aria-label={"Perfil siguiente"} className={"tc-site-hero__arrow tc-site-hero__arrow--next"} data-dir={"next"} type={"button"}>
          {"\n"}
          <svg aria-hidden={true} fill={"none"} height={16} viewBox={"0 0 24 24"} width={16}>
            {"\n"}
            <path d={"M9 6l6 6-6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
            {"\n"}
          </svg>
          {"\n"}
        </button>
        {"\n"}
        <div className={"tc-site-hero__viewport"} id={"skViewport"}>
          {"\n"}
          <div className={"tc-site-hero__track"} id={"skTrack"}>
            <HeroCards items={items} locale={locale} />
            <HeroCards clone items={items} locale={locale} />
            <HeroCards clone />
          </div>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"tc-site-hero__green"}>
        {"\n"}
        <div className={"tc-ui-logos"}>
          {"\n"}
          <div className={"tc-ui-logos__track"}>
            {"\n"}
            {module?.logos?.length?<HeroLogoGroup logos={logos} locale={locale}/>:(<div className={"tc-ui-logos__group"}>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Allianz"} className={"tc-home-logo--allianz"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/allianz.png"} data-tc-content-src={"image-018"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"BBVA"} className={"tc-home-logo--bbva"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bbva.png"} data-tc-content-src={"image-019"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Bankinter"} className={"tc-home-logo--bankinter"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bankinter.png"} data-tc-content-src={"image-020"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Microsoft"} className={"tc-home-logo--microsoft"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/microsoft.png"} data-tc-content-src={"image-021"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Qida"} className={"tc-home-logo--qida"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/qida.png"} data-tc-content-src={"image-022"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Accenture"} className={"tc-home-logo--accenture"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/accenture.png"} data-tc-content-src={"image-023"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Deloitte"} className={"tc-home-logo--deloitte"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/deloitte.png"} data-tc-content-src={"image-024"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Dcycle"} className={"tc-home-logo--dcycle"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/dcycle.png"} data-tc-content-src={"image-025"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"HP"} className={"tc-home-logo--hp"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/hp.png"} data-tc-content-src={"image-026"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Línea Directa"} className={"tc-home-logo--linea-directa"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/linea-directa.png"} data-tc-content-src={"image-027"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Podo"} className={"tc-home-logo--podo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/podo.png"} data-tc-content-src={"image-028"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Clicars"} className={"tc-home-logo--clicars"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/clicars.png"} data-tc-content-src={"image-029"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Sonosuite"} className={"tc-home-logo--sonosuite"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/sonosuite.png"} data-tc-content-src={"image-030"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Eroski"} className={"tc-home-logo--eroski"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/eroski.png"} data-tc-content-src={"image-031"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Civitatis"} className={"tc-home-logo--civitatis"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/civitatis.png"} data-tc-content-src={"image-032"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Alten"} className={"tc-home-logo--alten"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/alten.png"} data-tc-content-src={"image-033"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Vivla"} className={"tc-home-logo--vivla"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/vivla.png"} data-tc-content-src={"image-034"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Wayra"} className={"tc-home-logo--wayra"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/wayra.png"} data-tc-content-src={"image-035"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Cabify"} className={"tc-home-logo--cabify"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/cabify.png"} data-tc-content-src={"image-036"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Affinity"} className={"tc-home-logo--affinity"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/affinity.png"} data-tc-content-src={"image-037"} />
                {"\n"}
              </div>
              {"\n"}
            </div>)}
            {"\n"}
            <div aria-hidden={true} className={"tc-ui-logos__group"}>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--allianz"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/allianz.png"} data-tc-content-src={"image-038"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--bbva"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bbva.png"} data-tc-content-src={"image-039"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--bankinter"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bankinter.png"} data-tc-content-src={"image-040"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--microsoft"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/microsoft.png"} data-tc-content-src={"image-041"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--qida"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/qida.png"} data-tc-content-src={"image-042"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--accenture"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/accenture.png"} data-tc-content-src={"image-043"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--deloitte"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/deloitte.png"} data-tc-content-src={"image-044"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--dcycle"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/dcycle.png"} data-tc-content-src={"image-045"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--hp"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/hp.png"} data-tc-content-src={"image-046"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--linea-directa"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/linea-directa.png"} data-tc-content-src={"image-047"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--podo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/podo.png"} data-tc-content-src={"image-048"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--clicars"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/clicars.png"} data-tc-content-src={"image-049"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--sonosuite"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/sonosuite.png"} data-tc-content-src={"image-050"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--eroski"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/eroski.png"} data-tc-content-src={"image-051"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--civitatis"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/civitatis.png"} data-tc-content-src={"image-052"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--alten"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/alten.png"} data-tc-content-src={"image-053"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--vivla"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/vivla.png"} data-tc-content-src={"image-054"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--wayra"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/wayra.png"} data-tc-content-src={"image-055"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--cabify"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/cabify.png"} data-tc-content-src={"image-056"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--affinity"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/affinity.png"} data-tc-content-src={"image-057"} />
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
    </section>
  );
}
