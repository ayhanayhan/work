(function () {
  'use strict';
  var root = document.querySelector('#tc-blog');
  if (!root) return;
  var track = root.querySelector('.tc-blog__track');
  var previous = root.querySelector('[data-tc-blog-prev]');
  var next = root.querySelector('[data-tc-blog-next]');
  if (!track || !previous || !next) return;
  function step() {
    var first = track.querySelector('.tc-blog__card');
    if (!first) return track.clientWidth;
    var width = first.getBoundingClientRect().width;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return width + gap;
  }
  function update() {
    previous.disabled = track.scrollLeft < 3;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 3;
  }
  function move(direction) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({left: step()*direction, behavior: reduce ? 'auto' : 'smooth'});
  }
  previous.addEventListener('click',function(){move(-1);});
  next.addEventListener('click',function(){move(1);});
  track.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', update, {passive:true});
  update();
})();
