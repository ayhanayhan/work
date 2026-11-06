
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
