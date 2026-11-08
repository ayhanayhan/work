import MenuGroupItems from '@/components/navigation-links';
import type {Navigation} from '@/lib/navigation';
/* Original Ticarti header markup converted to native JSX. */
import MobileMegaMenu from './mobile-mega';
export default function HeaderSnapshot({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){return (
  <div className={"tc-component tc-component__content tc-component--section"} id={"tc-global-header"}>
    {"\n"}
    <div className={"tc-site-header header-main"}>
      <div className="tc-ui-drawer-overlay" aria-hidden="true"></div>
      {"\n"}
      <div aria-label={"Kampanya duyurusu"} className={"tc-announcement-bar tc-announcement-bar--closable"} data-days={"0"} data-editor={"0"} data-key={"ticarti-lansman-indirim-50"} data-tc-ui-topbar={""} role={"region"}>
        {"\n"}
        <div className={"container"}>
          {"\n"}
          <div className={"tc-announcement-bar__text"}>
            {"\n"}
            <p>
              {"\n"}
              <strong>
                {"Lansmana özel %50 indirim!"}
              </strong>
              {" Tüm Ticarti paketlerinde geçerli lansman fırsatını keşfet.\n              "}
            </p>
            {"\n"}
          </div>
          {"\n"}
          <a className={"tc-announcement-bar__cta"} href={"/paketler.html"} data-tc-content-key={"a-001"}>
            {"Paketleri incele"}
          </a>
          {"\n"}
          <button aria-label={"Duyuruyu kapat"} className={"tc-announcement-bar__close"} data-tc-ui-topbar-close={""} type={"button"}>
            {"\n"}
            <svg aria-hidden={true} fill={"none"} viewBox={"0 0 24 24"} xmlns={"http://www.w3.org/2000/svg"}>
              {"\n"}
              <path d={"M18 6L6 18M6 6L18 18"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"2"}></path>
              {"\n"}
            </svg>
            {"\n"}
          </button>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"container"}>
        {"\n"}
        <div className={"header-inner dis-flex align-center"}>
          {"\n"}
          <div className={"logo"}>
            {"\n"}
            <a href={"/"}>
              {"\n"}
              <img alt={"Ticarti"} loading={"lazy"} src={"/assets/images/ticarti-logo.svg"} data-tc-content-src={"image-001"} />
              {"\n"}
            </a>
            {"\n"}
          </div>
          {"\n"}
          <button aria-expanded={"false"} aria-label={"Menüyü aç"} className={"tc-menu-toggle"} type={"button"}>
            {"\n"}
            <span></span>
            {"\n"}
            <span></span>
            {"\n"}
            <span></span>
            {"\n"}
          </button>
          {"\n"}
          <div className={"tc-navigation-panel"}>
            <div className="tc-ui-drawer-header">
              <a className="tc-ui-drawer-brand" href="/" aria-label="Ticarti ana sayfa">
                <img src="/assets/images/ticarti-logo.svg" alt="Ticarti"/>
              </a>
              <button type="button" className="tc-ui-drawer-close" aria-label="Menüyü kapat">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {"\n"}
            <div className={"tc-menu primary-menu js-enabled"}>
              {"\n"}
              <span className={"tc-component tc-component__content tc-component--menu"} id={"tc-widget-015"}>
                {"\n"}
                <a className={"mobile-trigger"}>
                  {"\n"}
                  <i></i>
                  {"\n"}
                </a>
                {"\n"}
                <div aria-label={"Navigation Menu"} className={"tc-nav-wrapper active-branch no-flyouts tc-nav-horizontal"} data-menu-id={"218746567798"} data-sitemap-name={"default"} id={"tc-widget-051"} role={"navigation"}>
                  {"\n"}
                  <ul role={"menu"}>
                    {"\n"}
                    <li className={"tc-nav-item tc-nav-primary"} role={"none"}>
                      {"\n"}
                      <a aria-expanded={"false"} aria-haspopup={"true"} className={"has-mega"} data-mega-slug={"companies"} href={"#"} role={"menuitem"} data-tc-content-key={"a-002"}>
                        {"Çözümler"}
                      </a>
                      {"\n"}
                    </li>
                    {"\n"}
                    <li className={"tc-nav-item tc-nav-primary"} role={"none"}>
                      {"\n"}
                      <a href={"/paketler.html#tc-compare"} role={"menuitem"} data-tc-content-key={"a-003"}>
                        {"Özellikler"}
                      </a>
                      {"\n"}
                    </li>
                    {"\n"}
                    <li className={"tc-nav-item tc-nav-primary"} role={"none"}>
                      {"\n"}
                      <a aria-expanded={"false"} aria-haspopup={"true"} className={"has-mega"} data-mega-slug={"resources"} href={"#"} role={"menuitem"} data-tc-content-key={"a-004"}>
                        {"Kaynaklar"}
                      </a>
                      {"\n"}
                    </li>
                    {"\n"}
                  </ul>
                  {"\n"}
                </div>
                {"\n"}
              </span>
              {"\n"}
            </div>
            {"\n"}
            <div className={"tc-navigation-actions"}>
              {"\n"}
              <div className={"tc-menu secondary-menu js-enabled"}>
                {"\n"}
                <span className={"tc-component tc-component__content tc-component--menu"} id={"tc-widget-015"}>
                  {"\n"}
                  <a className={"mobile-trigger"}>
                    {"\n"}
                    <i></i>
                    {"\n"}
                  </a>
                  {"\n"}
                  <div aria-label={"Navigation Menu"} className={"tc-nav-wrapper active-branch no-flyouts tc-nav-horizontal"} data-menu-id={"218746190423"} data-sitemap-name={"default"} id={"tc-widget-051"} role={"navigation"}>
                    {"\n"}
                    <ul role={"menu"}>
                      {"\n"}
                      <li className={"tc-nav-item tc-nav-primary"} role={"none"}>
                        {"\n"}
                        <a href={"/contacto.html"} role={"menuitem"} data-tc-content-key={"a-005"}>
                          {"Hakkımızda"}
                        </a>
                        {"\n"}
                      </li>
                      {"\n"}
                    </ul>
                    {"\n"}
                  </div>
                  {"\n"}
                </span>
                {"\n"}
              </div>
              {"\n"}
              <div className={"button btn2 login-btn"}>
                {"\n"}
                <a href={"/contacto.html"} data-tc-content-key={"a-006"}>
                  {"İletişim"}
                </a>
                {"\n"}
              </div>
              {"\n"}
              <div className={"button btn1 account-btn"}>
                {"\n"}
                <a href={"/login.html"} data-tc-content-key={"a-007"}>
                  {"Giriş yap"}
                </a>
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <div className={"tc-ui-submenu-view"}>
              {"\n"}
              <button className={"tc-ui-back"} type={"button"}>
                {"\n"}
                <span aria-hidden={true} className={"tc-ui-back-ico"}></span>
                {"\n"}
                <span className={"tc-ui-back-label"}></span>
                {"\n"}
              </button>
              {"\n"}
              <div className={"tc-ui-submenu-slot"}><MobileMegaMenu navigation={navigation} locale={locale} /></div>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"tc-mega-navigation megamenu"}>
        {"\n"}
        <ul className={"tc-nav-children bm-add-companies"} data-mega={"companies"}>
          {"\n"}
          <div className={"tc-mega-menu"}>
            {"\n"}
            <div className={"container"}>
              {"\n"}
              <div className={"tc-mega-menu-card"}>
                {"\n"}
                <div className={"tc-ui-layout tc-ui-layout--four_columns"}>
                  {"\n"}
                  <div className={"tc-ui-featured column tc-ui-featured--cta-top"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-008"}>
                      {"Ticarti ile ticaret"}
                    </p>
                    {"\n"}
                    <p className={"tc-ui-col-title"} data-tc-content-key={"p-009"}>
                      {"İşletmenin büyüklüğüne ve satış modeline göre tek altyapıda yönetim"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-cta"}>
                      {"\n"}
                      <a href={"/paketler.html"} data-tc-content-key={"a-010"}>
                        {"Paketleri karşılaştır"}
                      </a>
                      {"\n"}
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-011"}>
                      {"İşletme ölçeği"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-companies-1" locale={locale}/>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-017"}>
                      {"Ticaret operasyonları"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-companies-2" locale={locale}/>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-023"}>
                      {"Satış ve büyüme"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-companies-3" locale={locale}/>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-029"}>
                      {"Entegrasyon ve analiz"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-companies-4" locale={locale}/>
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
        </ul>
        {"\n"}
        <ul className={"tc-nav-children bm-add-resources"} data-mega={"resources"}>
          {"\n"}
          <div className={"tc-mega-menu"}>
            {"\n"}
            <div className={"container"}>
              {"\n"}
              <div className={"tc-mega-menu-card"}>
                {"\n"}
                <div className={"tc-ui-layout tc-ui-layout--four_columns"}>
                  {"\n"}
                  <div className={"tc-ui-featured column tc-ui-featured--cta-top"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-035"}>
                      {"Ticarti kaynakları"}
                    </p>
                    {"\n"}
                    <p className={"tc-ui-col-title"} data-tc-content-key={"p-036"}>
                      {"E-ticaret operasyonlarını öğren, özellikleri keşfet ve doğru paketi seç"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-cta"}>
                      {"\n"}
                      <a href={"/paketler.html#tc-compare"} data-tc-content-key={"a-037"}>
                        {"Tüm özellikleri keşfet"}
                      </a>
                      {"\n"}
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-038"}>
                      {"Ürünü keşfet"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-resources-1" locale={locale}/>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-044"}>
                      {"Rehberler"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-resources-2" locale={locale}/>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"tc-ui-divider"}></div>
                  {"\n"}
                  <div className={"tc-ui-column column"}>
                    {"\n"}
                    <p className={"tc-ui-overline"} data-tc-content-key={"p-050"}>
                      {"Ticarti hakkında"}
                    </p>
                    {"\n"}
                    <div className={"tc-ui-links"}>
                      <MenuGroupItems data={navigation} id="header-resources-3" locale={locale}/>
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
        </ul>
        {"\n"}
      </div>
      {"\n"}
    </div>
    {"\n"}
    <div aria-hidden={true} className={"tc-ui-header-spacer"}></div>
    {"\n"}
  </div>
)}
