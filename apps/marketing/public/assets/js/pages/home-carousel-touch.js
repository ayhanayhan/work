(function () {
  'use strict';
  // Dedicated to the three scrollable carousels on the homepage.
  // No library or external dependency; vertical gestures remain native.
  if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;

  var selectors = [
    { container: '.tc-site-hero__viewport', card: '.tc-ui-card' },
    { container: '.tc-showcase__track', card: '.tc-showcase__item' },
    { container: '.tc-blog__track', card: '.tc-blog__card' }
  ];

  function addTouchCarousel(config) {
    var track = document.querySelector(config.container);
    if (!track) return;
    var gesture = null;
    var blockClickUntil = 0;

    function cardStep() {
      var card = track.querySelector(config.card);
      if (!card) return track.clientWidth * .8;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    track.addEventListener('touchstart', function (event) {
      if (event.touches.length !== 1 || track.scrollWidth <= track.clientWidth + 3) return;
      var t = event.touches[0];
      gesture = {
        x: t.clientX, y: t.clientY,
        startingScroll: track.scrollLeft,
        dragging: false, vertical: false,
        oldSnap: track.style.scrollSnapType,
        oldBehavior: track.style.scrollBehavior
      };
    }, { passive: true });

    track.addEventListener('touchmove', function (event) {
      if (!gesture || event.touches.length !== 1 || gesture.vertical) return;
      var t = event.touches[0];
      var dx = t.clientX - gesture.x;
      var dy = t.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
        if (Math.abs(dy) >= Math.abs(dx)) { gesture.vertical = true; return; }
        gesture.dragging = true;
        track.classList.add('is-touch-dragging');
        track.style.scrollSnapType = 'none';
        track.style.scrollBehavior = 'auto';
      }
      if (event.cancelable) event.preventDefault();
      track.scrollLeft = gesture.startingScroll - dx;
    }, { passive: false });

    function finish(event, cancelled) {
      if (!gesture) return;
      var g = gesture;
      gesture = null;
      track.classList.remove('is-touch-dragging');
      if (!g.dragging) return;
      blockClickUntil = Date.now() + 500;
      var lastTouch = event.changedTouches && event.changedTouches[0];
      var dx = lastTouch ? lastTouch.clientX - g.x : g.startingScroll - track.scrollLeft;
      var step = cardStep();
      var distance = Math.abs(dx);
      // One deliberate swipe advances one card; longer swipes can advance more.
      var jumps = distance < 35 ? 0 : Math.min(3, Math.max(1, Math.round(distance / step)));
      var target = jumps ? g.startingScroll - Math.sign(dx) * jumps * step : track.scrollLeft;
      var max = Math.max(0, track.scrollWidth - track.clientWidth);
      target = Math.max(0, Math.min(max, target));
      track.style.scrollSnapType = g.oldSnap;
      track.style.scrollBehavior = g.oldBehavior;
      if (!cancelled) {
        track.scrollTo({ left: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }
    track.addEventListener('touchend', function (event) { finish(event, false); }, { passive: true });
    track.addEventListener('touchcancel', function (event) { finish(event, true); }, { passive: true });
    track.addEventListener('click', function (event) {
      if (Date.now() < blockClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
  selectors.forEach(addTouchCarousel);
})();
