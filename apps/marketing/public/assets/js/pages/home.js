/* Local third-party assets shipped with Ticarti. Relative to this page script so nested pages work. */
function __ticartiVendorUrl(file) {
  var current = document.querySelector('script[src*="assets/js/pages/home.js"]');
  return current ? new URL('../vendor/' + file, current.src).href : '/assets/js/vendor/' + file;
}

(function () {
  'use strict';
  var bar = document.querySelector('[data-tc-ui-topbar]');
  var header = document.querySelector('.tc-site-header');
  var spacer = document.querySelector('.tc-ui-header-spacer');
  if (!bar || !header || !spacer) return;

  var editor = bar.getAttribute('data-editor') === '1';
  var key = 'tc-announcement-bar:' + (bar.getAttribute('data-key') || 'top-banner');
  var days = Math.max(0, parseFloat(bar.getAttribute('data-days')) || 0);

  function isDismissed() {
    if (editor) return false;
    try {
      if (window.sessionStorage.getItem(key) === '1') return true;
      return (parseInt(window.localStorage.getItem(key), 10) || 0) > Date.now();
    } catch (e) { return false; }
  }
  function remember() {
    if (editor) return;
    try {
      if (days > 0) { window.localStorage.setItem(key, String(Date.now() + days * 86400000)); }
      else { window.sessionStorage.setItem(key, '1'); }
    } catch (e) {}
  }

  if (isDismissed()) { bar.parentNode.removeChild(bar); return; }

  function sync() {
    var h = bar.parentNode ? bar.offsetHeight : 0;
    header.style.setProperty('--tc-ui-banner-h', h + 'px');
    spacer.style.height = header.offsetHeight + 'px';
  }
  function reset() {
    header.style.removeProperty('--tc-ui-banner-h');
    spacer.style.removeProperty('height');
  }

  sync();
  var ro = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(sync);
    ro.observe(bar);
    ro.observe(header);
  }
  window.addEventListener('resize', sync);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(sync); }

  var closeBtn = bar.querySelector('[data-tc-ui-topbar-close]');
  if (!closeBtn) return;
  closeBtn.addEventListener('click', function () {
    remember();
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      if (ro) ro.disconnect();
      window.removeEventListener('resize', sync);
      if (bar.parentNode) bar.parentNode.removeChild(bar);
      reset();
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { done(); return; }
    bar.style.height = bar.offsetHeight + 'px';
    void bar.offsetHeight;
    bar.classList.add('is-closing');
    bar.style.height = '0px';
    bar.addEventListener('transitionend', function (e) {
      if (e.target === bar && e.propertyName === 'height') done();
    });
    window.setTimeout(done, 450);
  });
})();

(function () {
  'use strict';
  function normalizeUrl(url){ if(!url) return url; return url.replace(/\/$/,'') + '/'; }
  function setActiveOption(selector){
    var options = selector.options;
    var currentUrl = normalizeUrl(selector.getAttribute('data-current-url'));
    var currentLocation = normalizeUrl(window.location.href);
    var matched = false;
    for (var i=0;i<options.length;i++){
      var optionUrl = normalizeUrl(options[i].getAttribute('data-url'));
      if (optionUrl && (optionUrl===currentUrl || optionUrl===currentLocation)){ selector.selectedIndex=i; matched=true; break; }
    }
    if(!matched){
      for(var j=0;j<options.length;j++){
        var optUrl = normalizeUrl(options[j].getAttribute('data-url'));
        if(optUrl && currentLocation.indexOf(optUrl)===0){ selector.selectedIndex=j; break; }
      }
    }
  }
  function init(){
    document.querySelectorAll('select.lang-select').forEach(setActiveOption);
    document.addEventListener('change', function(e){
      var selector = e.target.closest && e.target.closest('select.lang-select');
      if(!selector) return;
      var selectedOption = selector.options[selector.selectedIndex];
      var targetUrl = selectedOption.getAttribute('data-url');
      try { localStorage.setItem('preferredLanguage', selectedOption.value); } catch(err){}
      if (targetUrl && normalizeUrl(targetUrl)!==normalizeUrl(window.location.href)){ window.location.href = targetUrl; }
    });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();

/* Navigation is centrally handled by header-navigation.js.
   Removed the former duplicate menu/burger handlers to prevent double toggles. */

(function () {
  'use strict';
  function initHeadroom(){
    var header = document.querySelector('.tc-site-header');
    if(!header) return;
    var lastY = window.pageYOffset || 0;
    var revealAt = 80;
    var delta = 6;
    var ticking = false;
    function update(){
      var y = window.pageYOffset || 0;
      var menuOpen = header.classList.contains('is-mobile-open') || header.querySelector('.tc-menu a.is-open');
      if(y <= revealAt || menuOpen){
        header.classList.remove('is-hidden');
      } else if(y > lastY + delta){
        header.classList.add('is-hidden');
      } else if(y < lastY - delta){
        header.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if(!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', initHeadroom); } else { initHeadroom(); }
})();

;
/* block-001.js is loaded once from its page-local script. */

;
/* block-002.js is loaded once from its page-local script. */

;
/* block-003.js is loaded once from its page-local script. */

;
/* block-004.js is loaded once from its page-local script. */

;
/* block-005.js is loaded once from its page-local script. */

;
/* block-006.js is loaded once from its page-local script. */

;
/* block-007.js is loaded once from its page-local script. */

;
/* block-008.js is loaded once from its page-local script. */

;
/* block-009.js is loaded once from its page-local script. */

;
(function () {
  function init(wrap) {
    var lang = wrap.querySelector('.lang-wrap');
    var toggle = wrap.querySelector('.lang-toggle');
    if (!lang || !toggle) return;
    if (lang.getAttribute('data-lang-init') === '1') return;
    lang.setAttribute('data-lang-init', '1');
    toggle.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var open = lang.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!lang.contains(e.target)) {
        lang.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  function run() {
    var wraps = document.querySelectorAll('.tc-site-footer .footer-lang-wrap');
    for (var i = 0; i < wraps.length; i++) init(wraps[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
})();

;
window.addEventListener('DOMContentLoaded', function () {
  var headers = document.querySelectorAll('.ticarti-faq-container .faq-item h3');
  if (!headers.length) return;
  headers.forEach(function (header) {
    header.addEventListener('click', function () {
      header.parentElement.classList.toggle('active');
    });
  });
});
