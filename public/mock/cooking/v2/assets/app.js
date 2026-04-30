(function () {
  var filename = (location.pathname.split("/").pop() || "").toLowerCase();
  var links = document.querySelectorAll("[data-nav] a[href]");

  links.forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
    var target = (href.split("/").pop() || "").toLowerCase();
    if (!target || target === "#") return;
    if (target === filename) a.classList.add("active");
  });

  var openBtn = document.querySelector("[data-drawer-open]");
  var closeBtns = document.querySelectorAll("[data-drawer-close]");
  var overlay = document.querySelector("[data-drawer-overlay]");
  var drawer = document.querySelector("[data-drawer]");

  function setOpen(next) {
    if (!overlay || !drawer) return;
    overlay.dataset.open = next ? "true" : "false";
    drawer.dataset.open = next ? "true" : "false";
    if (openBtn) openBtn.setAttribute("aria-expanded", next ? "true" : "false");
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      setOpen(true);
    });
  }

  closeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setOpen(false);
    });
  });

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) setOpen(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();

(function () {
  var filename = (location.pathname.split("/").pop() || "").toLowerCase();
  var links = document.querySelectorAll("[data-nav] a[href]");

  links.forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
    var target = (href.split("/").pop() || "").toLowerCase();
    if (!target || target === "#") return;
    if (target === filename) a.classList.add("active");
  });

  var openBtn = document.querySelector("[data-drawer-open]");
  var closeBtns = document.querySelectorAll("[data-drawer-close]");
  var overlay = document.querySelector("[data-drawer-overlay]");
  var drawer = document.querySelector("[data-drawer]");

  function setOpen(next) {
    if (!overlay || !drawer) return;
    overlay.dataset.open = next ? "true" : "false";
    drawer.dataset.open = next ? "true" : "false";
    if (openBtn) openBtn.setAttribute("aria-expanded", next ? "true" : "false");
  }

  if (openBtn) openBtn.addEventListener("click", function () { setOpen(true); });
  closeBtns.forEach(function (btn) { btn.addEventListener("click", function () { setOpen(false); }); });
  if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
})();

