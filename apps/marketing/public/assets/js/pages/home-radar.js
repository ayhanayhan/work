/**
 * Ticarti marketplace radar – sweep-and-detect, not an orbit/carousel.
 * The scanner rotates. Targets stay still until a scan detects them:
 * some fade out and reappear in an unused location, while portraits can
 * change in place. Marketplace logos are never duplicated or renamed.
 * Works without dependencies; without JavaScript the static radar stays visible.
 */
(function () {
  'use strict';

  var root = document.querySelector('.tc-page-home .tc-radar');
  if (!root || root.dataset.radarReady === '1') return;
  root.dataset.radarReady = '1';

  var beam = root.querySelector('.tc-radar__beam');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portraits = 'https://inbound.shakersworks.com/hubfs/Web%20repositioning/Radar%20animation/';
  var SWEEP_SPEED = 45; // 360 degrees in 8 seconds.
  var FADE_OUT = 220;

  // Intentionally scattered across the inner and outer radar zones.
  // These coordinates are safe at 360px as well as desktop widths: nearby
  // slots leave room for the largest (portrait / n11) target circles.
  // angle: degrees clockwise from twelve o'clock; radius: fraction of diameter.
  var SLOTS = [
    { angle: 353, radius: .405, zone: 'outer' },
    { angle:  43, radius: .395, zone: 'outer' },
    { angle:  92, radius: .400, zone: 'outer' },
    { angle: 141, radius: .395, zone: 'outer' },
    { angle: 190, radius: .403, zone: 'outer' },
    { angle: 243, radius: .393, zone: 'outer' },
    { angle: 297, radius: .408, zone: 'outer' },
    { angle: 342, radius: .235, zone: 'inner' },
    { angle:  56, radius: .235, zone: 'inner' },
    { angle: 127, radius: .235, zone: 'inner' },
    { angle: 199, radius: .230, zone: 'inner' },
    { angle: 274, radius: .230, zone: 'inner' }
  ];

  // Five visible at the perimeter, four on inner rings.
  // No two visible nodes share a slot and the scan moves them without orbits.
  var descriptors = [
    { cls: 'tc-radar__person--top-left', slot: 6, kind: 'person', next: 'builder-b3.png', fallback: 'builder-a1.png' },
    { cls: 'tc-radar__item--hepsiburada', slot: 7, kind: 'market' },
    { cls: 'tc-radar__person--right', slot: 2, kind: 'person', next: 'builder-b1.png', fallback: 'builder-a2.png' },
    { cls: 'tc-radar__item--n11', slot: 9, kind: 'market' },
    { cls: 'tc-radar__item--pazarama', slot: 3, kind: 'market' },
    { cls: 'tc-radar__person--bottom', slot: 10, kind: 'person', next: 'builder-b2.png', fallback: 'builder-a3.png' },
    { cls: 'tc-radar__item--ciceksepeti', slot: 4, kind: 'market' },
    { cls: 'tc-radar__item--epttavm', slot: 5, kind: 'market' },
    { cls: 'tc-radar__item--trendyol', slot: 11, kind: 'market' }
  ];

  var nodes = descriptors.map(function (spec, index) {
    var element = root.querySelector('.' + spec.cls);
    if (!element) return null;
    var primary = element.querySelector('img');
    if (!primary) return null;

    if (spec.kind === 'person') {
      var holder = document.createElement('span');
      holder.className = 'tc-radar__asset';
      primary.parentNode.insertBefore(holder, primary);
      holder.appendChild(primary);
      primary.classList.add('tc-radar__asset--primary');

      var alternate = document.createElement('img');
      alternate.className = 'tc-radar__asset--alternate';
      alternate.src = portraits + spec.next;
      alternate.alt = '';
      alternate.setAttribute('aria-hidden', 'true');
      alternate.loading = 'lazy';
      alternate.decoding = 'async';
      alternate.addEventListener('error', function onError() {
        alternate.removeEventListener('error', onError);
        alternate.src = portraits + spec.fallback;
      });
      holder.appendChild(alternate);
    }

    return {
      el: element,
      kind: spec.kind,
      slot: spec.slot,
      index: index,
      scans: 0,
      alternate: false,
      busy: false,
      lastDetected: -10
    };
  }).filter(Boolean);

  function modulo(value) { return ((value % 360) + 360) % 360; }
  function angle(slot) { return SLOTS[slot].angle; }
  function degreesBetween(a, b) {
    var difference = Math.abs(a - b);
    return Math.min(difference, 360 - difference);
  }
  function putAtSlot(node) {
    var theta = angle(node.slot) * Math.PI / 180;
    var radius = SLOTS[node.slot].radius;
    node.el.style.left = (50 + 100 * radius * Math.sin(theta)).toFixed(3) + '%';
    node.el.style.top = (50 - 100 * radius * Math.cos(theta)).toFixed(3) + '%';
    node.el.dataset.radarSlot = String(node.slot);
  }
  nodes.forEach(putAtSlot);

  var occupied = new Set(nodes.map(function (node) { return node.slot; }));
  var seconds = 0;
  var lastStamp = 0;
  var frame = 0;
  var inView = false;
  var lastBeamAngle = 0;

  function refreshPortrait(node) {
    if (node.kind !== 'person') return;
    node.alternate = !node.alternate;
    node.el.classList.toggle('is-alt', node.alternate);
  }

  function detect(node) {
    node.el.classList.remove('is-detected');
    // Re-trigger the brief highlight when the sweep detects the target.
    void node.el.offsetWidth;
    node.el.classList.add('is-detected');
    window.setTimeout(function () {
      node.el.classList.remove('is-detected');
    }, 720);
  }

  function findFreeLocation(node) {
    var choices = [];
    for (var slot = 0; slot < SLOTS.length; slot++) {
      if (!occupied.has(slot) && SLOTS[slot].zone === SLOTS[node.slot].zone &&
          degreesBetween(angle(slot), angle(node.slot)) >= 45) {
        choices.push(slot);
      }
    }
    // Reserved points keep four inner targets visible at all times.
    if (!choices.length) return null;
    return choices[(node.scans * 5 + node.index * 3) % choices.length];
  }

  function relocate(node) {
    var destination = findFreeLocation(node);
    if (destination === null) {
      refreshPortrait(node);
      detect(node);
      return;
    }

    node.busy = true;
    occupied.add(destination); // Reserve the future slot before fading.
    node.el.classList.add('is-relocating');
    window.setTimeout(function () {
      occupied.delete(node.slot);
      node.slot = destination;
      putAtSlot(node); // Reposition while invisible; no left/top transition.
      refreshPortrait(node); // People may also show a new photo at the new location.
      window.setTimeout(function () {
        node.el.classList.remove('is-relocating');
        node.busy = false;
      }, 45);
    }, FADE_OUT);
  }

  function scanned(node) {
    if (node.busy || seconds - node.lastDetected < 2.5) return;
    node.scans++;
    node.lastDetected = seconds;
    // A few targets relocate on each scan; the others remain stationary.
    // Portraits that stay in place crossfade to their alternate image.
    var shouldMove = node.kind === 'market'
      ? (node.scans + node.index) % 2 === 0
      : node.scans % 3 === 0;
    if (shouldMove) relocate(node);
    else {
      refreshPortrait(node);
      detect(node);
    }
  }

  function update(stamp) {
    frame = 0;
    if (!inView || document.hidden) { lastStamp = 0; return; }
    if (lastStamp) seconds += Math.min((stamp - lastStamp) / 1000, .075);
    lastStamp = stamp;

    var beamAngle = modulo(seconds * SWEEP_SPEED);
    if (beam) beam.style.transform = 'rotate(' + beamAngle.toFixed(2) + 'deg)';
    var beamTravel = modulo(beamAngle - lastBeamAngle);
    // The beam crosses a fixed target: it does not drag the target along.
    nodes.forEach(function (node) {
      var crossedAt = modulo(angle(node.slot) - lastBeamAngle);
      if (beamTravel > 0 && crossedAt > 0 && crossedAt <= beamTravel) {
        scanned(node);
      }
    });
    lastBeamAngle = beamAngle;
    frame = requestAnimationFrame(update);
  }

  function start() {
    if (reduced || frame || document.hidden) return;
    lastStamp = 0;
    frame = requestAnimationFrame(update);
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastStamp = 0;
  }
  if (reduced) return;

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0 });
    observer.observe(root);
  } else {
    inView = true;
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (inView) start();
  });
})();
