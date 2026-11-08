'use client';
import {useState,type FormEvent} from 'react';
import {qrcodegen} from '@/lib/vendor/qrcodegen';
import {amazonCategories,commission,customs,desi,format,money,salary2026,salaryNetToGross,vat} from '@/lib/calculators';
type Result={items:Array<[string,string]>;note?:string};
const translations:Record<string,string[]> = {
 tr:['Hesapla','Sonuç','Geçersiz değer girdiniz.','Tutar','KDV oranı (%)','Satış fiyatı (₺)','Komisyon oranı (%)','Adet','Kargo (₺)','Ürün maliyeti (₺)','Diğer giderler (₺)','Komisyon KDV (%)','Girilen tutar KDV dahil','Komisyon oranı KDV dahil','Aylık brüt maaş (₺)','Hedef net maaş (₺)','Ay','Brütten nete','Netten brüte','Genişlik (cm)','Uzunluk (cm)','Yükseklik (cm)','Ağırlık (kg)','Desi böleni','Ürün bedeli (döviz)','Nakliye (döviz)','Sigorta (döviz)','Kur (1 döviz = ₺)','Gümrük vergisi (%)','İlave gümrük (%)','ÖTV (%)','Diğer masraflar (₺)','Metin veya URL','SVG indir','Kategori','Sözleşmenizdeki komisyon oranını kontrol edin.','Kaynak','Hesaplama'],
 en:['Calculate','Result','Enter valid values.','Amount','VAT rate (%)','Sale price (TRY)','Commission rate (%)','Units','Shipping (TRY)','Product cost (TRY)','Other costs (TRY)','Commission VAT (%)','Amount includes VAT','Commission rate includes VAT','Monthly gross salary (TRY)','Target net salary (TRY)','Month','Gross to net','Net to gross','Width (cm)','Length (cm)','Height (cm)','Weight (kg)','Volume divisor','Goods value','Freight','Insurance','FX to TRY','Customs duty (%)','Additional duty (%)','Excise (%)','Other fees','Text or URL','Download SVG','Category','Check your contractual commission rate.','Source','Calculator'],
 de:['Berechnen','Ergebnis','Ungültige Werte.','Betrag','MwSt. (%)','Verkaufspreis','Provision (%)','Menge','Versand','Warenkosten','Weitere Kosten','Provisions-MwSt.','Betrag inklusive MwSt.','Provision inklusive MwSt.','Bruttogehalt','Nettogehalt','Monat','Brutto zu Netto','Netto zu Brutto','Breite','Länge','Höhe','Gewicht','Volumenfaktor','Warenwert','Fracht','Versicherung','Wechselkurs','Zoll (%)','Zusatz-Zoll (%)','Verbrauchsteuer (%)','Andere Kosten','Text oder URL','SVG herunterladen','Kategorie','Vertraglichen Satz prüfen.','Quelle','Rechner'],
 ru:['Рассчитать','Результат','Неверные данные.','Сумма','НДС (%)','Цена продажи','Комиссия (%)','Штук','Доставка','Себестоимость','Другие расходы','НДС комиссии','Сумма с НДС','Комиссия с НДС','Зарплата брутто','Цель нетто','Месяц','Брутто в нетто','Нетто в брутто','Ширина','Длина','Высота','Вес','Делитель объёма','Стоимость товара','Перевозка','Страховка','Курс','Пошлина (%)','Доп. пошлина (%)','Акциз (%)','Другие расходы','Текст или URL','Скачать SVG','Категория','Уточните комиссию в договоре.','Источник','Калькулятор'],
 ar:['احسب','النتيجة','قيم غير صالحة','المبلغ','ضريبة القيمة المضافة','سعر البيع','العمولة (%)','الكمية','الشحن','تكلفة المنتج','تكاليف أخرى','ضريبة العمولة','السعر شامل الضريبة','العمولة شاملة الضريبة','الراتب الإجمالي','الراتب الصافي','الشهر','الإجمالي إلى الصافي','الصافي إلى الإجمالي','العرض','الطول','الارتفاع','الوزن','معامل الحجم','قيمة البضاعة','الشحن','التأمين','سعر الصرف','الرسوم الجمركية','رسوم إضافية','ضريبة خاصة','رسوم أخرى','نص أو رابط','تحميل SVG','الفئة','تحقق من العمولة في عقدك','المصدر','الحاسبة'],
 bg:['Изчисли','Резултат','Невалидни стойности','Сума','ДДС (%)','Продажна цена','Комисиона (%)','Количество','Доставка','Себестойност','Други разходи','ДДС комисиона','С включен ДДС','Комисиона с ДДС','Брутна заплата','Нетна заплата','Месец','Брутно към нетно','Нетно към брутно','Ширина','Дължина','Височина','Тегло','Делител','Цена на стоката','Превоз','Застраховка','Валутен курс','Мито','Доп. мито','Акциз','Други такси','Текст или URL','Изтегли SVG','Категория','Проверете договорената комисиона','Източник','Калкулатор'],
 uk:['Розрахувати','Результат','Некоректні дані','Сума','ПДВ (%)','Ціна продажу','Комісія (%)','Кількість','Доставка','Собівартість','Інші витрати','ПДВ комісії','З ПДВ','Комісія включає ПДВ','Зарплата брутто','Зарплата нетто','Місяць','Брутто до нетто','Нетто до брутто','Ширина','Довжина','Висота','Вага','Дільник','Вартість товару','Фрахт','Страхування','Курс','Мито','Додаткове мито','Акциз','Інші витрати','Текст або URL','Завантажити SVG','Категорія','Перевірте комісію в договорі','Джерело','Калькулятор'],
 id:['Hitung','Hasil','Nilai tidak valid','Jumlah','PPN (%)','Harga jual','Komisi (%)','Unit','Pengiriman','Biaya produk','Biaya lain','PPN komisi','Termasuk PPN','Komisi termasuk PPN','Gaji bruto','Gaji bersih','Bulan','Bruto ke neto','Neto ke bruto','Lebar','Panjang','Tinggi','Berat','Pembagi volume','Nilai barang','Pengiriman','Asuransi','Kurs','Bea masuk','Bea tambahan','Cukai','Biaya lain','Teks atau URL','Unduh SVG','Kategori','Periksa komisi kontrak','Sumber','Kalkulator'],
 vi:['Tính toán','Kết quả','Giá trị không hợp lệ','Số tiền','VAT (%)','Giá bán','Hoa hồng (%)','Số lượng','Vận chuyển','Giá vốn','Chi phí khác','VAT hoa hồng','Đã gồm VAT','Hoa hồng gồm VAT','Lương gộp','Lương thực nhận','Tháng','Gộp sang thực nhận','Thực nhận sang gộp','Rộng','Dài','Cao','Nặng','Hệ số','Giá hàng','Vận chuyển','Bảo hiểm','Tỷ giá','Thuế nhập khẩu','Thuế bổ sung','Thuế tiêu thụ','Chi phí khác','Văn bản hoặc URL','Tải SVG','Danh mục','Kiểm tra hoa hồng trong hợp đồng','Nguồn','Công cụ']
};
const feeSlugs=['trendyol','amazon','hepsiburada','n11','ciceksepeti','pazarama'];
const toNumber=(v:string)=>Number(v.replace(',','.'));
function generateQr(value:string){
 const qr=qrcodegen.QrCode.encodeText(value,qrcodegen.QrCode.Ecc.MEDIUM),quiet=4,size=qr.size+quiet*2;
 let path='';
 for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)
  if(qr.getModule(x,y))path+='M'+(x+quiet)+','+(y+quiet)+'h1v1h-1z';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges"><rect width="'+size+'" height="'+size+'" fill="#fff"/><path d="'+path+'" fill="#171b19"/></svg>';
}
export default function ToolCalculator({id,locale='tr'}:{id:string;locale?:string}){
 const t=translations[locale]||translations.en,marketplace=feeSlugs.some(x=>id===x+'-komisyon-hesaplama'),amazon=id==='amazon-komisyon-hesaplama',qr=id==='qr-kod-olusturucu';
 const [v,setV]=useState<Record<string,string>>({amount:'1000',vat:'20',price:'1000',rate:amazon?'10':'',units:'1',shipping:'0',cost:'0',other:'0',feeVat:'20',
  customerShipping:'0',width:'30',length:'20',height:'10',weight:'1',divisor:'3000',gross:'50000',net:'40000',month:'1',
  product:'1000',freight:'0',insurance:'0',exchange:'1',duty:'0',extraDuty:'0',excise:'0',fees:'0',text:'https://ticarti.com'});
 const [included,setIncluded]=useState(false),[commissionIncluded,setCommissionIncluded]=useState(false),[salaryMode,setSalaryMode]=useState('gross');
 const [category,setCategory]=useState('Diğer'),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[svg,setSvg]=useState('');
 const set=(key:string,val:string)=>{setV(old=>({...old,[key]:val}));setResult(null);setError('');};
 const n=(key:string)=>toNumber(v[key]),m=(a:number)=>money(a,locale),f=(a:number)=>format(a,locale);
 const field=(key:string,index:number,min='0')=><label className="tc-tool-field" key={key}>
  <span>{t[index]}</span><input type="number" min={min} step="any" required value={v[key]} onChange={e=>set(key,e.target.value)}/></label>;
 const select=(label:string,value:string,onChange:(x:string)=>void,options:string[][])=>
  <label className="tc-tool-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>
   {options.map(([value,title])=><option value={value} key={value}>{title}</option>)}</select></label>;
 const compute=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');setResult(null);setSvg('');
  try{
   if(qr){if(!v.text.trim()||v.text.length>1200)throw Error();setSvg(generateQr(v.text.trim()));return;}
   let items:Array<[string,string]>=[],note='';
   if(id==='kdv-hesaplama'){
    const r=vat(n('amount'),n('vat'),included);
    items=[['KDV hariç / Net',m(r.net)],['KDV',m(r.tax)],['KDV dahil / Total',m(r.gross)]];
   }else if(id==='desi-hesaplama'){
    const r=desi(n('width'),n('length'),n('height'),n('weight'),n('divisor'));
    items=[['Desi / Volumetric',f(r.desi)],['Kg',f(r.weight)],['Billable / Faturalandırılabilir',f(r.chargeable)]];
   }else if(id==='maas-hesaplama'){
    const r=salaryMode==='gross'?salary2026(n('gross'),n('month')):salaryNetToGross(n('net'),n('month'));
    items=[['Brüt / Gross',m(r.gross)],['SGK',m(r.sgk)],['İşsizlik / Unemployment',m(r.unemployment)],
     ['Gelir vergisi / Income tax',m(r.incomeTax)],['Damga / Stamp',m(r.stamp)],['Net',m(r.net)]];
    note='2026 · 4/a · Ocaktan itibaren aynı aylık ücret varsayımı / Same gross since January.';
   }else if(id==='gumruk-vergisi-hesaplama'){
    const r=customs({price:n('product'),freight:n('freight'),insurance:n('insurance'),exchange:n('exchange'),
     dutyRate:n('duty'),extraDutyRate:n('extraDuty'),exciseRate:n('excise'),vatRate:n('vat'),other:n('fees')});
    items=[['CIF',m(r.cif)],['Duty / Gümrük',m(r.duty)],['Extra duty',m(r.extra)],['ÖTV',m(r.excise)],['KDV',m(r.vat)],
     ['Total taxes / Vergiler',m(r.taxes)],['Landed cost / Toplam',m(r.landed)]];
    note='GTİP, menşe, muafiyet ve ek yükümlülükleri kontrol edin / Confirm HS code and applicable taxes.';
   }else if(marketplace){
    if(v.rate==='')throw Error();
    const r=commission({price:n('price'),rate:n('rate'),rateIncludesVat:commissionIncluded,
     commissionVat:n('feeVat'),shipping:n('shipping'),productCost:n('cost'),other:n('other'),units:n('units'),shippingCollected:amazon?n('customerShipping'):0});
    items=[['Satış / Sales',m(r.sale)],['Komisyon / Fee',m(r.fee)],['Komisyon KDV',m(r.tax)],
     ['Total fee / Toplam kesinti',m(r.total)],['Other costs / Giderler',m(r.expenses)],
     ['Remaining / Kalan',m(r.remainder)],['Margin / Kalan oran',f(r.margin)+'%']];
    note='Satış KDV’si, stopaj, iade ve sözleşmeye özgü kesintiler hariç / Sales VAT, withholding and returns excluded.';
   }else throw Error();
   setResult({items,note});
  }catch{setError(t[2]);}
 };
 const icon=<svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true"><rect x="3" y="3" width="64" height="64" rx="13" fill="#f6f8f8" stroke="#dfe4df"/>
  {qr?<><path d="M14 14h16v16H14zM40 14h16v16H40zM14 40h16v16H14z" fill="none" stroke="#212721" strokeWidth="3"/>
   <path d="M19 19h6v6h-6zM45 19h6v6h-6zM19 45h6v6h-6zM40 41h8v7h-8zM53 51h4v6h-4z" fill="#212721"/></>:
   <><rect x="20" y="12" width="30" height="46" rx="3" fill="#fff" stroke="#212721" strokeWidth="2"/>
    <path d="M26 22h18M26 32h5m8 0h5M26 41h5m8 0h5M26 50h5m8 0h5" stroke="#212721" strokeWidth="3" strokeLinecap="round"/></>}
  </svg>;
 return <section className="tc-tools-calculator-slot" id="tool-calculator">
  <div className="tc-tool-calc-heading">{icon}<div><h2>{t[37]}</h2><p>{locale==='tr'?'Hesaplama tarayıcınızda yapılır; bilgileriniz gönderilmez.':'Calculations run locally in your browser.'}</p></div></div>
  <form className="tc-tool-calc-form" onSubmit={compute}>
   {qr?<label className="tc-tool-field tc-tool-wide"><span>{t[32]}</span><textarea rows={3} maxLength={1200}
    required value={v.text} onChange={e=>set('text',e.target.value)}/></label>:null}
   {id==='kdv-hesaplama'?<>{field('amount',3)}{select(t[4],v.vat,x=>set('vat',x),['20','10','1','0'].map(x=>[x,x+'%']))}
    <label className="tc-tool-check"><input type="checkbox" checked={included} onChange={e=>{setIncluded(e.target.checked);setResult(null);}}/>{t[12]}</label></>:null}
   {id==='desi-hesaplama'?<>{field('width',19,'0.01')}{field('length',20,'0.01')}{field('height',21,'0.01')}
    {field('weight',22)}{select(t[23],v.divisor,x=>set('divisor',x),['3000','4000','5000'].map(x=>[x,x]))}</>:null}
   {id==='maas-hesaplama'?<>{select(t[37],salaryMode,x=>{setSalaryMode(x);setResult(null);},[['gross',t[17]],['net',t[18]]])}
    {salaryMode==='gross'?field('gross',14,'33030'):field('net',15,'28075.50')}
    {select(t[16],v.month,x=>set('month',x),Array.from({length:12},(_,i)=>[String(i+1),String(i+1)]))}</>:null}
   {id==='gumruk-vergisi-hesaplama'?<>{field('product',24)}{field('freight',25)}{field('insurance',26)}
    {field('exchange',27,'0.000001')}{field('duty',28)}{field('extraDuty',29)}{field('excise',30)}
    {select(t[4],v.vat,x=>set('vat',x),['20','10','1','0'].map(x=>[x,x+'%']))}{field('fees',31)}</>:null}
   {marketplace?<>
    {amazon?select(t[34],category,x=>{setCategory(x);const c=amazonCategories.find(a=>a.label===x);if(c)set('rate',String(c.rate));},
     amazonCategories.map(x=>[x.label,x.label])):null}
    {field('price',5,'0.01')}{amazon?<label className="tc-tool-field"><span>{locale==='tr'?'Alıcıdan tahsil edilen kargo (₺)':'Customer-paid shipping (TRY)'}</span><input type="number" min="0" step="any" required value={v.customerShipping} onChange={e=>set('customerShipping',e.target.value)}/></label>:null}{field('rate',6)}
    {!amazon?<p className="tc-tool-wide tc-tool-note">{t[35]}</p>:null}
    {field('units',7,'1')}{field('shipping',8)}{field('cost',9)}{field('other',10)}{field('feeVat',11)}
    <label className="tc-tool-check"><input type="checkbox" checked={commissionIncluded} onChange={e=>{setCommissionIncluded(e.target.checked);setResult(null);}}/>{t[13]}</label>
   </>:null}
   <div className="tc-tool-actions"><button type="submit" className="tc-tool-submit">{t[0]}</button></div>
  </form>
  {error?<p className="tc-tool-error" role="alert">{error}</p>:null}
  {qr&&svg?<div className="tc-tool-results" aria-live="polite"><div className="tc-tool-svg" role="img" aria-label="QR"
   dangerouslySetInnerHTML={{__html:svg}}/><a className="tc-tool-download" download="ticarti-qr.svg"
   href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}>{t[33]}</a></div>:null}
  {result?<div className="tc-tool-results" aria-live="polite"><h3>{t[1]}</h3><dl>
   {result.items.map(([name,value],i)=><div key={i}><dt>{name}</dt><dd>{value}</dd></div>)}
  </dl>{result.note?<p className="tc-tool-result-note">{result.note}</p>:null}</div>:null}
 </section>;
}
