import {moduleById,fieldFor,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
import FooterCallback from './bottomCta-callback';
/* Static React snapshot of original Ticarti homepage: bottomCta.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function BottomCtaSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
  const module=moduleById(home,'bottomCta');
  return (
    <section className={"tc-bottom-cta"}>
      {"\n"}
      <div className={"tc-bottom-cta__inner"}>
        {"\n"}
        <h2 className={"tc-bottom-cta__heading"} data-tc-content-key={"h2-153"}>
          {module?.configured?<SimpleHtml html={fieldFor(module,'heading',locale)}/>:"E-ticaret siteni oluştur. 14 gün ücretsiz dene."}
        </h2>
        {"\n"}
        <div className={"tc-bottom-cta__subtitle"}>
          {"Mağazanı dakikalar içinde kur; ürünlerini, siparişlerini, stoklarını ve pazaryeri bağlantılarını tek panelden kolayca yönet."}
        </div>
        {"\n"}
        <p className={"tc-bottom-cta__offer"} data-tc-content-key={"p-154"}>
          {module?.configured?<SimpleHtml html={fieldFor(module,'offer',locale)}/>:"Lansmana özel %50 indirimi kaçırma."}
        </p>
        {"\n"}
        <FooterCallback />
        {"\n"}
      </div>
      {"\n"}
      <div aria-hidden={false} className={"tc-bottom-cta__media"}>
        {"\n"}
        <div className={"tc-bottom-cta__col tc-bottom-cta__col--a"}>
          {"\n"}
          <div className={"tc-bottom-cta__track"}>
            {"\n"}
            <img alt={""} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Hugo.webp"} data-tc-content-src={"image-090"} />
            {"\n"}
            <img alt={""} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_3.webp"} data-tc-content-src={"image-091"} />
            {"\n"}
            <img alt={""} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_4.webp"} data-tc-content-src={"image-092"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Hugo.webp"} data-tc-content-src={"image-093"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_3.webp"} data-tc-content-src={"image-094"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_4.webp"} data-tc-content-src={"image-095"} />
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className={"tc-bottom-cta__col tc-bottom-cta__col--b"}>
          {"\n"}
          <div className={"tc-bottom-cta__track"}>
            {"\n"}
            <img alt={"Builder4"} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder4.png"} data-tc-content-src={"image-096"} />
            {"\n"}
            <img alt={""} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_David.webp"} data-tc-content-src={"image-097"} />
            {"\n"}
            <img alt={""} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_2.webp"} data-tc-content-src={"image-098"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder4.png"} data-tc-content-src={"image-099"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_David.webp"} data-tc-content-src={"image-100"} />
            {"\n"}
            <img alt={""} aria-hidden={true} className={"tc-bottom-cta__img"} loading={"lazy"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Kit_2.webp"} data-tc-content-src={"image-101"} />
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
