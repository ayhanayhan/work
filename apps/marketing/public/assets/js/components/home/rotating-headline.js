/* Ticarti: rotating headline with complete, uncut word transitions. */
(function () {
  'use strict';
  var script = document.currentScript;
  var section = script && script.previousElementSibling;
  while (section && !section.classList.contains('tc-animated-heading')) section = section.previousElementSibling;
  if (!section) section = document.querySelector('.tc-animated-heading');
  if (!section) return;
  var roller = section.querySelector('.tc-animated-heading__roller');
  var items = Array.prototype.slice.call(section.querySelectorAll('.tc-animated-heading__item'));
  if (!roller || items.length < 2) return;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var revealItems = Array.prototype.slice.call(section.querySelectorAll('.hrt-reveal'));
  var index = Math.max(0, items.findIndex(function (node) { return node.classList.contains('is-active'); }));
  var timer = null, revealTimer = null, resizeTimer = null;
  var visible = true, revealed = false;
  function delay() {
    var raw = getComputedStyle(section).getPropertyValue('--hrt-hold').trim();
    var value = parseFloat(raw);
    if (!isFinite(value)) return 2000;
    return raw.indexOf('ms') >= 0 ? value : raw.indexOf('s') >= 0 ? value * 1000 : value;
  }
  function measure() {
    // Items are absolute, so measuring them does not change the layout.
    var max = 0;
    items.forEach(function (item) { max = Math.max(max, item.getBoundingClientRect().width); });
    // Subpixel and font-rendering headroom prevents last-letter clipping.
    roller.style.width = Math.ceil(max + 8) + 'px';
  }
  function activate(nextIndex) {
    index = nextIndex;
    items.forEach(function (item, i) { item.classList.toggle('is-active', i === index); });
  }
  function stop() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (revealTimer !== null) { clearTimeout(revealTimer); revealTimer = null; }
  }
  function rotate() {
    if (!visible || reduceMotion || document.hidden) { timer = null; return; }
    activate((index + 1) % items.length);
    timer = setTimeout(rotate, Math.max(1200, delay()));
  }
  function start() {
    if (timer !== null || !visible || reduceMotion || document.hidden) return;
    timer = setTimeout(rotate, Math.max(1200, delay()));
  }
  function reveal() {
    if (!revealed) {
      revealed = true;
      revealItems.forEach(function (item) { item.classList.add('is-visible'); });
      revealTimer = setTimeout(function () { revealTimer = null; start(); }, 800);
    } else start();
  }
  section.classList.add('is-type-ready');
  activate(index);
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 120); });
  if ('IntersectionObserver' in window) {
    if (!reduceMotion) section.classList.add('is-reveal-ready');
    var observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!visible) stop(); else reveal();
    }, { threshold: .1, rootMargin: '0px 0px -5% 0px' });
    observer.observe(section);
  } else reveal();
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (revealed) start(); });
})();
