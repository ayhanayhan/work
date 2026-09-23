'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {Icon} from '@iconify/react';

type Props={data:any;sid:string;req:(path:string,options?:any)=>Promise<any>;reload:()=>Promise<void>};
type CartLine={variantId:string;productId:string;title:string;variantTitle:string;sku:string;basePrice:number;price:number;quantity:number;stock:number;image?:string};
type Address={address1:string;address2:string;district:string;city:string;postalCode:string;country:string;company?:string;taxOffice?:string;taxNumber?:string};
type Quote={subtotal:number;automaticDiscountTotal:number;couponDiscountTotal:number;manualDiscountTotal:number;discountTotal:number;shippingTotal:number;paymentFee:number;taxTotal:number;taxRate:number;pricesIncludeTax:boolean;grandTotal:number;currency:string};
type DeliveryType='SHIPPING'|'PICKUP'|'COURIER';

const blankAddress:Address={address1:'',address2:'',district:'',city:'',postalCode:'',country:'TR'};
const money=(value:any)=>Number(value||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const deliveryOptions:[DeliveryType,string,string,string][]=[
  ['SHIPPING','Kargo','Adresinize kargo ile gönderim','iconoir:delivery-truck'],
  ['PICKUP','Mağazadan Teslim','Sipariş mağazadan teslim alınır','iconoir:shop'],
  ['COURIER','Kurye ile Gönderim','Yerel kurye ile hızlı teslimat','iconoir:motorcycle'],
];

export default function PosView({data,sid,req}:Props){
  const products=Array.isArray(data?.products)?data.products:[];
  const paymentRows=Array.isArray(data?.payment)?data.payment.filter((x:any)=>x.isActive!==false):[];
  const shippingRows=Array.isArray(data?.shipping)?data.shipping.filter((x:any)=>x.isActive!==false):[];
  const[query,setQuery]=useState('');
  const[cart,setCart]=useState<CartLine[]>([]);
  const[selectedVariants,setSelectedVariants]=useState<Record<string,string>>({});
  const[paymentMethod,setPaymentMethod]=useState('POS_CASH');
  const[deliveryType,setDeliveryType]=useState<DeliveryType>('SHIPPING');
  const[shippingMethodCode,setShippingMethodCode]=useState('');
  const[customerName,setCustomerName]=useState('');
  const[customerEmail,setCustomerEmail]=useState('');
  const[customerPhone,setCustomerPhone]=useState('');
  const[shipping,setShipping]=useState<Address>({...blankAddress});
  const[billingSame,setBillingSame]=useState(true);
  const[billing,setBilling]=useState<Address>({...blankAddress,company:'',taxOffice:'',taxNumber:''});
  const[note,setNote]=useState('');
  const[manualType,setManualType]=useState<'NONE'|'PERCENTAGE'|'FIXED'>('NONE');
  const[manualValue,setManualValue]=useState('');
  const[manualReason,setManualReason]=useState('');
  const[couponInput,setCouponInput]=useState('');
  const[couponCode,setCouponCode]=useState('');
  const[couponError,setCouponError]=useState('');
  const[quote,setQuote]=useState<Quote|null>(null);
  const[quoteBusy,setQuoteBusy]=useState(false);
  const[busy,setBusy]=useState(false);
  const[receipt,setReceipt]=useState<any>(null);
  const[err,setErr]=useState('');
  const[checkoutOpen,setCheckoutOpen]=useState(false);
  const[step,setStep]=useState(1);
  const[stepError,setStepError]=useState('');

  const visibleProducts=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('tr');
    return products.filter((p:any)=>{
      if(p.status&&p.status!=='ACTIVE')return false;
      if(!q)return true;
      return `${p.title||''} ${(p.variants||[]).map((v:any)=>`${v.title||''} ${v.sku||''}`).join(' ')}`.toLocaleLowerCase('tr').includes(q);
    });
  },[products,query]);

  const deliveryMethods=useMemo(()=>shippingRows.filter((row:any)=>{
    const type=String(row.type||'shipping').toLowerCase();
    return deliveryType==='PICKUP'?type==='pickup':deliveryType==='COURIER'?type==='courier':type==='shipping';
  }),[shippingRows,deliveryType]);

  useEffect(()=>{
    if(!deliveryMethods.length){setShippingMethodCode('');return}
    if(!deliveryMethods.some((x:any)=>x.code===shippingMethodCode))setShippingMethodCode(String(deliveryMethods[0].code||''));
  },[deliveryMethods,shippingMethodCode]);

  function productVariants(product:any){return (product?.variants||[]).filter((v:any)=>v.isActive!==false)}
  function selectedVariant(product:any){const rows=productVariants(product);return rows.find((v:any)=>v.id===selectedVariants[product.id])||rows[0]||null}
  function stockOf(v:any){return v?.inventory?.trackStock===false?999999:Number(v?.inventory?.onHand||0)}

  function addProduct(product:any){
    const v=selectedVariant(product);if(!v)return;
    const stock=stockOf(v);if(stock<=0)return;
    const price=Number(v.price||0);
    setCart(rows=>{
      const found=rows.find(x=>x.variantId===v.id);
      if(found)return rows.map(x=>x.variantId===v.id?{...x,quantity:Math.min(stock>=999999?999999:stock,x.quantity+1)}:x);
      return [...rows,{variantId:v.id,productId:product.id,title:product.title,variantTitle:v.title||'Standart',sku:v.sku||'',basePrice:price,price,quantity:1,stock,image:product.images?.[0]?.url||''}];
    });
  }
  function qty(id:string,n:number){setCart(rows=>rows.map(x=>x.variantId===id?{...x,quantity:Math.max(1,Math.min(x.stock>=999999?999999:x.stock,n))}:x))}
  function setLinePrice(id:string,value:string){const n=Number(value);if(!Number.isFinite(n)||n<0)return;setCart(rows=>rows.map(x=>x.variantId===id?{...x,price:n}:x))}
  function removeLine(id:string){setCart(rows=>rows.filter(x=>x.variantId!==id))}

  function quoteBody(nextCoupon=couponCode){
    return {storeId:sid,paymentMethod,deliveryType,shippingMethodCode:shippingMethodCode||null,couponCode:nextCoupon||null,customerEmail:customerEmail||null,shippingAddress:{...shipping,name:customerName,email:customerEmail,phone:customerPhone},items:cart.map(x=>({variantId:x.variantId,quantity:x.quantity,unitPrice:x.price})),manualDiscount:manualType==='NONE'?null:{type:manualType,value:Number(manualValue||0),reason:manualReason||null}};
  }

  async function requestQuote(nextCoupon=couponCode,showCouponError=false){
    if(!cart.length){setQuote(null);return null}
    setQuoteBusy(true);if(showCouponError)setCouponError('');
    try{const result=await req('/admin/pos/quote',{method:'POST',body:JSON.stringify(quoteBody(nextCoupon))});setQuote(result);return result}
    catch(x:any){setQuote(null);if(showCouponError)setCouponError(x.message||'Kupon uygulanamadı');else setErr(x.message||'Toplam hesaplanamadı');return null}
    finally{setQuoteBusy(false)}
  }

  useEffect(()=>{
    if(!cart.length){setQuote(null);return}
    const timer=window.setTimeout(()=>void requestQuote(),260);
    return()=>window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cart,paymentMethod,manualType,manualValue,manualReason,couponCode,shipping.country,deliveryType,shippingMethodCode]);

  async function applyCoupon(){
    const code=couponInput.trim().toUpperCase();
    if(!code){setCouponCode('');setCouponError('');return}
    const result=await requestQuote(code,true);if(result){setCouponCode(code);setCouponInput(code);setCouponError('')}
  }
  function clearCoupon(){setCouponCode('');setCouponInput('');setCouponError('')}

  function resetSale(){
    setCart([]);setCustomerName('');setCustomerEmail('');setCustomerPhone('');setShipping({...blankAddress});setBilling({...blankAddress,company:'',taxOffice:'',taxNumber:''});setBillingSame(true);setDeliveryType('SHIPPING');setShippingMethodCode('');setNote('');setManualType('NONE');setManualValue('');setManualReason('');clearCoupon();setErr('');setStep(1);setCheckoutOpen(false);
  }

  function chooseDelivery(next:DeliveryType){setDeliveryType(next);if(next==='PICKUP')setBillingSame(false)}
  function openCheckout(){if(!cart.length)return;setErr('');setStepError('');setStep(1);setCheckoutOpen(true)}
  function validateStep(current:number){
    if(current===1){if(customerName.trim().length<2)return 'Ad soyad girin.';if(customerPhone.trim().length<7)return 'Telefon numarası girin.';}
    if(current===2&&deliveryType!=='PICKUP'){if(!shipping.address1.trim())return 'Teslimat adresini girin.';if(!shipping.city.trim())return 'Şehir bilgisini girin.';}
    return '';
  }
  function nextStep(){const message=validateStep(step);if(message){setStepError(message);return}setStepError('');setStep(x=>Math.min(4,x+1))}
  function previousStep(){setStepError('');setStep(x=>Math.max(1,x-1))}

  async function complete(){
    const message=validateStep(1)||validateStep(2);if(message){setStepError(message);return}
    if(!cart.length)return;setBusy(true);setErr('');setStepError('');
    try{
      const shippingAddress={...shipping,name:customerName,email:customerEmail,phone:customerPhone};
      const billingAddress=billingSame?shippingAddress:{...billing,name:customerName,email:customerEmail,phone:customerPhone};
      const order=await req('/admin/pos/orders',{method:'POST',body:JSON.stringify({...quoteBody(),customerName:customerName||null,customerEmail:customerEmail||null,customerPhone:customerPhone||null,shippingAddress,billingAddress,note:note||null})});
      setCheckoutOpen(false);setReceipt(order);resetSale();
    }catch(x:any){setStepError(x.message||'Satış tamamlanamadı')}finally{setBusy(false)}
  }

  const fallbackSubtotal=cart.reduce((sum,x)=>sum+x.price*x.quantity,0);
  const totals:Quote=quote||{subtotal:fallbackSubtotal,automaticDiscountTotal:0,couponDiscountTotal:0,manualDiscountTotal:0,discountTotal:0,shippingTotal:0,paymentFee:0,taxTotal:0,taxRate:0,pricesIncludeTax:true,grandTotal:fallbackSubtotal,currency:'TRY'};
  const stepMeta=[['Müşteri','Kişisel bilgiler'],['Teslimat','Teslimat türü ve adres'],['Fatura & İndirim','Fatura, kupon ve indirim'],['Ödeme','Kontrol ve onay']];

  return <div className="pos-v16-screen pos-v19-screen pos-v20-screen">
    <header className="pos-v16-toolbar pos-v19-toolbar pos-v20-toolbar">
      <div className="pos-v19-toolbar-start"><Link href="/dashboard" className="pos-v19-back"><Icon icon="iconoir:arrow-left"/></Link><div><b>Mağaza POS</b><small>Ürünleri ekleyin, sipariş bilgilerini son adımda tamamlayın.</small></div></div>
      <div className="pos-v19-toolbar-end"><span><Icon icon="iconoir:cart"/>{cart.reduce((s,x)=>s+x.quantity,0)} ürün</span><strong>₺{money(totals.grandTotal)}</strong></div>
    </header>

    <div className="pos-v16-page pos-v19-page pos-v20-page">
      <section className="pos-v16-products pos-v19-products pos-v20-products">
        <div className="pos-v19-catalog-head"><div><h3>Ürünler</h3><span>{visibleProducts.length} ürün listeleniyor</span></div><div className="input-group pos-v16-search"><span className="input-group-text"><Icon icon="iconoir:search"/></span><input className="form-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ürün, varyant veya SKU ara..."/></div></div>
        <div className="pos-v19-product-scroll"><div className="pos-v16-product-grid pos-v19-product-grid">
          {visibleProducts.map((p:any)=>{const variants=productVariants(p);const v=selectedVariant(p);const stock=stockOf(v);return <article className={`pos-v16-product pos-v19-product ${stock<=0?'is-out':''}`} key={p.id}>
            <div className="pos-v19-product-media">{p.images?.[0]?.url?<img src={p.images[0].url} alt=""/>:<span className="pos-v16-product-placeholder"><Icon icon="iconoir:box-iso"/></span>}{stock<=0&&<em>Tükendi</em>}</div>
            <div className="pos-v19-product-info"><b title={p.title}>{p.title}</b>{variants.length>1?<select value={v?.id||''} onChange={e=>setSelectedVariants(s=>({...s,[p.id]:e.target.value}))}>{variants.map((row:any)=><option key={row.id} value={row.id}>{row.title||'Standart'} · {row.sku||'SKU yok'}</option>)}</select>:<small>{v?.title&&v.title!=='Standart'?v.title+' · ':''}{v?.sku||'SKU yok'}</small>}<div><strong>₺{money(v?.price)}</strong><span>{stock>=999999?'Stok takibi yok':`${stock} stok`}</span></div><button type="button" disabled={!v||stock<=0} onClick={()=>addProduct(p)}><Icon icon="iconoir:plus"/> Sepete ekle</button></div>
          </article>})}
          {!visibleProducts.length&&<div className="pos-v19-no-products"><Icon icon="iconoir:search"/><b>Ürün bulunamadı</b><span>Arama ifadenizi değiştirin.</span></div>}
        </div></div>
      </section>

      <aside className="pos-v16-cart pos-v19-cart pos-v20-cart">
        <div className="pos-v19-order-head"><div><h3>Sipariş</h3><span>Sepet ve fiyat özeti</span></div><span className="badge bg-light text-body border">{cart.reduce((s,x)=>s+x.quantity,0)} adet</span></div>
        <div className="pos-v19-order-scroll pos-v20-order-scroll">
          <section className="pos-v19-block"><header><b>Sepet</b><small>Ürün fiyatı sipariş özelinde değiştirilebilir.</small></header><div className="pos-v16-lines pos-v19-lines">
            {cart.map(x=><div className="pos-v16-line pos-v19-line" key={x.variantId}>{x.image?<img src={x.image} alt=""/>:<span className="pos-v19-line-placeholder"><Icon icon="iconoir:box-iso"/></span>}<div className="pos-v19-line-main"><b>{x.title}</b><small>{x.variantTitle} · {x.sku}</small><div className="pos-v19-line-controls"><div className="pos-v16-qty"><button type="button" onClick={()=>qty(x.variantId,x.quantity-1)}>−</button><strong>{x.quantity}</strong><button type="button" onClick={()=>qty(x.variantId,x.quantity+1)}>+</button></div><label><span>Satış fiyatı</span><div><i>₺</i><input type="number" min="0" step="0.01" value={x.price} onChange={e=>setLinePrice(x.variantId,e.target.value)}/></div></label><button type="button" className="pos-v19-trash" onClick={()=>removeLine(x.variantId)} aria-label="Ürünü kaldır"><Icon icon="iconoir:trash"/></button></div>{x.price!==x.basePrice&&<small className="pos-v19-override">Liste fiyatı ₺{money(x.basePrice)}</small>}</div><strong>₺{money(x.price*x.quantity)}</strong></div>)}
            {!cart.length&&<div className="pos-v16-empty"><Icon icon="iconoir:cart"/><b>Sepet boş</b><span>Soldaki ürünlerden sepete ekleyin.</span></div>}
          </div></section>
        </div>
        <div className="pos-v19-summary pos-v20-summary">
          {err&&<div className="pos-v19-inline-error mb-2">{err}</div>}
          <div><span>Ara toplam</span><b>₺{money(totals.subtotal)}</b></div>
          {totals.discountTotal>0&&<div className="discount"><span>Toplam indirim</span><b>−₺{money(totals.discountTotal)}</b></div>}
          {totals.shippingTotal>0&&<div><span>Teslimat</span><b>₺{money(totals.shippingTotal)}</b></div>}
          {totals.paymentFee>0&&<div><span>Ödeme hizmet bedeli</span><b>₺{money(totals.paymentFee)}</b></div>}
          <div><span>KDV %{Number(totals.taxRate||0).toLocaleString('tr-TR',{maximumFractionDigits:2})}</span><b>₺{money(totals.taxTotal)}</b></div>
          <div className="total"><span>Genel toplam {quoteBusy&&<small>hesaplanıyor…</small>}</span><strong>₺{money(totals.grandTotal)}</strong></div>
          <button type="button" className="btn btn-primary btn-lg w-100" disabled={!cart.length||quoteBusy} onClick={openCheckout}><Icon icon="iconoir:arrow-right"/> Sipariş Bilgilerini Gir</button>
        </div>
      </aside>
    </div>

    {checkoutOpen&&<div className="modal d-block pos-v16-modal pos-v20-checkout-modal" tabIndex={-1} role="dialog" aria-modal="true"><div className="modal-dialog modal-xl modal-dialog-centered"><div className="modal-content">
      <div className="modal-header pos-v20-modal-head"><div><h5 className="modal-title">Siparişi Tamamla</h5><small>Bilgileri adım adım tamamlayın.</small></div><button type="button" className="btn-close" onClick={()=>setCheckoutOpen(false)} aria-label="Kapat"/></div>
      <div className="pos-v20-steps">{stepMeta.map(([title,sub],i)=><button key={title} type="button" className={(step===i+1?'active ':step>i+1?'done ':'')+'pos-v20-step'} onClick={()=>{if(i+1<step)setStep(i+1)}}><span>{step>i+1?<Icon icon="iconoir:check"/>:i+1}</span><div><b>{title}</b><small>{sub}</small></div></button>)}</div>
      <div className="modal-body pos-v20-modal-body">
        {stepError&&<div className="alert alert-danger py-2">{stepError}</div>}
        {step===1&&<div className="pos-v20-step-panel"><div className="pos-v20-step-title"><span><Icon icon="iconoir:user"/></span><div><h5>Müşteri bilgileri</h5><p>Siparişe ait iletişim bilgilerini girin.</p></div></div><div className="row g-3"><div className="col-12"><label className="form-label">Ad Soyad *</label><input autoFocus className="form-control" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Müşteri adı soyadı"/></div><div className="col-md-6"><label className="form-label">Telefon *</label><input className="form-control" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="05xx xxx xx xx"/></div><div className="col-md-6"><label className="form-label">E-posta</label><input className="form-control" type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="mail@ornek.com"/></div></div></div>}

        {step===2&&<div className="pos-v20-step-panel"><div className="pos-v20-step-title"><span><Icon icon="iconoir:delivery-truck"/></span><div><h5>Teslimat</h5><p>Teslimat türünü seçin ve gerekiyorsa adresi girin.</p></div></div><div className="pos-v20-delivery-grid">{deliveryOptions.map(([id,title,sub,icon])=><button type="button" key={id} className={deliveryType===id?'active':''} onClick={()=>chooseDelivery(id)}><span><Icon icon={icon}/></span><div><b>{title}</b><small>{sub}</small></div><i><Icon icon={deliveryType===id?'iconoir:check-circle':'iconoir:circle'}/></i></button>)}</div>{deliveryMethods.length>0&&<div className="mt-3"><label className="form-label">Teslimat yöntemi</label><select className="form-select" value={shippingMethodCode} onChange={e=>setShippingMethodCode(e.target.value)}>{deliveryMethods.map((row:any)=><option key={row.id} value={row.code}>{row.name}{Number(row.price||0)>0?` · ₺${money(row.price)}`:''}</option>)}</select></div>}{deliveryType!=='PICKUP'&&<div className="row g-3 mt-1"><div className="col-12"><label className="form-label">Adres *</label><input className="form-control" value={shipping.address1} onChange={e=>setShipping(s=>({...s,address1:e.target.value}))} placeholder="Mahalle, cadde, sokak, bina no"/></div><div className="col-md-4"><label className="form-label">Adres devamı</label><input className="form-control" value={shipping.address2} onChange={e=>setShipping(s=>({...s,address2:e.target.value}))} placeholder="Daire, kat vb."/></div><div className="col-md-4"><label className="form-label">İlçe</label><input className="form-control" value={shipping.district} onChange={e=>setShipping(s=>({...s,district:e.target.value}))}/></div><div className="col-md-4"><label className="form-label">Şehir *</label><input className="form-control" value={shipping.city} onChange={e=>setShipping(s=>({...s,city:e.target.value}))}/></div></div>}</div>}

        {step===3&&<div className="pos-v20-step-panel"><div className="pos-v20-step-title"><span><Icon icon="iconoir:page"/></span><div><h5>Fatura, kupon ve indirim</h5><p>Fatura bilgilerini ve siparişe özel indirimleri yönetin.</p></div></div>{deliveryType!=='PICKUP'&&<label className="pos-v20-billing-check"><input type="checkbox" checked={billingSame} onChange={e=>setBillingSame(e.target.checked)}/><span><b>Fatura adresi teslimat adresi ile aynı</b><small>İşaretli değilse ayrı fatura bilgisi girebilirsiniz.</small></span></label>}{(!billingSame||deliveryType==='PICKUP')&&<div className="row g-3 mt-1"><div className="col-md-6"><label className="form-label">Firma / Ünvan</label><input className="form-control" value={billing.company||''} onChange={e=>setBilling(s=>({...s,company:e.target.value}))}/></div><div className="col-md-3"><label className="form-label">Vergi dairesi</label><input className="form-control" value={billing.taxOffice||''} onChange={e=>setBilling(s=>({...s,taxOffice:e.target.value}))}/></div><div className="col-md-3"><label className="form-label">VKN / TCKN</label><input className="form-control" value={billing.taxNumber||''} onChange={e=>setBilling(s=>({...s,taxNumber:e.target.value}))}/></div><div className="col-12"><label className="form-label">Fatura adresi</label><input className="form-control" value={billing.address1} onChange={e=>setBilling(s=>({...s,address1:e.target.value}))}/></div><div className="col-md-6"><label className="form-label">İlçe</label><input className="form-control" value={billing.district} onChange={e=>setBilling(s=>({...s,district:e.target.value}))}/></div><div className="col-md-6"><label className="form-label">Şehir</label><input className="form-control" value={billing.city} onChange={e=>setBilling(s=>({...s,city:e.target.value}))}/></div></div>}<hr className="my-4"/><div className="row g-3"><div className="col-lg-6"><label className="form-label">Kupon kodu</label><div className="input-group"><input className="form-control" value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Kupon kodu" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void applyCoupon()}}}/>{couponCode?<button type="button" className="btn btn-outline-danger" onClick={clearCoupon}>Kaldır</button>:<button type="button" className="btn btn-outline-primary" disabled={!cart.length||quoteBusy} onClick={()=>void applyCoupon()}>Uygula</button>}</div>{couponCode&&<small className="text-success d-block mt-1"><Icon icon="iconoir:check-circle"/> {couponCode} uygulandı</small>}{couponError&&<small className="text-danger d-block mt-1">{couponError}</small>}</div><div className="col-lg-6"><label className="form-label">Manuel indirim</label><div className="input-group"><select className="form-select" value={manualType} onChange={e=>setManualType(e.target.value as any)}><option value="NONE">İndirim yok</option><option value="PERCENTAGE">Yüzde (%)</option><option value="FIXED">Tutar (₺)</option></select><input className="form-control" type="number" min="0" step="0.01" disabled={manualType==='NONE'} value={manualValue} onChange={e=>setManualValue(e.target.value)} placeholder={manualType==='PERCENTAGE'?'%':'₺'}/></div>{manualType!=='NONE'&&<input className="form-control mt-2" value={manualReason} onChange={e=>setManualReason(e.target.value)} placeholder="İndirim açıklaması (opsiyonel)"/>}</div></div></div>}

        {step===4&&<div className="pos-v20-step-panel pos-v20-final"><div className="pos-v20-final-main"><div className="pos-v20-step-title"><span><Icon icon="iconoir:credit-card"/></span><div><h5>Ödeme ve onay</h5><p>Siparişi kontrol edip oluşturun.</p></div></div><label className="form-label">Ödeme yöntemi</label><select className="form-select" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="POS_CASH">Nakit</option><option value="POS_CARD">Kart / Fiziki POS</option>{paymentRows.map((p:any)=><option key={p.id} value={p.code}>{p.name}</option>)}</select><label className="form-label mt-3">Sipariş notu</label><textarea className="form-control" rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Siparişe özel not..."/><div className="pos-v20-review mt-4"><div><span>Müşteri</span><b>{customerName}</b><small>{customerPhone}{customerEmail?` · ${customerEmail}`:''}</small></div><div><span>Teslimat</span><b>{deliveryOptions.find(x=>x[0]===deliveryType)?.[1]}</b><small>{deliveryType==='PICKUP'?'Mağazadan teslim':`${shipping.district?shipping.district+', ':''}${shipping.city}`}</small></div><div><span>Ürün</span><b>{cart.reduce((sum,x)=>sum+x.quantity,0)} adet</b><small>{cart.length} satır ürün</small></div></div></div><aside className="pos-v20-final-summary"><h6>Sipariş Özeti</h6><div><span>Ara toplam</span><b>₺{money(totals.subtotal)}</b></div>{totals.automaticDiscountTotal>0&&<div className="discount"><span>Otomatik kampanya</span><b>−₺{money(totals.automaticDiscountTotal)}</b></div>}{totals.couponDiscountTotal>0&&<div className="discount"><span>Kupon indirimi</span><b>−₺{money(totals.couponDiscountTotal)}</b></div>}{totals.manualDiscountTotal>0&&<div className="discount"><span>Manuel indirim</span><b>−₺{money(totals.manualDiscountTotal)}</b></div>}<div><span>Teslimat</span><b>{totals.shippingTotal>0?`₺${money(totals.shippingTotal)}`:'Ücretsiz'}</b></div>{totals.paymentFee>0&&<div><span>Ödeme hizmet bedeli</span><b>₺{money(totals.paymentFee)}</b></div>}<div><span>KDV %{Number(totals.taxRate||0).toLocaleString('tr-TR',{maximumFractionDigits:2})} {totals.pricesIncludeTax?'(dahil)':''}</span><b>₺{money(totals.taxTotal)}</b></div><div className="grand"><span>Genel toplam</span><strong>₺{money(totals.grandTotal)}</strong></div></aside></div>}
      </div>
      <div className="modal-footer pos-v20-modal-footer"><button type="button" className="btn btn-light" onClick={()=>setCheckoutOpen(false)}>Vazgeç</button><div className="ms-auto d-flex gap-2">{step>1&&<button type="button" className="btn btn-outline-secondary" onClick={previousStep}><Icon icon="iconoir:arrow-left" className="me-1"/>Geri</button>}{step<4?<button type="button" className="btn btn-primary" onClick={nextStep}>Devam Et <Icon icon="iconoir:arrow-right" className="ms-1"/></button>:<button type="button" className="btn btn-primary" disabled={busy||quoteBusy} onClick={()=>void complete()}>{busy?<><Icon icon="svg-spinners:ring-resize" className="me-1"/>Oluşturuluyor…</>:<><Icon icon="iconoir:check-circle" className="me-1"/>Siparişi Onayla</>}</button>}</div></div>
    </div></div></div>}

    {receipt&&<div className="modal d-block pos-v16-modal" tabIndex={-1}><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Sipariş oluşturuldu</h5><button type="button" className="btn-close" onClick={()=>setReceipt(null)}/></div><div className="modal-body text-center py-4"><div className="pos-v16-success"><Icon icon="iconoir:check"/></div><h4>#{receipt.number}</h4><p className="text-muted mb-1">Sipariş başarıyla oluşturuldu.</p><strong>₺{money(receipt.grandTotal)}</strong></div><div className="modal-footer"><Link href={`/orders/${receipt.id}`} className="btn btn-outline-primary">Siparişi Görüntüle</Link><button type="button" className="btn btn-primary" onClick={()=>setReceipt(null)}>Yeni Satış</button></div></div></div></div>}
  </div>;
}
