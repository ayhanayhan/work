
(function () {
document.documentElement.classList.add('js-reveal');
var items = document.querySelectorAll('.tc-sales-channels__reveal');
if (!('IntersectionObserver' in window)) {
items.forEach(function (el) { el.classList.add('is-visible', 'in-view'); });
return;
}
var observer = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
entry.target.classList.add('is-visible', 'in-view');
} else {
entry.target.classList.remove('in-view');
}
});
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
items.forEach(function (el) { observer.observe(el); });
})();
