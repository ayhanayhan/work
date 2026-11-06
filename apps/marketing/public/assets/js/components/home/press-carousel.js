
(function () {
  var carousels = document.querySelectorAll('.tc-press__carousel');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(carousels, function (root) {
    var track   = root.querySelector('.tc-press__track');
    var slides  = Array.prototype.slice.call(root.querySelectorAll('.tc-press__slide'));
    var brandEl = root.querySelector('.press__brand-img');
    var prevBtn = root.querySelector('.tc-press__arrow[data-dir="prev"]');
    var nextBtn = root.querySelector('.tc-press__arrow[data-dir="next"]');
    if (!track || slides.length === 0) return;

    var index = 0;
    var count = slides.length;
    var autoplay = root.getAttribute('data-autoplay') === '1' && !reduce && count > 1;
    var speed = (parseFloat(root.getAttribute('data-speed')) || 5) * 1000;
    var timer = null;

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (brandEl) {
        var brand = slides[index].getAttribute('data-brand');
        var alt   = slides[index].getAttribute('data-brand-alt') || '';
        if (brand) { brandEl.src = brand; brandEl.alt = alt; brandEl.style.display = ''; }
        else { brandEl.style.display = 'none'; }
      }
    }
    function go(dir) { index = (index + dir + count) % count; render(); }
    function start() {
      if (!autoplay) return;
      stop();
      timer = setInterval(function () { go(1); }, speed);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); start(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1);  start(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    if (count <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    }

    render();
    start();
  });
})();
