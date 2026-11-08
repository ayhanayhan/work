'use client';
import {useEffect,useState,type FormEvent} from 'react';

type Comment={id:string;name:string;comment:string;createdAt:string};
const copy:Record<string,{comments:string;name:string;message:string;send:string;pending:string;empty:string;error:string;phone:string;call:string;subtitle:string;consent:string;received:string;phoneError:string}>={
 tr:{comments:'Yorumlar',name:'Adınız',message:'Yorumunuz',send:'Yorum gönder',pending:'Yorumunuz onay için gönderildi.',empty:'Henüz yorum yapılmamış. İlk yorumu siz yazabilirsiniz.',error:'İşlem tamamlanamadı. Lütfen tekrar deneyin.',phone:'Telefon numaranız',call:'Sizi arayalım',subtitle:"Mağazanızı birlikte değerlendirelim. Numaranızı bırakın, sizi arayalım.",consent:'KVKK Aydınlatma Metni’ni okudum.',received:'Talebiniz alındı.',phoneError:'Geçerli bir telefon numarası girin.'},
 en:{comments:'Comments',name:'Your name',message:'Your comment',send:'Submit comment',pending:'Your comment is awaiting approval.',empty:'No comments yet. Be the first to comment.',error:'Could not submit. Please try again.',phone:'Phone number',call:'Request a call',subtitle:"Have a question about your store? Leave your number and we'll call you.",consent:'I have read the privacy notice.',received:'Your request has been received.',phoneError:'Enter a valid phone number.'},
 de:{comments:'Kommentare',name:'Ihr Name',message:'Ihr Kommentar',send:'Kommentar senden',pending:'Ihr Kommentar wartet auf Freigabe.',empty:'Noch keine Kommentare.',error:'Senden fehlgeschlagen. Bitte erneut versuchen.',phone:'Telefonnummer',call:'Rückruf anfordern',subtitle:"Fragen zu Ihrem Shop? Hinterlassen Sie Ihre Nummer, wir rufen zurück.",consent:'Ich habe die Datenschutzhinweise gelesen.',received:'Ihre Anfrage ist eingegangen.',phoneError:'Geben Sie eine gültige Telefonnummer ein.'},
 ru:{comments:'Комментарии',name:'Ваше имя',message:'Ваш комментарий',send:'Отправить комментарий',pending:'Комментарий отправлен на модерацию.',empty:'Комментариев пока нет.',error:'Не удалось отправить. Повторите попытку.',phone:'Номер телефона',call:'Заказать звонок',subtitle:"Есть вопросы о магазине? Оставьте номер, и мы вам перезвоним.",consent:'Я ознакомился с уведомлением о конфиденциальности.',received:'Запрос получен.',phoneError:'Введите корректный номер телефона.'},
 ar:{comments:'التعليقات',name:'الاسم',message:'تعليقك',send:'إرسال التعليق',pending:'تم إرسال تعليقك للمراجعة.',empty:'لا توجد تعليقات بعد.',error:'تعذر الإرسال. حاول مرة أخرى.',phone:'رقم الهاتف',call:'اطلب اتصالاً',subtitle:"هل لديك أسئلة حول متجرك؟ اترك رقمك وسنتصل بك.",consent:'قرأت إشعار حماية البيانات.',received:'تم استلام طلبك.',phoneError:'أدخل رقم هاتف صحيحاً.'}
};
export function BlogComments({slug,locale}:{slug:string;locale:string}){
 const t=copy[locale]||copy.en;
 const [rows,setRows]=useState<Comment[]>([]),[name,setName]=useState(''),[comment,setComment]=useState(''),[website,setWebsite]=useState('');
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;
  fetch('/api/v1/public/website/blog-comments/'+encodeURIComponent(slug),{cache:'no-store'})
    .then(r=>r.ok?r.json():[]).then(v=>{if(live&&Array.isArray(v))setRows(v)}).catch(()=>{});
  return()=>{live=false};
 },[slug]);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setBusy(true);setStatus('');
  try{
   const res=await fetch('/api/v1/public/website/blog-comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,name,comment,website})});
   if(!res.ok)throw Error();
   setComment('');setStatus(t.pending);
  }catch{setStatus(t.error)}finally{setBusy(false)}
 };
 return <section className="tc-post-comments" id="comments"><h2>{t.comments} ({rows.length})</h2>
  {rows.length?<div className="tc-post-comment-list">{rows.map(c=><article key={c.id} className="tc-post-comment">
    <div className="tc-post-comment-meta"><strong>{c.name}</strong><time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleDateString(locale)}</time></div>
    <p>{c.comment}</p></article>)}</div>:<p className="tc-post-comment-empty">{t.empty}</p>}
  <form onSubmit={e=>void submit(e)} className="tc-post-comment-form">
   <label>{t.name}<input value={name} maxLength={100} minLength={2} required onChange={e=>setName(e.target.value)}/></label>
   <label>{t.message}<textarea value={comment} maxLength={3000} minLength={5} rows={5} required onChange={e=>setComment(e.target.value)}/></label>
   <input className="tc-post-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e=>setWebsite(e.target.value)}/>
   <button type="submit" disabled={busy}>{t.send}</button>
   {status?<p role="status" aria-live="polite">{status}</p>:null}
  </form>
 </section>;
}
export function BlogPhoneCta({slug,locale}:{slug:string;locale:string}){
 const t=copy[locale]||copy.en;
 const [dial,setDial]=useState('+90'),[phone,setPhone]=useState(''),[consent,setConsent]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const send=async(e:FormEvent)=>{
  e.preventDefault();setStatus('');
  const digits=phone.replace(/[\s()\-]/g,'').replace(/^0(?=\d)/,'');
  if(!/^\d{7,15}$/.test(digits)){setStatus(t.phoneError);return;}
  if(!consent)return;
  setBusy(true);
  try{
   const res=await fetch('/api/v1/public/contact/callback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dial,phone:digits,consent,slug,locale,source:'BLOG'})});
   if(!res.ok)throw Error();
   setPhone('');setConsent(false);setStatus(t.received);
  }catch{setStatus(t.error)}finally{setBusy(false)}
 };
 return <section className="tc-post-cta">
  <h3>{t.call}</h3>
  <p className="tc-post-cta-subtitle">{t.subtitle}</p>
  <form onSubmit={e=>void send(e)}>
   <div className="tc-post-phone-row">
    <select value={dial} onChange={e=>setDial(e.target.value)} aria-label="Country code">
     <option value="+90">🇹🇷 +90</option><option value="+44">🇬🇧 +44</option><option value="+49">🇩🇪 +49</option><option value="+7">🇷🇺 +7</option><option value="+966">🇸🇦 +966</option><option value="+971">🇦🇪 +971</option>
    </select>
    <input type="tel" inputMode="tel" autoComplete="tel-national" required value={phone} placeholder={t.phone} onChange={e=>setPhone(e.target.value)} />
   </div>
   <label className="tc-post-consent"><input type="checkbox" checked={consent} required onChange={e=>setConsent(e.target.checked)}/>
     <span><a href="/kvkk.html" target="_blank" rel="noopener noreferrer">KVKK</a> — {t.consent}</span>
   </label>
   <button type="submit" disabled={busy}>{t.call}</button>
   {status?<p role="status" aria-live="polite">{status}</p>:null}
  </form>
 </section>;
}
