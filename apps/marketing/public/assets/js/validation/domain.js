/* Ticarti / Domain vs store-subdomain validators: separate rules. */
(() => {
  'use strict';
  const hostname=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  const slug=/^(?=.{3,40}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const validateHostname=(raw)=>{
    const value=String(raw||'').trim().toLowerCase();
    // Full domains, not URLs (https://), paths, spaces, or underscores.
    if (!hostname.test(value)) return {valid:false,error:'Geçerli bir alan adı girin (ör. magazam.com).'};
    return {valid:true,value};
  };
  const validateStoreSlug=(raw)=>{
    const value=String(raw||'').trim().toLowerCase();
    if (!slug.test(value)) return {valid:false,error:'3–40 karakter kullanın: a–z, 0–9 ve kelimeler arasında kısa çizgi.'};
    return {valid:true,value};
  };
  window.TicartiValidators=window.TicartiValidators||{};
  Object.assign(window.TicartiValidators,{validateHostname,validateStoreSlug});
  function validateField(input){
    const type=input.dataset.tcValidate || (input.name === 'domain' ? 'domain' : input.name === 'subdomain' ? 'slug' : '');
    if (!type) return;
    const result=type==='domain'?validateHostname(input.value):validateStoreSlug(input.value);
    let err=input.nextElementSibling;
    if (!err || !err.classList.contains('tc-field-error')) {
      err=document.createElement('small');err.className='tc-field-error';err.setAttribute('role','alert');input.insertAdjacentElement('afterend',err);
    }
    err.textContent=result.valid?'':result.error;
    if (result.valid)input.removeAttribute('aria-invalid');else input.setAttribute('aria-invalid','true');
    return result.valid;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('input[data-tc-validate],input[name="domain"],input[name="subdomain"]').forEach(input=>{
      input.addEventListener('blur',()=>validateField(input));
      input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')validateField(input)});
      input.form?.addEventListener('submit', e=>{if(!validateField(input)){e.preventDefault();input.focus()}},true);
    });
  });
})();
