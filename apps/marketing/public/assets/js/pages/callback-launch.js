/* Ticarti / Contact request (demonstration; backend not connected). */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-tc-callback]').forEach(form => {
    const input=form.querySelector('input[type="tel"]');
    const country=form.querySelector('select.tc-country-code');
    const visible=form.querySelector('.tc-dial-visible');
    const status=form.querySelector('.tc-callback-status');
    const kvkk=form.querySelector('input[name="kvkk_read"]');
    const kvkkError=form.querySelector('.tc-kvkk-error');
    const clearKvkk=()=>{
      if(kvkk) kvkk.removeAttribute('aria-invalid');
      if(kvkkError) kvkkError.textContent='';
    };
    function validateKvkk(){
      const ok=!kvkk || kvkk.checked;
      if(kvkk) kvkk.setAttribute('aria-invalid',String(!ok));
      if(kvkkError) kvkkError.textContent=ok?'':'Devam etmek için KVKK aydınlatmasını okuyup kutuyu işaretleyin.';
      return ok;
    }
    if (!input || !status) return;
    const clear=()=>{status.textContent='';input.removeAttribute('aria-invalid');};
    function selected(){return country?.selectedOptions?.[0]}
    function updateCountry(){
      const option=selected();if (!option)return;
      if (visible) visible.textContent=`${option.dataset.flag||''} ${country.value}`.trim();
      input.placeholder=option.dataset.country==='TR'?'5xx xxx xx xx':'Telefon numarası';
      clear();
    }
    function validate(){
      const iso=selected()?.dataset.country || 'TR';
      const dial=country?.value || '+90';
      const fn=window.TicartiValidators?.validatePhone;
      const result=fn?fn(input.value,iso,dial):{valid:false,error:'Telefon doğrulaması yüklenemedi.'};
      input.setAttribute('aria-invalid',String(!result.valid));
      status.textContent=result.valid?'':result.error;
      return result;
    }
    country?.addEventListener('change',updateCountry);
    kvkk?.addEventListener('change',clearKvkk);
    input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')validate();else clear()});
    input.addEventListener('blur',()=>{if(input.value.trim())validate()});
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const result=validate();
      const kvkkValid=validateKvkk();
      if(!result.valid){input.focus();return;}
      if(!kvkkValid){kvkk.focus();return;}
      input.removeAttribute('aria-invalid');
      status.textContent='Bu form henüz sunucuya bağlı değil; numaranız gönderilmedi.';
    });
    updateCountry();
  });
});
