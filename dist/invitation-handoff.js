/* A reversible hand-off: the branded envelope moves from her palm to his, then opens to reveal the District pass QR. */
(() => {
  "use strict";
  const scene = document.querySelector("#the-invitation");
  const rig = scene?.querySelector(".handoff-rig");
  const revealPanel = scene?.querySelector(".pass-reveal");
  if (!rig) return;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const palm = (x, y, dx, dy, degrees) => {
    const a = degrees * Math.PI / 180;
    return [x + dx * Math.cos(a) - dy * Math.sin(a),
      y + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  function draw(progress) {
    const reveal = ease((progress - 0.06) / 0.22);
    const reach = ease((progress - 0.20) / 0.16);
    const receive = ease((progress - 0.34) / 0.16);
    const open = ease((progress - 0.58) / 0.13);
    const qr = ease((progress - 0.67) / 0.18);
    const front = ease((progress - 0.15) / 0.10);
    const herAngle = -80 * (1 - reveal) - 68 * receive;
    const hisAngle = 48 * (1 - reach) - 8 * receive;
    const herPalm = palm(734, 331, -147.5, 56, -80 * (1 - reveal));
    const hisPalm = palm(306, 316, 152.5, 57.5, hisAngle);
    const x = (herPalm[0] - 195) * (1 - receive) + (hisPalm[0] - 135) * receive;
    const y = (herPalm[1] - 188) * (1 - receive) + (hisPalm[1] - 203) * receive;
    rig.style.setProperty("--her-arm", `${herAngle.toFixed(3)}deg`);
    rig.style.setProperty("--his-arm", `${hisAngle.toFixed(3)}deg`);
    rig.style.setProperty("--pass-x", `${(x / 270 * 100).toFixed(4)}%`);
    rig.style.setProperty("--pass-y", `${(y / (375 * 270 / 485) * 100).toFixed(4)}%`);
    rig.style.setProperty("--pass-turn", `${(12 * (1 - reveal) - 3 * receive).toFixed(3)}deg`);
    rig.style.setProperty("--front", front.toFixed(4));
    rig.style.setProperty("--rear", (1 - front).toFixed(4));
    rig.style.setProperty("--pass-visible", ease((progress - 0.07) / 0.07).toFixed(4));
    rig.style.setProperty("--handoff-fade", (1 - ease((progress - 0.62) / 0.10)).toFixed(4));
    if (revealPanel) {
      revealPanel.style.setProperty("--reveal", open.toFixed(4));
      revealPanel.style.setProperty("--qr-rise", qr.toFixed(4));
      revealPanel.style.setProperty("--qr-opacity", ease((progress - 0.65) / 0.10).toFixed(4));
      revealPanel.dataset.state = progress < 0.58 ? "closed" : progress < 0.72 ? "opening" : "passes";
    }
    rig.dataset.handoff = progress < 0.07 ? "concealed"
      : progress < 0.30 ? "revealing" : progress < 0.52 ? "offering" : progress < 0.62 ? "received" : "opened";
  }
  scene.addEventListener("story-progress", (event) => draw(event.detail));
  draw(0);
})();