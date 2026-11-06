
(function () {
  function initIcons(section) {
    var slots = section.querySelectorAll(".tc-ui-pc__icon");
    Array.prototype.forEach.call(slots, function (slot) {
      var img = slot.querySelector("img");
      function check() {
        var src = img ? (img.getAttribute("src") || "").trim() : "";
        slot.classList.toggle("is-empty", !src);
      }
      if (img) {
        img.addEventListener("error", function () { img.removeAttribute("src"); check(); });
      }
      check();
    });
  }

  function initReveal(section) {
    var items = Array.prototype.slice.call(section.querySelectorAll(".tc-ui-pc__reveal"));
    if (!items.length) return;

    function showAll() {
      items.forEach(function (el) { el.classList.add("is-visible"); });
    }

    if (!("IntersectionObserver" in window)) { showAll(); return; }

    section.classList.add("is-reveal-ready");

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });

    items.forEach(function (el) { observer.observe(el); });

    var pending = false;
    function catchUp() {
      pending = false;
      var limit = window.innerHeight || document.documentElement.clientHeight;
      var left = 0;
      items.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        if (el.getBoundingClientRect().top < limit * 0.9) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        } else { left++; }
      });
      if (!left) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(catchUp);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function boot() {
    var sections = document.querySelectorAll("[data-tc-ui-pc]");
    Array.prototype.forEach.call(sections, function (section) {
      if (section.dataset.skPcInit) return;
      section.dataset.skPcInit = "1";
      initIcons(section);
      if (!section.hasAttribute("data-tc-ui-pc-noreveal")) initReveal(section);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
