
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
