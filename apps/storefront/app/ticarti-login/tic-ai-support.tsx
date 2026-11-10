'use client';
import {useState,type FormEvent} from 'react';
import {useAuthLocale} from './auth-locale';
const API=process.env.NEXT_PUBLIC_API_URL||'/api/v1';
const CONTENT:Record<string,{open:string,phone:string,consent:string,submit:string,sending:string,success:string,error:string}> = {
 tr:{open:'Kurulum desteği al',phone:'Sizi arayabileceğimiz telefon numarası',consent:'Kurulum desteği için Ticarti ekibinin beni bu numaradan aramasını kabul ediyorum.',submit:'Beni arayın',sending:'Gönderiliyor…',success:'Talebiniz alındı. Ticarti ekibi sizinle iletişime geçecek.',error:'Talep gönderilemedi. Lütfen telefon numaranızı kontrol edip tekrar deneyin.'},
 en:{open:'Get setup support',phone:'Phone number we can call',consent:'I agree to be contacted by the Ticarti team for setup support.',submit:'Call me',sending:'Sending…',success:'Request received. The Ticarti team will contact you.',error:'Unable to send your request. Check your number and try again.'},
 de:{open:'Einrichtungshilfe erhalten',phone:'Telefonnummer für den Rückruf',consent:'Ich stimme einem Rückruf von Ticarti zur Einrichtung zu.',submit:'Rückruf anfordern',sending:'Wird gesendet…',success:'Deine Anfrage ist eingegangen.',error:'Anfrage konnte nicht gesendet werden.'},
 ru:{open:'Помощь с настройкой',phone:'Телефон для обратного звонка',consent:'Я согласен на звонок команды Ticarti для помощи с настройкой.',submit:'Позвоните мне',sending:'Отправка…',success:'Заявка принята. Мы свяжемся с вами.',error:'Не удалось отправить заявку. Проверьте номер.'},
 ar:{open:'احصل على دعم الإعداد',phone:'رقم الهاتف للتواصل معك',consent:'أوافق على أن يتصل بي فريق Ticarti للمساعدة في الإعداد.',submit:'اتصلوا بي',sending:'جارٍ الإرسال…',success:'تم استلام طلبك وسنتواصل معك.',error:'تعذر إرسال الطلب. تحقق من الرقم وحاول مجددًا.'},
 bg:{open:'Помощ при настройка',phone:'Телефон за обратна връзка',consent:'Съгласен съм екипът на Ticarti да се свърже с мен.',submit:'Обадете ми се',sending:'Изпращане…',success:'Заявката е приета.',error:'Заявката не можа да бъде изпратена.'},
 uk:{open:'Допомога з налаштуванням',phone:'Телефон для зворотного дзвінка',consent:'Погоджуюся на дзвінок від команди Ticarti.',submit:'Зателефонуйте мені',sending:'Надсилання…',success:'Запит отримано. Ми зв’яжемося з вами.',error:'Не вдалося надіслати запит.'},
 id:{open:'Dapatkan bantuan pengaturan',phone:'Nomor telepon untuk dihubungi',consent:'Saya setuju dihubungi tim Ticarti untuk bantuan pengaturan.',submit:'Hubungi saya',sending:'Mengirim…',success:'Permintaan diterima. Tim kami akan menghubungi Anda.',error:'Permintaan gagal dikirim. Periksa nomor telepon.'},
 vi:{open:'Nhận hỗ trợ thiết lập',phone:'Số điện thoại để liên hệ',consent:'Tôi đồng ý để đội ngũ Ticarti gọi hỗ trợ thiết lập.',submit:'Gọi cho tôi',sending:'Đang gửi…',success:'Đã nhận yêu cầu. Chúng tôi sẽ liên hệ với bạn.',error:'Không thể gửi yêu cầu. Vui lòng kiểm tra số điện thoại.'}
};
export default function TicAiSupport(){
 const {locale}=useAuthLocale();
 const copy=CONTENT[locale]||CONTENT.tr;
 const[expanded,setExpanded]=useState(false),[phone,setPhone]=useState(''),[dial,setDial]=useState('+90'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!consent)return;
  setBusy(true);setError('');
  try{
   const raw=phone.trim().replace(/[\s()-]/g,'');
   const full=raw.startsWith('+')?raw:dial+raw.replace(/^0+/,'');
   if(!/^\+[1-9]\d{7,14}$/.test(full))throw Error(copy.error);
   const response=await fetch(API+'/public/contact/callback',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
     source:'HOME',dial,phone:full,locale,consent:true,page:'/register',website:''
    })
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result?.ok!==true)throw Error(typeof result?.message==='string'?result.message:copy.error);
   setSuccess(true);setPhone('');setConsent(false);
  }catch(err){setError(err instanceof Error?err.message:copy.error)}finally{setBusy(false)}
 }
 return <div id="tc-support" className="tc-ai-support">
  <button type="button" id="tc-support-toggle" aria-expanded={expanded} aria-controls="tc-support-form" onClick={()=>setExpanded(v=>!v)}>
   <span className="tc-support-link">{copy.open}</span><span className="tc-support-arrow" aria-hidden="true">↗</span>
  </button>
  {expanded?<form id="tc-support-form" onSubmit={submit}>
   <label className="tc-support-label" htmlFor="tc-support-phone">{copy.phone}</label>
   <div className="tc-support-phone-row">
    <select aria-label="Country calling code" value={dial} onChange={e=>setDial(e.target.value)}>
     <option value="+90">+90</option><option value="+1">+1</option><option value="+44">+44</option>
     <option value="+49">+49</option><option value="+7">+7</option><option value="+359">+359</option>
     <option value="+380">+380</option><option value="+62">+62</option><option value="+84">+84</option>
     <option value="+966">+966</option><option value="+971">+971</option>
    </select>
    <input id="tc-support-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="5xx xxx xx xx" minLength={7} maxLength={22} required value={phone} onChange={e=>{setPhone(e.target.value);setSuccess(false)}}/>
   </div>
   <label className="tc-support-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{copy.consent}</span></label>
   <button type="submit" id="tc-support-submit" disabled={busy||!consent}>{busy?copy.sending:copy.submit}</button>
   {success?<p id="tc-support-result" role="status">{copy.success}</p>:null}
   {error?<p className="tc-support-error" role="alert">{error}</p>:null}
  </form>:null}
 </div>
}
