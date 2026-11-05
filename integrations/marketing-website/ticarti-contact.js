/* Ticarti marketing website contact integration.
 * Load once as an external script on the home/contact page.
 * Existing site styles/classes are left untouched.
 */
(() => {
  const endpoint = 'https://commerce-api-612520357246.europe-west1.run.app/v1/public/contact';
  const forms = document.querySelectorAll('form[data-ticarti-contact]');
  forms.forEach((form) => {
    if (form.dataset.ticartiContactBound === '1') return;
    form.dataset.ticartiContactBound = '1';
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-ticarti-contact-status]');
    const setStatus = (message, success) => {
      if (!status) return;
      status.textContent = message;
      status.setAttribute('role', success ? 'status' : 'alert');
    };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (button) button.disabled = true;
      setStatus('', true);
      const values = new FormData(form);
      const payload = {
        fullName: String(values.get('fullName') || values.get('name') || '').trim(),
        email: String(values.get('email') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        subject: String(values.get('subject') || 'Genel iletişim').trim(),
        message: String(values.get('message') || '').trim(),
        website: String(values.get('website') || ''), // hidden honeypot
        consent: values.get('consent') !== null,
      };
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Mesaj gönderilemedi.');
        setStatus('Mesajınız alındı. En kısa sürede size dönüş yapacağız.', true);
        form.reset();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Mesaj gönderilemedi. Tekrar deneyin.', false);
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
})();
