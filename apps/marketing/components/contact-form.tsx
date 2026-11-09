'use client';

import {useState,type FormEvent} from 'react';

type FormState={fullName:string;email:string;phone:string;subject:string;message:string;website:string;consent:boolean};
const initial:FormState={fullName:'',email:'',phone:'',subject:'',message:'',website:'',consent:false};

type Copy={title:string,intro:string,name:string,email:string,phone:string,subject:string,message:string,nameHint:string,subjectHint:string,messageHint:string,consent:string,send:string,sending:string,success:string,error:string};
const translations:Record<string,Copy>={
 tr:{title:'Bize yazın',intro:'Mesajınızı bırakın, Ticarti ekibi size dönüş yapsın.',name:'Ad soyad',email:'E-posta',phone:'Telefon',subject:'Konu',message:'Mesajınız',nameHint:'Adınız ve soyadınız',subjectHint:'Nasıl yardımcı olabiliriz?',messageHint:'Mesajınızı buraya yazın...',consent:'Metnini okudum ve kişisel verilerimin iletişim talebim için işlenmesi hakkında bilgilendirildim.',send:'Mesajı gönder',sending:'Gönderiliyor...',success:t.success,error:t.error},
 en:{title:'Send us a message',intro:'Our team will get back to you.',name:'Full name',email:'Email',phone:'Phone',subject:'Subject',message:'Your message',nameHint:'Your full name',subjectHint:'How can we help?',messageHint:'Write your message...',consent:'I have read the privacy notice and understand how my information is processed to respond to my request.',send:'Send message',sending:'Sending...',success:'We received your message and will get back to you.',error:'Unable to send your message. Please try again.'},
 de:{title:'Schreiben Sie uns',intro:'Unser Team meldet sich bei Ihnen.',name:'Vollständiger Name',email:'E-Mail',phone:'Telefon',subject:'Betreff',message:'Nachricht',nameHint:'Ihr Name',subjectHint:'Wie können wir helfen?',messageHint:'Ihre Nachricht...',consent:'Ich habe die Datenschutzhinweise gelesen und wurde über die Verarbeitung meiner Angaben informiert.',send:'Nachricht senden',sending:'Wird gesendet...',success:'Ihre Nachricht wurde empfangen.',error:'Nachricht konnte nicht gesendet werden.'},
 ru:{title:'Напишите нам',intro:'Наша команда ответит вам.',name:'Полное имя',email:'Эл. почта',phone:'Телефон',subject:'Тема',message:'Сообщение',nameHint:'Ваше имя',subjectHint:'Чем можем помочь?',messageHint:'Напишите сообщение...',consent:'Я ознакомился с уведомлением о конфиденциальности и обработке данных.',send:'Отправить',sending:'Отправка...',success:'Мы получили ваше сообщение.',error:'Не удалось отправить сообщение.'},
 ar:{title:'راسلنا',intro:'سيرد فريقنا على رسالتك.',name:'الاسم الكامل',email:'البريد الإلكتروني',phone:'الهاتف',subject:'الموضوع',message:'رسالتك',nameHint:'الاسم الكامل',subjectHint:'كيف يمكننا مساعدتك؟',messageHint:'اكتب رسالتك...',consent:'قرأت إشعار الخصوصية وأفهم كيفية معالجة بياناتي للرد على طلبي.',send:'إرسال الرسالة',sending:'جارٍ الإرسال...',success:'تم استلام رسالتك.',error:'تعذر إرسال الرسالة.'},
 bg:{title:'Пишете ни',intro:'Екипът ни ще ви отговори.',name:'Име и фамилия',email:'Имейл',phone:'Телефон',subject:'Тема',message:'Съобщение',nameHint:'Вашето име',subjectHint:'Как можем да помогнем?',messageHint:'Напишете съобщение...',consent:'Прочетох уведомлението за поверителност и съм информиран за обработката на данните ми.',send:'Изпрати',sending:'Изпращане...',success:'Получихме съобщението ви.',error:'Съобщението не бе изпратено.'},
 uk:{title:'Напишіть нам',intro:'Команда відповість на повідомлення.',name:'Повне ім’я',email:'Ел. пошта',phone:'Телефон',subject:'Тема',message:'Повідомлення',nameHint:'Ваше ім’я',subjectHint:'Як можемо допомогти?',messageHint:'Ваше повідомлення...',consent:'Я прочитав повідомлення про конфіденційність та обробку даних.',send:'Надіслати',sending:'Надсилання...',success:'Ваше повідомлення отримано.',error:'Не вдалося надіслати повідомлення.'},
 id:{title:'Kirim pesan',intro:'Tim kami akan segera menghubungi Anda.',name:'Nama lengkap',email:'Email',phone:'Telepon',subject:'Subjek',message:'Pesan',nameHint:'Nama lengkap Anda',subjectHint:'Apa yang bisa kami bantu?',messageHint:'Tulis pesan Anda...',consent:'Saya telah membaca pemberitahuan privasi dan memahami penggunaan data saya.',send:'Kirim pesan',sending:'Mengirim...',success:'Pesan Anda telah diterima.',error:'Pesan tidak dapat dikirim.'},
 vi:{title:'Gửi tin nhắn',intro:'Đội ngũ sẽ liên hệ lại với bạn.',name:'Họ và tên',email:'Email',phone:'Điện thoại',subject:'Chủ đề',message:'Tin nhắn',nameHint:'Họ và tên của bạn',subjectHint:'Chúng tôi có thể giúp gì?',messageHint:'Viết tin nhắn...',consent:'Tôi đã đọc thông báo quyền riêng tư và hiểu cách dữ liệu được xử lý.',send:'Gửi tin nhắn',sending:'Đang gửi...',success:'Chúng tôi đã nhận được tin nhắn.',error:'Không thể gửi tin nhắn.'}
};

export default function ContactForm({locale='tr'}:{locale?:string}){
 const t=translations[locale]||translations.en;
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
   if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||t.error);
   setValues(initial);
   setFeedback({ok:true,message:'Mesajınız bize ulaştı. En kısa sürede size dönüş yapacağız.'});
  }catch(error){
   setFeedback({ok:false,message:error instanceof Error?error.message:t.error});
  }finally{setBusy(false)}
 }
 return <form className="tc-contact-form" onSubmit={submit}>
  <h2 className="tc-contact-form__title">{t.title}</h2>
  <p className="tc-contact-form__intro">{t.intro}</p>
  <div className="tc-contact-form__fields">
   <label className="tc-contact-form__field"><span>{t.name} <b aria-hidden="true">*</b></span><input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={150} required value={values.fullName} onChange={e=>set('fullName',e.target.value)} placeholder={t.nameHint}/></label>
   <label className="tc-contact-form__field"><span>{t.email} <b aria-hidden="true">*</b></span><input name="email" type="email" autoComplete="email" maxLength={254} required value={values.email} onChange={e=>set('email',e.target.value)} placeholder="ornek@firma.com"/></label>
   <label className="tc-contact-form__field"><span>{t.phone}</span><input name="phone" type="tel" autoComplete="tel" maxLength={22} value={values.phone} onChange={e=>set('phone',e.target.value)} placeholder="+90 5xx xxx xx xx"/></label>
   <label className="tc-contact-form__field"><span>{t.subject} <b aria-hidden="true">*</b></span><input name="subject" type="text" minLength={3} maxLength={180} required value={values.subject} onChange={e=>set('subject',e.target.value)} placeholder={t.subjectHint}/></label>
   <label className="tc-contact-form__field tc-contact-form__field--full"><span>{t.message} <b aria-hidden="true">*</b></span><textarea name="message" minLength={10} maxLength={10000} rows={5} required value={values.message} onChange={e=>set('message',e.target.value)} placeholder={t.messageHint}/></label>
  </div>
  <input type="text" name="website" autoComplete="off" tabIndex={-1} aria-hidden="true" hidden value={values.website} onChange={e=>set('website',e.target.value)}/>
  <label className="tc-contact-form__consent"><input name="consent" type="checkbox" required checked={values.consent} onChange={e=>set('consent',e.target.checked)}/><span><a href="/kvkk.html" target="_blank" rel="noopener noreferrer">KVKK</a> · {t.consent}</span></label>
  <button className="tc-contact-form__submit" disabled={busy} type="submit">{busy?t.sending:t.send}</button>
  {feedback?<p className={'tc-contact-form__status'+(feedback.ok?'':' is-error')} role={feedback.ok?'status':'alert'} aria-live="polite">{feedback.message}</p>:null}
 </form>;
}
