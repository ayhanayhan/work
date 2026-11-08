import CmsSection from './channels-cms';
import {moduleById,fieldFor,type HomeContent} from '@/lib/home-content';
import {SimpleHtml} from './simple-html';
import OrdersPreview from './orders-preview';
/* Static React snapshot of original Ticarti homepage: channels.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function ChannelsSection({home,locale='tr'}:{home?:HomeContent|null;locale?:string}){
  const module=moduleById(home,'channels');
  // Only explicitly configured Master modules use database content.
  if(module?.configured)return <CmsSection home={home} locale={locale}/>;
  return (
    <section aria-label={"Ticarti operasyon ve pazaryeri yönetimi"} className={"tc-sales-channels"}>
      {"\n"}
      <h2 className={"tc-sales-channels__heading tc-sales-channels__reveal"} data-tc-content-key={"h2-090"}>
        {module?.configured?<SimpleHtml html={fieldFor(module,'heading',locale)}/>:"Tek panelde tüm mağazan, tüm satış kanalların."}
      </h2>
      {"\n"}
      <p className={"tc-sales-channels__intro tc-sales-channels__reveal"} data-tc-content-key={"p-091"}>
        {module?.configured?<SimpleHtml html={fieldFor(module,'description',locale)}/>:"Mağazanı, pazaryerlerini ve tüm siparişlerini tek panelden yönet. Stoklarını güncel tut, satış kanallarını kolayca takip et."}
      </p>
      {"\n"}
      <div className={"tc-sales-channels__grid"}>
        {"\n"}
        <div className={"tc-sales-channels__col tc-sales-channels__reveal tc-home-banner-reveal"}>
          {"\n"}
          <div className={"tc-sales-channels__frame"}>
            {"\n"}
            <div aria-label={"Mağaza yönetim paneli görseli"} className={"tc-sales-channels__stage"} role={"group"}>
              {"\n"}
              <div className={"mk tc-ops"}>
                {"\n"}
                <div className={"mk__head tc-ops__head"}>
                  {"\n"}
                  <span className={"mk__head-t"} data-tc-content-key={"span-092"}>
                    {"Mağaza yönetimi"}
                  </span>
                  {"\n"}
                </div>
                {"\n"}
                <div className={"tc-ops__body"}>
                  {"\n"}
                  <div className={"tc-ops__metrics"}>
                    {"\n"}
                    <div className={"tc-ops__metric"}>
                      <span data-tc-content-key={"span-093"}>
                        {"Bugünkü sipariş"}
                      </span>
                      <strong>
                        {"38"}
                      </strong>
                      <small>
                        {"Tek ekrandan takip"}
                      </small>
                    </div>
                    {"\n"}
                    <div className={"tc-ops__metric"}>
                      <span data-tc-content-key={"span-094"}>
                        {"Aktif ürün"}
                      </span>
                      <strong>
                        {"1.248"}
                      </strong>
                      <small>
                        {"Katalog yönetimi"}
                      </small>
                    </div>
                    {"\n"}
                    <div className={"tc-ops__metric"}>
                      <span data-tc-content-key={"span-095"}>
                        {"Satış kanalı"}
                      </span>
                      <strong>
                        {"6"}
                      </strong>
                      <small>
                        {"Birbiriyle bağlantılı"}
                      </small>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ops__subtitle"}>
                    {"Operasyon özeti"}
                  </div>
                  {"\n"}
                  <div className={"tc-ops__item"}>
                    <span aria-hidden={true} className={"tc-ops__check"}>
                      {"✓"}
                    </span>
                    <span data-tc-content-key={"span-096"}>
                      {"Stoklar tüm kanallarda eşitlendi"}
                    </span>
                    <span className={"tc-ops__state"} data-tc-content-key={"span-097"}>
                      {"Güncel"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"tc-ops__item"}>
                    <span aria-hidden={true} className={"tc-ops__check"}>
                      {"✓"}
                    </span>
                    <span data-tc-content-key={"span-098"}>
                      {"Yeni siparişler tek listede"}
                    </span>
                    <span className={"tc-ops__state"} data-tc-content-key={"span-099"}>
                      {"Aktif"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"tc-ops__item"}>
                    <span aria-hidden={true} className={"tc-ops__check"}>
                      {"✓"}
                    </span>
                    <span data-tc-content-key={"span-100"}>
                      {"Kampanyalar ve ürünler kontrol altında"}
                    </span>
                    <span className={"tc-ops__state"} data-tc-content-key={"span-101"}>
                      {"Hazır"}
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
          <div className={"tc-sales-channels__body"}>
            {"\n"}
            <p className={"tc-sales-channels__text"} data-tc-content-key={"p-102"}>
              {"Ürünlerini, stoklarını ve siparişlerini ayrı ayrı yönetme. Ticarti ile mağazanın tüm operasyonunu tek panelden takip et."}
            </p>
            {"\n"}
            <a className={"tc-sales-channels__link"} href={"/paketler.html"}>
              <span className={"tc-sales-channels__link-label"} data-tc-content-key={"span-103"}>
                {"Tüm özellikleri keşfet"}
              </span>
              <span aria-hidden={true} className={"tc-sales-channels__link-arrow"}>
                {"→"}
              </span>
            </a>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
        <div className={"tc-sales-channels__col tc-sales-channels__reveal tc-home-banner-reveal-2"}>
          {"\n"}
          <div className={"tc-sales-channels__frame"}>
            {"\n"}
            <div aria-label={"Pazaryeri sipariş akışı görseli"} className={"tc-sales-channels__stage"} role={"group"}>
              {"\n"}
              <div className={"mk tc-orders"}>
                {"\n"}
                <div className={"mk__head tc-orders__head"}>
                  {"\n"}
                  <span className={"mk__head-t"} data-tc-content-key={"span-104"}>
                    {"Yeni siparişler"}
                  </span>
                  {"\n"}
                </div>
                {"\n"}
                <div className={"tk tc-orders__viewport"}>
                  {"\n"}
                  <OrdersPreview />
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
          <div className={"tc-sales-channels__body"}>
            {"\n"}
            <p className={"tc-sales-channels__text"} data-tc-content-key={"p-113"}>
              {"Trendyol, Hepsiburada, n11 ve diğer pazaryerlerinden gelen siparişlerin tek ekranda toplansın; hiçbir kanalı ayrı ayrı kontrol etme."}
            </p>
            {"\n"}
            <a className={"tc-sales-channels__link"} href={"/paketler.html#tc-compare"}>
              <span className={"tc-sales-channels__link-label"} data-tc-content-key={"span-114"}>
                {"Pazaryeri bağlantılarını incele"}
              </span>
              <span aria-hidden={true} className={"tc-sales-channels__link-arrow"}>
                {"→"}
              </span>
            </a>
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
