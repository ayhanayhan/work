
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
