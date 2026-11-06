
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
