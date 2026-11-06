/* Local third-party assets shipped with Ticarti. Relative to this page script so nested pages work. */
function __ticartiVendorUrl(file) {
  var current = document.querySelector('script[src*="assets/js/pages/enterprise.js"]');
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
'use strict';
var section = document.querySelector('.tc-ui-ehero');
if (!section) return;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var anim = section.getAttribute('data-anim');
if (anim === 'none' || reduce) return;
var panel = section.querySelector('.tc-ui-ehero__panel');
if (panel) {
Array.prototype.forEach.call(panel.children, function (el, i) {
el.style.setProperty('--tc-ui-i', i);
});
}
var pills = section.querySelectorAll('.tc-ui-ehero__panel-pill:not(.tc-ui-ehero__panel-pill--icon)');
Array.prototype.forEach.call(pills, function (p, i) {
p.style.setProperty('--tc-ui-p', (i * 0.16) + 's');
});
if (!('IntersectionObserver' in window)) return;
section.classList.add('is-armed');
void section.offsetHeight;
var row = section.querySelector('.tc-ui-ehero__row');
function revelar() {
section.classList.add('is-in');
if (io) io.disconnect();
clearTimeout(red);
}
var red = setTimeout(revelar, 2500);
var io = new IntersectionObserver(function (entries) {
for (var i = 0; i < entries.length; i++) {
if (entries[i].isIntersecting) { revelar(); return; }
}
}, { threshold: 0.01 });
io.observe(row);
})();

;
(function () {
var sections = document.querySelectorAll('.hcta:not([data-anim-init])');
if (!sections.length) return;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) {
sections.forEach(function (s) { s.setAttribute('data-anim-init', '1'); });
return;
}
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
entry.target.classList.add('is-visible');
io.unobserve(entry.target);
}
});
}, {
threshold: 0.25
});
sections.forEach(function (s) {
s.setAttribute('data-anim-init', '1');
s.classList.add('hcta--anim');   // oculta solo ahora, con JS confirmado
io.observe(s);
});
})();

;
(function () {
'use strict';
var section = document.querySelector('.tc-ui-emk');
if (!section) return;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var anim = section.getAttribute('data-anim');
var modo = section.getAttribute('data-reveal') || 'once';
var boxes = section.querySelectorAll('.tc-ui-emk__box');
function css(prop) { return getComputedStyle(section).getPropertyValue(prop); }
Array.prototype.forEach.call(boxes, function (box, i) {
box.style.setProperty('--tc-ui-i', i);
var hijos = box.querySelectorAll('.tc-ui-emk__row, .tc-ui-emk__tag');
Array.prototype.forEach.call(hijos, function (el, j) { el.style.setProperty('--tc-ui-j', j); });
});
function medirDeriva() {
var clip = section.querySelector('.tc-ui-emk__tags-clip');
var tira = section.querySelector('.tc-ui-emk__tags');
if (!clip || !tira) return;
var sobra = tira.scrollWidth - clip.clientWidth;
tira.style.setProperty('--tc-ui-drift', (sobra > 4 ? -sobra : 0) + 'px');
clip.classList.toggle('is-drift', sobra > 4);
}
medirDeriva();
var rt; window.addEventListener('resize', function () {
clearTimeout(rt); rt = setTimeout(medirDeriva, 200);
});
if (anim === 'none' || reduce) return;
var seg = section.querySelector('.tc-ui-emk__seg');
var thumb = seg && seg.querySelector('.tc-ui-emk__thumb');
var items = seg ? seg.querySelectorAll('.tc-ui-emk__seg-item') : [];
var segBox = seg ? seg.closest('.tc-ui-emk__box') : null;
var actual = 0, timer = null, cicloListo = false;
function colocarThumb(animado) {
if (!thumb || !items.length) return;
var el = items[actual];
if (!animado) thumb.style.transition = 'none';
thumb.style.width = el.offsetWidth + 'px';
thumb.style.height = el.offsetHeight + 'px';
thumb.style.transform = 'translate(' + el.offsetLeft + 'px, ' + el.offsetTop + 'px)';
thumb.style.opacity = '1';
if (!animado) { void thumb.offsetWidth; thumb.style.transition = ''; }
}
function activar(i, animado) {
actual = (i + items.length) % items.length;
Array.prototype.forEach.call(items, function (el, k) {
el.classList.toggle('is-on', k === actual);
});
colocarThumb(animado);
}
if (items.length) {
for (var k = 0; k < items.length; k++) if (items[k].classList.contains('is-on')) actual = k;
activar(actual, false);
window.addEventListener('resize', function () {
clearTimeout(rt); setTimeout(function () { colocarThumb(false); }, 220);
});
}
function arrancarCiclo() {
if (timer || anim !== 'loop' || !items.length || !cicloListo) return;
var ms = parseFloat(css('--tc-ui-emk-cycle')) || 2600;
timer = setInterval(function () { activar(actual + 1, true); }, ms);
}
function pararCiclo() { if (timer) { clearInterval(timer); timer = null; } }
function contar(el) {
var fin = parseInt(el.getAttribute('data-count'), 10);
if (isNaN(fin)) return;
var dur = parseFloat(css('--tc-ui-emk-count')) || 900;
var t0 = null;
el.textContent = '0';
function paso(t) {
if (t0 === null) t0 = t;
var p = Math.min(1, (t - t0) / dur);
var suave = 1 - Math.pow(1 - p, 3);
el.textContent = Math.round(fin * suave);
if (p < 1) requestAnimationFrame(paso);
else el.textContent = fin;
}
requestAnimationFrame(paso);
}
function revelarBox(box) {
if (box.classList.contains('is-in')) return;
box.classList.add('is-in');
var paso = parseFloat(css('--tc-ui-emk-in-step')) || 120;
var dly = paso * (parseFloat(box.style.getPropertyValue('--tc-ui-i')) || 0) + 500;
var num = box.querySelector('.tc-ui-emk__stat-v[data-count]');
if (num) setTimeout(function () { contar(num); }, dly);
if (box === segBox) setTimeout(function () {
cicloListo = true; colocarThumb(false); arrancarCiclo();
}, dly);
}
function ocultarBox(box) {
box.classList.remove('is-in');
var num = box.querySelector('.tc-ui-emk__stat-v[data-count]');
if (num) num.textContent = '0';
}
function revelarTodo() { Array.prototype.forEach.call(boxes, revelarBox); }
if (!('IntersectionObserver' in window)) {
cicloListo = true; arrancarCiclo(); return;
}
section.classList.add('is-armed');
void section.offsetHeight;
colocarThumb(false);
var hayObserver = false;
var red = setTimeout(function () { if (!hayObserver) revelarTodo(); }, 3000);
var ioBox = new IntersectionObserver(function (entries) {
hayObserver = true; clearTimeout(red);
for (var i = 0; i < entries.length; i++) {
var e = entries[i];
if (e.isIntersecting) {
revelarBox(e.target);
if (modo !== 'always') ioBox.unobserve(e.target);
} else if (modo === 'always') {
ocultarBox(e.target);
}
}
}, {
threshold: Math.min(1, Math.max(0, parseFloat(css('--tc-ui-emk-reveal-th')) || .15)),
rootMargin: '0px 0px ' + ((css('--tc-ui-emk-reveal-margin') || '-8%').trim()) + ' 0px'
});
Array.prototype.forEach.call(boxes, function (b) { ioBox.observe(b); });
var ioSec = new IntersectionObserver(function (entries) {
for (var i = 0; i < entries.length; i++) {
if (entries[i].isIntersecting) { section.classList.add('is-in'); arrancarCiclo(); }
else pararCiclo();
}
}, { threshold: 0.01 });
ioSec.observe(section);
})();

;
(function () {
  function initIcons(section) {
    var slots = section.querySelectorAll(".tc-ui-pc__icon");
    Array.prototype.forEach.call(slots, function (slot) {
      var img = slot.querySelector("img");
      function check() {
        var src = img ? (img.getAttribute("src") || "").trim() : "";
        slot.classList.toggle("is-empty", !src);
      }
      if (img) {
        img.addEventListener("error", function () { img.removeAttribute("src"); check(); });
      }
      check();
    });
  }

  function initReveal(section) {
    var items = Array.prototype.slice.call(section.querySelectorAll(".tc-ui-pc__reveal"));
    if (!items.length) return;

    function showAll() {
      items.forEach(function (el) { el.classList.add("is-visible"); });
    }

    if (!("IntersectionObserver" in window)) { showAll(); return; }

    section.classList.add("is-reveal-ready");

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });

    items.forEach(function (el) { observer.observe(el); });

    var pending = false;
    function catchUp() {
      pending = false;
      var limit = window.innerHeight || document.documentElement.clientHeight;
      var left = 0;
      items.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        if (el.getBoundingClientRect().top < limit * 0.9) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        } else { left++; }
      });
      if (!left) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(catchUp);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function boot() {
    var sections = document.querySelectorAll("[data-tc-ui-pc]");
    Array.prototype.forEach.call(sections, function (section) {
      if (section.dataset.skPcInit) return;
      section.dataset.skPcInit = "1";
      initIcons(section);
      if (!section.hasAttribute("data-tc-ui-pc-noreveal")) initReveal(section);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();

;
(function () {
'use strict';
var section = document.querySelector('.tc-ui-adp');
if (!section) return;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (section.getAttribute('data-anim') === 'none' || reduce) return;
var cols = Array.prototype.slice.call(section.querySelectorAll('.tc-ui-adp__col'));
if (!cols.length) return;
var cs = getComputedStyle(section);
var umbral = parseFloat(cs.getPropertyValue('--tc-ui-adp-in-threshold'));
if (isNaN(umbral)) umbral = 0.18;
var margen = (cs.getPropertyValue('--tc-ui-adp-in-margin') || '-10%').trim();
section.classList.add('is-armed');
void section.offsetHeight;
var pend = cols.slice();
var tick = false, red = null, alguna = false;
function linea() {
var vh = window.innerHeight || document.documentElement.clientHeight;
var n = parseFloat(margen) || 0;
return vh + (margen.indexOf('%') > -1 ? vh * n / 100 : n);
}
function barrer() {
tick = false;
if (!pend.length) return;
var l = linea(), entran = [], quedan = [];
pend.forEach(function (c) {
var r = c.getBoundingClientRect();
var cruzada = r.top + r.height * umbral < l;
var pasada = r.bottom < 0;
(cruzada || pasada ? entran : quedan).push(c);
});
pend = quedan;
entran.forEach(function (c, i) {
c.style.setProperty('--tc-ui-i', i);
c.classList.add('is-in');
});
if (entran.length) { alguna = true; clearTimeout(red); }
if (!pend.length) desmontar();
}
function pedir() {
if (tick) return;
tick = true;
(window.requestAnimationFrame || function (f) { setTimeout(f, 16); })(barrer);
}
function desmontar() {
window.removeEventListener('scroll', pedir);
window.removeEventListener('resize', pedir);
window.removeEventListener('orientationchange', pedir);
}
window.addEventListener('scroll', pedir, { passive: true });
window.addEventListener('resize', pedir);
window.addEventListener('orientationchange', pedir);
barrer();
red = setTimeout(function () {
if (alguna) return;
desmontar();
pend.forEach(function (c, i) { c.style.setProperty('--tc-ui-i', i); c.classList.add('is-in'); });
pend = [];
}, 2500);
})();

;
(function () {
var section = document.currentScript.previousElementSibling;
while (section && !section.classList.contains('gmarkets')) {
section = section.previousElementSibling;
}
if (!section) section = document.querySelector('.gmarkets');
if (!section) return;
var items = section.querySelectorAll('.gm-reveal');
var counters = section.querySelectorAll('[data-gm-count]');
var icons = section.querySelectorAll('.gmcard__icon--anim');
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function playIcon(el) {
if (!el) return;
el.classList.remove('is-playing');
void el.offsetWidth;
el.classList.add('is-playing');
}
if (!reduce) {
Array.prototype.forEach.call(icons, function (el) {
var card = el.closest ? el.closest('.gmcard') : null;
if (!card) return;
card.addEventListener('mouseenter', function () { playIcon(el); });
});
}
if (reduce || !('IntersectionObserver' in window)) return;
section.classList.add('is-reveal-ready');
function countUp(el) {
var target = parseInt(el.getAttribute('data-gm-count'), 10);
if (isNaN(target)) return;
var dur = 900;
var delay = 340;
var start = null;
el.textContent = '0';
setTimeout(function () {
requestAnimationFrame(function step(ts) {
if (start === null) start = ts;
var p = Math.min((ts - start) / dur, 1);
var eased = 1 - Math.pow(1 - p, 3);
el.textContent = Math.round(target * eased);
if (p < 1) requestAnimationFrame(step);
});
}, delay);
}
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-visible');
var nums = entry.target.querySelectorAll ? entry.target.querySelectorAll('[data-gm-count]') : [];
Array.prototype.forEach.call(nums, countUp);
var icon = entry.target.querySelector ? entry.target.querySelector('.gmcard__icon--anim') : null;
if (icon) {
var cs = window.getComputedStyle(entry.target);
var base = parseFloat(cs.getPropertyValue('--gm-reveal-delay')) || 0;
var extra = parseFloat(cs.getPropertyValue('--gm-icon-anim-delay')) || 320;
setTimeout(function () { playIcon(icon); }, base + extra);
}
io.unobserve(entry.target);
});
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
items.forEach(function (el) { io.observe(el); });
Array.prototype.forEach.call(counters, function (el) {
if (!el.closest('.gm-reveal')) countUp(el);
});
})();

;
(function () {
    function initBuilders(root) {
      var track = root.querySelector("[data-tc-ui-track]");
      var prev  = root.querySelector("[data-tc-ui-prev]");
      var next  = root.querySelector("[data-tc-ui-next]");
      if (!track || !prev || !next) return;
      function gapPx() {
        var cs = getComputedStyle(track);
        return parseFloat(cs.columnGap || cs.gap) || 0;
      }
      function step() {
        var card = track.querySelector(".tc-ui-card");
        if (!card) return track.clientWidth;
        return card.getBoundingClientRect().width + gapPx();
      }
      /* Estado de las flechas: al principio y al final se apagan (35%),
         igual que en el resto de módulos. En modo grid el track no
         desplaza nada, así que las dos quedan deshabilitadas y las
         flechas ni se ven (CSS). */
      function syncArrows() {
        var max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
      }
      prev.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
      next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
      var t = null;
      track.addEventListener("scroll", function () {
        window.clearTimeout(t);
        t = window.setTimeout(syncArrows, 80);
      });
      var lastW = window.innerWidth;
      window.addEventListener("resize", function () {
        syncArrows();
        if (window.innerWidth === lastW) return;   /* en móvil, la barra de
             direcciones dispara resize cambiando sólo el alto */
        lastW = window.innerWidth;
      });
      window.addEventListener("load", syncArrows);
      syncArrows();
    }
    document.querySelectorAll(".tc-ui-builders").forEach(initBuilders);
    // Scroll reveal
    var reveals = document.querySelectorAll(".tc-ui-reveal");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }
  })();

;
(function () {
var section = document.currentScript.previousElementSibling;
while (section && !section.classList.contains('tc-enterprise-criteria')) {
section = section.previousElementSibling;
}
if (!section) section = document.querySelector('.tc-enterprise-criteria');
if (!section) return;
var items = section.querySelectorAll('.tc-pricing-system-reveal');
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) return;
section.classList.add('is-reveal-ready');
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-visible');
io.unobserve(entry.target);
});
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
items.forEach(function (el) { io.observe(el); });
})();

;
(function () {
var script = document.currentScript;
var section = script.previousElementSibling;
while (section && !section.classList.contains('tc-enterprise-criteria')) {
section = section.previousElementSibling;
}
if (!section) section = document.querySelector('.tc-enterprise-criteria');
if (!section) return;
var GLYPHS = {
users:     '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
trend:     '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
clock:     '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
sliders:   '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.4"/><circle cx="16" cy="17" r="2.4"/>',
globe:     '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
grid:      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
squad:     '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20v-1.4A4.1 4.1 0 0 1 6.6 14.5h4.8a4.1 4.1 0 0 1 4.1 4.1V20"/><circle cx="17.5" cy="7" r="2.4"/><path d="M21.5 20v-1.6a3.4 3.4 0 0 0-2.6-3.3"/>',
userCheck: '<path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="16 11 18.5 13.5 23 9"/>',
award:     '<circle cx="12" cy="9" r="5.5"/><polyline points="8.2 13.6 7 22 12 19 17 22 15.8 13.6"/>',
pie:       '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M12 3v9h9A9 9 0 0 0 12 3z"/>',
cpu:       '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"/>',
refresh:   '<path d="M20 11a8 8 0 0 0-13.7-4.9L3 9"/><polyline points="3 4 3 9 8 9"/><path d="M4 13a8 8 0 0 0 13.7 4.9L21 15"/><polyline points="21 20 21 15 16 15"/>',
swap:      '<polyline points="15 4 19 8 15 12"/><line x1="4" y1="8" x2="19" y2="8"/><polyline points="9 12 5 16 9 20"/><line x1="20" y1="16" x2="5" y2="16"/>',
database:  '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
rocket:    '<path d="M12 3c3 2 5 5.5 5 9l-5 4-5-4c0-3.5 2-7 5-9z"/><circle cx="12" cy="10" r="1.8"/><path d="M8 17l-2 4 4-1.6M16 17l2 4-4-1.6"/>',
clipboard: '<path d="M9 4h6v3H9z"/><path d="M15 5h2.5A1.5 1.5 0 0 1 19 6.5v13A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5H9"/><polyline points="9 13 11 15 15 11"/>',
briefcase: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><line x1="3" y1="13" x2="21" y2="13"/>',
merge:     '<circle cx="7" cy="18" r="2.5"/><circle cx="7" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M7 8.5v7"/><path d="M9.5 6h2A4 4 0 0 1 15.5 10v0.6"/>'
};
var GLYPH_ORDER = Object.keys(GLYPHS);
function svg(name, i) {
var g = GLYPHS[name] || GLYPHS[GLYPH_ORDER[i % GLYPH_ORDER.length]];
return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + g + '</svg>';
}
var STEP     = 1.15;  // segundos por avance
var EASE_T   = 0.55;  // tramo animado dentro de cada avance
var VISIBLE  = 4;     // filas visibles
var SEL_SLOT = 1;     // hueco que lee como seleccionado
var SLOTS    = [-1, 0, 1, 2, 3, 4];
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function easeInOutCubic(t) {
return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function cssNum(name, fallback) {
var v = parseFloat(getComputedStyle(section).getPropertyValue(name));
return isNaN(v) ? fallback : v;
}
var ROW_H  = cssNum('--tc-enterprise-criteria-pk-row-h', 62);
var MARGIN = cssNum('--tc-enterprise-criteria-pk-margin', 24);
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var HAS_IO = 'IntersectionObserver' in window;
var HOVER_SCOPE = 'col';
var HOVER_GATED = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
function build(pk) {
var media  = pk.parentElement;
var card   = pk.querySelector('.tc-pricing-system-pk__card');
var win    = pk.querySelector('.tc-pricing-system-pk__window');
var source = pk.querySelectorAll('.tc-pricing-system-pk__source li');
if (!media || !card || !win || !source.length) return;
var ITEMS = [];
for (var i = 0; i < source.length; i++) {
var t = (source[i].textContent || '').trim();
if (t) ITEMS.push({ text: t, icon: source[i].getAttribute('data-icon') });
}
if (!ITEMS.length) return;
var DELAY = parseFloat(pk.getAttribute('data-delay')) || 0;
var rows = SLOTS.map(function () {
var el = document.createElement('div');
el.className = 'tc-pricing-system-pk__row';
el.innerHTML = '<span class="tc-pricing-system-pk__chip"></span><span class="tc-pricing-system-pk__label"></span>';
win.appendChild(el);
return { el: el, chip: el.firstChild, label: el.lastChild, idx: -1, sel: null };
});
function render(T0) {
var T = Math.max(0, T0 - DELAY);
var n = ITEMS.length;
var k = Math.floor(T / STEP);
var frac = easeInOutCubic(clamp((T - k * STEP) / EASE_T, 0, 1));
var scroll = k + frac;
var base = Math.floor(scroll);
var off = scroll - base;
for (var i = 0; i < rows.length; i++) {
var r = rows[i];
var j = SLOTS[i];
var idx = ((base + j) % n + n) % n;
var slot = j - off;
var selected = Math.abs(slot - SEL_SLOT) < 0.5;
var edge = clamp(Math.min(slot + 0.9, VISIBLE - 0.1 - slot), 0, 1);
r.el.style.transform = 'translateY(' + (slot * ROW_H) + 'px)';
r.el.style.opacity = edge * (selected ? 1 : 0.66);
if (r.idx !== idx) {
r.idx = idx;
r.label.textContent = ITEMS[idx].text;
r.chip.innerHTML = svg(ITEMS[idx].icon, idx);
}
if (r.sel !== selected) {
r.sel = selected;
r.el.classList.toggle('is-sel', selected);
}
}
}
function fit() {
var natW = card.offsetWidth, natH = card.offsetHeight;
if (!natW || !natH) return;
var s = Math.min(1,
(media.clientWidth  - MARGIN * 2) / natW,
(media.clientHeight - MARGIN * 2) / natH);
card.style.setProperty('--tc-enterprise-criteria-pk-scale', Math.max(0.2, s).toFixed(4));
}
render(0);
fit();
if (window.ResizeObserver) new ResizeObserver(fit).observe(media);
else window.addEventListener('resize', fit);
if (reduce) return null;   // se queda en el primer frame, sin movimiento
var raf = null, t0 = 0, acc = 0, running = false;
function frame(now) {
render((acc + (now - t0)) / 1000);
raf = requestAnimationFrame(frame);
}
function start() {
if (running) return;
running = true;
t0 = performance.now();
raf = requestAnimationFrame(frame);
}
function stop() {
if (!running) return;
running = false;
acc += performance.now() - t0;   // congela donde iba, no reinicia
cancelAnimationFrame(raf);
}
var inView = !HAS_IO;
if (HAS_IO) {
new IntersectionObserver(function (entries) {
inView = entries[0].isIntersecting;
sync();
}, { threshold: 0.05 }).observe(media);
}
var hovered = false;
function sync() {
var go = inView && !document.hidden && (!HOVER_GATED || hovered);
go ? start() : stop();
}
if (HOVER_GATED) {
var hoverEl = HOVER_SCOPE === 'section'
? section
: (pk.closest ? (pk.closest('.tc-enterprise-criteria__col') || media) : media);
hoverEl.addEventListener('mouseenter', function () { hovered = true;  sync(); });
hoverEl.addEventListener('mouseleave', function () { hovered = false; sync(); });
hoverEl.addEventListener('focusin',  function () { hovered = true;  sync(); });
hoverEl.addEventListener('focusout', function (e) {
if (!hoverEl.contains(e.relatedTarget)) { hovered = false; sync(); }
});
}
sync();
return sync;
}
var pickers = section.querySelectorAll('.tc-pricing-system-pk');
var syncs = [];
for (var i = 0; i < pickers.length; i++) {
var fn = build(pickers[i]);
if (fn) syncs.push(fn);
}
function syncAll() { for (var i = 0; i < syncs.length; i++) syncs[i](); }
document.addEventListener('visibilitychange', syncAll);
})();

;
(function () {
var sections = document.querySelectorAll('.hcta:not([data-anim-init])');
if (!sections.length) return;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) {
sections.forEach(function (s) { s.setAttribute('data-anim-init', '1'); });
return;
}
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
entry.target.classList.add('is-visible');
io.unobserve(entry.target);
}
});
}, {
threshold: 0.25
});
sections.forEach(function (s) {
s.setAttribute('data-anim-init', '1');
s.classList.add('hcta--anim');   // oculta solo ahora, con JS confirmado
io.observe(s);
});
})();

;
(function () {
var section = document.currentScript && document.currentScript.previousElementSibling;
while (section && !(section.classList && section.classList.contains('tc-story-highlights'))) {
section = section.previousElementSibling;
}
if (!section) section = document.querySelector('[data-tc-story-highlights]');
if (!section) return;
var items   = [].slice.call(section.querySelectorAll('.tc-story-highlights__item'));
var reveals = section.querySelectorAll('.tc-story-heading-reveal');
var countEl = section.querySelector('[data-tc-story-highlights-count]');
var nextEl  = section.querySelector('.tc-story-highlights__check-item--next');
var reduce  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var CYCLE = parseInt(section.getAttribute('data-tc-story-highlights-interval'), 10) || 5000;
if (!reduce) section.classList.add('tc-story-heading-anim');
var cs = getComputedStyle(section);
function cssMs(name, fallback) {
var v = (cs.getPropertyValue(name) || '').trim();
if (!v) return fallback;
var n = parseFloat(v);
if (isNaN(n)) return fallback;
return /ms\s*$/.test(v) ? n : n * 1000;
}
var T_NEXT = cssMs('--tc-story-highlights-t-next', 2400);
var checks = [].slice.call(section.querySelectorAll('[data-tc-story-highlights-check]'))
.map(function (el, i) {
var n = parseInt(el.getAttribute('data-tc-story-highlights-check'), 10);
return { el: el, orden: isNaN(n) ? i : n };
})
.sort(function (a, b) { return a.orden - b.orden; });
checks.forEach(function (c, i) {
var porDefecto = 400 + i * 1100;
c.t = cssMs('--tc-story-highlights-t-check-' + (i + 1), porDefecto);
});
var COUNT = null;
if (countEl) {
var raw = (countEl.textContent || '').trim();
var m = raw.match(/^(\D*)(\d+)([\s\S]*)$/);
if (m) COUNT = { prefix: m[1], suffix: m[3], raw: raw };
}
function pintaContador(n) {
if (!COUNT || !countEl) return;
countEl.textContent = COUNT.prefix + n + COUNT.suffix;
}
var pendientes = [];
if (!reduce) {
section.classList.add('tc-story-heading-is-ready');
pendientes = [].slice.call(reveals);
}
function enPantalla(el) {
var r = el.getBoundingClientRect();
var vh = window.innerHeight || document.documentElement.clientHeight;
return r.bottom > 0 && r.top < vh;
}
function revisarReveals() {
for (var i = pendientes.length - 1; i >= 0; i--) {
if (enPantalla(pendientes[i])) {
pendientes[i].classList.add('tc-story-heading-is-visible');
pendientes.splice(i, 1);
}
}
}
var raf = 0;
var t0 = 0;
var elapsed = 0;
function paint(ms) {
var n = 0;
for (var i = 0; i < checks.length; i++) {
var on = ms >= checks[i].t;
checks[i].el.classList.toggle('tc-story-heading-is-done', on);
if (on) n++;
}
pintaContador(n);
if (nextEl) nextEl.classList.toggle('tc-story-heading-is-next', ms >= T_NEXT);
}
function tick(now) {
raf = 0;
var ms = elapsed + (now - t0);
if (ms > CYCLE) ms = CYCLE;
paint(ms);
if (ms < CYCLE) raf = window.requestAnimationFrame(tick);
}
function nowMs() {
return (window.performance && performance.now) ? performance.now() : Date.now();
}
function sceneReset() {
if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
elapsed = 0;
if (reduce) { paint(CYCLE); return; }
paint(0);
}
function sceneStart() {
if (raf || reduce) return;
t0 = nowMs();
raf = window.requestAnimationFrame(tick);
}
function scenePause() {
if (!raf) return;
elapsed += nowMs() - t0;
window.cancelAnimationFrame(raf);
raf = 0;
}
function sceneResume() {
if (elapsed >= CYCLE) return;
sceneStart();
}
var index = 0;
var timer = null;
var inView = false;
var focusHold = false;
function setActive(i) {
if (!items.length) return;
index = (i + items.length) % items.length;
items.forEach(function (item, n) {
var on = n === index;
item.classList.toggle('tc-story-heading-is-active', on);
var trigger = item.querySelector('.tc-story-highlights__trigger');
if (trigger) trigger.setAttribute('aria-current', on ? 'true' : 'false');
var fill = item.querySelector('.tc-story-highlights__rule-fill');
if (fill && on) {
fill.style.animation = 'none';
void fill.offsetWidth;
fill.style.animation = '';
}
});
sceneReset();
if (timer && inView) sceneStart();
}
function play() {
if (timer || focusHold || !inView) return;
timer = window.setInterval(function () { setActive(index + 1); }, CYCLE);
section.classList.remove('tc-story-heading-is-paused');
sceneResume();
}
function pause() {
if (timer) { window.clearInterval(timer); timer = null; }
section.classList.add('tc-story-heading-is-paused');
scenePause();
}
function resume() { focusHold = false; pause(); play(); }
function revisarInView() {
var v = enPantalla(section);
if (v === inView) return;
inView = v;
if (inView) play(); else pause();
}
var rafChk = 0;
function revisar() {
if (rafChk) return;
rafChk = window.requestAnimationFrame(function () {
rafChk = 0;
revisarReveals();
revisarInView();
});
}
window.addEventListener('scroll', revisar, { passive: true });
window.addEventListener('resize', revisar);
document.addEventListener('visibilitychange', function () {
if (!document.hidden) revisar();
});
if ('IntersectionObserver' in window) {
var obs = new IntersectionObserver(revisar, { threshold: 0 });
obs.observe(section);
[].forEach.call(reveals, function (el) { obs.observe(el); });
}
window.setTimeout(revisar, 400);
window.setTimeout(revisar, 1500);
revisar();
items.forEach(function (item, n) {
var trigger = item.querySelector('.tc-story-highlights__trigger');
if (!trigger) return;
trigger.addEventListener('click', function () { setActive(n); resume(); });
});
section.addEventListener('focusin', function (e) {
var keyboard = false;
try { keyboard = e.target && e.target.matches(':focus-visible'); } catch (err) { keyboard = false; }
if (!keyboard) return;
focusHold = true;
pause();
});
section.addEventListener('focusout', function () {
if (!focusHold) return;
focusHold = false;
play();
});
setActive(0);
})();

;
(function () {
var section = document.currentScript && document.currentScript.previousElementSibling;
while (section && !(section.classList && section.classList.contains('tc-story-feature'))) {
section = section.previousElementSibling;
}
if (!section) section = document.querySelector('[data-tc-story-feature]');
if (!section) return;
var items   = [].slice.call(section.querySelectorAll('.tc-story-feature__item'));
var reveals = section.querySelectorAll('.tc-story-section-reveal');
var pendRow = section.querySelector('.tc-story-feature__row--pending');
var reduce  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var CYCLE = parseInt(section.getAttribute('data-tc-story-feature-interval'), 10) || 5000;
if (!reduce) section.classList.add('tc-story-section-anim');
var cs = getComputedStyle(section);
function cssMs(name, fallback) {
var v = (cs.getPropertyValue(name) || '').trim();
if (!v) return fallback;
var n = parseFloat(v);
if (isNaN(n)) return fallback;
return /ms\s*$/.test(v) ? n : n * 1000;
}
var T_PEND = cssMs('--tc-story-feature-t-pend', 2400);
var rows = [].slice.call(section.querySelectorAll('[data-tc-story-feature-live]'))
.map(function (el, i) {
var n = parseInt(el.getAttribute('data-tc-story-feature-live'), 10);
return { el: el, orden: isNaN(n) ? i : n };
})
.sort(function (a, b) { return a.orden - b.orden; });
rows.forEach(function (r, i) {
var porDefecto = 400 + i * 1000;
r.t = cssMs('--tc-story-feature-t-live-' + (i + 1), porDefecto);
});
var pendientes = [];
if (!reduce) {
section.classList.add('tc-story-section-is-ready');
pendientes = [].slice.call(reveals);
}
function enPantalla(el) {
var r = el.getBoundingClientRect();
var vh = window.innerHeight || document.documentElement.clientHeight;
return r.bottom > 0 && r.top < vh;
}
function revisarReveals() {
for (var i = pendientes.length - 1; i >= 0; i--) {
if (enPantalla(pendientes[i])) {
pendientes[i].classList.add('tc-story-section-is-visible');
pendientes.splice(i, 1);
}
}
}
var raf = 0;
var t0 = 0;
var elapsed = 0;
function paint(ms) {
for (var i = 0; i < rows.length; i++) {
rows[i].el.classList.toggle('tc-story-section-is-live', ms >= rows[i].t);
}
if (pendRow) pendRow.classList.toggle('tc-story-section-is-shown', ms >= T_PEND);
}
function tick(now) {
raf = 0;
var ms = elapsed + (now - t0);
if (ms > CYCLE) ms = CYCLE;
paint(ms);
if (ms < CYCLE) raf = window.requestAnimationFrame(tick);
}
function nowMs() {
return (window.performance && performance.now) ? performance.now() : Date.now();
}
function sceneReset() {
if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
elapsed = 0;
if (reduce) { paint(CYCLE); return; }
paint(0);
}
function sceneStart() {
if (raf || reduce) return;
t0 = nowMs();
raf = window.requestAnimationFrame(tick);
}
function scenePause() {
if (!raf) return;
elapsed += nowMs() - t0;
window.cancelAnimationFrame(raf);
raf = 0;
}
function sceneResume() {
if (elapsed >= CYCLE) return;
sceneStart();
}
var index = 0;
var timer = null;
var inView = false;
var focusHold = false;
function setActive(i) {
if (!items.length) return;
index = (i + items.length) % items.length;
items.forEach(function (item, n) {
var on = n === index;
item.classList.toggle('tc-story-section-is-active', on);
var trigger = item.querySelector('.tc-story-feature__trigger');
if (trigger) trigger.setAttribute('aria-current', on ? 'true' : 'false');
var fill = item.querySelector('.tc-story-feature__rule-fill');
if (fill && on) {
fill.style.animation = 'none';
void fill.offsetWidth;
fill.style.animation = '';
}
});
sceneReset();
if (timer && inView) sceneStart();
}
function play() {
if (timer || focusHold || !inView) return;
timer = window.setInterval(function () { setActive(index + 1); }, CYCLE);
section.classList.remove('tc-story-section-is-paused');
sceneResume();
}
function pause() {
if (timer) { window.clearInterval(timer); timer = null; }
section.classList.add('tc-story-section-is-paused');
scenePause();
}
function resume() { focusHold = false; pause(); play(); }
function revisarInView() {
var v = enPantalla(section);
if (v === inView) return;
inView = v;
if (inView) play(); else pause();
}
var rafChk = 0;
function revisar() {
if (rafChk) return;
rafChk = window.requestAnimationFrame(function () {
rafChk = 0;
revisarReveals();
revisarInView();
});
}
window.addEventListener('scroll', revisar, { passive: true });
window.addEventListener('resize', revisar);
document.addEventListener('visibilitychange', function () {
if (!document.hidden) revisar();
});
if ('IntersectionObserver' in window) {
var obs = new IntersectionObserver(revisar, { threshold: 0 });
obs.observe(section);
[].forEach.call(reveals, function (el) { obs.observe(el); });
}
window.setTimeout(revisar, 400);
window.setTimeout(revisar, 1500);
revisar();
items.forEach(function (item, n) {
var trigger = item.querySelector('.tc-story-feature__trigger');
if (!trigger) return;
trigger.addEventListener('click', function () { setActive(n); resume(); });
});
section.addEventListener('focusin', function (e) {
var keyboard = false;
try { keyboard = e.target && e.target.matches(':focus-visible'); } catch (err) { keyboard = false; }
if (!keyboard) return;
focusHold = true;
pause();
});
section.addEventListener('focusout', function () {
if (!focusHold) return;
focusHold = false;
play();
});
setActive(0);
})();

;
(function () {
  var root = document.getElementById("tc-ui-faq-widget_1784811503841_220805406473");
  if (!root || root.dataset.skFaqInit === "true") return;
  root.dataset.skFaqInit = "true";
  var items = root.querySelectorAll(".tc-faq__item");
  items.forEach(function (item, idx) {
    var btn = item.querySelector(".tc-faq__question");
    var panel = item.querySelector(".tc-faq__panel");
    // Fuerza la primera pregunta abierta al cargar (idx === 0). Cambia a "false" para desactivarlo.
    var openFirst = idx === 0;
    var shouldOpen = item.classList.contains("is-open") || openFirst;
    if (shouldOpen) {
      item.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = panel.scrollHeight + "px";
    } else {
      panel.style.maxHeight = "0px";
    }
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open");
      if (open) {
        item.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        panel.style.maxHeight = "0px";
      } else {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
      /* Para modo "solo uno abierto", descomenta:
      items.forEach(function (o) {
        if (o !== item) { o.classList.remove("is-open"); o.querySelector(".tc-faq__question").setAttribute("aria-expanded","false"); o.querySelector(".tc-faq__panel").style.maxHeight="0px"; }
      }); */
    });
  });
  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      root.querySelectorAll(".tc-faq__item.is-open .tc-faq__panel").forEach(function (p) {
        p.style.maxHeight = p.scrollHeight + "px";
      });
    }, 150);
  });
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
window.addEventListener('DOMContentLoaded', function () {
  var headers = document.querySelectorAll('.ticarti-faq-container .faq-item h3');
  if (!headers.length) return;
  headers.forEach(function (header) {
    header.addEventListener('click', function () {
      header.parentElement.classList.toggle('active');
    });
  });
});
