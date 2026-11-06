
(function () {
  var root = document.getElementById("tc-ui-faq-widget_1784811503841_220805406473");
  if (!root || root.dataset.skFaqInit === "true") return;
  root.dataset.skFaqInit = "true";
  var items = root.querySelectorAll(".tc-faq__item");
  items.forEach(function (item, idx) {
    var btn = item.querySelector(".tc-faq__question");
    var panel = item.querySelector(".tc-faq__panel");
    // Fuerza la primera pregunta abierta al cargar (idx === 0). Cambia a "false" para desactivarlo.
    var openFirst = idx === 0;
    var shouldOpen = item.classList.contains("is-open") || openFirst;
    if (shouldOpen) {
      item.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = panel.scrollHeight + "px";
    } else {
      panel.style.maxHeight = "0px";
    }
    btn.addEventListener("click", function () {
      var open = item.classList.contains("is-open");
      if (open) {
        item.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        panel.style.maxHeight = "0px";
      } else {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
      /* Para modo "solo uno abierto", descomenta:
      items.forEach(function (o) {
        if (o !== item) { o.classList.remove("is-open"); o.querySelector(".tc-faq__question").setAttribute("aria-expanded","false"); o.querySelector(".tc-faq__panel").style.maxHeight="0px"; }
      }); */
    });
  });
  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      root.querySelectorAll(".tc-faq__item.is-open .tc-faq__panel").forEach(function (p) {
        p.style.maxHeight = p.scrollHeight + "px";
      });
    }, 150);
  });
})();
