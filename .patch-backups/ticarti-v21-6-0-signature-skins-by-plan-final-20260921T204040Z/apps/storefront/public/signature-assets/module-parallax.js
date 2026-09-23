export function startParallax() {
  window.addEventListener("scroll", initScrollBg);
  initScrollBg();
}
function initScrollBg(){
  document.querySelectorAll(".section-background__elements__item").forEach((item) => {
    const scale = item.hasAttribute('data-scale')?Number(item.getAttribute('data-scale')):1;
    const rect = item.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const absoluteY = rect.top + scrollTop;
    var checkPosition = scrollTop+window.innerHeight*scale;
    item.style.transform = `scale(${1 + Math.min(0.5,Math.max(checkPosition-absoluteY, 0) * 0.00025)})`;
  });
}