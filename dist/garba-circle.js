/* Only the dancers orbit. The floor, shrine and lotus decor stay fixed. */
(() => {
  "use strict";
  const scene = document.querySelector("#celebration");
  if (!scene) return;
  const root = document.documentElement;
  const iOSWebKit = /iP(?:hone|ad|od)/.test(navigator.userAgent) && /WebKit/.test(navigator.userAgent);
  let lastPaint = 0;
  const rings = [...scene.querySelectorAll(".garba-ring")];
  let frame = 0, previous = 0, elapsed = 0, progress = 0;
  const canDance = () => root.classList.contains("cinematic") &&
    scene.classList.contains("is-visible") && !document.hidden;

  function paint() {
    rings.forEach((ring, i) => {
      const angle = elapsed * (i ? 5 : 7) + progress * (i ? 24 : 32);
      ring.style.transform = `rotate(${angle.toFixed(3)}deg)`;
    });
    scene.dispatchEvent(new Event("garba-frame"));
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    delete scene.dataset.dancing;
  }
  function dance(now) {
    frame = 0;
    if (!canDance()) { stop(); return; }
    if (previous) elapsed += Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (!iOSWebKit || now - lastPaint >= 32) {
      lastPaint = now;
      paint();
    }
    frame = requestAnimationFrame(dance);
  }
  function sync() {
    if (!root.classList.contains("cinematic")) {
      stop();
      elapsed = 0;
      progress = 0;
      rings.forEach((ring) => ring.removeAttribute("style"));
      return;
    }
    if (!canDance()) { stop(); return; }
    scene.dataset.dancing = "true";
    if (!frame) frame = requestAnimationFrame(dance);
  }
  scene.addEventListener("story-progress", (event) => {
    progress = Math.max(0, Math.min(1, Number(event.detail) || 0));
    paint();
    sync();
  });
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  observer.observe(scene, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", sync);
  addEventListener("pagehide", stop);
  addEventListener("pageshow", sync);
  sync();
})();
