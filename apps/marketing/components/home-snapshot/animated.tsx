import {moduleById,fieldFor,textFor,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
/* Static React snapshot of original Ticarti homepage: animated.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function AnimatedHeadingSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'animated');
  return (
    <section className={"tc-animated-heading is-type-ready is-reveal-ready"}>
      {"\n"}
      <div className={"tc-animated-heading__inner"}>
        {"\n"}
        <div className={"tc-animated-heading__eyebrow hrt-reveal"}>
          {"\n"}
          <span className={"tc-animated-heading__eyebrow-inner"} data-tc-content-key={"span-070"}>
            {module?.configured?<SimpleHtml html={fieldFor(module,"description",locale)}/>:"Ticaretin her aşaması için tek platform"}
          </span>
          {"\n"}
        </div>
        {"\n"}
        <h2 className={"tc-animated-heading__title hrt-reveal"}>
          {"\n"}
          <span className={"tc-animated-heading__sr"} data-tc-content-key={"span-071"}>
            {module?.configured?fieldFor(module,"heading",locale):"Ürün yönetiminden siparişlere"}
          </span>
          {"\n"}
          <span aria-hidden={true} className={"tc-animated-heading__roller"}>
            {"\n"}
            <span className={"tc-animated-heading__stack"}>
              {"\n"}
              {module?.configured?(module.items||[]).filter(item=>item.enabled!==false).map((item,i)=>
                <span key={item.id} className={"tc-animated-heading__item"+(i===0?" is-active":"")}>
                  <SimpleHtml html={textFor(item.fields?.heading,locale)}/>
                </span>
              ):<>
              <span className={"tc-animated-heading__item is-active"} data-tc-content-key={"span-072"}>
                {"Ürün yönetimi"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-073"}>
                {"Sipariş ve iadeler"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-074"}>
                {"Depo ve stok"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-075"}>
                {"Kampanya yönetimi"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-076"}>
                {"Çok dilli mağaza"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-077"}>
                {"SEO ve içerik"}
              </span>
              {"\n"}
              <span className={"tc-animated-heading__item"} data-tc-content-key={"span-078"}>
                {"Analitik raporlar"}
              </span>
              {"\n"}
              </>}
            </span>
            {"\n"}
          </span>
          {"\n"}
          <i aria-hidden={true} className={"tc-animated-heading__caret tc-animated-heading__caret--inline"}></i>
          {"\n"}
          <span aria-hidden={true} className={"tc-animated-heading__static"} data-tc-content-key={"span-079"}>
            {"tek panelden"}
          </span>
          {"\n"}
        </h2>
        {"\n"}
      </div>
      {"\n"}
    </section>
  );
}
