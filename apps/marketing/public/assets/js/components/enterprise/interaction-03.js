
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
