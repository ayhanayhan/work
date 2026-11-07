/* Static React snapshot of original Ticarti homepage: channels.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function ChannelsSection(){
  return (
    <section aria-label={"Ticarti operasyon ve pazaryeri yönetimi"} className={"tc-sales-channels"}>
      {"\n"}
      <h2 className={"tc-sales-channels__heading tc-sales-channels__reveal"} data-tc-content-key={"h2-090"}>
        {"Tek panelde tüm mağazan, tüm satış kanalların."}
      </h2>
      {"\n"}
      <p className={"tc-sales-channels__intro tc-sales-channels__reveal"} data-tc-content-key={"p-091"}>
        {"Mağazanı, pazaryerlerini ve tüm siparişlerini tek panelden yönet. Stoklarını güncel tut, satış kanallarını kolayca takip et."}
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
                  <div aria-label={"Farklı pazaryerlerinden gelen örnek siparişler"} aria-live={"off"} className={"tc-orders__list"} data-tc-orders-preview={""}>
                    {"\n"}
                    <div className={"tk__row tc-order"}>
                      <img alt={"Trendyol"} className={"tc-order__logo"} src={"/assets/images/marketplaces/trendyol.svg"} data-tc-content-src={"image-073"} />
                      <div className={"tk__info"}>
                        <span className={"tk__role"} data-tc-content-key={"span-105"}>
                          {"Sipariş #TR-4821"}
                        </span>
                        <span className={"tk__meta"}>
                          {"Trendyol · 2 ürün "}
                          <span className={"tc-order__price"} data-tc-content-key={"span-106"}>
                            {"₺1.249,90"}
                          </span>
                        </span>
                      </div>
                      <span className={"tk__badge"}>
                        {"Yeni"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"tk__row tc-order"}>
                      <img alt={"Hepsiburada"} className={"tc-order__logo"} src={"/assets/images/marketplaces/hepsiburada.svg"} data-tc-content-src={"image-074"} />
                      <div className={"tk__info"}>
                        <span className={"tk__role"} data-tc-content-key={"span-107"}>
                          {"Sipariş #HB-3268"}
                        </span>
                        <span className={"tk__meta"}>
                          {"Hepsiburada · 1 ürün "}
                          <span className={"tc-order__price"} data-tc-content-key={"span-108"}>
                            {"₺899,00"}
                          </span>
                        </span>
                      </div>
                      <span className={"tk__badge"}>
                        {"Yeni"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"tk__row tc-order"}>
                      <img alt={"n11"} className={"tc-order__logo"} src={"/assets/images/marketplaces/n11.svg"} data-tc-content-src={"image-075"} />
                      <div className={"tk__info"}>
                        <span className={"tk__role"} data-tc-content-key={"span-109"}>
                          {"Sipariş #N11-1954"}
                        </span>
                        <span className={"tk__meta"}>
                          {"n11 · 3 ürün "}
                          <span className={"tc-order__price"} data-tc-content-key={"span-110"}>
                            {"₺2.150,00"}
                          </span>
                        </span>
                      </div>
                      <span className={"tk__badge"}>
                        {"Yeni"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"tk__row tc-order"}>
                      <img alt={"Pazarama"} className={"tc-order__logo"} src={"/assets/images/marketplaces/pazarama.svg"} data-tc-content-src={"image-076"} />
                      <div className={"tk__info"}>
                        <span className={"tk__role"} data-tc-content-key={"span-111"}>
                          {"Sipariş #PZ-7186"}
                        </span>
                        <span className={"tk__meta"}>
                          {"Pazarama · 1 ürün "}
                          <span className={"tc-order__price"} data-tc-content-key={"span-112"}>
                            {"₺649,90"}
                          </span>
                        </span>
                      </div>
                      <span className={"tk__badge"}>
                        {"Yeni"}
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
