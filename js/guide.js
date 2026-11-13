// First-visit tips: short, dismissible notes on the Solar System and Real Missions pages.
// Each tip ([data-tip] in index.html) shows until its "Got it" button is pressed, and that is
// remembered in this browser, so returning visitors are not shown the same tip again.
// (Build a Mission and the surface have their own first-visit guides in simulator.js and exploration.js.)

const KEY = "space-legacy-tips-seen";

let seen = {};
try {
  seen = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
} catch (error) {
  seen = {}; // storage blocked: tips show once per visit
}

function remember(id) {
  seen[id] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch (error) {
    // not remembered after this visit
  }
}

(document.querySelectorAll ? Array.from(document.querySelectorAll("[data-tip]")) : []).forEach(function (tip) {
  const id = tip.getAttribute("data-tip");
  if (!seen[id]) tip.classList.remove("hidden");
  const close = tip.querySelector(".page-tip-close");
  if (close) {
    close.addEventListener("click", function () {
      tip.classList.add("hidden");
      remember(id);
    });
  }
});
