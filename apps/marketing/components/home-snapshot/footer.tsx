import {FooterTree} from '@/components/navigation-tree';
import MenuGroupItems from '@/components/navigation-links';
import {groupFor,menuLabel,type Navigation} from '@/lib/navigation';
import FooterLanguagePicker from '@/components/footer-language-picker';
/* Original Ticarti footer markup converted to native JSX. */
export default function FooterSnapshot({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){return (
  <div className={"tc-component tc-component__content tc-component--section"} id={"tc-global-footer"}>
    {"\n"}
    <footer aria-label={"Ticarti footer"} className={"tc-site-footer tc-home-footer"}>
      {"\n"}
      <div className={"footer-inner-wrap"}>
        {"\n"}
        <div className={"footer-top-row"}>
          <nav aria-label={"Footer"} className={"footer-nav-columns"}>
            {"\n"}
            <FooterTree navigation={navigation} locale={locale}/>
          </nav>
        </div>
        {"\n"}
        <div className={"footer-bottom-bar"}>
          {"\n"}
          <div className={"tc-home-footer-brand"}>
            {"\n"}
            <a className={"footer-logo"} href={"/"}>
              {"\n"}
              <img alt={"Ticarti"} loading={"lazy"} src={"/assets/images/ticarti-logo.svg"} data-tc-content-src={"image-108"} />
              {"\n"}
            </a>
            {"\n"}
            <ul className={"footer-social"}>
              {"\n"}
              <li>
                {"\n"}
                <a aria-label={"Instagram"} href={"/contacto.html"} title={"Sosyal medya hesabı bağlantısı yapılandırılacak"}>
                  {"\n"}
                  <span className={"tc-component tc-component__content tc-component--icon"} id={"tc-widget-007"}>
                    {"\n"}
                    <svg aria-hidden={true} version={"1.0"} viewBox={"0 0 448 512"} xmlns={"http://www.w3.org/2000/svg"}>
                      {"\n"}
                      <g id={"Instagram1_layer"}>
                        {"\n"}
                        <path d={"M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"}></path>
                        {"\n"}
                      </g>
                      {"\n"}
                    </svg>
                    {"\n"}
                  </span>
                  {"\n"}
                </a>
                {"\n"}
              </li>
              {"\n"}
              <li>
                {"\n"}
                <a aria-label={"YouTube"} href={"/contacto.html"} title={"Sosyal medya hesabı bağlantısı yapılandırılacak"}>
                  {"\n"}
                  <span className={"tc-component tc-component__content tc-component--icon"} id={"tc-widget-007"}>
                    {"\n"}
                    <svg aria-hidden={true} version={"1.0"} viewBox={"0 0 576 512"} xmlns={"http://www.w3.org/2000/svg"}>
                      {"\n"}
                      <g id={"YouTube2_layer"}>
                        {"\n"}
                        <path d={"M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"}></path>
                        {"\n"}
                      </g>
                      {"\n"}
                    </svg>
                    {"\n"}
                  </span>
                  {"\n"}
                </a>
                {"\n"}
              </li>
              {"\n"}
              <li>
                {"\n"}
                <a aria-label={"Spotify"} href={"/contacto.html"} title={"Sosyal medya hesabı bağlantısı yapılandırılacak"}>
                  {"\n"}
                  <span className={"tc-component tc-component__content tc-component--icon"} id={"tc-widget-007"}>
                    {"\n"}
                    <svg aria-hidden={true} version={"1.0"} viewBox={"0 0 496 512"} xmlns={"http://www.w3.org/2000/svg"}>
                      {"\n"}
                      <g id={"Spotify3_layer"}>
                        {"\n"}
                        <path d={"M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z"}></path>
                        {"\n"}
                      </g>
                      {"\n"}
                    </svg>
                    {"\n"}
                  </span>
                  {"\n"}
                </a>
                {"\n"}
              </li>
              {"\n"}
              <li>
                {"\n"}
                <a aria-label={"LinkedIn"} href={"/contacto.html"} title={"Sosyal medya hesabı bağlantısı yapılandırılacak"}>
                  {"\n"}
                  <span className={"tc-component tc-component__content tc-component--icon"} id={"tc-widget-007"}>
                    {"\n"}
                    <svg aria-hidden={true} version={"1.0"} viewBox={"0 0 448 512"} xmlns={"http://www.w3.org/2000/svg"}>
                      {"\n"}
                      <g id={"LinkedIn4_layer"}>
                        {"\n"}
                        <path d={"M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"}></path>
                        {"\n"}
                      </g>
                      {"\n"}
                    </svg>
                    {"\n"}
                  </span>
                  {"\n"}
                </a>
                {"\n"}
              </li>
              {"\n"}
            </ul>
            {"\n"}
            <div className={"tc-footer-brand-support"}>
              {"\n"}
              <a className={"tc-site-hero__cta tc-site-hero__cta--1 tc-support-link"} href={"/contacto.html"} data-tc-content-key={"a-273"}>
                {"Destek al"}
              </a>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
          <FooterLanguagePicker/>
        </div>
        {"\n"}
        <div className={"tc-home-footer-legal-bottom"}>
          <div className={"tc-footer-legal-content"}>
            {"\n"}
            <div className={"tc-home-footer-legal-menu"}>
              <nav aria-label={"Yasal bilgiler"} className={"footer-legal-menu"}>
                {"\n"}
                <ul className={"tc-footer-legal-links"}>
                  {"\n"}
                  <li>
                    <a href={"/kvkk.html"} data-tc-content-key={"a-276"}>
                      {"KVKK Aydınlatma Metni"}
                    </a>
                  </li>
                  {"\n"}
                  <li>
                    <span aria-disabled={true} title={"Bağlantı henüz tanımlanmadı"} data-tc-content-key={"span-277"}>
                      {"Gizlilik Politikası"}
                    </span>
                  </li>
                  {"\n"}
                  <li>
                    <span aria-disabled={true} title={"Bağlantı henüz tanımlanmadı"} data-tc-content-key={"span-278"}>
                      {"Kullanım Koşulları"}
                    </span>
                  </li>
                  {"\n"}
                  <li>
                    <span aria-disabled={true} title={"Bağlantı henüz tanımlanmadı"} data-tc-content-key={"span-279"}>
                      {"Çerez Politikası"}
                    </span>
                  </li>
                  {"\n"}
                </ul>
                {"\n"}
              </nav>
            </div>
            {"\n"}
            <div className={"footer-copyright"}>
              {"\n"}
              <p data-tc-content-key={"p-280"}>
                {"© 2026 Ticarti. Tüm hakları saklıdır."}
              </p>
              {"\n"}
              <p className={"tc-home-footer-company"} data-tc-content-key={"p-281"}>
                {"We Did It Dijital Reklam ve Ticaret Ltd. Şti. kuruluşudur."}
              </p>
              {"\n"}
            </div>
            {"\n"}
          </div>
          <div aria-label={"Ödeme markaları"} className={"tc-footer-payments"}>
            <img alt={"Visa, Mastercard, Troy, American Express ve iyzico"} height={69} loading={"lazy"} src={"/assets/images/payments/payment-logos.svg"} width={420} data-tc-content-src={"image-110"} />
          </div>
        </div>
        {"\n"}
      </div>
      {"\n"}
    </footer>
    {"\n"}
  </div>
)}
