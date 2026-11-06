
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
