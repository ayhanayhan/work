import {moduleById,fieldFor,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
import RadarDisplay from './radar-display';
/* Static React snapshot of original Ticarti homepage: radar.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function RadarSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
  const module=moduleById(home,'radar');
  return (
    <section className={"tc-dashboard-radar"}>
      {"\n"}
      <div className={"tc-dashboard-radar__inner"}>
        {"\n"}
        <div className={"tc-dashboard-radar__left"}>
          {"\n"}
          <header className={"tc-dashboard-radar__header"}>
            {"\n"}
            <h2 className={"tc-dashboard-radar__heading tc-dashboard-radar__reveal"} data-tc-content-key={"h2-084"}>
              {module?.configured?<SimpleHtml html={fieldFor(module,'heading',locale)}/>:"Satış yapmak kolay. Büyürken her şeyi yönetmek asıl mesele."}
            </h2>
            {"\n"}
            <p className={"tc-dashboard-radar__subtitle tc-dashboard-radar__reveal"} data-tc-content-key={"p-085"}>
              {module?.configured?<SimpleHtml html={fieldFor(module,'description',locale)}/>:"Ürün kataloğundan sevkiyata, kampanyadan iade süreçlerine kadar günlük operasyonunu sadeleştir."}
            </p>
            {"\n"}
          </header>
          {"\n"}
          <div className={"tc-dashboard-radar__cards"}>
            {"\n"}
            <article className={"tc-dashboard-radar__card tc-dashboard-radar__reveal tc-home-radar-reveal"}>
              {"\n"}
              <div className={"tc-dashboard-radar__card-text"}>
                {"\n"}
                <img alt={""} className={"tc-dashboard-radar__card-icon"} height={44} sizes={"(max-width: 44px) 100vw, 44px"} src={"https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=44&height=44&name=arrow-right-44x44.webp"} srcSet={"https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=22&height=22&name=arrow-right-44x44.webp 22w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=44&height=44&name=arrow-right-44x44.webp 44w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=66&height=66&name=arrow-right-44x44.webp 66w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=88&height=88&name=arrow-right-44x44.webp 88w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=110&height=110&name=arrow-right-44x44.webp 110w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/arrow-right-44x44.webp?width=132&height=132&name=arrow-right-44x44.webp 132w"} width={44} data-tc-content-src={"image-061"} />
                {"\n"}
                <h3 className={"tc-dashboard-radar__card-title"} data-tc-content-key={"h3-086"}>
                  {"Siparişler ve stoklar aynı ritimde"}
                </h3>
                {"\n"}
                <p className={"tc-dashboard-radar__card-body"} data-tc-content-key={"p-087"}>
                  {"Çoklu depo, stok hareketleri, transfer talepleri ve sipariş dağıtım kurallarıyla süreci tek ekranda izle."}
                </p>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-dashboard-radar__card tc-dashboard-radar__reveal tc-home-radar-reveal-2"}>
              {"\n"}
              <div className={"tc-dashboard-radar__card-text"}>
                {"\n"}
                <img alt={""} className={"tc-dashboard-radar__card-icon"} height={44} sizes={"(max-width: 44px) 100vw, 44px"} src={"https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=44&height=44&name=heart-handshake-44x44.webp"} srcSet={"https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=22&height=22&name=heart-handshake-44x44.webp 22w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=44&height=44&name=heart-handshake-44x44.webp 44w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=66&height=66&name=heart-handshake-44x44.webp 66w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=88&height=88&name=heart-handshake-44x44.webp 88w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=110&height=110&name=heart-handshake-44x44.webp 110w, https://www.shakersworks.com/hs-fs/hubfs/Web%20repositioning/Icons/heart-handshake-44x44.webp?width=132&height=132&name=heart-handshake-44x44.webp 132w"} width={44} data-tc-content-src={"image-062"} />
                {"\n"}
                <h3 className={"tc-dashboard-radar__card-title"} data-tc-content-key={"h3-088"}>
                  {"Pazarlama ve müşteri deneyimi bir arada"}
                </h3>
                {"\n"}
                <p className={"tc-dashboard-radar__card-body"} data-tc-content-key={"p-089"}>
                  {"Koşullu kampanyalar, kuponlar, içerik yönetimi ve e-posta şablonlarıyla müşterinin yolculuğunu yönet."}
                </p>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className={"tc-dashboard-radar__right tc-dashboard-radar__reveal"}>
          {"\n"}
          <RadarDisplay />
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
    </section>
  );
}
