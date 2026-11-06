
(function(){
var cards = document.querySelectorAll('.tc-builder-section__card');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) {
cards.forEach(function(c){ c.classList.add('is-visible'); });
return;
}
var io = new IntersectionObserver(function(entries){
entries.forEach(function(e){
if (e.isIntersecting){
e.target.classList.add('is-visible');
io.unobserve(e.target);
}
});
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
cards.forEach(function(c){ io.observe(c); });
})();
