(function () {
  var filename = (location.pathname.split("/").pop() || "").toLowerCase();
  var links = document.querySelectorAll("[data-nav] a[href]");

  links.forEach(function (a) {
    var href = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
    var target = (href.split("/").pop() || "").toLowerCase();
    if (!target || target === "#") return;
    if (target === filename) a.classList.add("active");
  });
})();

