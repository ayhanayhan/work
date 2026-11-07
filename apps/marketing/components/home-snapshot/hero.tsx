import HeroCards from './hero-cards';
/* Static React snapshot of original Ticarti homepage: hero.
 * Preserves DOM/classes/content; no CMS, fetch, innerHTML, or client text replacement.
 */
export default function HeroSection(){
  return (
    <section aria-label={"La casa del mejor talento tech de Europa"} className={"tc-site-hero is-armed"} data-kpi-replay={"false"} data-kpi-stagger={"0"}>
      {"\n"}
      <div className={"tc-site-hero__intro"}>
        {"\n"}
        <h1 className={"tc-site-hero__h1"}>
          {"E-ticaret siteni oluştur."}
          <br />
          {"14 gün ücretsiz dene."}
        </h1>
        {"\n"}
        <p className={"tc-site-hero__sub"} data-tc-content-key={"p-056"}>
          {"Mağazanı dakikalar içinde kur; ürünlerini, siparişlerini, stoklarını ve pazaryeri bağlantılarını tek panelden kolayca yönet."}
        </p>
        {"\n"}
        <p className={"tc-hero-offer"} data-tc-content-key={"p-057"}>
          {"Lansmana özel %50 indirimi kaçırma."}
        </p>
        {"\n"}
        <form className={"tc-callback-form tc-hero-callback"} data-tc-callback={""} noValidate>
          {"\n"}
          <div className={"tc-callback-fields tc-phone-combined"}>
            {"\n"}
            <div className={"tc-dial-select"}>
              {"\n"}
              <span aria-hidden={true} className={"tc-dial-visible"} data-tc-content-key={"span-058"}>
                {"🇹🇷 +90"}
              </span>
              {"\n"}
              <select aria-label={"Ülke ve telefon alan kodu seçin"} className={"tc-country-code"} name={"country_code"} defaultValue={"+90"}>
                {"\n"}
                <option data-country={"TR"} data-flag={"🇹🇷"} data-name={"Türkiye"} value={"+90"}>
                  {"🇹🇷 Türkiye (+90)"}
                </option>
                {"\n"}
                <option data-country={"DE"} data-flag={"🇩🇪"} data-name={"Almanya"} value={"+49"}>
                  {"🇩🇪 Almanya (+49)"}
                </option>
                {"\n"}
                <option data-country={"US"} data-flag={"🇺🇸"} data-name={"Amerika Birleşik Devletleri"} value={"+1"}>
                  {"🇺🇸 Amerika Birleşik Devletleri (+1)"}
                </option>
                {"\n"}
                <option data-country={"GB"} data-flag={"🇬🇧"} data-name={"Birleşik Krallık"} value={"+44"}>
                  {"🇬🇧 Birleşik Krallık (+44)"}
                </option>
                {"\n"}
                <option data-country={"FR"} data-flag={"🇫🇷"} data-name={"Fransa"} value={"+33"}>
                  {"🇫🇷 Fransa (+33)"}
                </option>
                {"\n"}
                <option data-country={"NL"} data-flag={"🇳🇱"} data-name={"Hollanda"} value={"+31"}>
                  {"🇳🇱 Hollanda (+31)"}
                </option>
                {"\n"}
                <option data-country={"BE"} data-flag={"🇧🇪"} data-name={"Belçika"} value={"+32"}>
                  {"🇧🇪 Belçika (+32)"}
                </option>
                {"\n"}
                <option data-country={"AT"} data-flag={"🇦🇹"} data-name={"Avusturya"} value={"+43"}>
                  {"🇦🇹 Avusturya (+43)"}
                </option>
                {"\n"}
                <option data-country={"CH"} data-flag={"🇨🇭"} data-name={"İsviçre"} value={"+41"}>
                  {"🇨🇭 İsviçre (+41)"}
                </option>
                {"\n"}
                <option data-country={"IT"} data-flag={"🇮🇹"} data-name={"İtalya"} value={"+39"}>
                  {"🇮🇹 İtalya (+39)"}
                </option>
                {"\n"}
                <option data-country={"ES"} data-flag={"🇪🇸"} data-name={"İspanya"} value={"+34"}>
                  {"🇪🇸 İspanya (+34)"}
                </option>
                {"\n"}
                <option data-country={"PT"} data-flag={"🇵🇹"} data-name={"Portekiz"} value={"+351"}>
                  {"🇵🇹 Portekiz (+351)"}
                </option>
                {"\n"}
                <option data-country={"BG"} data-flag={"🇧🇬"} data-name={"Bulgaristan"} value={"+359"}>
                  {"🇧🇬 Bulgaristan (+359)"}
                </option>
                {"\n"}
                <option data-country={"RO"} data-flag={"🇷🇴"} data-name={"Romanya"} value={"+40"}>
                  {"🇷🇴 Romanya (+40)"}
                </option>
                {"\n"}
                <option data-country={"GR"} data-flag={"🇬🇷"} data-name={"Yunanistan"} value={"+30"}>
                  {"🇬🇷 Yunanistan (+30)"}
                </option>
                {"\n"}
                <option data-country={"CY"} data-flag={"🇨🇾"} data-name={"Kıbrıs"} value={"+357"}>
                  {"🇨🇾 Kıbrıs (+357)"}
                </option>
                {"\n"}
                <option data-country={"AZ"} data-flag={"🇦🇿"} data-name={"Azerbaycan"} value={"+994"}>
                  {"🇦🇿 Azerbaycan (+994)"}
                </option>
                {"\n"}
                <option data-country={"GE"} data-flag={"🇬🇪"} data-name={"Gürcistan"} value={"+995"}>
                  {"🇬🇪 Gürcistan (+995)"}
                </option>
                {"\n"}
                <option data-country={"UA"} data-flag={"🇺🇦"} data-name={"Ukrayna"} value={"+380"}>
                  {"🇺🇦 Ukrayna (+380)"}
                </option>
                {"\n"}
                <option data-country={"RU"} data-flag={"🇷🇺"} data-name={"Rusya"} value={"+7"}>
                  {"🇷🇺 Rusya (+7)"}
                </option>
                {"\n"}
                <option data-country={"AE"} data-flag={"🇦🇪"} data-name={"Birleşik Arap Emirlikleri"} value={"+971"}>
                  {"🇦🇪 Birleşik Arap Emirlikleri (+971)"}
                </option>
                {"\n"}
                <option data-country={"SA"} data-flag={"🇸🇦"} data-name={"Suudi Arabistan"} value={"+966"}>
                  {"🇸🇦 Suudi Arabistan (+966)"}
                </option>
                {"\n"}
                <option data-country={"QA"} data-flag={"🇶🇦"} data-name={"Katar"} value={"+974"}>
                  {"🇶🇦 Katar (+974)"}
                </option>
                {"\n"}
                <option data-country={"KW"} data-flag={"🇰🇼"} data-name={"Kuveyt"} value={"+965"}>
                  {"🇰🇼 Kuveyt (+965)"}
                </option>
                {"\n"}
                <option data-country={"IQ"} data-flag={"🇮🇶"} data-name={"Irak"} value={"+964"}>
                  {"🇮🇶 Irak (+964)"}
                </option>
                {"\n"}
                <option data-country={"IR"} data-flag={"🇮🇷"} data-name={"İran"} value={"+98"}>
                  {"🇮🇷 İran (+98)"}
                </option>
                {"\n"}
                <option data-country={"EG"} data-flag={"🇪🇬"} data-name={"Mısır"} value={"+20"}>
                  {"🇪🇬 Mısır (+20)"}
                </option>
                {"\n"}
                <option data-country={"MA"} data-flag={"🇲🇦"} data-name={"Fas"} value={"+212"}>
                  {"🇲🇦 Fas (+212)"}
                </option>
                {"\n"}
                <option data-country={"IN"} data-flag={"🇮🇳"} data-name={"Hindistan"} value={"+91"}>
                  {"🇮🇳 Hindistan (+91)"}
                </option>
                {"\n"}
                <option data-country={"PK"} data-flag={"🇵🇰"} data-name={"Pakistan"} value={"+92"}>
                  {"🇵🇰 Pakistan (+92)"}
                </option>
                {"\n"}
                <option data-country={"CA"} data-flag={"🇨🇦"} data-name={"Kanada"} value={"+1"}>
                  {"🇨🇦 Kanada (+1)"}
                </option>
                {"\n"}
                <option data-country={"AU"} data-flag={"🇦🇺"} data-name={"Avustralya"} value={"+61"}>
                  {"🇦🇺 Avustralya (+61)"}
                </option>
                {"\n"}
              </select>
              {"\n"}
              <span aria-hidden={true} className={"tc-dial-chevron"}></span>
              {"\n"}
            </div>
            {"\n"}
            <label className={"tc-visually-hidden"} htmlFor={"tc-phone-main-hero"}>
              {"Telefon numaranız"}
            </label>
            {"\n"}
            <input aria-required={true} autoComplete={"tel-national"} id={"tc-phone-main-hero"} inputMode={"tel"} name={"phone"} placeholder={"5xx xxx xx xx"} required type={"tel"} />
            {"\n"}
            <button className={"tc-site-hero__cta tc-site-hero__cta--1"} type={"submit"} data-tc-content-key={"button-059"}>
              {"Sizi arayalım"}
            </button>
            {"\n"}
          </div>
          {"\n"}
          <div className={"tc-kvkk"}>
            {"\n"}
            <input aria-describedby={"tc-kvkk-hero-error"} id={"tc-kvkk-hero"} name={"kvkk_read"} required type={"checkbox"} value={"1"} />
            {"\n"}
            <label htmlFor={"tc-kvkk-hero"}>
              <a href={"/kvkk.html"} rel={"noopener noreferrer"} target={"_blank"} data-tc-content-key={"a-060"}>
                {"KVKK Aydınlatma Metni"}
              </a>
              {"’ni okudum, onaylıyorum."}
            </label>
            {"\n"}
          </div>
          {"\n"}
          <p className={"tc-kvkk-error"} id={"tc-kvkk-hero-error"} role={"alert"}></p>
          {"\n"}
          <p aria-live={"polite"} className={"tc-callback-status"} role={"status"}></p>
          {"\n"}
        </form>
        {"\n"}
        <div className={"tc-site-hero__ctas"}>
          {"\n"}
          <a className={"tc-site-hero__cta tc-site-hero__cta--1"} href={"/paketler.html"}>
            <span data-tc-content-key={"span-061"}>
              {"E-ticaret siteni oluştur"}
            </span>
          </a>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"tc-site-hero__carousel"}>
        {"\n"}
        <span aria-hidden={true} className={"tc-site-hero__fade tc-site-hero__fade--l"}></span>
        {"\n"}
        <span aria-hidden={true} className={"tc-site-hero__fade tc-site-hero__fade--r"}></span>
        {"\n"}
        <button aria-label={"Perfil anterior"} className={"tc-site-hero__arrow tc-site-hero__arrow--prev"} data-dir={"prev"} type={"button"}>
          {"\n"}
          <svg aria-hidden={true} fill={"none"} height={16} viewBox={"0 0 24 24"} width={16}>
            {"\n"}
            <path d={"M15 6l-6 6 6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
            {"\n"}
          </svg>
          {"\n"}
        </button>
        {"\n"}
        <button aria-label={"Perfil siguiente"} className={"tc-site-hero__arrow tc-site-hero__arrow--next"} data-dir={"next"} type={"button"}>
          {"\n"}
          <svg aria-hidden={true} fill={"none"} height={16} viewBox={"0 0 24 24"} width={16}>
            {"\n"}
            <path d={"M9 6l6 6-6 6"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.6"}></path>
            {"\n"}
          </svg>
          {"\n"}
        </button>
        {"\n"}
        <div className={"tc-site-hero__viewport"} id={"skViewport"}>
          {"\n"}
          <div className={
            <HeroCards />
            <HeroCards clone />
            <HeroCards clone />
          article>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
      </div>
      {"\n"}
      <div className={"tc-site-hero__green"}>
        {"\n"}
        <div className={"tc-ui-logos"}>
          {"\n"}
          <div className={"tc-ui-logos__track"}>
            {"\n"}
            <div className={"tc-ui-logos__group"}>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Allianz"} className={"tc-home-logo--allianz"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/allianz.png"} data-tc-content-src={"image-018"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"BBVA"} className={"tc-home-logo--bbva"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bbva.png"} data-tc-content-src={"image-019"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Bankinter"} className={"tc-home-logo--bankinter"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bankinter.png"} data-tc-content-src={"image-020"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Microsoft"} className={"tc-home-logo--microsoft"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/microsoft.png"} data-tc-content-src={"image-021"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Qida"} className={"tc-home-logo--qida"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/qida.png"} data-tc-content-src={"image-022"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Accenture"} className={"tc-home-logo--accenture"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/accenture.png"} data-tc-content-src={"image-023"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Deloitte"} className={"tc-home-logo--deloitte"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/deloitte.png"} data-tc-content-src={"image-024"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Dcycle"} className={"tc-home-logo--dcycle"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/dcycle.png"} data-tc-content-src={"image-025"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"HP"} className={"tc-home-logo--hp"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/hp.png"} data-tc-content-src={"image-026"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Línea Directa"} className={"tc-home-logo--linea-directa"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/linea-directa.png"} data-tc-content-src={"image-027"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Podo"} className={"tc-home-logo--podo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/podo.png"} data-tc-content-src={"image-028"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Clicars"} className={"tc-home-logo--clicars"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/clicars.png"} data-tc-content-src={"image-029"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Sonosuite"} className={"tc-home-logo--sonosuite"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/sonosuite.png"} data-tc-content-src={"image-030"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Eroski"} className={"tc-home-logo--eroski"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/eroski.png"} data-tc-content-src={"image-031"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Civitatis"} className={"tc-home-logo--civitatis"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/civitatis.png"} data-tc-content-src={"image-032"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Alten"} className={"tc-home-logo--alten"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/alten.png"} data-tc-content-src={"image-033"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Vivla"} className={"tc-home-logo--vivla"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/vivla.png"} data-tc-content-src={"image-034"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Wayra"} className={"tc-home-logo--wayra"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/wayra.png"} data-tc-content-src={"image-035"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Cabify"} className={"tc-home-logo--cabify"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/cabify.png"} data-tc-content-src={"image-036"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={"Affinity"} className={"tc-home-logo--affinity"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/affinity.png"} data-tc-content-src={"image-037"} />
                {"\n"}
              </div>
              {"\n"}
            </div>
            {"\n"}
            <div aria-hidden={true} className={"tc-ui-logos__group"}>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--allianz"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/allianz.png"} data-tc-content-src={"image-038"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--bbva"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bbva.png"} data-tc-content-src={"image-039"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--bankinter"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/bankinter.png"} data-tc-content-src={"image-040"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--microsoft"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/microsoft.png"} data-tc-content-src={"image-041"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--qida"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/qida.png"} data-tc-content-src={"image-042"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--accenture"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/accenture.png"} data-tc-content-src={"image-043"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--deloitte"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/deloitte.png"} data-tc-content-src={"image-044"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--dcycle"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/dcycle.png"} data-tc-content-src={"image-045"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--hp"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/hp.png"} data-tc-content-src={"image-046"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--linea-directa"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/linea-directa.png"} data-tc-content-src={"image-047"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--podo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/podo.png"} data-tc-content-src={"image-048"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--clicars"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/clicars.png"} data-tc-content-src={"image-049"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--sonosuite"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/sonosuite.png"} data-tc-content-src={"image-050"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--eroski"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/eroski.png"} data-tc-content-src={"image-051"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--civitatis"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/civitatis.png"} data-tc-content-src={"image-052"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--alten"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/alten.png"} data-tc-content-src={"image-053"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--vivla"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/vivla.png"} data-tc-content-src={"image-054"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--wayra"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/wayra.png"} data-tc-content-src={"image-055"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--cabify"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/cabify.png"} data-tc-content-src={"image-056"} />
                {"\n"}
              </div>
              {"\n"}
              <div className={"tc-ui-logos__box"}>
                {"\n"}
                <img alt={""} className={"tc-home-logo--affinity"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Logos/affinity.png"} data-tc-content-src={"image-057"} />
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
    </section>
  );
}
