
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
