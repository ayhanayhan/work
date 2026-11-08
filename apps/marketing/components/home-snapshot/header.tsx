import {HeaderPrimaryTree,HeaderMegaTree} from '@/components/navigation-tree';
import MenuGroupItems from '@/components/navigation-links';
import {groupFor,menuLabel,type Navigation} from '@/lib/navigation';
/* Original Ticarti header markup converted to native JSX. */
import MobileMegaMenu from './mobile-mega';
export default function HeaderSnapshot({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){
 const top=groupFor(navigation,'header-primary');
 const primary=(id:string,fallback:string,url:string)=>{
  const item=top?.links?.find(x=>x.id===id);
  return {enabled:item?.enabled!==false,label:menuLabel(item?.label,locale)||fallback,url:item?.url||url};
 };
 const solutions=primary('nav-solutions','Çözümler','#');
 const features=primary('nav-features','Özellikler','/paketler.html#tc-compare');
 const resources=primary('nav-resources','Kaynaklar','#');
 return (
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
                  <ul role="menu"><HeaderPrimaryTree navigation={navigation} locale={locale}/></ul>
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
      <div className={"tc-mega-navigation megamenu"}><HeaderMegaTree navigation={navigation} locale={locale}/></div>
      {"\n"}
    </div>
    {"\n"}
    <div aria-hidden={true} className={"tc-ui-header-spacer"}></div>
    {"\n"}
  </div>
)}
