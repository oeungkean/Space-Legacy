// Runs a resize handler at most once per animation frame, so a WebGL renderer is not
// resized (and its buffers reallocated) many times during a single window resize.
export function onResizeDebounced(handler) {
  let frame = 0;
  window.addEventListener("resize", function () {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      handler();
    });
  });
}
