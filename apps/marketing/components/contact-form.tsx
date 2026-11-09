'use client';

import {useState,type FormEvent} from 'react';

type FormState={fullName:string;email:string;phone:string;subject:string;message:string;website:string;consent:boolean};
const initial:FormState={fullName:'',email:'',phone:'',subject:'',message:'',website:'',consent:false};

export default function ContactForm(){
 const [values,setValues]=useState<FormState>(initial);
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState<{ok:boolean;message:string}|null>(null);
 const set=(key:keyof FormState,value:string|boolean)=>{setValues(prev=>({...prev,[key]:value}));setFeedback(null)};
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setFeedback(null);
  try{
   const response=await fetch('/api/v1/public/contact',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(values)
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
   setValues(initial);
   setFeedback({ok:true,message:'Mesajınız bize ulaştı. En kısa sürede size dönüş yapacağız.'});
  }catch(error){
   setFeedback({ok:false,message:error instanceof Error?error.message:'Mesaj gönderilemedi. Lütfen tekrar deneyin.'});
  }finally{setBusy(false)}
 }
 return <form className="tc-contact-form" onSubmit={submit}>
  <h2 className="tc-contact-form__title">Bize yazın</h2>
  <p className="tc-contact-form__intro">Mesajınızı bırakın, Ticarti ekibi size dönüş yapsın.</p>
  <div className="tc-contact-form__fields">
   <label className="tc-contact-form__field"><span>Ad soyad <b aria-hidden="true">*</b></span><input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={150} required value={values.fullName} onChange={e=>set('fullName',e.target.value)} placeholder="Adınız ve soyadınız"/></label>
   <label className="tc-contact-form__field"><span>E-posta <b aria-hidden="true">*</b></span><input name="email" type="email" autoComplete="email" maxLength={254} required value={values.email} onChange={e=>set('email',e.target.value)} placeholder="ornek@firma.com"/></label>
   <label className="tc-contact-form__field"><span>Telefon</span><input name="phone" type="tel" autoComplete="tel" maxLength={22} value={values.phone} onChange={e=>set('phone',e.target.value)} placeholder="+90 5xx xxx xx xx"/></label>
   <label className="tc-contact-form__field"><span>Konu <b aria-hidden="true">*</b></span><input name="subject" type="text" minLength={3} maxLength={180} required value={values.subject} onChange={e=>set('subject',e.target.value)} placeholder="Nasıl yardımcı olabiliriz?"/></label>
   <label className="tc-contact-form__field tc-contact-form__field--full"><span>Mesajınız <b aria-hidden="true">*</b></span><textarea name="message" minLength={10} maxLength={10000} rows={5} required value={values.message} onChange={e=>set('message',e.target.value)} placeholder="Mesajınızı buraya yazın..."/></label>
  </div>
  <input type="text" name="website" autoComplete="off" tabIndex={-1} aria-hidden="true" hidden value={values.website} onChange={e=>set('website',e.target.value)}/>
  <label className="tc-contact-form__consent"><input name="consent" type="checkbox" required checked={values.consent} onChange={e=>set('consent',e.target.checked)}/><span><a href="/kvkk.html" target="_blank" rel="noopener noreferrer">KVKK Aydınlatma Metni</a>’ni okudum; talebime yanıt verilmesi için iletişim bilgilerimin işlenmesi hakkında bilgilendirildim.</span></label>
  <button className="tc-contact-form__submit" disabled={busy} type="submit">{busy?'Gönderiliyor...':'Mesajı gönder'}</button>
  {feedback?<p className={'tc-contact-form__status'+(feedback.ok?'':' is-error')} role={feedback.ok?'status':'alert'} aria-live="polite">{feedback.message}</p>:null}
 </form>;
}
