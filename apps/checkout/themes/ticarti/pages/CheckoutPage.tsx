'use client';
import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {api,getCartToken,getLocale,money,track,mediaUrl} from '../../../lib/api';
import {uiText} from '../../../lib/i18n';
import PhoneField from '../../../components/PhoneField';

type Geo={id:string;name:string;code?:string|null;source?:string};
type CheckoutAccessMode='REQUIRED'|'SUGGESTED'|'GUEST';
type Step=1|2|3;

export default function Checkout({
  const tt=(key:string)=>uiText(key,locale||getLocale());sessionId,storeOrigin,sessionStore,locale}:{sessionId?:string;storeOrigin?:string;sessionStore?:any;locale?:string}){
  const storeUrl=(href:string)=>{if(!storeOrigin)return href;try{return new URL(href,storeOrigin).toString()}catch{return href}};
  const goStore=(href:string)=>{if(typeof window!=='undefined')window.location.assign(storeUrl(href))};
  const formRef=useRef<HTMLFormElement|null>(null);
  const idempotencyKey=useRef(typeof crypto!=='undefined'?crypto.randomUUID():`${Date.now()}-${Math.random()}`);
  const[data,setData]=useState<any>(null);const[contracts,setContracts]=useState<any>({});const[customer,setCustomer]=useState<any>(null);const[customerToken,setCustomerToken]=useState('');
  const[country,setCountry]=useState('TR');const[admin1,setAdmin1]=useState('');const[admin1Rows,setAdmin1Rows]=useState<Geo[]>([]);
  const[admin2,setAdmin2]=useState('');const[admin2Rows,setAdmin2Rows]=useState<Geo[]>([]);
  const[shippingCountry,setShippingCountry]=useState('TR');const[shippingAdmin1,setShippingAdmin1]=useState('');const[shippingAdmin1Rows,setShippingAdmin1Rows]=useState<Geo[]>([]);const[shippingAdmin2,setShippingAdmin2]=useState('');const[shippingAdmin2Rows,setShippingAdmin2Rows]=useState<Geo[]>([]);
  const[phone,setPhone]=useState('');const[phoneCountry,setPhoneCountry]=useState('TR');const[phoneValid,setPhoneValid]=useState(false);const[shippingDifferent,setShippingDifferent]=useState(false);const[invoiceDetails,setInvoiceDetails]=useState(false);const[code,setCode]=useState('');
  const[selectedAddressId,setSelectedAddressId]=useState('');const[selectedAddress,setSelectedAddress]=useState<any>(null);const[editingAddress,setEditingAddress]=useState(false);const[addressFormKey,setAddressFormKey]=useState(0);const[savingAddress,setSavingAddress]=useState(false);
  const[done,setDone]=useState<any>(null);const[err,setErr]=useState('');const[busy,setBusy]=useState(false);const[step,setStep]=useState<Step>(1);const[couponOpen,setCouponOpen]=useState(false);const[mobileSummaryOpen,setMobileSummaryOpen]=useState(true);
  const[successPassword,setSuccessPassword]=useState('');const[registerBusy,setRegisterBusy]=useState(false);const[registerDone,setRegisterDone]=useState(false);const[registerErr,setRegisterErr]=useState('');
  const[addressSummary,setAddressSummary]=useState<{email:string;name:string;phone:string;line1:string;line2:string}>({email:'',name:'',phone:'',line1:'',line2:''});

  const token=getCartToken();
  const cart=data?.cart;const config=data?.checkoutConfig||{};const mode:CheckoutAccessMode=config.customerAccessMode||'GUEST';
  const cur=cart?.totals?.currency||data?.store?.currency||'TRY';const selectedPayment=data?.paymentMethods?.find((p:any)=>p.id===cart?.paymentMethodId);
  const defaultAddress=customer?.addresses?.find((x:any)=>x.isDefault)||customer?.addresses?.[0]||null;
  const activeAddress=selectedAddress||defaultAddress;
  const vatCountries=new Set(['AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','GB','NO','CH']);
  const invoiceTaxLabel=country==='TR'?'Vergi / T.C. Kimlik Numarası':country==='US'?'EIN / Tax ID':country==='CA'?'Business Number / Tax ID':vatCountries.has(country)?'VAT / Vergi Numarası':'Vergi Numarası';

  useEffect(()=>{void init()},[]);
  async function init(){
    if(!token){goStore('/cart');return}
    setErr('');
    try{
      const d=await api(`/storefront/carts/${token}/checkout`);
      let authToken='';let me:any=null;
      try{const r=await api('/storefront/customer/refresh',{method:'POST',credentials:'include',body:'{}'});authToken=r.accessToken||'';if(authToken){me=await api('/storefront/customer/me',{headers:{authorization:`Bearer ${authToken}`}});setCustomerToken(authToken);setCustomer(me)}}catch{}
      setCountry(d.store?.defaultCountry||'TR');setData(d);
      const resolvedSlug=String(sessionStore?.publicSlug||d.store?.publicSlug||'').trim();if(resolvedSlug){try{const boot=await api(`/storefront/${encodeURIComponent(resolvedSlug)}?currency=${encodeURIComponent(d.store?.currency||sessionStore?.currency||'TRY')}&locale=${encodeURIComponent(getLocale())}`);setContracts(boot.contractPages||{})}catch{setContracts({})}}
      const address=me?.addresses?.find((x:any)=>x.isDefault)||me?.addresses?.[0];
      if(address){setSelectedAddressId(address.id);setSelectedAddress(address);setPhone(address.phone||me?.phone||'');}
      await hydrateGeo(address,d.store?.defaultCountry||'TR',String(sessionStore?.publicSlug||d.store?.publicSlug||''));
    }catch(e:any){setErr(e.message)}
  }
  async function refreshCheckout(){if(!token)return;setData(await api(`/storefront/carts/${token}/checkout`))}
  async function hydrateGeo(address:any,fallbackCountry:string,storeSlug:string){if(!storeSlug){setAdmin1Rows([]);setAdmin2Rows([]);return;}
    const co=address?.country||fallbackCountry||'TR';setCountry(co);
    try{
      const a1=await api(`/storefront/${storeSlug}/locations?countryCode=${encodeURIComponent(co)}&level=ADMIN1`).catch(()=>[]);setAdmin1Rows(a1);
      const a1id=address?.admin1Id||'';setAdmin1(a1id);
      if(a1id){const a2=await api(`/storefront/${storeSlug}/locations?parentId=${encodeURIComponent(a1id)}&level=ADMIN2`).catch(()=>[]);setAdmin2Rows(a2);setAdmin2(address?.admin2Id||'')}else{setAdmin2Rows([]);setAdmin2('')}
    }catch{setAdmin1Rows([]);setAdmin2Rows([])}
  }
  async function loadAdmin1(codeValue:string){setAdmin1('');setAdmin2('');setAdmin2Rows([]);try{setAdmin1Rows(await api(`/storefront/${encodeURIComponent(String(sessionStore?.publicSlug||data?.store?.publicSlug||''))}/locations?countryCode=${encodeURIComponent(codeValue)}&level=ADMIN1`))}catch{setAdmin1Rows([])}}
  async function changeCountry(codeValue:string){setCountry(codeValue);await loadAdmin1(codeValue)}
  async function changeAdmin1(id:string){setAdmin1(id);setAdmin2('');try{setAdmin2Rows(id?await api(`/storefront/${encodeURIComponent(String(sessionStore?.publicSlug||data?.store?.publicSlug||''))}/locations?parentId=${encodeURIComponent(id)}&level=ADMIN2`):[])}catch{setAdmin2Rows([])}}
  function changeAdmin2(id:string){setAdmin2(id)}
  const names=useMemo(()=>({state:admin1Rows.find(x=>x.id===admin1)?.name||'',district:admin2Rows.find(x=>x.id===admin2)?.name||''}),[admin1,admin2,admin1Rows,admin2Rows]);

  async function loadShippingAdmin1(codeValue:string){setShippingAdmin1('');setShippingAdmin2('');setShippingAdmin2Rows([]);try{setShippingAdmin1Rows(await api(`/storefront/${encodeURIComponent(String(sessionStore?.publicSlug||data?.store?.publicSlug||''))}/locations?countryCode=${encodeURIComponent(codeValue)}&level=ADMIN1`))}catch{setShippingAdmin1Rows([])}}
  async function changeShippingCountry(codeValue:string){setShippingCountry(codeValue);await loadShippingAdmin1(codeValue)}
  async function changeShippingAdmin1(id:string){setShippingAdmin1(id);setShippingAdmin2('');try{setShippingAdmin2Rows(id?await api(`/storefront/${encodeURIComponent(String(sessionStore?.publicSlug||data?.store?.publicSlug||''))}/locations?parentId=${encodeURIComponent(id)}&level=ADMIN2`):[])}catch{setShippingAdmin2Rows([])}}
  const shippingNames=useMemo(()=>({state:shippingAdmin1Rows.find(x=>x.id===shippingAdmin1)?.name||'',district:shippingAdmin2Rows.find(x=>x.id===shippingAdmin2)?.name||''}),[shippingAdmin1,shippingAdmin2,shippingAdmin1Rows,shippingAdmin2Rows]);

  async function selectSavedAddress(address:any){
    setSelectedAddressId(address.id);setSelectedAddress(address);setEditingAddress(false);setPhone(address.phone||customer?.phone||'');setAddressFormKey(v=>v+1);
    await hydrateGeo(address,data?.store?.defaultCountry||'TR',String(sessionStore?.publicSlug||data?.store?.publicSlug||''));
  }
  async function newAddress(){
    setSelectedAddressId('');setSelectedAddress(null);setEditingAddress(true);setPhone(customer?.phone||'');setAddressFormKey(v=>v+1);
    await hydrateGeo(null,data?.store?.defaultCountry||'TR',String(sessionStore?.publicSlug||data?.store?.publicSlug||''));
  }
  async function saveSelectedAddress(){
    if(!selectedAddressId||!customerToken||!formRef.current)return;
    if((config.requirePhone??true)&&!phoneValid){setErr(tt('checkout.errors.phoneInvalid'));return}
    const f:any=Object.fromEntries(new FormData(formRef.current));
    const payload={firstName:f.firstName,lastName:f.lastName,phone,address1:f.address1,address2:f.address2||null,district:names.district||f.districtManual||null,city:names.state||f.cityManual||'',state:names.state||null,postalCode:f.postalCode||null,country,admin1Id:admin1||null,admin2Id:admin2||null};
    try{setSavingAddress(true);setErr('');const updated=await api(`/storefront/customer/addresses/${selectedAddressId}`,{method:'PATCH',headers:{authorization:`Bearer ${customerToken}`},body:JSON.stringify(payload)});setSelectedAddress(updated);setCustomer((c:any)=>({...c,addresses:(c.addresses||[]).map((a:any)=>a.id===updated.id?updated:a)}));setEditingAddress(false);setAddressFormKey(v=>v+1)}catch(e:any){setErr(e.message)}finally{setSavingAddress(false)}
  }

  async function chooseShipping(id:string){try{setBusy(true);const updated=await api(`/storefront/carts/${token}/shipping`,{method:'PATCH',body:JSON.stringify({shippingMethodId:id})});setData((d:any)=>({...d,cart:updated}))}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
  async function choosePayment(id:string){try{setBusy(true);const updated=await api(`/storefront/carts/${token}/payment`,{method:'PATCH',body:JSON.stringify({paymentMethodId:id})});setData((d:any)=>({...d,cart:updated}))}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
  async function applyDiscount(){if(!code.trim())return;try{setBusy(true);await api(`/storefront/carts/${token}/discount`,{method:'POST',body:JSON.stringify({code})});setCode('');await refreshCheckout()}catch(e:any){setErr(e.message)}finally{setBusy(false)}}

  async function registerAfterOrder(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!done?.order?.customer||!data?.store?.publicSlug)return;
    if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(successPassword)){setRegisterErr('Şifre en az 10 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.');return}
    const c=done.order.customer;
    try{
      setRegisterBusy(true);setRegisterErr('');
      await api(`/storefront/${encodeURIComponent(String(sessionStore?.publicSlug||data.store.publicSlug))}/customers/register`,{method:'POST',credentials:'include',body:JSON.stringify({email:c.email,firstName:c.firstName,lastName:c.lastName,phone:c.phone,password:successPassword,consents:{terms:true,privacy:true,kvkkNotice:true},consentVersions:{terms:'checkout',privacy:'checkout',kvkkNotice:'checkout'}})});
      setRegisterDone(true);
    }catch(e:any){setRegisterErr(e.message||'Hesap oluşturulamadı.')}finally{setRegisterBusy(false)}
  }

  function validateStep(section:number){
    setErr('');
    const root=formRef.current?.querySelector(`[data-checkout-step="${section}"]`);
    if(!root)return true;
    const controls=Array.from(root.querySelectorAll('input,select,textarea')) as Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>;
    for(const control of controls){
      if(control.type==='hidden'||control.disabled)continue;
      if(!control.checkValidity()){control.reportValidity();return false}
    }
    if(section===1&&(config.requirePhone??true)&&!phoneValid){setErr(tt('checkout.errors.phoneInvalid'));return false}
    return true;
  }

  function continueAddress(){
    if(!validateStep(1))return;
    const f:any=Object.fromEntries(new FormData(formRef.current!));
    const district=names.district||f.districtManual||'';
    const city=names.state||f.cityManual||'';
    setAddressSummary({
      email:f.email||'',
      name:`${f.firstName||''} ${f.lastName||''}`.trim(),
      phone:phone||'',
      line1:[f.address1,f.address2].filter(Boolean).join(', '),
      line2:[district,city,country].filter(Boolean).join(', ')
    });
    setStep(2);window.scrollTo({top:0,behavior:'smooth'});
  }

  function continueShipping(){
    setErr('');
    if(!cart?.shippingMethodId){setErr(tt('checkout.errors.shippingRequired'));return}
    track('begin_checkout',{value:Number(cart?.totals?.grandTotal||0),currency:cur,items:(cart?.items||[]).map((i:any)=>({item_id:i.variant?.product?.id,item_name:i.variant?.product?.title,item_variant:i.variant?.title,quantity:i.quantity,price:Number(i.variant?.price||0)}))});
    setStep(3);window.scrollTo({top:0,behavior:'smooth'});
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setErr('');
    if(step!==3){setErr(tt('checkout.errors.steps'));return}
    if((config.requirePhone??true)&&!phoneValid){setErr(tt('checkout.errors.phoneInvalid'));setStep(1);return}
    if(mode==='REQUIRED'&&!customerToken){goStore('/account?mode=login&return=/checkout');return}
    const f:any=Object.fromEntries(new FormData(e.currentTarget));
    const billingAddress={firstName:f.firstName,lastName:f.lastName,phone,address1:f.address1,address2:f.address2||null,district:names.district||f.districtManual||null,city:names.state||f.cityManual||'',state:names.state||null,postalCode:f.postalCode||null,country,admin1Id:admin1||null,admin2Id:admin2||null,...(invoiceDetails?{company:f.invoiceCompany||null,taxNumber:f.invoiceTaxNumber||null}: {})};
    const shippingAddress=shippingDifferent?{firstName:f.shippingFirstName||f.firstName,lastName:f.shippingLastName||f.lastName,phone,address1:f.shippingAddress1||f.address1,address2:f.shippingAddress2||null,district:shippingNames.district||f.shippingDistrictManual||null,city:shippingNames.state||f.shippingCityManual||'',state:shippingNames.state||null,postalCode:f.shippingPostalCode||null,country:shippingCountry,admin1Id:shippingAdmin1||null,admin2Id:shippingAdmin2||null}:billingAddress;
    const version=(type:string)=>data.legalDocuments?.find((x:any)=>x.type===type&&(!x.locale||x.locale===data.store.locale))?.version||data.legalDocuments?.find((x:any)=>x.type===type)?.version||null;
    try{localStorage.setItem('commerce-city',String(shippingAddress.city||''));localStorage.setItem('commerce-country',String(shippingAddress.country||''))}catch{}
    const payload={checkoutSessionId:sessionId,idempotencyKey:idempotencyKey.current,email:f.email,firstName:f.firstName,lastName:f.lastName,phone,phoneCountry,shippingMethodId:f.shippingMethodId,paymentMethodId:f.paymentMethodId,shippingAddress,billingAddress,note:f.note,consents:{terms:!!f.terms,privacy:!!f.privacy,kvkkNotice:!!f.kvkkNotice,emailMarketing:!!f.emailMarketing,smsMarketing:!!f.smsMarketing},consentVersions:{terms:version('DISTANCE_SALES')||version('TERMS'),privacy:version('PRIVACY'),kvkkNotice:version('KVKK_NOTICE')}};
    try{setBusy(true);let authToken=customerToken;if(authToken){try{const refreshed=await api('/storefront/customer/refresh',{method:'POST',credentials:'include',body:'{}'});authToken=refreshed.accessToken||authToken;setCustomerToken(authToken)}catch{if(mode==='REQUIRED'){goStore('/account?mode=login&return=/checkout');return}}}const path=authToken?`/storefront/carts/${token}/checkout/customer`:`/storefront/carts/${token}/checkout`;const x=await api(path,{method:'POST',headers:authToken?{authorization:`Bearer ${authToken}`}:{},body:JSON.stringify(payload)});track('purchase',{transaction_id:String(x?.order?.number||x?.order?.id||''),value:Number(x?.order?.grandTotal||cart?.totals?.grandTotal||0),currency:x?.order?.currency||cur,items:(x?.order?.items||[]).map((i:any)=>({item_id:i.variantId,item_name:i.title,quantity:i.quantity,price:Number(i.unitPrice||0)}))});setDone(x);localStorage.removeItem('commerce-cart');window.dispatchEvent(new Event('cart-change'))}catch(e:any){setErr(e.message)}finally{setBusy(false)}
  }

  if(done){
    const order=done.order;const orderCustomer=order.customer||{};
    return <div className="checkout-shell checkout-stepflow checkout-success-page">
      <main className="checkout-success-layout">
        <header className="checkout-success-header"><Link href={storeUrl("/")} className="checkout-brand">{data?.store?.logoUrl?<img src={data.store.logoUrl} alt={data.store.name}/>:<span>{data?.store?.name||'Mağaza'}</span>}</Link></header>
        <section className="checkout-success-main">
          <div className="checkout-success-primary">
            <div className="success-mark">✓</div><p className="success-kicker">Siparişiniz alındı</p><h1>Teşekkürler {orderCustomer.firstName||''}</h1>
            <p className="success-order-no">Sipariş numarası <b>#{order.number}</b></p>
            <div className="success-info-card"><h2>Sipariş bilgileri</h2><div className="success-info-grid"><span><small>E-posta</small><b>{orderCustomer.email||'-'}</b></span><span><small>Telefon</small><b>{orderCustomer.phone||'-'}</b></span><span><small>Ödeme</small><b>{order.paymentMethod||done.payment?.code||'-'}</b></span><span><small>Durum</small><b>{order.status||'-'}</b></span></div></div>
            {done.payment?.instructions&&<div className="success-payment-note"><b>Ödeme bilgisi</b><p>{done.payment.instructions}</p></div>}
            {!customerToken&&!registerDone&&<form className="success-register-card" onSubmit={registerAfterOrder}><div><h2>Hesabınızı oluşturun</h2><p>Sipariş bilgileriniz hazır. Yalnızca bir şifre belirleyin; bu siparişi hesabınızdan takip edin.</p></div><label>Şifre<input type="password" value={successPassword} onChange={e=>setSuccessPassword(e.target.value)} minLength={10} autoComplete="new-password" placeholder="En az 10 karakter" required/></label>{registerErr&&<div className="checkout-error">{registerErr}</div>}<button className="btn" disabled={registerBusy}>{registerBusy?'Oluşturuluyor…':'Hesap oluştur'}</button></form>}
            {registerDone&&<div className="success-register-card success-register-done"><h2>Hesabınız oluşturuldu</h2><p>Siparişinizi ve adreslerinizi hesabınızdan yönetebilirsiniz.</p><Link className="btn" href={storeUrl("/account")}>Hesabıma git</Link></div>}
            <Link className="success-back-link" href="/">Alışverişe devam et</Link>
          </div>
          <aside className="success-order-summary"><h2>Sipariş özeti</h2><div className="success-order-items">{order.items?.map((i:any)=>{const cartItem=data?.cart?.items?.find((x:any)=>x.variantId===i.variantId||x.variant?.id===i.variantId);const imageAsset=cartItem?.variant?.product?.images?.[0];const image=mediaUrl(imageAsset?.url,'thumb','webp');return <div className="success-order-item" key={i.id}>{image&&<div className="success-order-thumb product-image-wrap"><img src={image} alt=""/>{imageAsset?.aiGenerated&&<span className="product-ai-badge" title="AI ile oluşturuldu">AI</span>}</div>}<div className="success-order-copy"><b>{i.title}</b><small>Adet: {i.quantity}</small></div><strong>{money(Number(i.total),order.currency)}</strong></div>})}</div><div className="success-summary-lines"><div><span>{tt('checkout.summary.subtotal')}</span><b>{money(order.subtotal,order.currency)}</b></div>{Number(order.discountTotal)>0&&<div><span>{tt('checkout.summary.discount')}</span><b>-{money(order.discountTotal,order.currency)}</b></div>}<div><span>Kargo</span><b>{Number(order.shippingTotal)===0?tt('common.free'):money(order.shippingTotal,order.currency)}</b></div>{Number(order.paymentFee)>0&&<div><span>{tt('checkout.summary.paymentFee')}</span><b>{money(order.paymentFee,order.currency)}</b></div>}<div className="success-summary-total"><span>Toplam</span><b>{money(order.grandTotal,order.currency)}</b></div></div></aside>
        </section>
        <footer className="checkout-success-footer"><img className="banksicon" src="/banksicon.png" alt="Desteklenen ödeme yöntemleri"/><a href="https://ticarti.com" target="_blank" rel="noreferrer">Designed by Ticarti</a></footer>
      </main>
    </div>;
  }
  if(!data)return <div className="checkout-shell"><div className="checkout-loading">{err||'Ödeme sayfası hazırlanıyor…'}</div></div>;
  if(!cart?.items?.length)return <div className="checkout-shell"><main className="checkout-success"><div className="checkout-success-card"><h1>Sepetiniz boş</h1><Link className="btn" href={storeUrl("/products")}>Ürünlere dön</Link></div></main></div>;

  const phoneInitial=activeAddress?.phone||customer?.phone||'';
  const selectedShipping=data.shippingMethods?.find((s:any)=>s.id===cart.shippingMethodId);

  return <div className="checkout-shell checkout-stepflow">
    <header className="checkout-page-header">
      <div className="checkout-page-header-inner">
        <Link href={storeUrl("/")} className="checkout-brand">{data.store?.logoUrl?<img src={data.store.logoUrl} alt={data.store.name}/>:<span>{data.store?.name||'Mağaza'}</span>}</Link>
        {!customer?<span className="checkout-login-link">{tt('checkout.login.question')} <Link href={storeUrl("/account?mode=login&return=/checkout")}>{tt('checkout.login.action')}</Link></span>:<span className="checkout-signed">{customer.email||customer.phone}</span>}
      </div>
    </header>
    <main className="checkout-main">
      <form ref={formRef} className="checkout-final-grid" onSubmit={submit}>
        <div className="checkout-form-column">
          <div className="checkout-left-top">
            <Link href={storeUrl("/")} className="checkout-brand">{data.store?.logoUrl?<img src={data.store.logoUrl} alt={data.store.name}/>:<span>{data.store?.name||'Mağaza'}</span>}</Link>
            {!customer?<span className="checkout-login-link">Zaten hesabınız var mı? <Link href={storeUrl("/account?mode=login&return=/checkout")}>Giriş yap</Link></span>:<span className="checkout-signed">{customer.email}</span>}
          </div>
          <div className={`checkout-mobile-summary ${mobileSummaryOpen?'open':''}`}>
            <button type="button" className="checkout-mobile-summary-toggle" onClick={()=>setMobileSummaryOpen(v=>!v)} aria-expanded={mobileSummaryOpen}><span>Özet</span><strong>{money(cart.totals.grandTotal,cur)} ({cart.items.reduce((a:number,i:any)=>a+i.quantity,0)} ürün)</strong><span className="checkout-mobile-summary-arrow">⌃</span></button>
            {mobileSummaryOpen&&<div className="checkout-mobile-summary-body"><div className="checkout-items">{cart.items.map((i:any)=><div className="checkout-item" key={`m-${i.id}`}><div className="checkout-thumb product-image-wrap"><img src={mediaUrl(i.variant.product.images?.[0]?.url,'thumb','webp')||'https://placehold.co/96'} alt=""/>{i.variant.product.images?.[0]?.aiGenerated&&<span className="product-ai-badge" title="AI ile oluşturuldu">AI</span>}<span>{i.quantity}</span></div><div className="checkout-item-copy"><b>{i.variant.product.title}</b><small>{i.variant.title}</small></div><strong>{money(Number(i.variant.price)*i.quantity,cur)}</strong></div>)}</div>{config.showCouponField!==false&&<div className={`checkout-coupon-wrap ${couponOpen?'open':''}`}><button type="button" className="checkout-coupon-toggle" onClick={()=>setCouponOpen(v=>!v)}>{tt('checkout.summary.addDiscount')} <span>{couponOpen?'−':'+'}</span></button>{couponOpen&&<div className="checkout-coupon"><input value={code} onChange={e=>setCode(e.target.value)} placeholder={tt('checkout.summary.discountCode')}/><button type="button" disabled={busy||!code.trim()} onClick={()=>void applyDiscount()}>Uygula</button></div>}</div>}<div className="checkout-totals"><div><span>{tt('checkout.summary.subtotal')}</span><b>{money(cart.totals.subtotal,cur)}</b></div>{Number(cart.totals.discountTotal)>0&&<div className="discount"><span>{tt('checkout.summary.discount')}</span><b>-{money(cart.totals.discountTotal,cur)}</b></div>}<div><span>{tt('checkout.summary.shipping')}</span><b>{cart.shippingMethodId?(Number(cart.totals.shippingTotal)===0?tt('common.free'):money(cart.totals.shippingTotal,cur)):'—'}</b></div><div className="checkout-total"><span>Toplam</span><b>{money(cart.totals.grandTotal,cur)}</b></div></div></div>}
          </div>

          {err&&<div className="checkout-error">{err}</div>}
          {mode==='REQUIRED'&&!customerToken&&<div className="checkout-auth-required"><b>Bu mağazada ödeme öncesi giriş zorunlu.</b><span>Checkout içinde üyelik oluşturulmaz. Giriş yaptıktan sonra bu sayfaya geri dönersiniz.</span><Link className="btn" href={storeUrl("/account?mode=login&return=/checkout")}>Giriş yap</Link></div>}

          <section className={`checkout-step ${step===1?'active':step>1?'complete':''}`} data-checkout-step="1">
            <div className="checkout-step-heading">
              <span className="checkout-step-index">{step>1?'✓':'1'}</span>
              <h2>{tt('checkout.steps.address')}</h2>
              {step>1&&<button type="button" className="checkout-step-edit" onClick={()=>setStep(1)}>{tt('common.edit')}</button>}
            </div>
            {step>1&&<div className="checkout-step-summary"><b>{addressSummary.email}</b><span>{addressSummary.name}</span><span>{addressSummary.phone}</span><span>{addressSummary.line1}</span><span>{addressSummary.line2}</span></div>}
            <div className="checkout-step-body">
              <h3>{tt('checkout.contact.title')}</h3>
              <div className="checkout-form-grid checkout-contact-grid" key={`contact-${selectedAddressId||'new'}-${addressFormKey}`}>
                <label className="field"><span>Ad</span><input name="firstName" autoComplete="given-name" placeholder="Ad" defaultValue={activeAddress?.firstName||customer?.firstName||''} required/></label>
                <label className="field"><span>Soyad</span><input name="lastName" autoComplete="family-name" placeholder="Soyad" defaultValue={activeAddress?.lastName||customer?.lastName||''} required/></label>
                <PhoneField key={`contact-phone-${selectedAddressId||'new'}-${addressFormKey}`} required={config.requirePhone??true} country={country} locale={getLocale()} defaultValue={phoneInitial} onChange={(v,valid,phoneCountryCode)=>{setPhone(v);setPhoneCountry(phoneCountryCode);setPhoneValid(valid)}}/>
                <label className="field full"><span>{tt('checkout.contact.email')} <em>{tt('common.optional')}</em></span><input name="email" type="email" autoComplete="email" placeholder={tt('checkout.contact.email')} defaultValue={customer?.email||''} readOnly={!!customer}/></label>
                <label className="inline-check checkout-marketing-check"><input type="checkbox" name="emailMarketing"/> Beni haberlerden ve özel tekliflerden haberdar et</label>
              </div>
              <h3>{tt('checkout.address.billing')}</h3>
              {customer?.addresses?.length>0&&<div className="saved-addresses">
                <div className="saved-address-list">
                  {customer.addresses.map((a:any)=><div className={`saved-address-card ${selectedAddressId===a.id?'selected':''}`} key={a.id}><label><input type="radio" name="savedBillingAddress" checked={selectedAddressId===a.id} onChange={()=>void selectSavedAddress(a)}/><span><small>{[a.address1,a.address2,a.district,a.city,a.country].filter(Boolean).join(', ')}</small></span></label>{selectedAddressId===a.id&&<button type="button" className="saved-address-edit" onClick={()=>setEditingAddress(true)}>{tt('common.edit')}</button>}</div>)}
                </div>
                <button type="button" className="saved-address-new" onClick={()=>void newAddress()}>+ Yeni adres kullan</button>
              </div>}
              {selectedAddressId&&!editingAddress?<>
                <input type="hidden" name="address1" value={activeAddress?.address1||''}/><input type="hidden" name="address2" value={activeAddress?.address2||''}/><input type="hidden" name="postalCode" value={activeAddress?.postalCode||''}/>
                <div className="saved-address-selected-detail"><span>{[activeAddress?.address1,activeAddress?.address2].filter(Boolean).join(', ')}</span><span>{[activeAddress?.district,activeAddress?.city].filter(Boolean).join(' / ')}</span></div>
              </>:<div className="checkout-form-grid" key={addressFormKey}>
                <label className="field full"><span>Adres</span><input name="address1" autoComplete="address-line1" placeholder="Adres" defaultValue={activeAddress?.address1||''} required/></label>
                <label className="field full"><span>Adres devamı</span><input name="address2" autoComplete="address-line2" placeholder="Apartman, daire, şirket vb." defaultValue={activeAddress?.address2||''}/></label>
                <label className="field"><span>Ülke / Bölge</span><select name="country" value={country} onChange={e=>void changeCountry(e.target.value)} required>{data.countries?.map((c:string)=><option key={c} value={c}>{new Intl.DisplayNames([getLocale()],{type:'region'}).of(c)||c}</option>)}</select></label>
                <label className="field"><span>Posta kodu</span><input name="postalCode" autoComplete="postal-code" placeholder="Posta kodu" defaultValue={activeAddress?.postalCode||''}/></label>
                <label className="field"><span>İl / Eyalet</span>{admin1Rows.length||country==='TR'?<select value={admin1} onChange={e=>void changeAdmin1(e.target.value)} required disabled={country==='TR'&&!admin1Rows.length}><option value="">İl seçin</option>{admin1Rows.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>:<input name="cityManual" placeholder="İl / Eyalet" defaultValue={activeAddress?.city||''} required/>}</label>
                <label className="field"><span>İlçe</span>{admin2Rows.length||country==='TR'?<select value={admin2} onChange={e=>changeAdmin2(e.target.value)} disabled={!admin1||!admin2Rows.length}><option value="">İlçe seçin</option>{admin2Rows.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>:<input name="districtManual" placeholder="İlçe" defaultValue={activeAddress?.district||''}/>}</label>
                {editingAddress&&selectedAddressId&&<div className="full saved-address-save-row"><button type="button" className="saved-address-save" disabled={savingAddress} onClick={()=>void saveSelectedAddress()}>{savingAddress?'Kaydediliyor…':'Değişiklikleri kaydet'}</button><button type="button" className="saved-address-cancel" onClick={()=>setEditingAddress(false)}>Vazgeç</button></div>}
              </div>}
              <div className="invoice-details-block">
                <label className="inline-check"><input type="checkbox" checked={invoiceDetails} onChange={e=>setInvoiceDetails(e.target.checked)}/> Fatura bilgisi girin</label>
                {invoiceDetails&&<div className="checkout-form-grid invoice-details-grid">
                  <label className="field"><span>{tt('checkout.address.company')}</span><input name="invoiceCompany" placeholder="Firma / Kurum adı" defaultValue={activeAddress?.company||''}/></label>
                  <label className="field"><span>{invoiceTaxLabel}</span><input name="invoiceTaxNumber" placeholder={invoiceTaxLabel}/></label>
                </div>}
              </div>
              <div className="checkout-delivery-address-toggle">
                <label className="inline-check"><input type="checkbox" checked={shippingDifferent} onChange={e=>{setShippingDifferent(e.target.checked);if(e.target.checked){setShippingCountry(country);void loadShippingAdmin1(country)}}}/> Teslimat adresim farklı olsun</label>
                {shippingDifferent&&<div className="checkout-form-grid billing-grid">
                  <label className="field full"><span>Adres</span><input name="shippingAddress1" required/></label>
                  <label className="field full"><span>Adres devamı</span><input name="shippingAddress2" placeholder="Apartman, daire, şirket vb."/></label>
                  <label className="field"><span>Ülke / Bölge</span><select name="shippingCountry" value={shippingCountry} onChange={e=>void changeShippingCountry(e.target.value)} required>{data.countries?.map((c:string)=><option key={c} value={c}>{new Intl.DisplayNames([getLocale()],{type:'region'}).of(c)||c}</option>)}</select></label>
                  <label className="field"><span>Posta kodu</span><input name="shippingPostalCode"/></label>
                  <label className="field"><span>İl / Eyalet</span>{shippingAdmin1Rows.length||shippingCountry==='TR'?<select value={shippingAdmin1} onChange={e=>void changeShippingAdmin1(e.target.value)} required disabled={shippingCountry==='TR'&&!shippingAdmin1Rows.length}><option value="">İl seçin</option>{shippingAdmin1Rows.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>:<input name="shippingCityManual" placeholder="İl / Eyalet" required/>}</label>
                  <label className="field"><span>İlçe</span>{shippingAdmin2Rows.length||shippingCountry==='TR'?<select value={shippingAdmin2} onChange={e=>setShippingAdmin2(e.target.value)} disabled={!shippingAdmin1||!shippingAdmin2Rows.length}><option value="">İlçe seçin</option>{shippingAdmin2Rows.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>:<input name="shippingDistrictManual" placeholder="İlçe"/>}</label>
                </div>}
              </div>
              <button type="button" className="checkout-continue-button" onClick={continueAddress}>{tt('checkout.actions.continueShipping')}</button>
            </div>
          </section>

          <section className={`checkout-step ${step===2?'active':step>2?'complete':''}`} data-checkout-step="2">
            <div className="checkout-step-heading">
              <span className="checkout-step-index">{step>2?'✓':'2'}</span><h2>{tt('checkout.steps.shipping')}</h2>
              {step>2&&<button type="button" className="checkout-step-edit" onClick={()=>setStep(2)}>{tt('common.edit')}</button>}
            </div>
            {step>2&&selectedShipping&&<div className="checkout-step-summary checkout-step-summary-row"><span>{selectedShipping.name}</span><b>{Number(cart.totals.shippingTotal)===0?tt('common.free'):money(cart.totals.shippingTotal,cur)}</b></div>}
            <div className="checkout-step-body">
              <p className="checkout-help">Siparişiniz için uygun teslimat yöntemini seçin.</p>
              <div className="checkout-options">{data.shippingMethods.map((s:any)=><label className={`checkout-option ${cart.shippingMethodId===s.id?'selected':''}`} key={s.id}><input type="radio" name="shippingMethodId" value={s.id} checked={cart.shippingMethodId===s.id} onChange={()=>void chooseShipping(s.id)} required/><span className="checkout-option-copy"><b>{s.name}</b>{(s.description||s.estimatedMinDays)&&<small>{s.description||`${s.estimatedMinDays}–${s.estimatedMaxDays||s.estimatedMinDays} gün`}</small>}</span><strong>{Number(s.price)===0?tt('common.free'):money(s.price,cur)}</strong></label>)}</div>
              <button type="button" className="checkout-continue-button" disabled={busy||!cart.shippingMethodId} onClick={continueShipping}>{tt('checkout.actions.continuePayment')}</button>
            </div>
          </section>

          <section className={`checkout-step ${step===3?'active':''}`} data-checkout-step="3">
            <div className="checkout-step-heading"><span className="checkout-step-index">3</span><h2>{tt('checkout.steps.payment')}</h2></div>
            <div className="checkout-step-body">
              <p className="checkout-help">Tüm ödeme işlemleri güvenli bağlantı üzerinden gerçekleştirilir.</p>
              <div className="checkout-options">{data.paymentMethods.map((p:any)=><label className={`checkout-option ${cart.paymentMethodId===p.id?'selected':''}`} key={p.id}><input type="radio" name="paymentMethodId" value={p.id} checked={cart.paymentMethodId===p.id} onChange={()=>void choosePayment(p.id)} required/><span className="checkout-option-copy"><b>{p.name}</b>{p.instructions&&<small>{p.instructions}</small>}</span>{Number(p.fee)>0&&<strong>+{money(p.fee,cur)}</strong>}</label>)}</div>
              {selectedPayment?.requiresOnlinePayment&&<div className="payment-provider-slot"><div className="payment-provider-lock">🔒</div><div><b>Güvenli ödeme alanı</b><p>Kart veya cüzdan bilgileri ödeme sağlayıcısının güvenli bileşeninde burada açılır; kart verisi mağaza sunucusunda tutulmaz.</p></div></div>}

              <div className="checkout-payment-extras">
                <label className="field checkout-note-field"><span>Sipariş notu <em>isteğe bağlı</em></span><textarea name="note" rows={3} placeholder="Siparişinizle ilgili bir not ekleyin"/></label>
                <div className="checkout-consents">
                  <input type="hidden" name="privacy" value="1"/>
                  <input type="hidden" name="kvkkNotice" value="1"/>
                  <label><input type="checkbox" name="terms" required/> <span>{contracts.DISTANCE_SALES?.href?<><Link href={storeUrl(contracts.DISTANCE_SALES.href)} target="_blank">Mesafeli Satış Sözleşmesi</Link>ni</>:<>Mesafeli Satış Sözleşmesini</>}, {contracts.PRIVACY?.href?<><Link href={storeUrl(contracts.PRIVACY.href)} target="_blank">Gizlilik Politikası</Link>nı</>:<>Gizlilik Politikasını</>} ve {contracts.KVKK_NOTICE?.href?<><Link href={storeUrl(contracts.KVKK_NOTICE.href)} target="_blank">KVKK Aydınlatma Metni</Link>ni</>:<>KVKK Aydınlatma Metnini</>} okudum, onaylıyorum.</span></label>
                </div>
                <button className="checkout-pay-button" disabled={busy||!cart.paymentMethodId||mode==='REQUIRED'&&!customerToken}>{busy?tt('checkout.actions.processing'):tt('checkout.actions.completeOrder')}</button>
                <p className="checkout-secure-note">🔒 Ödemeler güvenli ve şifrelidir</p>
              </div>
            </div>
          </section>
          <div className="checkout-left-footer"><div className="checkout-footer-links">{contracts.RETURNS?.href?<Link href={storeUrl(contracts.RETURNS.href)}>İade Politikası</Link>:<span>İade Politikası</span>}<span>•</span>{contracts.PRIVACY?.href?<Link href={storeUrl(contracts.PRIVACY.href)}>Gizlilik Politikası</Link>:<span>Gizlilik Politikası</span>}<span>•</span>{contracts.TERMS?.href?<Link href={storeUrl(contracts.TERMS.href)}>Hizmet Şartları</Link>:<span>Hizmet Şartları</span>}</div><div className="checkout-footer-meta"><img className="banksicon" src="/banksicon.png" alt="Desteklenen ödeme yöntemleri"/><a className="designed-by" href="https://ticarti.com" target="_blank" rel="noreferrer">Designed by Ticarti</a></div></div>
        </div>

        <aside className="checkout-summary-column">
          <div className="checkout-summary-inner">
            <div className="checkout-items">{cart.items.map((i:any)=><div className="checkout-item" key={i.id}><div className="checkout-thumb product-image-wrap"><img src={mediaUrl(i.variant.product.images?.[0]?.url,'thumb','webp')||'https://placehold.co/96'} alt=""/>{i.variant.product.images?.[0]?.aiGenerated&&<span className="product-ai-badge" title="AI ile oluşturuldu">AI</span>}<span>{i.quantity}</span></div><div className="checkout-item-copy"><b>{i.variant.product.title}</b><small>{i.variant.title}</small></div><strong>{money(Number(i.variant.price)*i.quantity,cur)}</strong></div>)}{cart.promotionGifts?.map((g:any)=><div className="checkout-item" key={g.variantId}><div className="checkout-thumb product-image-wrap"><img src={mediaUrl(g.product?.images?.[0]?.url,'thumb','webp')||'https://placehold.co/96'} alt=""/>{g.product?.images?.[0]?.aiGenerated&&<span className="product-ai-badge" title="AI ile oluşturuldu">AI</span>}<span>{g.quantity}</span></div><div className="checkout-item-copy"><b>{g.title}</b><small>Promosyon hediyesi</small></div><strong>{money(0,cur)}</strong></div>)}</div>
            {config.showCouponField!==false&&<div className={`checkout-coupon-wrap ${couponOpen?'open':''}`}><button type="button" className="checkout-coupon-toggle" onClick={()=>setCouponOpen(v=>!v)}>{tt('checkout.summary.addDiscount')} <span>{couponOpen?'−':'+'}</span></button>{couponOpen&&<div className="checkout-coupon"><input value={code} onChange={e=>setCode(e.target.value)} placeholder={tt('checkout.summary.discountCode')}/><button type="button" disabled={busy||!code.trim()} onClick={()=>void applyDiscount()}>Uygula</button></div>}</div>}
            {cart.totals.appliedPromotions?.length>0&&<div className="checkout-promos">{cart.totals.appliedPromotions.map((p:any)=><span key={p.id}>✓ {p.name}</span>)}</div>}
            <div className="checkout-totals"><div><span>{tt('checkout.summary.subtotal')}</span><b>{money(cart.totals.subtotal,cur)}</b></div>{Number(cart.totals.discountTotal)>0&&<div className="discount"><span>{tt('checkout.summary.discount')}</span><b>-{money(cart.totals.discountTotal,cur)}</b></div>}<div><span>{tt('checkout.summary.shipping')}</span><b>{cart.shippingMethodId?(Number(cart.totals.shippingTotal)===0?tt('common.free'):money(cart.totals.shippingTotal,cur)):'—'}</b></div>{Number(cart.totals.paymentFee)>0&&<div><span>{tt('checkout.summary.paymentFee')}</span><b>{money(cart.totals.paymentFee,cur)}</b></div>}{Number(cart.totals.taxTotal)>0&&<div><span>{tt('checkout.summary.tax')}</span><b>{money(cart.totals.taxTotal,cur)}</b></div>}<div className="checkout-total"><span>{tt('checkout.summary.total')} <small>{cur}</small></span><b>{money(cart.totals.grandTotal,cur)}</b></div></div>
          </div>
        </aside>
      </form>
    </main>
    <footer className="checkout-page-footer">
      <div className="checkout-page-footer-inner">
        <div className="checkout-footer-links">
          {contracts.RETURNS?.href?<Link href={storeUrl(contracts.RETURNS.href)}>{tt('checkout.footer.returns')}</Link>:<span>{tt('checkout.footer.returns')}</span>}
          <span>•</span>
          {contracts.PRIVACY?.href?<Link href={storeUrl(contracts.PRIVACY.href)}>{tt('checkout.footer.privacy')}</Link>:<span>{tt('checkout.footer.privacy')}</span>}
          <span>•</span>
          {contracts.TERMS?.href?<Link href={storeUrl(contracts.TERMS.href)}>{tt('checkout.footer.terms')}</Link>:<span>{tt('checkout.footer.terms')}</span>}
        </div>
        <div className="checkout-footer-meta">
          <img className="banksicon" src="/banksicon.png" alt=""/>
          <a className="designed-by designed-by-ticarti" href="https://ticarti.com" target="_blank" rel="noreferrer"><span>{tt('checkout.footer.designedBy')}</span><img src="/ticarti-logo.svg" alt="Ticarti"/></a>
        </div>
      </div>
    </footer>
  </div>
}
