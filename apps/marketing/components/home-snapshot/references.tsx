import CmsSection from './references-cms';
import {moduleById,fieldFor,safeAssetUrl,textFor,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
/* Static React snapshot of original Ticarti homepage: references.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function ReferencesSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
 const module=moduleById(home,'references');
  if(module?.configured)return <CmsSection home={home} locale={locale}/>;
 const items=(module?.items||[]).filter(item=>item.enabled!==false&&(item.assets?.image||item.assets?.logo||textFor(item.fields?.heading,locale)||textFor(item.fields?.description,locale)));
  return (
    <section className={"tc-press"}>
      {"\n"}
      <div className={"tc-press__inner"}>
        {"\n"}
        <p aria-hidden={true} className={"tc-press__title tc-press__title--m"}>
          {"\n"}
          <span data-tc-content-key={"span-141"}>
            {module?.configured?<SimpleHtml html={fieldFor(module,'heading',locale)}/>:"Bir mağazadan,"}
          </span>
          {"\n"}
          <span data-tc-content-key={"span-142"}>
            {module?.configured?null:"sınırsız olasılığa"}
          </span>
          {"\n"}
        </p>
        {"\n"}
        <div className={"tc-press__left"}>
          {"\n"}
          <div className={"tc-press__carousel"} data-autoplay={"0"} data-speed={"5"}>
            {"\n"}
            <div className={"tc-press__viewport"}>
              {"\n"}
              <ul className={"tc-press__track"} role={"list"}>
                {"\n"}
                {module?.configured?items.map(item=><li key={item.id} className="tc-press__slide">
                  {item.assets?.image?<img alt={textFor(item.fields?.heading,locale)||'Referans'} className="tc-press__img" decoding="async"
                    loading="lazy" src={safeAssetUrl(item.assets.image,'' )}/>:null}
                  {item.assets?.logo?<img className="tc-press__entry-logo" src={safeAssetUrl(item.assets.logo,'')} alt={textFor(item.fields?.heading,locale)||'Logo'}/>:null}
                  {textFor(item.fields?.description,locale)?<p className="tc-press__entry-description">{textFor(item.fields?.description,locale)}</p>:null}
                </li>):(                <li className={"tc-press__slide"}>
                  {"\n"}
                  <img alt={"Butik moda atölyesinde gülümseyen girişimci"} className={"tc-press__img"} decoding={"async"} height={941} loading={"lazy"} src={"/assets/images/ticarti-butik-girisimci.webp"} width={1672} data-tc-content-src={"image-081"} />
                  {"\n"}
                </li>)}
                {"\n"}
              </ul>
              {"\n"}
              <div className={"tc-press__arrows"}>
                {"\n"}
                <button aria-label={"Önceki görsel"} className={"tc-press__arrow"} data-dir={"prev"} type={"button"}>
                  {"\n"}
                  <svg aria-hidden={true} fill={"none"} height={14} viewBox={"0 0 18 14"} width={18}>
                    {"\n"}
                    <path d={"M17 7H1M6 1L1 7l5 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
                    {"\n"}
                  </svg>
                  {"\n"}
                </button>
                {"\n"}
                <button aria-label={"Sonraki görsel"} className={"tc-press__arrow"} data-dir={"next"} type={"button"}>
                  {"\n"}
                  <svg aria-hidden={true} fill={"none"} height={14} viewBox={"0 0 18 14"} width={18}>
                    {"\n"}
                    <path d={"M1 7h16M12 1l5 6-5 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
                    {"\n"}
                  </svg>
                  {"\n"}
                </button>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className={"tc-press__right"}>
          {"\n"}
          <h2 className={"tc-press__title"}>
            {"\n"}
            <span data-tc-content-key={"span-143"}>
              {fieldFor(module,'heading',locale)||"Bir mağazadan,"}
            </span>
            {"\n"}
            <span data-tc-content-key={"span-144"}>
              {fieldFor(module,'heading',locale)?null:"sınırsız olasılığa"}
            </span>
            {"\n"}
          </h2>
          {"\n"}
          <div className={"tc-press__body"}>
            {"Her işin ayrı bir araca bölünmesin. Ürün ve stoktan siparişlere, pazarlamadan çok dilli satışa kadar tüm süreçleri Ticarti ile bir arada yönet."}
          </div>
          {"\n"}
          <div className={"tc-press__cta-wrap"}>
            {"\n"}
            <a className={"tc-press__cta"} href={"/paketler.html"} data-tc-content-key={"a-145"}>
              {"Paketleri karşılaştır"}
            </a>
            {"\n"}
          </div>
          {"\n"}
          <ul className={"tc-press__facts"} role={"list"}>
            {"\n"}
            <li className={"tc-press__fact"}>
              {"\n"}
              <span className={"tc-press__fact-icon"}>
                {"\n"}
                <img alt={"map-pin-Ticarti-anim"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/map-pin-shakers-anim.webp"} data-tc-content-src={"image-082"} />
                {"\n"}
              </span>
              {"\n"}
              <span className={"tc-press__fact-text"} data-tc-content-key={"span-146"}>
                {"Ürün, varyant ve sipariş yönetimi"}
              </span>
              {"\n"}
            </li>
            {"\n"}
            <li className={"tc-press__fact"}>
              {"\n"}
              <span className={"tc-press__fact-icon"}>
                {"\n"}
                <img alt={"Frame 2147236915"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/Frame%202147236915.png"} data-tc-content-src={"image-083"} />
                {"\n"}
              </span>
              {"\n"}
              <span className={"tc-press__fact-text"} data-tc-content-key={"span-147"}>
                {"Depo, iade ve müşteri operasyonları"}
              </span>
              {"\n"}
            </li>
            {"\n"}
            <li className={"tc-press__fact"}>
              {"\n"}
              <span className={"tc-press__fact-icon"}>
                {"\n"}
                <img alt={"calendar-days-Ticarti-anim"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/calendar-days-shakers-anim.webp"} data-tc-content-src={"image-084"} />
                {"\n"}
              </span>
              {"\n"}
              <span className={"tc-press__fact-text"} data-tc-content-key={"span-148"}>
                {"Çoklu dil, kampanya ve analitik"}
              </span>
              {"\n"}
            </li>
            {"\n"}
          </ul>
          {"\n"}
          <div aria-label={"Teknoloji platformları"} className={"tc-press__awards"}>
            {"\n"}
            <p data-tc-content-key={"p-149"}>
              {"Teknoloji platformları"}
            </p>
            {"\n"}
            <div className={"tc-press__awards-row"}>
              {"\n"}
              <div>
                <img alt={"Google"} height={28} loading={"lazy"} src={"/assets/images/partners/google.svg"} width={28} data-tc-content-src={"image-085"} />
                <span data-tc-content-key={"span-150"}>
                  {"Google"}
                </span>
              </div>
              {"\n"}
              <div>
                <img alt={"AWS"} height={46} loading={"lazy"} src={"/assets/images/partners/aws.svg"} width={58} data-tc-content-src={"image-086"} />
              </div>
              {"\n"}
              <div>
                <img alt={"Microsoft"} height={28} loading={"lazy"} src={"/assets/images/partners/microsoft.svg"} width={25} data-tc-content-src={"image-087"} />
                <span data-tc-content-key={"span-151"}>
                  {"Microsoft"}
                </span>
              </div>
              {"\n"}
              <div>
                <img alt={"Cloudflare"} height={28} loading={"lazy"} src={"/assets/images/partners/cloudflare.svg"} width={30} data-tc-content-src={"image-088"} />
                <span data-tc-content-key={"span-152"}>
                  {"Cloudflare"}
                </span>
              </div>
              {"\n"}
              <div>
                <img alt={"Meta"} height={28} loading={"lazy"} src={"/assets/images/partners/meta.svg"} width={34} data-tc-content-src={"image-089"} />
                <span>
                  {"Meta"}
                </span>
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
