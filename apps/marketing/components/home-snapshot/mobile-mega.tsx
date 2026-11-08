import MenuGroupItems from '@/components/navigation-links';
import {groupFor,menuLabel,type Navigation} from '@/lib/navigation';
/* Desktop mega sections cloned as React JSX for the existing mobile submenu slot.
 * Same static content. No DOM moves, HTML strings, or data mutations.
 */
export default function MobileMegaMenu({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){return <>
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
                      {menuLabel(groupFor(navigation,'header-companies-1')?.title,locale)||"İşletme ölçeği"}
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
                      {menuLabel(groupFor(navigation,'header-companies-2')?.title,locale)||"Ticaret operasyonları"}
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
                      {menuLabel(groupFor(navigation,'header-companies-3')?.title,locale)||"Satış ve büyüme"}
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
                      {menuLabel(groupFor(navigation,'header-companies-4')?.title,locale)||"Entegrasyon ve analiz"}
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
                      {menuLabel(groupFor(navigation,'header-resources-1')?.title,locale)||"Ürünü keşfet"}
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
                      {menuLabel(groupFor(navigation,'header-resources-2')?.title,locale)||"Rehberler"}
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
                      {menuLabel(groupFor(navigation,'header-resources-3')?.title,locale)||"Ticarti hakkında"}
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
</>}
