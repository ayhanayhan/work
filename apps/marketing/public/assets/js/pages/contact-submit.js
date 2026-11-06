/* Ticarti marketing site contact form; separate external JS; no inline script. */
(function () {
  'use strict';
  var endpoint = '/api/v1/public/contact';
  function boot() {
    document.querySelectorAll('form[data-ticarti-contact]').forEach(function (form) {
      if (form.dataset.tcContactReady === '1') return;
      form.dataset.tcContactReady = '1';
      var submit = form.querySelector('button[type="submit"]');
      var status = form.querySelector('[data-ticarti-contact-status]');
      function setMessage(text, ok) {
        if (!status) return;
        status.textContent = text;
        status.setAttribute('role', ok ? 'status' : 'alert');
        status.classList.toggle('is-error', !ok && !!text);
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var data = new FormData(form);
        var payload = {
          fullName: String(data.get('fullName') || '').trim(),
          email: String(data.get('email') || '').trim(),
          phone: String(data.get('phone') || '').trim(),
          subject: String(data.get('subject') || '').trim(),
          message: String(data.get('message') || '').trim(),
          website: String(data.get('website') || ''),
          consent: data.has('consent')
        };
        if (submit) submit.disabled = true;
        setMessage('', true);
        try {
          var response = await fetch(endpoint, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          var result = await response.json().catch(function () { return {}; });
          if (!response.ok) {
            throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Mesaj gönderilemedi.');
          }
          form.reset();
          setMessage('Mesajınız alındı. En kısa sürede size dönüş yapacağız.', true);
        } catch (error) {
          setMessage(error && error.message ? error.message : 'Mesaj gönderilemedi. Lütfen tekrar deneyin.', false);
        } finally { if (submit) submit.disabled = false; }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
