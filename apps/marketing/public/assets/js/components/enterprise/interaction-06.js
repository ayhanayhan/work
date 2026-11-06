
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
