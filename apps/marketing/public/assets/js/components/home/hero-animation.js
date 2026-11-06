
(function () {
'use strict';
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var section = document.querySelector('.tc-site-hero');
if (!section) return;
(function carousel() {
var viewport = document.getElementById('skViewport');
var track = document.getElementById('skTrack');
if (!viewport || !track) return;
var originals = Array.prototype.slice.call(track.querySelectorAll('.tc-ui-card'));
var SET = originals.length;
var cards = [];
var cardW = 0, panelW = 0, gap = 0, unit = 0, setW = 0, openW = 0;
var mode = '', resetting = false, snapping = false, scrollTO = null, snapTO = null;
var LABEL_OPEN = 'Ver detalle del perfil';
var LABEL_CLOSE = 'Cerrar detalle del perfil';
function isMobile() { return window.matchMedia('(max-width: 1150px)').matches; }
function lockScroll(on) {
document.documentElement.style.overflow = on ? 'hidden' : '';
document.body.style.overflow = on ? 'hidden' : '';
}
var fs = document.createElement('div');
fs.className = 'tc-site-hero tc-ui-fs';
fs.setAttribute('role', 'dialog');
fs.setAttribute('aria-modal', 'true');
fs.innerHTML =
'<div class="tc-ui-fs__stage"></div>' +
'<button class="tc-ui-fs__arrow tc-ui-fs__arrow--prev" type="button" aria-label="Perfil anterior"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
'<button class="tc-ui-fs__arrow tc-ui-fs__arrow--next" type="button" aria-label="Perfil siguiente"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
document.body.appendChild(fs);
var fsStage = fs.querySelector('.tc-ui-fs__stage');
var fsIndex = -1;
fs.querySelector('.tc-ui-fs__arrow--prev').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fsNav(-1); });
fs.querySelector('.tc-ui-fs__arrow--next').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fsNav(1); });
function renderFullscreen(i, dir) {
var n = originals.length;
i = ((i % n) + n) % n;
fsIndex = i;
var clone = originals[i].cloneNode(true);
clone.removeAttribute('data-clone');
clone.removeAttribute('aria-hidden');
clone.removeAttribute('tabindex');
clone.classList.remove('is-open');
var cert = clone.querySelector('.tc-ui-card__panel-inner .tc-ui-card__meta--cert');
var tag = clone.querySelector('.tc-ui-card__tag');
if (cert && tag) {
tag.innerHTML = cert.innerHTML;
tag.classList.add('tc-ui-fs-tag--cert');
cert.parentNode.removeChild(cert);
}
if (dir > 0) clone.classList.add('tc-ui-fs-from-right');
else if (dir < 0) clone.classList.add('tc-ui-fs-from-left');
fsStage.innerHTML = '';
fsStage.appendChild(clone);
var closeBtn = clone.querySelector('.tc-ui-card__plus');
if (closeBtn) {
closeBtn.setAttribute('aria-label', 'Cerrar');
closeBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); closeFullscreen(); });
}
}
function openFullscreen(card) {
var i = originals.indexOf(card);
renderFullscreen(i < 0 ? 0 : i, 0);
void fs.offsetWidth;
fs.classList.add('is-active');
lockScroll(true);
}
function fsNav(dir) { if (fs.classList.contains('is-active')) renderFullscreen(fsIndex + dir, dir); }
function closeFullscreen() {
fs.classList.remove('is-active');
fsStage.innerHTML = '';
fsIndex = -1;
lockScroll(false);
}
var sx = 0, sy = 0;
fs.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) { sx = t.clientX; sy = t.clientY; } }, { passive: true });
fs.addEventListener('touchend', function (e) {
var t = e.changedTouches[0]; if (!t) return;
var dx = t.clientX - sx, dy = t.clientY - sy;
if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) fsNav(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('keydown', function (e) {
if (!fs.classList.contains('is-active')) return;
if (e.key === 'Escape') closeFullscreen();
else if (e.key === 'ArrowRight') fsNav(1);
else if (e.key === 'ArrowLeft') fsNav(-1);
});
var openSlot = -1;
function syncLabels() {
for (var i = 0; i < cards.length; i++) {
var b = cards[i].querySelector('.tc-ui-card__plus');
if (b) b.setAttribute('aria-label', cards[i].classList.contains('is-open') ? LABEL_CLOSE : LABEL_OPEN);
}
}
function setOpenSlot(s) {
openSlot = (s === null || s === undefined) ? -1 : s;
for (var i = 0; i < cards.length; i++) {
if (openSlot >= 0 && (i % SET) === openSlot) cards[i].classList.add('is-open');
else cards[i].classList.remove('is-open');
}
syncLabels();
}
function closeAll() { setOpenSlot(-1); }
function measure() {
var photo = track.querySelector('.tc-ui-card__photo');
var panel = track.querySelector('.tc-ui-card__panel-inner');
var cs = window.getComputedStyle(track);
gap = parseFloat(cs.columnGap || cs.gap || '0') || 0;
cardW = photo ? photo.offsetWidth : 472;
panelW = panel ? panel.offsetWidth : 472;
unit = cardW + gap;
openW = cardW + panelW;
setW = unit * SET;
}
function isOpenIdx(i) { return openSlot >= 0 && (i % SET) === openSlot; }
function offsetOf(i) {
var off = i * unit;
if (openSlot >= 0) for (var j = 0; j < i; j++) if ((j % SET) === openSlot) off += panelW;
return off;
}
function widthOf(i) { return isOpenIdx(i) ? openW : cardW; }
function centerOf(i) { return offsetOf(i) + widthOf(i) / 2; }
function scrollTargetFor(i) { return centerOf(i) - viewport.clientWidth / 2; }
function period() { return setW + (openSlot >= 0 ? panelW : 0); }
function activeIndex() {
var c = viewport.scrollLeft + viewport.clientWidth / 2;
var best = 0, bestD = Infinity;
for (var i = 0; i < cards.length; i++) {
var d = Math.abs(centerOf(i) - c);
if (d < bestD) { bestD = d; best = i; }
}
return best;
}
function snapTo(i, animate) {
snapping = true;
viewport.scrollTo({ left: scrollTargetFor(i), behavior: animate ? 'smooth' : 'auto' });
clearTimeout(snapTO);
snapTO = setTimeout(function () { snapping = false; }, animate ? 520 : 60);
}
function focusCenter(animate, doOpen) {
if (mode !== 'd' || !unit) return;
var i = activeIndex();
if (doOpen) setOpenSlot(i % SET);
snapTo(i, animate);
}
function attachOnce(card) {
if (card.__sk) return;
card.__sk = true;
var plus = card.querySelector('.tc-ui-card__plus');
if (plus) plus.addEventListener('click', function (e) {
e.preventDefault();
e.stopPropagation();
if (mode !== 'd') { openFullscreen(card); return; }
var i = cards.indexOf(card);
if (card.classList.contains('is-open')) setOpenSlot(-1);
else setOpenSlot(i % SET);
if (i >= 0) snapTo(i, true);
});
}
function clearClones() {
var clones = track.querySelectorAll('.tc-ui-card[data-clone]');
for (var i = 0; i < clones.length; i++) clones[i].parentNode.removeChild(clones[i]);
}
function build() {
mode = isMobile() ? 'm' : 'd';
clearClones();
if (mode === 'd') {
for (var c = 0; c < 2; c++) {
originals.forEach(function (card) {
var cl = card.cloneNode(true);
cl.setAttribute('data-clone', '1');
cl.setAttribute('aria-hidden', 'true');
cl.removeAttribute('tabindex');
cl.classList.remove('is-open');
track.appendChild(cl);
});
}
}
cards = Array.prototype.slice.call(track.querySelectorAll('.tc-ui-card'));
cards.forEach(attachOnce);
if (mode === 'd') {
openSlot = -1;
measure();
var gi = SET + 1;
var target = scrollTargetFor(gi);
while (target < setW) target += setW;
while (target >= 2 * setW) target -= setW;
viewport.scrollLeft = target;
focusCenter(false, false);
} else {
closeAll();
closeFullscreen();
}
}
function maybeReset() {
if (setW <= 0 || resetting || mode !== 'd') return;
var P = period();
if (viewport.scrollLeft < P) { resetting = true; viewport.scrollLeft += P; resetting = false; }
else if (viewport.scrollLeft >= 2 * P) { resetting = true; viewport.scrollLeft -= P; resetting = false; }
}
viewport.addEventListener('scroll', function () {
if (mode !== 'd' || snapping) return;
maybeReset();
clearTimeout(scrollTO);
scrollTO = setTimeout(function () { focusCenter(true, false); }, 140);
}, { passive: true });
function step(dir) {
if (mode !== 'd') {
var w = cards[0] ? cards[0].getBoundingClientRect().width + 14 : 300;
viewport.scrollBy({ left: dir > 0 ? w : -w, behavior: 'smooth' });
return;
}
var i = activeIndex() + dir;
if (i < 0) i = 0;
if (i > cards.length - 1) i = cards.length - 1;
snapping = true;
viewport.scrollTo({ left: scrollTargetFor(i), behavior: 'smooth' });
clearTimeout(snapTO);
snapTO = setTimeout(function () { snapping = false; maybeReset(); focusCenter(false, false); }, 520);
}
section.querySelectorAll('.tc-site-hero__arrow').forEach(function (btn) {
btn.addEventListener('click', function () { step(btn.getAttribute('data-dir') === 'next' ? 1 : -1); });
});
var rt, lastW = window.innerWidth;
window.addEventListener('resize', function () {
if (window.innerWidth === lastW) return;
lastW = window.innerWidth;
clearTimeout(rt);
rt = setTimeout(build, 180);
});
build();
})();
(function kpis() {
if (reduce || !('IntersectionObserver' in window)) return;
var stagger = parseInt(section.getAttribute('data-kpi-stagger'), 10) || 0;
var replay = section.getAttribute('data-kpi-replay') === 'true';
var nums = section.querySelectorAll('.tc-ui-kpis__num');
if (!nums.length) return;
Array.prototype.forEach.call(nums, function (n, i) {
n.style.setProperty('--tc-ui-delay', (i * stagger) + 'ms');
});
section.classList.add('is-armed');
void section.offsetHeight;
requestAnimationFrame(function () {
var grid = section.querySelector('.tc-ui-kpis');
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (e) {
if (e.isIntersecting) {
section.classList.add('is-in');
if (!replay) io.unobserve(grid);
} else if (replay) {
section.classList.remove('is-in');
}
});
}, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
io.observe(grid);
});
})();
})();
