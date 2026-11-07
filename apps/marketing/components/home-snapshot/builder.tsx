import {moduleById,textFor,safeAssetUrl,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
/* Static React snapshot of original Ticarti homepage: builder.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function BuilderSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'builder');
  return (
    <section className={"tc-builder-section"}>
      {"\n"}
      <h2 className={"tc-visually-hidden"} data-tc-content-key={"h2-080"}>
        {"Ticarti ile e-ticaret operasyonları"}
      </h2>
      {"\n"}
      <div className={"tc-builder-section__grid"}>
        {"\n"}
        {module?.configured ? (module.items||[]).filter(item=>item.enabled!==false).map(item=>
          <article key={item.id} className="tc-builder-section__card">
           {item.assets?.image?<span className="tc-builder-section__badge"><img src={safeAssetUrl(item.assets.image,'')} alt=""/></span>:null}
           <h3 className="tc-builder-section__title"><SimpleHtml html={textFor(item.fields?.heading,locale)}/></h3>
           <div className="tc-builder-section__text"><SimpleHtml html={textFor(item.fields?.description,locale)}/></div>
          </article>
        ) : <>
        <article className={"tc-builder-section__card"}>
          {"\n"}
          <span className={"tc-builder-section__badge"}>
            {"\n"}
            <img src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/user-round-check-44x44.webp"} data-tc-content-src={"image-058"} />
            {"\n"}
          </span>
          {"\n"}
          <h3 className={"tc-builder-section__title"} data-tc-content-key={"h3-081"}>
            {"Tek merkezden yönetim"}
          </h3>
          {"\n"}
          <div className={"tc-builder-section__text"}>
            {"Ürünler, varyantlar, siparişler, müşteriler ve iadeler aynı yönetim panelinde."}
          </div>
          {"\n"}
        </article>
        {"\n"}
        <article className={"tc-builder-section__card"}>
          {"\n"}
          <span className={"tc-builder-section__badge"}>
            {"\n"}
            <img src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/shield-check-44x44.webp"} data-tc-content-src={"image-059"} />
            {"\n"}
          </span>
          {"\n"}
          <h3 className={"tc-builder-section__title"} data-tc-content-key={"h3-082"}>
            {"Büyümeye hazır altyapı"}
          </h3>
          {"\n"}
          <div className={"tc-builder-section__text"}>
            {"Birden fazla depo, çoklu dil ve para birimi seçenekleriyle farklı satış modellerine uyum sağla."}
          </div>
          {"\n"}
        </article>
        {"\n"}
        <article className={"tc-builder-section__card"}>
          {"\n"}
          <span className={"tc-builder-section__badge"}>
            {"\n"}
            <img src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/circle-check-shakers-anim.webp"} data-tc-content-src={"image-060"} />
            {"\n"}
          </span>
          {"\n"}
          <h3 className={"tc-builder-section__title"} data-tc-content-key={"h3-083"}>
            {"Kontrol sende"}
          </h3>
          {"\n"}
          <div className={"tc-builder-section__text"}>
            {"Rol ve yetki yönetimi, kampanya koşulları ve raporlarla operasyonunu görünür kıl."}
          </div>
          {"\n"}
        </article>
        {"\n"}
        </>}
      </div>
      {"\n"}
    </section>
  );
}
