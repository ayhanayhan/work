
  (function () {
    function initBuilders(root) {
      var track = root.querySelector("[data-tc-ui-track]");
      var prev  = root.querySelector("[data-tc-ui-prev]");
      var next  = root.querySelector("[data-tc-ui-next]");
      if (!track || !prev || !next) return;
      function gapPx() {
        var cs = getComputedStyle(track);
        return parseFloat(cs.columnGap || cs.gap) || 0;
      }
      function step() {
        var card = track.querySelector(".tc-ui-card");
        if (!card) return track.clientWidth;
        return card.getBoundingClientRect().width + gapPx();
      }
      /* Estado de las flechas: al principio y al final se apagan (35%),
         igual que en el resto de módulos. En modo grid el track no
         desplaza nada, así que las dos quedan deshabilitadas y las
         flechas ni se ven (CSS). */
      function syncArrows() {
        var max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
      }
      prev.addEventListener("click", function () {
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
      next.addEventListener("click", function () {
        track.scrollBy({ left: step(), behavior: "smooth" });
      });
      var t = null;
      track.addEventListener("scroll", function () {
        window.clearTimeout(t);
        t = window.setTimeout(syncArrows, 80);
      });
      var lastW = window.innerWidth;
      window.addEventListener("resize", function () {
        syncArrows();
        if (window.innerWidth === lastW) return;   /* en móvil, la barra de
             direcciones dispara resize cambiando sólo el alto */
        lastW = window.innerWidth;
      });
      window.addEventListener("load", syncArrows);
      syncArrows();
    }
    document.querySelectorAll(".tc-ui-builders").forEach(initBuilders);
    // Scroll reveal
    var reveals = document.querySelectorAll(".tc-ui-reveal");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }
  })();
