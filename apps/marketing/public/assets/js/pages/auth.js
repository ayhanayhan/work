
(()=>{'use strict';
const $=id=>document.getElementById(id), views=['welcome','email','register'];let mode='login',step=0,lang='tr',unpaidPreview=false;const state={};
// Paket fiyatları sitedeki Paketler sayfasının mevcut gösterim değerleridir (örnek tutarlar).
const plans=[
 {id:'start',name:'Start',desc:'Yeni başlayan işletmeler için',price:'4.660',oldPrice:'5.490',features:['Online mağaza ve ürün yönetimi','Sipariş, müşteri ve stok takibi']},
 {id:'grow',name:'Grow',desc:'Büyüyen mağazalar için',price:'6.998',oldPrice:'8.230',features:['Start kapsamındaki özellikler','Çoklu depo ve gelişmiş pazarlama'],popular:true},
 {id:'scale',name:'Scale',desc:'Yüksek satış hacimleri için',price:'11.618',oldPrice:'13.670',features:['Grow kapsamındaki özellikler','Depolar arası transfer ve gelişmiş raporlama']}
];
const requestedPlan=new URLSearchParams(location.search).get('plan');
if(plans.some(p=>p.id===requestedPlan))state.plan=requestedPlan;
const titles=[['Önce hesabını','oluşturalım.'],['Sana uygun','paketi seç.'],['Mağazanı','tanıyalım.'],['Şimdi mağazana','isim verelim.'],['Mağaza adresini','seçelim.'],['Son kontroller,','hepsi bu.'],['Son adım:','ödeme.']];
const steps=[
 {key:'account',desc:'Ad, e-posta ve şifre bilgilerini tamamla.',fields:'<label>Ad ve soyad<input name="name" autocomplete="name" required placeholder="Ad Soyad"></label><label>E-posta adresi<input name="email" type="email" autocomplete="email" required placeholder="ornek@eposta.com"></label><label>Şifre<div class="tc-password-wrap"><input name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="En az 8 karakter"><button type="button" class="tc-password-toggle" aria-label="Şifreyi göster" aria-pressed="false">Göster</button></div></label>'},
 {key:'plan',desc:'14 gün ücretsiz denemek istediğin paketi seç.',planChoice:true},
 {key:'category',desc:'İşini en iyi anlatan seçeneği işaretle.',choice:['Giyim ve moda','Kozmetik ve kişisel bakım','Elektronik','Ev ve yaşam','Gıda','Diğer / Henüz karar vermedim']},
 {key:'store',desc:'Mağazanın adını dilediğin zaman değiştirebilirsin.',fields:'<label>Mağaza adı<input name="store" required minlength="2" maxlength="60" placeholder="Örn. Nova Store"></label>'},
 {key:'slug',desc:'Müşterilerin seni bu adreste bulacak.',fields:'<label>Mağaza adresi<div class="tc-domain-input"><input name="slug" required pattern="[a-z0-9-]{3,40}" placeholder="magaza-adi" autocapitalize="off" autocomplete="off" spellcheck="false"><span>.ticarti.com</span></div></label>'},
 {key:'review',desc:'Ödemeye geçmeden önce seçimini gözden geçir.',finished:true},
 {key:'payment',desc:'Seçtiğin paket ve deneme dönemin aşağıda.',payment:true}
];
const aiDescriptions={
 login:{tr:'Tekrar hoş geldin! Mağazana giriş yaparak ürünlerini, siparişlerini ve tüm operasyonunu kaldığın yerden yönetebilirsin.',en:'Welcome back! Sign in to manage your products, orders and store operations.'},
 loginEmail:{tr:'E-posta adresin ve şifrenle güvenle devam et. Hesap açman gerekiyorsa kayıt ekranına dönebilirsin.',en:'Sign in securely with your email and password, or return to create an account.'},
 registerHome:{tr:'Ticarti’ye hoş geldin! Hesabını oluşturduktan sonra mağazanı birkaç basit adımda birlikte hazırlayacağız.',en:'Welcome to Ticarti! Create your account and set up your store in a few simple steps.'},
 steps:[
 {tr:'Önce seni tanıyalım. Adın, e-posta adresin ve şifren Ticarti hesabının temelini oluşturacak.',en:'First, let’s get to know you.'},
 {tr:'Başlangıç için sana uygun paketi seç. Sonraki adımlarda mağazanı hazırlayacağız.',en:'Choose a plan to start with.'},
 {tr:'Ne satacağını seç. Bu bilgi başlangıçta sana daha uygun mağaza önerileri sunmamıza yardımcı olacak.',en:'Choose what you plan to sell.'},
 {tr:'Şimdi markana bir isim verelim. Mağaza adını daha sonra yönetim panelinden değiştirebilirsin.',en:'Give your store a name.'},
 {tr:'Mağazan için kısa ve akılda kalıcı bir internet adresi seç. Kendi alan adını sonradan bağlayabileceksin.',en:'Pick a short, memorable store address.'},
 {tr:'Mağaza bilgilerini tamamladın. Son adım olan ödeme özetine geçmeden önce seçimlerini kontrol edebilirsin.',en:'Review your selections before payment.'},
 {tr:'Son adımda paket özetini görüyorsun. Gerçek ödeme, güvenli ödeme sağlayıcısı bağlandıktan sonra etkinleştirilecek.',en:'Review your plan. Checkout will become available when connected.'}
 ]};
const aiColumn=document.querySelector('.tc-auth-shell-shell-alma-col');
const aiTextElements=aiColumn?[...aiColumn.querySelectorAll('span')].filter(el=>el.textContent&&el.textContent.includes('Merhaba, ben TicAi.')&&el.children.length===0):[];
function updateAi(context){let msg=context==='login'?'login':context==='email'?'loginEmail':context==='registerWelcome'?'registerHome':'steps';let data=msg==='steps'?aiDescriptions.steps[step]:aiDescriptions[msg];const val=data[lang]||data.tr;aiTextElements.forEach(el=>el.textContent=val);const mobile=$('tc-mobile-ai-message');if(mobile)mobile.textContent=val;}

// Optional callback form inside the existing TicAi column (no external backend in this demo).
if(aiColumn){
 const support=document.createElement('div');support.id='tc-support';support.innerHTML=`<button type="button" id="tc-support-toggle" aria-expanded="false"><span class="tc-support-link">Kurulum desteği al</span><span class="tc-support-arrow" aria-hidden="true">↗</span></button><form id="tc-support-form" hidden><label class="tc-support-label" for="tc-support-phone">Sizi arayabileceğimiz telefon numarası</label><input id="tc-support-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+90 5xx xxx xx xx" required minlength="10"/><label class="tc-support-consent"><input id="tc-support-approval" type="checkbox" required/> Kurulum desteği için Ticarti ekibinin beni bu numaradan aramasını kabul ediyorum.</label><button type="submit" id="tc-support-submit">Beni arayın</button><p id="tc-support-result" role="status"></p></form>`;
 $('tc-mobile-ai-panel-support-slot')?.appendChild(support);
 const toggle=support.querySelector('#tc-support-toggle'),form=support.querySelector('#tc-support-form');
 toggle.onclick=()=>{form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden));};
 form.onsubmit=e=>{e.preventDefault();const phone=support.querySelector('#tc-support-phone');if(!form.reportValidity())return;support.querySelector('#tc-support-result').textContent='Numaran formda hazır. Bu önizlemede talep gönderilmiyor; canlı sürümde Ticarti destek API’sine bağlanacak.';};
}
function show(name){views.forEach(v=>$("tc-"+v).hidden=v!==name);setProgress(name);updateAi(name==='welcome'?(mode==='login'?'login':'registerWelcome'):name);}
function setProgress(name){const track=document.querySelector('.tc-auth-shell-progress-track');if(track)track.hidden=(mode!=='register');const val=name==='register'?Math.round(((step+1)/steps.length)*100):0;const bar=document.querySelector('.tc-auth-shell-progress-fill');if(bar)bar.style.width=val+'%';}
function headline(a,b){return a+' '+b;}
function start(which){unpaidPreview=false;mode=which;$('tc-welcome-icon').textContent=which==='login'?'⇥':'▣';$('tc-welcome-title').innerHTML=which==='login'?headline('Ticarti’ye tekrar','hoş geldin.'):headline('Mağazanı birlikte','kuralım.');$('tc-welcome-sub').textContent=which==='login'?'Mağazanı yönetmek için hesabına giriş yap.':'Ücretsiz hesabını oluştur, mağazanı birkaç adımda hazırla.';$('tc-linkedin-text').textContent=which==='login'?'ile giriş yap':'ile kaydol';$('tc-google-text').textContent=which==='login'?'ile giriş yap':'ile kaydol';$('tc-linkedin').setAttribute('aria-label',which==='login'?'LinkedIn ile giriş yap':'LinkedIn ile kaydol');$('tc-google').setAttribute('aria-label',which==='login'?'Google ile giriş yap':'Google ile kaydol');$('tc-email-text').textContent=which==='login'?'E-posta ile giriş yap':'E-posta ile devam et';$('tc-switch-p').firstChild.textContent=which==='login'?'Hesabın yok mu? ':'Zaten hesabın var mı? ';$('tc-switch').textContent=which==='login'?'Kayıt ol':'Giriş yap';show('welcome');}
function save(){document.querySelectorAll('#tc-fields [name]').forEach(el=>{if(el.type!=='checkbox'&&el.value)state[el.name]=el.value});}
const tcIcons=[`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h18v13H3zM8 7V5a4 4 0 0 1 8 0v2M3 12h18"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10 12 3l9 7v11H3zM9 21v-7h6v7"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,`<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`];
const categorySymbols={
 'Giyim ve moda':'<path d="M7 3 4 6 2 12l4 2 2-4v11h8V10l2 4 4-2-2-6-3-3-4 3h-2z"/>',
 'Kozmetik ve kişisel bakım':'<rect x="7" y="8" width="10" height="13" rx="2"/><path d="M10 8V3h4v5M7 13h10"/>',
 'Elektronik':'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>',
 'Ev ve yaşam':'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
 'Gıda':'<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M16 21V3c4 2 5 6 5 10h-5"/>',
 'Diğer / Henüz karar vermedim':'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>'
};
function iconForCategory(v){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(categorySymbols[v]||categorySymbols['Diğer / Henüz karar vermedim'])+'</svg>'}
function sanitizeSlug(value){return value.toLowerCase().replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-+/,'').slice(0,40)}
function markFieldError(inp,message){
 document.querySelectorAll('.tc-field-validation,.tc-inline-hint.is-error').forEach(el=>el.remove());
 document.querySelectorAll('#tc-fields input[aria-invalid="true"],#tc-email-form input[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
 inp.setAttribute('aria-invalid','true');
 const msg=document.createElement('small');msg.className='tc-field-validation';msg.setAttribute('role','alert');msg.textContent=message;
 const target=inp.type==='checkbox'?(inp.closest('.tc-agreement')||inp):(inp.closest('.tc-domain-input,.tc-password-wrap')||inp);
 target.insertAdjacentElement('afterend',msg);inp.focus();
}

// Paketler sayfasındaki /ay gösterim değerleri yıllık peşin tutarın aylık karşılığıdır.
// Bu demo yıllık tek ödemeyi gösterir; ödeme altyapısı henüz bağlı değildir.
const annualPrice=monthly=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0}).format(Number(String(monthly).replace(/\./g,''))*12);
function planMarkup(){
 return '<div class="tc-plan-choices" role="radiogroup" aria-label="Paket seçimi">'+plans.map(p=>{
  const checked=state.plan===p.id;
  return `<button type="button" class="tc-plan-choice${checked?' is-selected':''}${p.popular?' is-popular':''}" data-plan="${p.id}" role="radio" aria-checked="${checked}" tabindex="${checked||(!state.plan&&p.id==='start')?'0':'-1'}">
   <span class="tc-plan-choice-head"><span class="tc-plan-choice-name">${p.name}</span><span class="tc-plan-choice-indicator" aria-hidden="true">${checked?'✓':''}</span></span>
   ${p.popular?'<span class="tc-plan-choice-badge">En çok tercih edilen</span>':'<span class="tc-plan-choice-badge-placeholder" aria-hidden="true"></span>'}
   <span class="tc-plan-choice-desc">${p.desc}</span>
   <span class="tc-plan-choice-price"><strong>₺${annualPrice(p.price)}</strong><small>/yıl</small></span>
   <span class="tc-plan-choice-tax"><s>₺${annualPrice(p.oldPrice)}/yıl</s><span>KDV dahil · yıllık ödeme</span></span>
   <span class="tc-plan-choice-divider" aria-hidden="true"></span>
   <span class="tc-plan-choice-features">${p.features.map(feature=>`<span class="tc-plan-choice-feature"><span class="tc-plan-choice-check" aria-hidden="true">✓</span>${feature}</span>`).join('')}</span>
   <span class="tc-plan-choice-select-label" aria-hidden="true">${checked?'Seçildi':'Paketi seç'} <span>${checked?'✓':'→'}</span></span>
  </button>`;
 }).join('')+'</div><p class="tc-plan-note">14 gün ücretsiz dene. Yıllık tutar tek seferde tahsil edilir; fiyatlar örnektir.</p>';
}
function planSummary(finalPayment){
 const plan=plans.find(p=>p.id===state.plan);
 if(!plan)return '<p class="tc-plan-note">Paket seçimi bulunamadı. Geri dönüp paket seç.</p>';
 const store=state.store||'—';const url=state.slug?state.slug+'.ticarti.com':'—';
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="tc-payment-summary">
 <div class="tc-payment-summary-heading"><strong>${finalPayment?'Ödeme özeti':'Kurulum özeti'}</strong><span class="tc-payment-trial">14 gün ücretsiz deneme</span></div>
 <div class="tc-payment-summary-row"><span>Seçilen paket</span><strong>${plan.name}</strong></div>
 <div class="tc-payment-summary-row"><span>Mağaza adı</span><strong>${esc(store)}</strong></div>
 <div class="tc-payment-summary-row"><span>Mağaza adresi</span><strong>${esc(url)}</strong></div>
 <div class="tc-payment-summary-total"><span>Deneme sonrası yıllık abonelik<small>Yıllık tek ödeme · KDV dahil · örnek fiyat</small></span><strong>₺${annualPrice(plan.price)}<small> / yıl</small></strong></div>
 </div>${finalPayment?'<div class="tc-payment-provider"><strong>Güvenli ödeme</strong><p>14 günlük deneme sonrasında yıllık abonelik bedeli tek seferde tahsil edilir. Bu önizleme ödeme veya kart bilgisi toplamaz.</p></div>':'<p class="tc-plan-note">Bilgilerin doğruysa ödeme adımına geçebilirsin.</p>'}`;
}
function render(){
 const x=steps[step],t=titles[step];
 document.body.classList.toggle('tc-auth-long-step',Boolean(x.planChoice||x.payment));
 document.body.classList.toggle('tc-auth-plan-step',Boolean(x.planChoice));
 document.body.classList.toggle('tc-auth-review-step',Boolean(x.finished));
 $('tc-step-icon').innerHTML=tcIcons[step];$('tc-step-title').innerHTML=headline(t[0],t[1]);$('tc-step-desc').textContent=x.desc;
 $('tc-error').textContent='';$('tc-next').hidden=false;$('tc-next').textContent=x.payment?'Ödemeye geç →':x.finished?'Ödeme adımına geç':'Devam';$('tc-skip-payment').hidden=!x.finished;
 let html=x.fields||'';
 if(x.choice){html='<div class="tc-choices" role="radiogroup" aria-label="Satış kategorisi">'+x.choice.map((v,i)=>'<button type="button" class="tc-choice'+(state.category===v?' selected':'')+'" data-val="'+v+'" role="radio" tabindex="'+(state.category===v||(!state.category&&i===0)?'0':'-1')+'" aria-checked="'+(state.category===v?'true':'false')+'"><span class="tc-choice-icon">'+iconForCategory(v)+'</span><span class="tc-choice-label">'+v+'</span><span class="tc-choice-check" aria-hidden="true">'+(state.category===v?'✓':'')+'</span></button>').join('')+'</div>'}
 if(x.planChoice)html=planMarkup();
 if(x.finished)html=planSummary(false);
 if(x.payment)html=planSummary(true);
 if(x.key==='account'){html += `<div class="tc-agreements">
   <label class="tc-agreement"><input type="checkbox" name="termsAccepted" id="tc-terms" ${state.termsAccepted?'checked':''} required><span><a href="uyelik-sozlesmesi.html" target="_blank" rel="noopener">Üyelik Sözleşmesi</a>'ni kabul ediyorum ve <a href="gizlilik-politikasi.html" target="_blank" rel="noopener">Gizlilik Politikası</a> hakkında bilgilendirildim. <span class="tc-required-mark">*</span></span></label>
   <label class="tc-agreement"><input type="checkbox" name="marketingConsent" id="tc-marketing" ${state.marketingConsent?'checked':''}><span>Ticarti'den yenilikler ve duyurular almak istiyorum.</span></label>
 </div>`;}
 if(unpaidPreview){
   document.body.classList.remove('tc-auth-plan-step','tc-auth-long-step');
   document.body.classList.add('tc-auth-unpaid-step');
   $('tc-step-title').textContent='Mağazanı açmaya hazırsın.';
   $('tc-step-desc').textContent='Ödemesiz devam etme seçeneğini belirledin.';
   const selected=plans.find(p=>p.id===state.plan);
   const escapeText=x=>String(x).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
   html=`<div class="tc-unpaid-summary"><strong>Ödemesiz kurulum</strong><p>${escapeText(state.store||'Mağazan')} için ${escapeText(selected?.name||'seçilen')} paketiyle devam etmeyi seçtin. 14 günlük deneme süresince ödeme bilgisi girmene gerek yok.</p><p class="tc-unpaid-notice">Bu sürüm yalnızca arayüz önizlemesidir. Gerçek mağaza oluşturulmadı; bu işlemin tamamlanması için Ticarti kayıt API’si bağlanmalıdır.</p></div>`;
   $('tc-next').hidden=true;
   $('tc-skip-payment').hidden=true;
   $('tc-prev').textContent='← Kurulum özetine dön';
   $('tc-fields').innerHTML=html;
   const fill=document.querySelector('.tc-auth-shell-progress-fill');if(fill)fill.style.width='100%';
   return;
 }
 document.body.classList.remove('tc-auth-unpaid-step');
 $('tc-fields').innerHTML=html;
 const tcTerms=$('tc-terms'), tcMarketing=$('tc-marketing');
 if(tcTerms)tcTerms.addEventListener('change',()=>{state.termsAccepted=tcTerms.checked;tcTerms.closest('.tc-agreement')?.querySelector('.tc-field-validation')?.remove();});
 if(tcMarketing)tcMarketing.addEventListener('change',()=>{state.marketingConsent=tcMarketing.checked;});
 for(const inp of document.querySelectorAll('#tc-fields [name]'))if(state[inp.name])inp.value=state[inp.name];
 const slugInput=document.querySelector('#tc-fields input[name="slug"]');
 if(slugInput){if(!state.slug&&state.store)slugInput.value=sanitizeSlug(state.store);slugInput.addEventListener('input',()=>{slugInput.value=sanitizeSlug(slugInput.value);slugInput.removeAttribute('aria-invalid');document.querySelectorAll('.tc-inline-hint.is-error').forEach(el=>el.remove())});}
 const password=document.querySelector('#tc-fields input[name="password"]');
 if(password){const toggle=document.querySelector('.tc-password-toggle');toggle.onclick=()=>{const visible=password.type==='password';password.type=visible?'text':'password';toggle.textContent=visible?'Gizle':'Göster';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',visible?'Şifreyi gizle':'Şifreyi göster')};}
 const planOptions=[...document.querySelectorAll('.tc-plan-choice')];
 planOptions.forEach((b,i)=>{
   b.addEventListener('click',()=>{state.plan=b.dataset.plan;render();document.querySelector('.tc-plan-choice.is-selected')?.focus()});
   b.addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){
      e.preventDefault();const idx=e.key==='Home'?0:e.key==='End'?planOptions.length-1:(i+(e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1)+planOptions.length)%planOptions.length;
      state.plan=planOptions[idx].dataset.plan;render();document.querySelectorAll('.tc-plan-choice')[idx]?.focus();
   }});
 });
 const options=[...document.querySelectorAll('.tc-choice')];
 options.forEach((b,i)=>{b.addEventListener('click',()=>{state.category=b.dataset.val;render();const selected=document.querySelector('.tc-choice.selected');selected?.focus()});b.addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1)+options.length)%options.length;state.category=options[next].dataset.val;render();document.querySelectorAll('.tc-choice')[next]?.focus()}})});
 $('tc-prev').textContent='← Geri';setProgress('register');updateAi('register');
}
$('tc-switch').onclick=()=>start(mode==='login'?'register':'login');$('tc-go-login').onclick=()=>start('login');$('tc-email-btn').onclick=()=>{if(mode==='login')show('email');else{step=0;render();show('register')}};$('tc-linkedin').onclick=$('tc-google').onclick=()=>{alert('Sosyal giriş için Ticarti API bağlantısı gerekiyor. Bu dosya bir frontend önizlemesidir.')};$('tc-email-form').onsubmit=e=>{e.preventDefault();for(const inp of $('tc-email-form').querySelectorAll('input')){if(!inp.checkValidity()){markFieldError(inp,inp.validity.valueMissing?'Bu alanı doldur.':inp.type==='email'?'Geçerli bir e-posta adresi yaz.':'Şifre en az 8 karakter olmalı.');return;}}$('tc-login-error').textContent='Gerçek oturum açma işlemi için Ticarti API bağlantısı gerekiyor.'};$('tc-forgot').onclick=()=>$('tc-login-error').textContent='Şifre sıfırlama servisi henüz bağlanmadı.';document.querySelectorAll('[data-back="welcome"]').forEach(b=>b.onclick=()=>show('welcome'));
$('tc-register-form').onsubmit=e=>{
 e.preventDefault();const current=steps[step];
 if(current.payment){
  $('tc-error').textContent='Bu önizlemede ödeme alınmıyor. Canlı ödeme sayfası için Ticarti ödeme API’si bağlanmalı.';
  return;
 }
 if(current.planChoice&&!state.plan){$('tc-error').textContent='Devam etmek için bir paket seçmelisin.';return;}
 if(current.choice&&!state.category){$('tc-error').textContent='Lütfen bir kategori seç.';return;}
 if(current.key==='account'&&!state.termsAccepted){const box=$('tc-terms');if(box)markFieldError(box,'Devam etmek için üyelik onayını vermelisin.');return;}
 const inputs=[...document.querySelectorAll('#tc-fields input')].filter(i=>i.type!=='checkbox');
 for(const i of inputs){if(!i.checkValidity()){markFieldError(i,i.name==='slug'?'Adres 3–40 karakter olmalı; yalnızca harf, rakam veya tire kullan.':i.name==='password'?'Şifre en az 8 karakter olmalı.':'Lütfen bu alanı geçerli şekilde doldur.');return;}}
 save();
 if(current.key==='slug'&&!/^[a-z0-9-]{3,40}$/.test(state.slug||'')){markFieldError(inputs[0],'Geçerli mağaza adresi gir.');return;}
 if(step<steps.length-1){step++;render();}
};
$('tc-skip-payment').onclick=()=>{
 if(steps[step]?.key!=='review')return;
 save();unpaidPreview=true;render();
};
$('tc-prev').onclick=()=>{
 if(unpaidPreview){unpaidPreview=false;render();return;}
 if(step===0){start('register');return;}
 save();step--;render();
};
// Keep the original language button in its original position, enable a usable dropdown.
const langBtn=document.querySelector('.tc-auth-shell-progress-header button[aria-label="Change language"]');
if(langBtn){
 langBtn.setAttribute('aria-haspopup','listbox');langBtn.setAttribute('aria-expanded','false');
 langBtn.addEventListener('click',e=>{
  e.stopPropagation();const existing=$('tc-language-picker');if(existing){existing.remove();langBtn.setAttribute('aria-expanded','false');return;}
  const picker=document.createElement('div');picker.id='tc-language-picker';picker.setAttribute('role','listbox');picker.setAttribute('aria-label','Dil seçimi');
  [['TR','Türkçe'],['EN','English']].forEach(([code,label])=>{
   const b=document.createElement('button');b.type='button';b.className='tc-language-option';b.setAttribute('role','option');b.setAttribute('aria-selected',String(lang===code.toLowerCase()));
   b.innerHTML='<span>'+label+'</span><span class="tc-language-code">'+code+(lang===code.toLowerCase()?' ✓':'')+'</span>';
   b.onclick=()=>{lang=code.toLowerCase();const v=langBtn.querySelector('[data-slot="select-value"]');if(v)v.textContent=code;picker.remove();langBtn.setAttribute('aria-expanded','false');updateAi(document.getElementById('tc-register').hidden?(mode==='login'?'login':'registerWelcome'):'register');};picker.append(b);
  });
  langBtn.parentElement.append(picker);langBtn.setAttribute('aria-expanded','true');
 });
 document.addEventListener('click',e=>{const picker=$('tc-language-picker');if(picker&&!picker.contains(e.target)&&!langBtn.contains(e.target)){picker.remove();langBtn.setAttribute('aria-expanded','false');}});
}
start(new URLSearchParams(window.location.search).get('mode') === 'register' || /\/register\.html$/i.test(window.location.pathname) ? 'register' : 'login');
})();
