// Keeps a WebGL canvas usable when the browser or GPU drops its context.
// A context can be lost on a driver reset, when the computer sleeps, or when too many
// WebGL contexts are alive. Calling preventDefault() on "webglcontextlost" tells the
// browser the page wants the context back. After "webglcontextrestored", Three.js
// re-uploads its resources on the next render, so an animation loop recovers by itself.
export function guardContextLoss(canvas, onRestore) {
  if (!canvas || !canvas.addEventListener) return;
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
  });
  canvas.addEventListener("webglcontextrestored", function () {
    if (typeof onRestore === "function") onRestore();
  });
}
