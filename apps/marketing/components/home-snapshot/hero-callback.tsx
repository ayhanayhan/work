'use client';
import {useState,type FormEvent} from 'react';
import {validatePhone} from './phone-validators';
import {fieldFor,safePageUrl,type HomeModule} from '@/lib/home-content';
/* Original markup and text retained. Fields are native controlled React state. */
export default function HeroCallback({module,locale='tr',consentHref='/kvkk.html'}:{module?:HomeModule;locale?:string;consentHref?:string}){
 const [country,setCountry]=useState({dial:'+90',flag:'🇹🇷',iso:'TR'});
 const [phone,setPhone]=useState('');
 const [consent,setConsent]=useState(false);
 const [error,setError]=useState('');
 const [kvkk,setKvkk]=useState('');
 const [busy,setBusy]=useState(false);
 const [website,setWebsite]=useState('');
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();
   if(busy)return;
   const national=phone.replace(/[\\s()-]/g,'').replace(/^0(?=\\d)/,'');
   const phoneError=!phone.trim()?(fieldFor(module,'phoneEmpty',locale)||'Telefon numaranızı girin.'):
     validatePhone(phone,country.iso,country.dial);
   const consentError=consent?'':(fieldFor(module,'kvkkRequired',locale)||'KVKK aydınlatma onayı gereklidir.');
   setKvkk(consentError);setError(phoneError||'');
   if(phoneError||consentError)return;
   setBusy(true);
   try{
     const response=await fetch('/api/v1/public/contact/callback',{
       method:'POST',headers:{'content-type':'application/json'},
       body:JSON.stringify({dial:country.dial,phone:national,locale,source:'HOME',consent,website})
     });
     if(!response.ok)throw Error();
     setPhone('');setConsent(false);setError(locale==='en'?'We received your request.':
       locale==='de'?'Ihre Anfrage ist eingegangen.':
       locale==='ru'?'Мы получили вашу заявку.':
       locale==='ar'?'تم استلام طلبك.':'Talebinizi aldık, sizinle iletişime geçeceğiz.');
   }catch{setError(locale==='en'?'Could not submit. Please try again.':'Talep gönderilemedi. Lütfen tekrar deneyin.');}
   finally{setBusy(false);}
 };
 return (
<form onSubmit={submit} className={"tc-callback-form tc-hero-callback"} data-tc-callback={""} noValidate>
          {"\n"}
          <div className={"tc-callback-fields tc-phone-combined"}>
            {"\n"}
            <div className={"tc-dial-select"}>
              {"\n"}
              <span aria-hidden={true} className={"tc-dial-visible"} data-tc-content-key={"span-058"}>
                {country.flag+" "+country.dial}
              </span>
              {"\n"}
              <select aria-label={"Ülke ve telefon alan kodu seçin"} className={"tc-country-code"} name={"country_code"} defaultValue={"+90"} onChange={e=>{const option=e.currentTarget.selectedOptions[0];setCountry({dial:option.value,flag:option.dataset.flag||'',iso:option.dataset.country||'TR'});setError('')}}>
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
            <input aria-invalid={!!error} aria-required={true} autoComplete={"tel-national"} id={"tc-phone-main-hero"} inputMode={"tel"} name={"phone"} value={phone} onChange={e=>{setPhone(e.target.value);setError('')}} placeholder={fieldFor(module,'phonePlaceholder',locale)||(country.iso==='TR'?'5xx xxx xx xx':'Telefon numarası')} required type={"tel"} />
            {"\n"}
            <button disabled={busy} className={"tc-site-hero__cta tc-site-hero__cta--1"} type={"submit"} data-tc-content-key={"button-059"}>
              {fieldFor(module,'formButton',locale)||"Sizi arayalım"}
            </button>
            {"\n"}
          </div>
          {"\n"}
          <input type="text" name="website" autoComplete="off" tabIndex={-1}
            aria-hidden="true" style={{position:'absolute',left:'-9999px'}}
            value={website} onChange={e=>setWebsite(e.target.value)}/>
          <div className={"tc-kvkk"}>
            {"\n"}
            <input aria-describedby={"tc-kvkk-hero-error"} id={"tc-kvkk-hero"} name={"kvkk_read"} aria-invalid={!!kvkk} checked={consent} onChange={e=>{setConsent(e.target.checked);setKvkk('')}} required type={"checkbox"} value={"1"} />
            {"\n"}
            <label htmlFor={"tc-kvkk-hero"}>
              <a href={safePageUrl(consentHref,'/kvkk.html')} rel={"noopener noreferrer"} target={"_blank"} data-tc-content-key={"a-060"}>
                {fieldFor(module,'consentLinkText',locale)||"KVKK Aydınlatma Metni"}
              </a>
              {fieldFor(module,'consentText',locale)||"’ni okudum, onaylıyorum."}
            </label>
            {"\n"}
          </div>
          {"\n"}
          <p className={"tc-kvkk-error"} id={"tc-kvkk-hero-error"} role={"alert"}>{kvkk}</p>
          {"\n"}
          <p aria-live={"polite"} className={"tc-callback-status"} role={"status"}>{error}</p>
          {"\n"}
        </form>
 );
}
