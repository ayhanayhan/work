(function () {
  'use strict';
  const root = document.querySelector('.tc-showcase');
  if (!root) return;
  const track = root.querySelector('.tc-showcase__track');
  const prev = root.querySelector('[data-dir="prev"]');
  const next = root.querySelector('[data-dir="next"]');
  if (!track || !prev || !next) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function step() {
    const item = track.querySelector('.tc-showcase__item');
    if (!item) return track.clientWidth;
    return item.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
  }
  function update() {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  }
  function move(direction) {
    track.scrollBy({left: direction * step(), behavior: reduced.matches ? 'auto' : 'smooth'});
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', update);
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  update();
})();
