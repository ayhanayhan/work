/* Local third-party assets shipped with Ticarti. Relative to this page script so nested pages work. */
function __ticartiVendorUrl(file) {
  var current = document.querySelector('script[src*="assets/js/pages/stories.js"]');
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
(function() {
    function loadScript(src, onload) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = onload;
      document.body.appendChild(s);
    }

    function initSlider() {
      var $ = jQuery;
      var $slider = $('.widget_1773840240399.logo-section .logo-list');
      if ($slider.hasClass('slick-initialized')) return;

      $slider.slick({
        autoplay: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        infinite: true,
        swipe: false,
        
        cssEase: 'linear',
        speed: 3000,
        autoplaySpeed: 0,
        
        variableWidth: true,
        responsive: [
          {
            breakpoint: 767,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
              variableWidth: true,
            }
          }
        ]
      });
    }

    function waitForJQuery(cb) {
      if (typeof jQuery !== 'undefined') {
        cb();
      } else {
        setTimeout(function(){ waitForJQuery(cb); }, 50);
      }
    }

    function run() {
      waitForJQuery(function() {
        if (typeof jQuery.fn.slick !== 'undefined') {
          initSlider();
        } else {
          loadScript(__ticartiVendorUrl('slick.min.js'), function() {
            initSlider();
          });
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  })();

;
$('document').ready(function(){
    $('#demo').jplist({
      itemsBox: '.list',
      itemPath: '.list-item',
      panelPath: '.jplist-panel'
    });
    $(document).on('click', '.jplist-pagingprev button, .jplist-pagesbox button, .jplist-pagingnext button', function(e){
      e.preventDefault();
      $([document.documentElement, document.body]).animate({
        scrollTop: $("#demo").offset().top - 100
      }, 500);
    });

    // Animación scroll cards
    const cards = document.querySelectorAll('.card-items');
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function() {
            entry.target.classList.add('card-visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cards.forEach(function(card) {
      observer.observe(card);
    });
  });

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
