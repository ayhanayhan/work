'use client';
import {useState,type FormEvent} from 'react';
import {qrcodegen} from '@/lib/vendor/qrcodegen';
import {completeEan13,ean13Svg} from '@/lib/ean13';
type Mode='qr'|'ean13';
const labels:Record<string,{qrLabel:string,eanLabel:string,download:string,help:string,error:string,invalid:string,generated:string,notice:string,create:string}> = {
 tr:{qrLabel:'Metin veya bağlantı',eanLabel:'12 veya 13 haneli ürün numarası',download:'SVG indir',help:'12 rakam girerseniz kontrol hanesi otomatik eklenir. 13 rakam girerseniz kontrol hanesi doğrulanır.',error:'Geçerli bir metin veya bağlantı girin (en fazla 1200 karakter).',invalid:'Yalnızca 12 veya 13 rakam girin. 13 haneli numaranın kontrol basamağı doğru olmalı.',generated:'EAN-13 numarası',notice:'Bu araç GS1 ürün numarası tahsis etmez. Pazaryerleri ve perakende satış için size ait, GS1 tarafından tahsis edilmiş GTIN kullanın.',create:'Oluştur'},
 en:{qrLabel:'Text or URL',eanLabel:'12 or 13-digit product number',download:'Download SVG',help:'A 12-digit input gets its check digit automatically; a 13-digit input is validated.',error:'Enter text or a URL (maximum 1200 characters).',invalid:'Enter 12 or 13 digits with a valid check digit.',generated:'EAN-13 number',notice:'This tool does not assign GS1 identifiers. Use a GTIN issued to you by GS1 for retail or marketplace listings.',create:'Generate'},
 de:{qrLabel:'Text oder URL',eanLabel:'12- oder 13-stellige Produktnummer',download:'SVG herunterladen',help:'Bei 12 Ziffern wird die Prüfziffer ergänzt, bei 13 Ziffern geprüft.',error:'Bitte Text oder URL eingeben (max. 1200 Zeichen).',invalid:'12 oder 13 Ziffern mit gültiger Prüfziffer eingeben.',generated:'EAN-13-Nummer',notice:'Dieses Werkzeug vergibt keine GS1-Nummern. Verwenden Sie eine Ihnen zugewiesene GTIN.',create:'Erstellen'},
 ru:{qrLabel:'Текст или ссылка',eanLabel:'Номер товара из 12 или 13 цифр',download:'Скачать SVG',help:'Для 12 цифр контрольная цифра добавляется автоматически, для 13 проверяется.',error:'Введите текст или ссылку (до 1200 символов).',invalid:'Введите 12 или 13 цифр с верной контрольной цифрой.',generated:'Номер EAN-13',notice:'Инструмент не выдаёт номера GS1. Используйте назначенный вам GTIN.',create:'Создать'},
 ar:{qrLabel:'نص أو رابط',eanLabel:'رقم منتج من 12 أو 13 رقماً',download:'تنزيل SVG',help:'تضاف خانة التحقق تلقائياً لـ 12 رقماً، ويتم التحقق منها لـ 13 رقماً.',error:'أدخل نصاً أو رابطاً صالحاً (حتى 1200 حرف).',invalid:'أدخل 12 أو 13 رقماً مع رقم تحقق صحيح.',generated:'رقم EAN-13',notice:'هذه الأداة لا تمنح أرقام GS1. استخدم رقم GTIN مخصصاً لك رسمياً.',create:'إنشاء'},
 bg:{qrLabel:'Текст или URL',eanLabel:'12- или 13-цифрен продуктов номер',download:'Изтегли SVG',help:'При 12 цифри контролната се добавя; при 13 се проверява.',error:'Въведете текст или URL (до 1200 знака).',invalid:'Въведете 12 или 13 цифри с правилна контролна цифра.',generated:'EAN-13 номер',notice:'Инструментът не присвоява GS1 номера. Използвайте издаден за вас GTIN.',create:'Създай'},
 uk:{qrLabel:'Текст або посилання',eanLabel:'12- або 13-значний номер товару',download:'Завантажити SVG',help:'До 12 цифр додається контрольна цифра; 13 цифр перевіряються.',error:'Введіть текст або URL (до 1200 символів).',invalid:'Введіть 12 або 13 цифр з правильною контрольною цифрою.',generated:'Номер EAN-13',notice:'Інструмент не видає номери GS1. Використовуйте присвоєний вам GTIN.',create:'Створити'},
 id:{qrLabel:'Teks atau URL',eanLabel:'Nomor produk 12 atau 13 digit',download:'Unduh SVG',help:'Untuk 12 digit, digit pemeriksa ditambahkan; untuk 13 digit, diperiksa.',error:'Masukkan teks atau URL (maksimal 1200 karakter).',invalid:'Masukkan 12 atau 13 digit dengan digit pemeriksa yang valid.',generated:'Nomor EAN-13',notice:'Alat ini tidak menerbitkan nomor GS1. Gunakan GTIN resmi yang dialokasikan kepada Anda.',create:'Buat'},
 vi:{qrLabel:'Văn bản hoặc URL',eanLabel:'Mã sản phẩm gồm 12 hoặc 13 chữ số',download:'Tải SVG',help:'12 chữ số sẽ được bổ sung số kiểm tra; 13 chữ số sẽ được xác minh.',error:'Nhập văn bản hoặc URL (tối đa 1200 ký tự).',invalid:'Nhập 12 hoặc 13 chữ số với số kiểm tra hợp lệ.',generated:'Mã EAN-13',notice:'Công cụ không cấp mã GS1. Hãy sử dụng GTIN được GS1 cấp cho bạn.',create:'Tạo'}
};
function qrSvg(value:string){
 const qr=qrcodegen.QrCode.encodeText(value,qrcodegen.QrCode.Ecc.MEDIUM);
 const quiet=4,size=qr.size+quiet*2;
 let bars='';
 for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++){
  if(qr.getModule(x,y))bars+='M'+(x+quiet)+','+(y+quiet)+'h1v1h-1z';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges"><rect width="'+size+'" height="'+size+'" fill="#fff"/><path d="'+bars+'" fill="#171b19"/></svg>';
}
export default function CodeGenerator({mode,locale}:{mode:Mode;locale:string}){
 const t=labels[locale]||labels.en;
 const [value,setValue]=useState(mode==='qr'?'https://ticarti.com':'');
 const [state,setState]=useState({svg:'',number:'',error:''});
 const create=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!value.trim()){setState({svg:'',number:'',error:mode==='qr'?t.error:t.invalid});return;}
  try{
   if(mode==='qr'){
    if(value.length>1200)throw Error();
    setState({svg:qrSvg(value.trim()),number:'',error:''});
   }else{
    const number=completeEan13(value);
    setState({svg:ean13Svg(number),number,error:''});
   }
  }catch{setState({svg:'',number:'',error:mode==='qr'?t.error:t.invalid});}
 };
 const update=(next:string)=>{setValue(next);setState({svg:'',number:'',error:''});};
 const label=mode==='qr'?t.qrLabel:t.eanLabel;
 return <div className="tc-tool-generator">
  <form className="tc-tool-calc-form" onSubmit={create}>
   <label className="tc-tool-field tc-tool-wide"><span>{label}</span>
    {mode==='qr'?<textarea rows={3} maxLength={1200} value={value} onChange={e=>update(e.target.value)}/>:
     <input type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={13}
      value={value} placeholder="869123456789" onChange={e=>update(e.target.value.replace(/[^0-9]/g,'').slice(0,13))}/>}
   </label>
   <div className="tc-tool-actions"><button type="submit" className="tc-tool-submit">{t.create}</button></div>
  </form>
  {mode==='ean13'?<p className="tc-tool-result-note">{t.help}</p>:null}
  {state.error?<p className="tc-tool-error" role="alert">{state.error}</p>:null}
  {state.svg?<div className="tc-tool-results" aria-live="polite">
   <div className="tc-tool-svg" role="img" aria-label={mode==='qr'?'QR':'EAN-13 '+state.number}
    dangerouslySetInnerHTML={{__html:state.svg}}/>
   {state.number?<p className="tc-tool-generated-number">{t.generated}: <strong>{state.number}</strong></p>:null}
   <a className="tc-tool-download" download={mode==='qr'?'ticarti-qr.svg':'ticarti-ean13-'+state.number+'.svg'}
    href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(state.svg)}>{t.download}</a>
  </div>:null}
  {mode==='ean13'?<p className="tc-tool-result-note tc-tool-gs1-notice">{t.notice}</p>:null}
 </div>;
}
