/* Ticarti / Phone validation: country-specific rules, no global generic regex. */
(() => {
  'use strict';
  const rules = {
    TR: [/^5\d{9}$/,'5 ile başlayan 10 haneli cep telefonu girin.'],
    US: [/^[2-9]\d{2}[2-9]\d{6}$/,'10 haneli geçerli bir telefon numarası girin.'],
    CA: [/^[2-9]\d{2}[2-9]\d{6}$/,'10 haneli geçerli bir telefon numarası girin.'],
    GB: [/^[1-9]\d{9}$/,'10 haneli İngiltere numarası girin.'],
    DE: [/^[1-9]\d{5,12}$/,'6–13 haneli Almanya numarası girin.'],
    FR: [/^[1-9]\d{8}$/,'9 haneli Fransa numarası girin.'],
    NL: [/^[1-9]\d{8}$/,'9 haneli Hollanda numarası girin.'],
    BE: [/^[1-9]\d{7,8}$/,'8–9 haneli Belçika numarası girin.'],
    AT: [/^[1-9]\d{3,12}$/,'4–13 haneli Avusturya numarası girin.'],
    CH: [/^[1-9]\d{8}$/,'9 haneli İsviçre numarası girin.'],
    IT: [/^\d{6,11}$/,'6–11 haneli İtalya numarası girin.'],
    ES: [/^[6-9]\d{8}$/,'9 haneli İspanya numarası girin.'],
    PT: [/^[29]\d{8}$/,'9 haneli Portekiz numarası girin.'],
    BG: [/^[1-9]\d{7,8}$/,'8–9 haneli Bulgaristan numarası girin.'],
    RO: [/^[1-9]\d{8}$/,'9 haneli Romanya numarası girin.'],
    GR: [/^[1269]\d{9}$/,'10 haneli Yunanistan numarası girin.'],
    CY: [/^[2-9]\d{7}$/,'8 haneli Kıbrıs numarası girin.'],
    AZ: [/^[1-9]\d{8}$/,'9 haneli Azerbaycan numarası girin.'],
    GE: [/^[1-9]\d{8}$/,'9 haneli Gürcistan numarası girin.'],
    UA: [/^[1-9]\d{8}$/,'9 haneli Ukrayna numarası girin.'],
    RU: [/^[3489]\d{9}$/,'10 haneli Rusya numarası girin.'],
    AE: [/^[1-9]\d{7,8}$/,'8–9 haneli BAE numarası girin.'],
    SA: [/^[1-9]\d{8}$/,'9 haneli Suudi Arabistan numarası girin.'],
    QA: [/^[3-7]\d{7}$/,'8 haneli Katar numarası girin.'],
    KW: [/^[1-9]\d{7}$/,'8 haneli Kuveyt numarası girin.'],
    IQ: [/^[1-9]\d{7,9}$/,'8–10 haneli Irak numarası girin.'],
    IR: [/^[1-9]\d{9}$/,'10 haneli İran numarası girin.'],
    EG: [/^[1-9]\d{8,9}$/,'9–10 haneli Mısır numarası girin.'],
    MA: [/^[1-9]\d{8}$/,'9 haneli Fas numarası girin.'],
    IN: [/^[6-9]\d{9}$/,'6–9 ile başlayan 10 haneli Hindistan numarası girin.'],
    PK: [/^3\d{9}$/,'3 ile başlayan 10 haneli Pakistan cep telefonu girin.'],
    AU: [/^[1-9]\d{8}$/,'9 haneli Avustralya numarası girin.']
  };
  // Spaces, dashes, and parentheses are permitted for readable formatting;
  // letters and other symbols are not. Dialing code is selected separately.
  const permitted = /^[0-9 ()\-]+$/;
  function validatePhone(raw, iso, dial) {
    let value = String(raw || '').trim();
    if (!value) return {valid:false, error:'Telefon numaranızı girin.'};
    if (value.startsWith('+')) {
      const countryPrefix=String(dial||'');
      if (!value.startsWith(countryPrefix)) return {valid:false,error:'Ülke kodunu soldaki listeden seçin.'};
      value=value.slice(countryPrefix.length).trim();
    }
    if (!value || !permitted.test(value) || (value.match(/\(/g)||[]).length !== (value.match(/\)/g)||[]).length) {
      return {valid:false,error:'Yalnızca rakam, boşluk, kısa çizgi ve parantez kullanın.'};
    }
    let digits=value.replace(/\D/g,'');
    if (iso !== 'IT' && digits.startsWith('0')) digits=digits.slice(1); // local trunk prefix
    if (!digits || digits.length < 4 || digits.length > 14) return {valid:false,error:'Telefon numarası seçilen ülkeye uygun uzunlukta değil.'};
    const rule=rules[iso];
    if (!rule) return {valid:false,error:'Seçilen ülke için doğrulama kuralı bulunamadı.'};
    if (!rule[0].test(digits)) return {valid:false,error:rule[1]};
    const e164=String(dial||'')+digits;
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) return {valid:false,error:'Telefon numarasını kontrol edin.'};
    return {valid:true,e164,local:digits};
  }
  window.TicartiValidators=window.TicartiValidators||{};
  window.TicartiValidators.validatePhone=validatePhone;
})();
