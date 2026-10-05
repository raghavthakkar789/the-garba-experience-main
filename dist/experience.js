/* A continuous scroll-driven film with deliberate manual dialogue stops. Every scene remains readable without JavaScript. */
(() => {
  "use strict";
  const isReload =
    performance.getEntriesByType?.("navigation")?.[0]?.type === "reload";
  if (isReload && location.hash)
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  const root = document.documentElement;
  const journey = document.querySelector(".journey");
  const stage = document.querySelector(".journey-stage");
  const elephantRide = document.querySelector(".journey-elephant");
  const scenes = [...document.querySelectorAll(".scene")];
  const hydrateNode = (node) => {
    node?.querySelectorAll?.("[data-src]").forEach(img => {
      img.decoding = "async";
      img.src = img.dataset.src;
      delete img.dataset.src;
    });
    node?.querySelectorAll?.("[data-srcset]").forEach(source => {
      source.srcset = source.dataset.srcset;
      delete source.dataset.srcset;
    });
  };
  const hydrateScene = (index) => {
    if (index < 0 || index >= scenes.length) return;
    hydrateNode(scenes[index]);
  };
  // Opening + first conversation are needed immediately.
  [0,1].forEach(hydrateScene);
  // The final walking chapter needs time for every shop, within the same film.
  const sceneSpans = scenes.map((scene) => Number(scene.dataset.scrollSpan) || 1);
  const sceneStarts = [];
  const storySpan = sceneSpans.reduce((total, span) => {
    sceneStarts.push(total);
    return total + span;
  }, 0);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const iOSWebKit = (/iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && /WebKit/.test(navigator.userAgent);
  const androidWeb = /Android/i.test(navigator.userAgent) && !iOSWebKit;
  root.classList.toggle("ios-webkit", iOSWebKit);
  root.classList.toggle("android-web", androidWeb);
  const hydrateInvitation = () => hydrateScene(2);
  if (iOSWebKit) {
    if ("requestIdleCallback" in window) requestIdleCallback(hydrateInvitation, { timeout: 900 });
    else setTimeout(hydrateInvitation, 120);
  } else hydrateInvitation();
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const scroller = document.scrollingElement || root;
  const jumpTo = (top, left = 0) => {
    const y = Math.max(0, Number(top) || 0);
    if (left) window.scrollTo(left, y);
    else scroller.scrollTop = y;
  };
  const ease = (v) => {
    const x = clamp(v);
    return x * x * (3 - 2 * x);
  };
  const toast = document.querySelector(".toast");
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4400);
  }

  let frame = 0;
  let cinematic = false;
  let activeIndex = 0;
  let journeyTop = 0;
  let travel = 1;
  let stageHeight = 1;
  let lastWidth = innerWidth;
  let lastHeight = innerHeight;
  let stableViewportHeight = Math.max(1, Math.round(window.visualViewport?.height || innerHeight));
  function updateStableViewport(force = false) {
    const current = Math.max(1, Math.round(window.visualViewport?.height || innerHeight));
    if (force || Math.abs(current - stableViewportHeight) > Math.max(120, stableViewportHeight * .18))
      stableViewportHeight = current;
    root.style.setProperty("--app-height", stableViewportHeight + "px");
  }
  updateStableViewport(true);

  // Invisible reliability fallback: only reduce expensive rendering after sustained
  // long frames. This does not alter scene order, timing, dialogue or layout.
  let lowPowerRender = false;
  let longFrameScore = 0;
  function enableLowPowerRender() {
    if (lowPowerRender) return;
    lowPowerRender = true;
    root.classList.add("low-power-render");
  }
  function noteFrameCost(duration) {
    if (!Number.isFinite(duration)) return;
    if (duration >= 50) longFrameScore += duration >= 100 ? 2 : 1;
    else longFrameScore = Math.max(0, longFrameScore - .35);
    if (longFrameScore >= 8) enableLowPowerRender();
  }
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => noteFrameCost(entry.duration));
      });
      observer.observe({ type:"longtask", buffered:true });
    } catch {}
  }
  const opening = document.querySelector(".opening-scene");
  const openingButtons = [
    ...document.querySelectorAll("[data-open-invitation]"),
  ];
  const sealButton = document.querySelector("#invitation-seal");
  let readingBoxOpen = false;
  let entryUnlocked = false;
  let focusStoryOnArrival = false;
  // One user gesture runs the doors and camera move on a deliberate timeline.
  const openingSoundButton = document.querySelector("#opening-sound");
  const soundtrack = window.garbaSoundtrack;
  let entryFrame = 0;
  const autoScrollButton = document.querySelector("#autoscroll-toggle");
  // Fixed fresh-start budget: 65 seconds from opening click to absolute page bottom.
  // The opening lands 42% into #beginning, so its full-scene duration is chosen
  // so the remaining 58% consumes exactly 3.2 seconds.
  const AUTO_INTRO_SECONDS = 3.5;
  const AUTO_FINALE_SECONDS = 8;
  const AUTO_SCENE_SECONDS = Object.freeze({
    invitation: 3.5,
    beginning: 3.2 / 0.58,
    "the-invitation": 12,
    "the-plan": 2,
    "the-drive": 2,
    arrival: 4.8,
    "a-memory": 3,
    devotion: 2.2,
    "the-stage": 2.3,
    celebration: 2,
    "partner-road": 20,
  });
  const AUTO_ENTRY_ACCEL = 4.7 / AUTO_INTRO_SECONDS;
  let autoScrolling = false, autoScrollFrame = 0, autoScrollLast = 0, autoScrollPosition = 0;
  let autoWasEntering = false;
  let iosAutoTimeline = null, iosAutoStartedAt = 0, iosAutoLastWrite = 0, iosAutoLastRender = 0;
  let iosGsapAuto = null;
  function updateAutoScrollButton() {
    autoScrollButton.setAttribute("aria-pressed", String(autoScrolling));
    autoScrollButton.setAttribute("aria-label", autoScrolling ? "Pause automatic scrolling" : "Start automatic scrolling");
    autoScrollButton.querySelector(".control-label").textContent = autoScrolling ? "Pause" : "Autoscroll";
    autoScrollButton.querySelector("use").setAttribute("href", `assets/ui-icons.svg#${autoScrolling ? "pause" : "play"}`);
  }
  function stopAutoScroll() {
    const wasRunning = autoScrolling;
    autoScrolling = false;
    cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = 0;
    stopIosGsapAuto();
    iosAutoTimeline = null;
    iosAutoStartedAt = 0;
    iosAutoLastWrite = 0;
    iosAutoLastRender = 0;
    root.classList.remove("ios-autoscroll-safe");
    if (wasRunning && entryFrame) cancelEntry();
    updateAutoScrollButton();
  }

  function buildIosAutoTimeline(startY) {
    // Store semantic progress, not absolute pixels. Safari can resize its visual
    // viewport or finish image/font layout while Autoscroll is running; mapping
    // scene progress back to live geometry each frame keeps the timeline stable.
    const segments = [];
    const currentStoryEnd = journeyTop + travel;
    let y = clamp(startY, 0, Math.max(0, root.scrollHeight - innerHeight));

    if (cinematic && y < currentStoryEnd) {
      const cursor = clamp((y - journeyTop) / Math.max(1, travel)) * storySpan;
      let firstIndex = scenes.length - 1;
      while (firstIndex > 0 && cursor < sceneStarts[firstIndex]) firstIndex--;

      for (let i = firstIndex; i < scenes.length; i++) {
        const span = sceneSpans[i];
        const startCursor = sceneStarts[i];
        const endCursor = startCursor + span;
        const fromLocal = i === firstIndex
          ? clamp((cursor - startCursor) / Math.max(.001, span))
          : 0;
        const toLocal = 1;
        if (toLocal <= fromLocal) continue;

        const fullDuration = AUTO_SCENE_SECONDS[scenes[i].id] || 3;
        segments.push({
          kind:"story",
          sceneIndex:i,
          fromLocal,
          toLocal,
          duration:Math.max(.05, fullDuration * (toLocal - fromLocal)),
        });
      }
    }

    // Finale progress is also normalized so mobile layout height can change
    // without invalidating the remaining elapsed-time schedule.
    const liveEnd = Math.max(0, root.scrollHeight - innerHeight);
    const liveFinaleStart = journeyTop + travel;
    if (y >= liveFinaleStart || !cinematic) {
      const finaleDistance = Math.max(1, liveEnd - liveFinaleStart);
      const fromLocal = clamp((y - liveFinaleStart) / finaleDistance);
      if (fromLocal < 1)
        segments.push({
          kind:"finale",
          fromLocal,
          toLocal:1,
          duration:Math.max(.05, AUTO_FINALE_SECONDS * (1 - fromLocal)),
        });
    } else if (segments.length) {
      segments.push({
        kind:"finale",
        fromLocal:0,
        toLocal:1,
        duration:AUTO_FINALE_SECONDS,
      });
    }

    let elapsed = 0;
    for (const segment of segments) {
      segment.start = elapsed;
      elapsed += segment.duration;
      segment.end = elapsed;
    }
    return { segments, duration:elapsed };
  }

  function iosAutoPositionAt(elapsedSeconds) {
    const timeline = iosAutoTimeline;
    const liveEnd = Math.max(0, root.scrollHeight - innerHeight);
    if (!timeline?.segments?.length) return clamp(scrollY, 0, liveEnd);

    const segment = elapsedSeconds >= timeline.duration
      ? timeline.segments[timeline.segments.length - 1]
      : timeline.segments.find(item => elapsedSeconds <= item.end) || timeline.segments[timeline.segments.length - 1];
    const localTime = clamp((elapsedSeconds - segment.start) / Math.max(.001, segment.duration));
    const semantic = segment.fromLocal + (segment.toLocal - segment.fromLocal) * localTime;

    if (segment.kind === "story") {
      const cursor = sceneStarts[segment.sceneIndex] + semantic * sceneSpans[segment.sceneIndex];
      return clamp(journeyTop + cursor / storySpan * travel, 0, liveEnd);
    }

    const liveFinaleStart = journeyTop + travel;
    return clamp(liveFinaleStart + semantic * Math.max(1, liveEnd - liveFinaleStart), 0, liveEnd);
  }
  function iosGsapAvailable() {
    return iOSWebKit && window.gsap && window.ScrollToPlugin;
  }

  function stopIosGsapAuto() {
    if (!iosGsapAuto) return;
    iosGsapAuto.kill();
    iosGsapAuto = null;
  }

  function startIosGsapAuto() {
    if (!iosGsapAvailable() || !autoScrolling || entryFrame) return false;

    stopIosGsapAuto();
    window.gsap.registerPlugin(window.ScrollToPlugin);

    // Only this isolated GSAP instance is used for iOS automatic scrolling.
    // The site's existing scroll-linked animation/render system is untouched.
    const tl = window.gsap.timeline({
      defaults:{ ease:"none" },
      onComplete:() => {
        iosGsapAuto = null;
        if (!autoScrolling) return;
        const liveEnd = Math.max(0, root.scrollHeight - innerHeight);
        scroller.scrollTop = liveEnd;
        stopAutoScroll();
      }
    });

    const currentY = scrollY;
    const storyEnd = journeyTop + travel;

    if (cinematic && currentY < storyEnd) {
      const cursor = clamp((currentY - journeyTop) / Math.max(1, travel)) * storySpan;
      let first = scenes.length - 1;
      while (first > 0 && cursor < sceneStarts[first]) first--;

      for (let i = first; i < scenes.length; i++) {
        const span = sceneSpans[i];
        const sceneStart = sceneStarts[i];
        const fromLocal = i === first
          ? clamp((cursor - sceneStart) / Math.max(.001, span))
          : 0;
        const remaining = Math.max(0, 1 - fromLocal);
        if (!remaining) continue;

        const duration = (AUTO_SCENE_SECONDS[scenes[i].id] || 3) * remaining;
        tl.to(window, {
          duration,
          scrollTo:{
            y:() => {
              const liveCursor = sceneStart + span;
              return clamp(
                journeyTop + liveCursor / storySpan * travel,
                0,
                Math.max(0, root.scrollHeight - innerHeight),
              );
            },
            autoKill:false,
          },
        });
      }
    }

    const liveEnd = Math.max(0, root.scrollHeight - innerHeight);
    const finaleStart = journeyTop + travel;
    const finaleDistance = Math.max(1, liveEnd - finaleStart);
    const finaleLocal = clamp((Math.max(scrollY, finaleStart) - finaleStart) / finaleDistance);
    if (finaleLocal < 1) {
      tl.to(window, {
        duration:Math.max(.05, AUTO_FINALE_SECONDS * (1 - finaleLocal)),
        scrollTo:{
          y:() => Math.max(0, root.scrollHeight - innerHeight),
          autoKill:false,
        },
      });
    }

    if (!tl.duration()) {
      tl.kill();
      return false;
    }

    iosGsapAuto = tl;
    return true;
  }

    function advanceAutoScroll(now) {
    if (iOSWebKit) {
      if (autoScrolling) stopAutoScroll();
      return;
    }
    if (!autoScrolling) return;
    if (document.hidden || document.querySelector("dialog[open]")) { stopAutoScroll(); return; }

    // On iOS, prefer GSAP ScrollToPlugin for programmatic Autoscroll.
    // Manual/native scrolling and all existing scene rendering remain unchanged.
    if (iOSWebKit && iosGsapAvailable()) {
      if (entryFrame) {
        stopIosGsapAuto();
        autoScrollPosition = scrollY;
        autoWasEntering = true;
        autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
        return;
      }
      autoWasEntering = false;
      if (!iosGsapAuto) startIosGsapAuto();
      return;
    }

    // Fallback only if GSAP/ScrollToPlugin failed to load.
    if (iOSWebKit) {
      if (entryFrame) {
        autoScrollPosition = scrollY;
        autoWasEntering = true;
        iosAutoTimeline = null;
        iosAutoStartedAt = 0;
      } else {
        if (autoWasEntering || !iosAutoTimeline) {
          autoScrollPosition = scrollY;
          autoWasEntering = false;
          iosAutoTimeline = buildIosAutoTimeline(scrollY);
          iosAutoStartedAt = now;
          iosAutoLastWrite = 0;
        }

        const elapsedSeconds = Math.max(0, now - iosAutoStartedAt) / 1000;
        autoScrollPosition = iosAutoPositionAt(elapsedSeconds);

        // Safari safety: do not force a scroll write on every RAF. 30 Hz is
        // visually smooth for this story while greatly reducing layout/paint
        // pressure; sustained jank automatically falls back to ~20 Hz.
        const writeInterval = (lowPowerRender || longFrameScore >= 4) ? 80 : 50;
        if (!iosAutoLastWrite || now - iosAutoLastWrite >= writeInterval) {
          iosAutoLastWrite = now;
          if (Math.abs(scrollY - autoScrollPosition) > .75)
            scroller.scrollTop = autoScrollPosition;
        }

        const liveEnd = Math.max(0, root.scrollHeight - innerHeight);
        if (elapsedSeconds >= iosAutoTimeline.duration || scrollY >= liveEnd - 1) {
          scroller.scrollTop = liveEnd;
          stopAutoScroll();
          return;
        }
      }
      autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
      return;
    }

    const seconds = Math.min(Math.max(0, now - autoScrollLast), 120) / 1000;
    autoScrollLast = now;
    // The door/descent sequence retains sole control until landing.
    if (entryFrame) { autoScrollPosition = scrollY; autoWasEntering = true; }
    else {
      if (autoWasEntering) { autoScrollPosition = scrollY; autoWasEntering = false; }
      const end = Math.max(0, root.scrollHeight - innerHeight);
      if (scrollY >= end - 1) { stopAutoScroll(); return; }
      const inStory = cinematic && scrollY < journeyTop + travel;
      let sceneIndex = -1;
      if (inStory) {
        const cursor = clamp((scrollY - journeyTop) / travel) * storySpan;
        sceneIndex = scenes.length - 1;
        while (sceneIndex > 0 && cursor < sceneStarts[sceneIndex]) sceneIndex--;
      } else if (!cinematic) {
        sceneIndex = scenes.findIndex(scene => scene.getBoundingClientRect().bottom > innerHeight / 2);
      }
      let targetSpeed;
      if (inStory && sceneIndex >= 0) {
        const scene = scenes[sceneIndex];
        const duration = AUTO_SCENE_SECONDS[scene.id] || 3;
        const distance = travel * sceneSpans[sceneIndex] / storySpan;
        targetSpeed = distance / duration;
      } else if (!cinematic && sceneIndex >= 0) {
        const scene = scenes[sceneIndex];
        const duration = AUTO_SCENE_SECONDS[scene.id] || 3;
        targetSpeed = Math.max(1, scene.getBoundingClientRect().height) / duration;
      } else {
        const finaleStart = journeyTop + travel;
        const finaleDistance = Math.max(1, end - finaleStart);
        targetSpeed = finaleDistance / AUTO_FINALE_SECONDS;
      }
      autoScrollPosition = Math.min(end, autoScrollPosition + targetSpeed * seconds);
      const before = scrollY;
      jumpTo(autoScrollPosition);
      if (Math.abs(scrollY - before) < .5 && Math.abs(autoScrollPosition - before) > 1)
        scroller.scrollTop = autoScrollPosition;
    }
    autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
  }
  // iOS/iPadOS: manual scrolling is reliable, so hide and hard-disable
  // Autoscroll only on WebKit iOS devices. Desktop and Android are unchanged.
  autoScrollButton.hidden = iOSWebKit;
  autoScrollButton.disabled = iOSWebKit;
  if (iOSWebKit)
    autoScrollButton.setAttribute("aria-label", "Autoscroll unavailable on iOS");

  autoScrollButton.addEventListener("click", () => {
    if (iOSWebKit) return;
    cancelManualScroll();
    if (autoScrolling) { stopAutoScroll(); return; }
    if (document.querySelector("dialog[open]")) return;
    if (!entryUnlocked || (!cinematic && !readingBoxOpen)) beginEntry();
    if (scrollY >= root.scrollHeight - innerHeight - 1) return;
    autoScrolling = true;
    stopIosGsapAuto();
    autoWasEntering = Boolean(entryFrame);
    autoScrollPosition = scrollY;
    autoScrollLast = performance.now();
    iosAutoTimeline = null;
    iosAutoStartedAt = 0;
    iosAutoLastWrite = 0;
    iosAutoLastRender = 0;
    root.classList.toggle("ios-autoscroll-safe", iOSWebKit);
    updateAutoScrollButton();
    autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
  });
  const scrollControl = target => target?.closest?.("#autoscroll-toggle, #soundtrack-toggle, #opening-sound");
  addEventListener("wheel", stopAutoScroll, { passive:true });
  addEventListener("touchstart", event => { if (!scrollControl(event.target)) stopAutoScroll(); }, { passive:true });
  document.addEventListener("pointerdown", event => { if (!scrollControl(event.target)) stopAutoScroll(); }, { passive:true });
  document.addEventListener("keydown", event => {
    const activatesControl = event.key === " " && scrollControl(event.target);
    if (event.key === "Escape" || (!activatesControl && ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(event.key))) stopAutoScroll();
  });
  document.addEventListener("click", event => {
    if (event.target.closest?.("a,button,input,select,textarea") && !scrollControl(event.target)) stopAutoScroll();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAutoScroll(); });
  addEventListener("pagehide", stopAutoScroll);
  addEventListener("pageshow", () => {
    if (!autoScrolling || autoScrollFrame || document.hidden) return;
    autoScrollPosition = scrollY;
    autoScrollLast = performance.now();
    if (iOSWebKit) {
      iosAutoTimeline = buildIosAutoTimeline(scrollY);
      iosAutoStartedAt = performance.now();
    }
    autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
  });
  // Manual scrolling: bounded momentum with continuous content-aware slowdowns.
  // No snapping, forced pauses or checkpoint locks.
  let manualFrame = 0, manualTarget = 0, manualPosition = 0, manualLast = 0, manualVelocity = 0;
  let touchY = null, touchX = null, touchOwned = false;
  let androidPointerId = null, androidPointerY = null, androidPointerX = null, androidPointerOwned = false;
  let readingZones = [], readingZonesDirty = true;

  const manualMaxSpeed = () => clamp(innerHeight * 1.8, 950, 1900);
  const manualQueueBudget = () => Math.min(820, innerHeight * .95);
  const slowdownRadius = () => clamp(innerHeight * .26, 160, 260);

  function stopManualMotion(sync = true) {
    if (manualFrame) cancelAnimationFrame(manualFrame);
    manualFrame = 0;
    manualVelocity = 0;
    if (sync) manualPosition = manualTarget = scrollY;
  }
  function cancelManualScroll() {
    stopManualMotion();
    touchY = touchX = null;
    touchOwned = false;
  }

  function addVirtualReadingZone(sceneId, local) {
    const index = scenes.findIndex(scene => scene.id === sceneId);
    if (index < 0) return;
    readingZones.push(
      journeyTop + (sceneStarts[index] + clamp(local) * sceneSpans[index]) / storySpan * travel,
    );
  }

  function rebuildReadingZones() {
    readingZones = [];
    if (cinematic) {
      scenes.forEach((scene, index) => {
        scene.querySelectorAll(".dialogue-beat").forEach(line => {
          const beat = Number(line.dataset.at) || 0;
          const local = scene.id === "beginning" && beat === 0 ? .42 : Math.max(.06, beat + .015);
          readingZones.push(
            journeyTop + (sceneStarts[index] + local * sceneSpans[index]) / storySpan * travel,
          );
        });
      });
      // Key non-dialogue messages that deserve a gentle read-through.
      addVirtualReadingZone("the-invitation", .60); // pass / QR reveal
      addVirtualReadingZone("a-memory", .62);       // photo caption / keepsake moment
      addVirtualReadingZone("partner-road", .08);  // sponsor heading / introduction
    } else {
      document.querySelectorAll(".dialogue-beat").forEach(line => {
        const box = line.getBoundingClientRect();
        readingZones.push(box.top + scrollY + box.height / 2 - innerHeight * .45);
      });
    }

    document.querySelectorAll(
      ".thank-you-message, .thank-you-kicker, .entry-note, .booking-note, footer p",
    ).forEach(element => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      readingZones.push(box.top + scrollY + box.height / 2 - innerHeight * .45);
    });

    readingZones = readingZones
      .map(value => clamp(value, 0, Math.max(0, root.scrollHeight - innerHeight)))
      .sort((a, b) => a - b);
    readingZonesDirty = false;
  }

  function manualSceneFactor(position) {
    // Dialogue scenes keep the current manual-scroll feel exactly as-is.
    // Non-dialogue scenes get an additional 15% reduction.
    if (!cinematic) {
      const viewportY = position - scrollY + innerHeight * .5;
      const scene = scenes.find(item => {
        const box = item.getBoundingClientRect();
        return viewportY >= box.top && viewportY <= box.bottom;
      });
      return scene?.querySelector(".dialogue-beat") ? 1 : .975;
    }
    if (position < journeyTop || position >= journeyTop + travel) return .975;
    const cursor = clamp((position - journeyTop) / travel) * storySpan;
    let index = scenes.length - 1;
    while (index > 0 && cursor < sceneStarts[index]) index--;
    return scenes[index]?.querySelector(".dialogue-beat") ? 1 : .975;
  }

  function readingSlowdown(position) {
    if (readingZonesDirty) rebuildReadingZones();
    if (!readingZones.length) return 1;
    const radius = slowdownRadius();
    let nearest = Infinity;
    for (const zone of readingZones) {
      const distance = Math.abs(zone - position);
      if (distance < nearest) nearest = distance;
      if (zone > position + radius && distance > nearest) break;
    }
    if (nearest >= radius) return 1;
    const t = clamp(nearest / radius);
    const smooth = t * t * (3 - 2 * t);
    return .78 + .22 * smooth;
  }

  function advanceManualScroll(now) {
    manualFrame = 0;
    if (autoScrolling || entryFrame || document.hidden || document.querySelector("dialog[open]")) {
      stopManualMotion(); return;
    }

    const distance = manualTarget - manualPosition;
    const dt = Math.min(48, Math.max(0, now - manualLast)) / 1000;
    manualLast = now;

    if (Math.abs(distance) <= .35 && Math.abs(manualVelocity) <= 2) {
      manualVelocity = 0;
      manualPosition = manualTarget;
      jumpTo(manualPosition);
      return;
    }

    const slowdown = readingSlowdown(manualPosition);
    const sceneFactor = manualSceneFactor(manualPosition);
    const maxSpeed = manualMaxSpeed() * slowdown * sceneFactor;

    // Remove the hard-scroll component completely: velocity approaches the
    // requested motion gradually instead of snapping to the speed ceiling.
    const desiredVelocity = clamp(distance * 6.8, -maxSpeed, maxSpeed);
    const response = 1 - Math.exp(-dt / .07);
    manualVelocity += (desiredVelocity - manualVelocity) * response;

    let step = manualVelocity * dt;
    if (Math.abs(step) > Math.abs(distance)) {
      step = distance;
      manualVelocity = 0;
    }

    manualPosition += step;
    jumpTo(manualPosition);

    if (Math.abs(manualTarget - manualPosition) > .35 || Math.abs(manualVelocity) > 2)
      manualFrame = requestAnimationFrame(advanceManualScroll);
  }

  function manualScroll(delta, gain = 1.35) {
    if (!delta || (cinematic && !entryUnlocked)) return;
    if (autoScrolling) stopAutoScroll();
    if (entryFrame) cancelEntry();

    if (!manualFrame) manualPosition = manualTarget = scrollY;
    const slowdown = readingSlowdown(manualPosition);
    const sceneFactor = manualSceneFactor(manualPosition);
    const baseBudget = manualQueueBudget();
    const localBudget = Math.max(260 * sceneFactor, baseBudget * slowdown * sceneFactor);
    const amount = delta * gain * slowdown * sceneFactor;
    const direction = Math.sign(amount);

    if (reduced.matches) {
      const immediate = clamp(amount, -localBudget, localBudget);
      manualPosition = manualTarget = clamp(
        scrollY + immediate,
        0,
        Math.max(0, root.scrollHeight - innerHeight),
      );
      jumpTo(manualPosition);
      return;
    }

    if (direction && Math.sign(manualTarget - manualPosition) !== direction) {
      manualTarget = manualPosition;
      manualVelocity *= .18;
    }

    manualTarget = clamp(
      manualTarget + amount,
      Math.max(0, manualPosition - localBudget),
      Math.min(root.scrollHeight - innerHeight, manualPosition + localBudget),
    );

    if (!manualFrame) {
      manualLast = performance.now();
      manualFrame = requestAnimationFrame(advanceManualScroll);
    }
  }

  function localScrollableTarget(target, delta = 0) {
    for (let element = target?.nodeType === 1 ? target : target?.parentElement;
      element && element !== document.body; element = element.parentElement) {
      if (element.matches?.("dialog, input, textarea, select, [contenteditable=true], iframe"))
        return true;
      const style = getComputedStyle(element);
      if (!/(auto|scroll|overlay)/.test(style.overflowY) || element.scrollHeight <= element.clientHeight + 1)
        continue;
      if (!delta) return true;
      if (delta > 0 && element.scrollTop < element.scrollHeight - element.clientHeight - 1) return true;
      if (delta < 0 && element.scrollTop > 1) return true;
    }
    return false;
  }

  addEventListener("wheel", event => {
    if (event.ctrlKey || event.metaKey || document.querySelector("dialog[open]")) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const raw = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (localScrollableTarget(event.target, raw)) return;
    if (!entryUnlocked && cinematic) return;
    if (event.cancelable) event.preventDefault();

    // Device-independent wheel/trackpad normalization. A very aggressive wheel
    // notch or trackpad fling can no longer flood the movement queue.
    const normalized = clamp(raw, -360, 360);
    manualScroll(normalized, 1.35);
  }, { passive:false });

  addEventListener("touchstart", event => {
    if (iOSWebKit || androidWeb) {
      if (!scrollControl(event.target) && autoScrolling) stopAutoScroll();
      stopManualMotion();
      return;
    }
    if (event.touches?.length !== 1 || !event.target.closest?.("main") ||
        localScrollableTarget(event.target) || scrollControl(event.target)) {
      touchY = touchX = null;
      touchOwned = false;
      return;
    }
    if (autoScrolling) stopAutoScroll();
    stopManualMotion();
    touchY = event.touches[0].clientY;
    touchX = event.touches[0].clientX;
    touchOwned = false;
  }, { passive:true });

  addEventListener("touchmove", event => {
    if (iOSWebKit || androidWeb) return;
    if (touchY === null || touchX === null || event.touches?.length !== 1 ||
        document.querySelector("dialog[open]")) return;
    const touch = event.touches[0];
    const dy = touchY - touch.clientY;
    const dx = touchX - touch.clientX;
    if (!touchOwned) {
      if (Math.abs(dx) > Math.abs(dy) * 1.05) {
        touchY = touch.clientY;
        touchX = touch.clientX;
        return;
      }
      if (Math.abs(dy) < 2) return;
      touchOwned = true;
    }
    touchY = touch.clientY;
    touchX = touch.clientX;
    // When vertical scrolling is app-owned, keep moving even if WebKit reports
    // a non-cancelable touchmove; only prevent native scrolling when allowed.
    if (event.cancelable) event.preventDefault();
    manualScroll(dy, 1.12);
  }, { passive:false });

  for (const name of ["touchend", "touchcancel"]) addEventListener(name, () => {
    touchY = touchX = null;
    touchOwned = false;
  }, { passive:true });

  if (androidWeb && "PointerEvent" in window) {
    addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch" || event.isPrimary === false ||
          !event.target.closest?.("main") || localScrollableTarget(event.target) ||
          scrollControl(event.target) || document.querySelector("dialog[open]")) return;
      if (autoScrolling) stopAutoScroll();
      stopManualMotion();
      androidPointerId = event.pointerId;
      androidPointerY = event.clientY;
      androidPointerX = event.clientX;
      androidPointerOwned = false;
      try { event.target.setPointerCapture?.(event.pointerId); } catch {}
    }, { passive:true });

    addEventListener("pointermove", event => {
      if (event.pointerType !== "touch" || event.pointerId !== androidPointerId ||
          androidPointerY === null || androidPointerX === null ||
          document.querySelector("dialog[open]")) return;

      const dy = androidPointerY - event.clientY;
      const dx = androidPointerX - event.clientX;

      if (!androidPointerOwned) {
        if (Math.abs(dx) > Math.abs(dy) * 1.05) {
          androidPointerY = event.clientY;
          androidPointerX = event.clientX;
          return;
        }
        if (Math.abs(dy) < 2) return;
        androidPointerOwned = true;
      }

      androidPointerY = event.clientY;
      androidPointerX = event.clientX;
      if (event.cancelable) event.preventDefault();

      // Same controlled Android touch gain as the existing manual-scroll model.
      manualScroll(clamp(dy, -140, 140), 1.12);
    }, { passive:false });

    const endAndroidPointer = event => {
      if (event.pointerId !== androidPointerId) return;
      androidPointerId = null;
      androidPointerY = androidPointerX = null;
      androidPointerOwned = false;
    };
    addEventListener("pointerup", endAndroidPointer, { passive:true });
    addEventListener("pointercancel", endAndroidPointer, { passive:true });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { cancelManualScroll(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector("dialog[open]")) return;
    if (localScrollableTarget(event.target)) return;
    if ([" ", "Enter"].includes(event.key) && event.target.closest?.("button,a,summary")) return;
    const page = Math.min(760, innerHeight * .88);
    const delta = {
      ArrowDown: 64, ArrowUp: -64,
      PageDown: page, PageUp: -page,
      End: page, Home: -page,
      " ": event.shiftKey ? -page : page,
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    manualScroll(delta, 1);
  });

  document.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && !scrollControl(event.target)) stopManualMotion();
  }, { passive:true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelManualScroll();
      lastRenderSample = 0;
    }
  });
  addEventListener("pagehide", cancelManualScroll);
  function cancelEntry() {
    if (entryFrame) cancelAnimationFrame(entryFrame);
    entryFrame = 0;
    delete opening.dataset.entering;
    focusStoryOnArrival = false;
    root.classList.remove("journey-finished");
    soundtrack?.cancelIntro();
  }
  function beginEntry() {
    cancelManualScroll();
    if (entryFrame) return;
    entryUnlocked = true;
    root.classList.remove("invitation-locked");
    soundtrack?.begin(cinematic);
    if (!cinematic) {
      readingBoxOpen = true;
      updateOpening(1);
      scrollToScene(document.querySelector("#beginning"), "instant");
      document.querySelector("#beginning-title").focus({ preventScroll: true });
      return;
    }
    const from = scrollY;
    const to = journeyTop + (1.42 / storySpan) * travel;
    let lastEntryTime = performance.now(), elapsed = 0;
    opening.dataset.entering = "true";
    focusStoryOnArrival = true;
    const advance = (now) => {
      // Autoscroll fast-forwards the dialogue-free opening; the logo keeps its normal timing.
      elapsed += (now - lastEntryTime) * (autoScrolling ? AUTO_ENTRY_ACCEL : 1);
      lastEntryTime = now;
      const doorDuration = 1425;
      const descentDuration = 2800;
      const entryDuration = doorDuration + descentDuration;
      const soundDuration = 4700;
      const doorTime = clamp(elapsed / doorDuration);
      // Audio keeps the original clock: door until 1.9s, descent until 4.7s.
      soundtrack?.setIntroElapsed?.(elapsed);
      // Door/camera opening is 25% faster; the character descent keeps its timing.
      const progress = elapsed <= doorDuration
        ? doorTime < 0.66
          ? 0.48 * ease(doorTime / 0.66)
          : 0.48 + 0.52 * ease((doorTime - 0.66) / 0.34)
        : 1 + 0.42 * clamp((elapsed - doorDuration) / descentDuration);
      jumpTo(from + (to - from) * Math.min(progress, 1.42) / 1.42);
      if (elapsed < soundDuration) {
        // Visual movement finishes at 4.225s; keep the lightweight frame alive
        // only long enough for the original intro audio clock to finish at 4.7s.
        entryFrame = requestAnimationFrame(advance);
      } else {
        soundtrack?.finishIntroClock?.();
        entryFrame = 0;
        delete opening.dataset.entering;
        if (autoScrolling) {
          autoScrollPosition = scrollY;
          autoScrollLast = performance.now();
          if (!autoScrollFrame) autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
        }
      }
    };
    entryFrame = requestAnimationFrame(advance);
  }
  openingSoundButton.hidden = false;
  for (const event of ["wheel", "touchstart"])
    addEventListener(event, (input) => {
      if (input.type === "touchstart" && scrollControl(input.target)) return;
      if (entryFrame) cancelEntry();
    }, { passive: true });
  addEventListener("pagehide", cancelEntry);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && entryFrame) cancelEntry();
    opening.querySelector(".seal-prompt").style.animationPlayState = document.hidden ? "paused" : "running";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === " " && scrollControl(event.target)) return;
    if (entryFrame && ["Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelEntry();
  });
  document.addEventListener("pointerdown", (event) => {
    if (entryFrame && !event.target.closest?.("#invitation-seal, #opening-sound, #soundtrack-toggle, #autoscroll-toggle")) cancelEntry();
  }, { passive: true });
  function updateOpening(open, enter = 0) {
    opening.style.setProperty("--enter", enter.toFixed(4));
    // Counter-scale the courtyard to keep it sharp as the box aperture expands.
    opening.style.setProperty(
      "--portal-inverse",
      (1.08 / (1 + enter * 3.5)).toFixed(4),
    );
    opening.style.setProperty("--entry-copy", (1 - clamp(open * 2)).toFixed(4));
    opening.style.setProperty("--open", open.toFixed(4));
    opening.style.setProperty("--seal", (1 - clamp(open * 4)).toFixed(4));
    const revealed = open >= 0.95;
    opening.dataset.open = String(revealed);
    openingButtons.forEach((button) => {
      button.hidden = button === sealButton && open >= 0.25;
      button.setAttribute("aria-expanded", String(revealed));
      button.setAttribute(
        "aria-label",
        revealed ? "Follow their story" : "Open your invitation",
      );
    });
  }

  // Dialogue beats and the original illustrated cast advance with native scroll.
  function animateStory(scene, progress) {
    const beats = [...scene.querySelectorAll(".dialogue-beat")];
    let spoken = 0;
    beats.forEach((line, i) => {
      if (progress >= Number(line.dataset.at)) spoken = i;
    });
    beats.forEach((line, i) => {
      line.classList.toggle("is-speaking", i === spoken);
      line.setAttribute("aria-hidden", String(i !== spoken));
    });
    scene.dataset.speaker = beats[spoken]?.dataset.speaker || "him";
    const w = innerWidth,
      h = stageHeight;
    const person = (
      who,
      x = 0,
      y = 0,
      opacity = 1,
      scale = 1,
      pose = "think",
      tilt = 0,
    ) => {
      const el = scene.querySelector(`.story-person.${who}`);
      if (!el) return;
      el.style.setProperty("--person-x", `${x.toFixed(2)}px`);
      el.style.setProperty("--person-y", `${y.toFixed(2)}px`);
      el.style.setProperty("--person-opacity", opacity.toFixed(3));
      el.style.setProperty("--person-scale", scale.toFixed(3));
      el.style.setProperty("--person-tilt", `${tilt.toFixed(2)}deg`);
      el.dataset.pose = pose;
    };
    const together = (opacity, scale, y) => {
      scene.style.setProperty("--together-opacity", opacity.toFixed(3));
      scene.style.setProperty("--together-scale", scale.toFixed(3));
      scene.style.setProperty("--together-y", `${y.toFixed(2)}px`);
    };
    if (scene.id === "beginning") {
      for (const [who, delay, direction] of [["man", 0, 1], ["woman", 0.025, -1]]) {
        const lower = ease((progress - delay) / 0.28);
        const land = ease((progress - 0.29 - delay) / 0.065);
        const el = scene.querySelector(`.story-person.${who}`);
        person(who);
        el.style.setProperty("--descent-y", `${(-(1 - lower) * h * 1.25).toFixed(2)}px`);
        el.style.setProperty("--descent-turn", `${(Math.sin(lower * Math.PI * 2) * 4 * direction * (1 - land)).toFixed(2)}deg`);
        el.style.setProperty("--landed", land.toFixed(4));
      }
      // Finish before the automatic endpoint; scroll positions round to pixels.
      const arrived = ease((progress - 0.385) / 0.025);
      scene.style.setProperty("--arrival-copy", arrived.toFixed(4));
      beats.forEach((line, i) => line.setAttribute("aria-hidden", String(arrived < 1 || i !== spoken)));
    }
    if (scene.id === "the-plan") {
      const board = ease((progress - 0.25) / 0.22);
      const fade = 1 - ease((progress - 0.36) / 0.11);
      person(
        "man",
        board * w * 0.10,
        -board * h * 0.31,
        fade,
        0.7 - board * 0.25,
        board > 0 ? "walk" : "think",
      );
      person(
        "woman",
        -board * w * 0.12,
        -board * h * 0.3,
        fade,
        0.7 - board * 0.25,
        board > 0 ? "walk" : "think",
      );
    }
    if (scene.id === "the-drive")
      scene.style.setProperty("--road-zoom", (1 + progress * 0.16).toFixed(3));
    if (scene.id === "arrival") {
      const step = ease((progress - 0.17) / 0.18);
      const joined = ease((progress - 0.34) / 0.07),
        walk = ease((progress - 0.42) / 0.26);
      const gateDetail = ease((progress - 0.18) / 0.14) * (1 - ease((progress - 0.38) / 0.12));
      const passageDetail = ease((progress - 0.38) / 0.14) * (1 - ease((progress - 0.62) / 0.12));
      const passage = ease((progress - 0.62) / 0.16);
      scene.style.setProperty("--gate-detail-opacity", gateDetail.toFixed(4));
      scene.style.setProperty("--passage-detail-opacity", passageDetail.toFixed(4));
      scene.style.setProperty("--passage-opacity", passage.toFixed(4));
      person("man", -(1 - step) * w * .1, -(1 - step) * h * .24, step * (1 - joined), .65, "walk");
      person("woman", -(1 - step) * w * .22, -(1 - step) * h * .24, step * (1 - joined), .65, "walk");
      together(
        joined,
        0.8 - walk * 0.49,
        -walk * h * 0.2 + passage * h * 0.12 + Math.sin(walk * Math.PI * 10) * 2,
      );
    }
    if (scene.id === "a-memory") {
      const gather = ease(progress / 0.22);
      const showPhoto = scene.dataset.photo
        ? scene.dataset.photo === "true"
        : progress > 0.54;
      const photo = showPhoto ? 1 : 0;
      scene.style.setProperty("--photo-opacity", photo);
      scene.style.setProperty("--photo-scale", showPhoto ? 1 : 0.85);
      scene.style.setProperty("--dialogue-opacity", 1 - photo);
      person(
        "man",
        (1 - gather) * -w * 0.1,
        0,
        1 - photo,
        1,
        gather < 1 ? "walk" : "think",
      );
      person(
        "woman",
        (1 - gather) * w * 0.1,
        0,
        1 - photo,
        1,
        gather < 1 ? "walk" : "think",
      );
      const button = scene.querySelector("#take-story-photo");
      button.setAttribute("aria-pressed", String(showPhoto));
      button.querySelector(".control-label").textContent = showPhoto
        ? "Back to the moment"
        : "Take their photo";
    }
    if (scene.id === "the-stage")
      together(1, 1 - progress * 0.12, -progress * h * 0.025);
    if (scene.id === "celebration") {
      const approach = ease((progress - 0.08) / 0.78);
      scene.style.setProperty("--garba-zoom", (1 + approach * 1.15).toFixed(4));
      scene.style.setProperty("--garba-dialogue-opacity", (1 - ease((progress - 0.42) / 0.14)).toFixed(4));
    }
    if (scene.id === "devotion")
      scene.style.setProperty(
        "--prayer-tilt",
        `${Math.sin(progress * Math.PI * 3) * 1.4}deg`,
      );
  }

  // One shared elephant survives the scene dissolves; only its surroundings change.
  function animateElephant(cursor) {
    const visible = cursor >= 3 && cursor < 5.52;
    elephantRide.hidden = !visible;
    elephantRide.setAttribute("aria-hidden", String(!visible));
    elephantRide.dataset.walking = String(visible && (
      cursor < 3.22 || (cursor > 3.5 && cursor < 5.08) || cursor > 5.34));
    if (!visible) return;
    const enter = ease((cursor - 3.02) / .20);
    const travel = ease((cursor - 3.52) / 1.55);
    const leave = ease((cursor - 5.34) / .14);
    const board = ease((cursor - 3.36) / .11);
    const dismount = ease((cursor - 5.17) / .18);
    elephantRide.style.setProperty("--ride-x", `${((1 - enter) * -innerWidth * 1.2 + travel * innerWidth * .05 + leave * innerWidth * 1.2).toFixed(2)}px`);
    elephantRide.style.setProperty("--ride-opacity", (1 - ease((cursor - 5.36) / .12)).toFixed(4));
    elephantRide.style.setProperty("--riders-opacity", (board * (1 - dismount)).toFixed(4));
    elephantRide.style.setProperty("--riders-y", `${(dismount * stageHeight * .13).toFixed(2)}px`);
  }

  function positionDialogue(scene) {
    const line = scene.querySelector(".dialogue-beat.is-speaking");
    if (!line) return;
    const her = line.dataset.speaker === "her";
    let target, xPart = 0.5, yPart = 0.08;
    if (scene.id === "the-invitation") {
      target = scene.querySelector(her ? ".handoff-woman" : ".handoff-man");
    } else if (scene.id === "devotion") {
      target = scene.querySelector(".aarti-art");
      xPart = her ? 0.72 : 0.27;
      yPart = her ? 0.1 : 0.02;
    } else if (scene.id === "celebration") {
      target = scene.querySelector(her ? ".garba-woman" : ".garba-man");
      yPart = 0.30;
    } else if (scene.id === "arrival" && !elephantRide.hidden &&
      Number(elephantRide.style.getPropertyValue("--riders-opacity")) > .4) {
      target = elephantRide.querySelector(".elephant-riders");
      xPart = her ? .32 : .72;
      yPart = -.12;
    } else {
      const together = scene.querySelector(".together-art");
      if (together && Number(getComputedStyle(together).opacity) > 0.5) {
        target = together;
        xPart = her ? 0.72 : 0.28;
      } else target = scene.querySelector(her ? ".story-person.woman" : ".story-person.man");
    }
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const box = scene.getBoundingClientRect();
    const headX = bounds.left - box.left + bounds.width * xPart;
    const headY = bounds.top - box.top + bounds.height * yPart;
    const width = line.offsetWidth;
    const centre = clamp(headX, width / 2 + 12, box.width - width / 2 - 12);
    line.style.setProperty("--bubble-x", `${centre.toFixed(2)}px`);
    line.style.setProperty("--bubble-y", `${(headY - 12).toFixed(2)}px`);
    line.style.setProperty("--bubble-tip", `${clamp(headX - centre + width / 2, 14, width - 14).toFixed(2)}px`);
    line.style.setProperty("--speaker-visible", getComputedStyle(target).opacity);
    if (scene.id === "the-invitation") fitInvitationLogo(scene);
  }
  function fitInvitationLogo(scene) {
    const mobile = innerWidth <= 650;
    const svg = scene.querySelector(mobile ? ".wall-brand-mobile" : ".wall-brand-desktop");
    const logo = svg.querySelector("image");
    const matrix = svg.getScreenCTM?.();
    if (!matrix) return;
    const upper = scene.querySelector(".story-title").getBoundingClientRect().bottom + (!mobile && innerHeight <= 800 ? 22 : 30);
    const lower = Math.min(...[...scene.querySelectorAll(".dialogue-beat")].map(beat => {
      const person = scene.querySelector(beat.dataset.speaker === "her" ? ".handoff-woman" : ".handoff-man");
      const head = person.getBoundingClientRect();
      return head.top + head.height * .08 - 12 - beat.offsetHeight;
    })) - 12;
    const preferred = new DOMPoint(mobile ? 512 : 768, mobile ? 465 : 370).matrixTransform(matrix);
    const ratio = mobile ? 230 / 157 : 152 / 104;
    const height = Math.max(0, Math.min((mobile ? 157 : 104) * matrix.d, lower - upper));
    const top = clamp(preferred.y, upper, Math.max(upper, lower - height));
    const point = new DOMPoint(preferred.x, top).matrixTransform(matrix.inverse());
    const artHeight = height / matrix.d;
    logo.style.setProperty("x", `${point.x - artHeight * ratio / 2}px`);
    logo.style.setProperty("y", `${point.y}px`);
    logo.style.setProperty("width", `${artHeight * ratio}px`);
    logo.style.setProperty("height", `${artHeight}px`);
  }
  // The moving circle keeps the small speech bubble attached between scroll events.
  let lastGarbaDialogueLayout = 0;
  document.querySelector("#celebration").addEventListener("garba-frame", (event) => {
    if (!cinematic) return;
    const now = performance.now();
    if (iOSWebKit && now - lastGarbaDialogueLayout < (autoScrolling ? 360 : 90)) return;
    lastGarbaDialogueLayout = now;
    positionDialogue(event.currentTarget);
  });
  function clearSceneState() {
    document.querySelectorAll(".invitation-wall-branding image").forEach(logo => logo.removeAttribute("style"));
    elephantRide.hidden = true;
    elephantRide.setAttribute("aria-hidden", "true");
    for (const scene of scenes) {
      scene.classList.remove("is-visible", "is-active");
      scene.inert = false;
      scene.removeAttribute("aria-hidden");
      scene
        .querySelectorAll(".dialogue-beat")
        .forEach((line) => { line.removeAttribute("aria-hidden"); line.removeAttribute("style"); });
      scene
        .querySelectorAll(".story-person")
        .forEach((person) => person.removeAttribute("style"));
      [
        "--together-opacity",
        "--together-scale",
        "--together-y",
        "--road-zoom",
        "--prayer-tilt",
        "--dialogue-opacity",
        "--arrival-copy",
        "--passage-opacity",
        "--gate-detail-opacity",
        "--passage-detail-opacity",
        "--garba-zoom",
        "--garba-dialogue-opacity",
      ].forEach((prop) => scene.style.removeProperty(prop));
    }
  }
  function measure() {
    stageHeight = stage.clientHeight || stableViewportHeight || innerHeight;
    journeyTop = journey.getBoundingClientRect().top + scrollY;
    travel = Math.max(1, journey.offsetHeight - stageHeight);
    readingZonesDirty = true;
  }
  function setMotion(preservePlace = false) {
    cancelManualScroll();
    if (iOSWebKit && autoScrolling) stopIosGsapAuto();
    const wasAutoScrolling = autoScrolling;
    const wasEntering = Boolean(entryFrame);
    const previous = activeIndex;
    const wasCinematic = cinematic;
    const wasWithin = scrollY < journeyTop + journey.offsetHeight;
    const finaleOffset = scrollY - (journeyTop + journey.offsetHeight);
    cinematic = !reduced.matches && stableViewportHeight >= 640;
    root.classList.toggle("cinematic", cinematic);
    root.classList.toggle("read-mode", !cinematic);
    // Use a stable viewport height; mobile address-bar changes do not reshape the story.
    journey.style.setProperty(
      "--journey-height",
      `${storySpan * stableViewportHeight * 1.32}px`,
    );
    clearSceneState();
    if (!cinematic) {
      updateOpening(readingBoxOpen ? 1 : 0);
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            hydrateNode(entry.target);
            observer.unobserve(entry.target);
          });
        }, { rootMargin: "80% 0px" });
        scenes.forEach(scene => observer.observe(scene));
      } else scenes.forEach((_, i) => hydrateScene(i));
    }
    measure();
    if (
      cinematic &&
      scenes.some(
        (s) => (s.querySelector(".scene-copy")?.scrollHeight || 0) > stageHeight - 180,
      )
    ) {
      cinematic = false; // Enlarged text is more important than pinned animation.
      root.classList.remove("cinematic");
      root.classList.add("read-mode");
      updateOpening(readingBoxOpen ? 1 : 0);
      measure();
    }
    root.classList.toggle("invitation-locked", cinematic && !entryUnlocked);
    if (!cinematic || iOSWebKit) root.classList.remove("manual-scroll-owned");
    openingSoundButton.hidden = !cinematic;
    if (preservePlace && wasCinematic !== cinematic) {
      const top = !wasWithin
        ? journeyTop + journey.offsetHeight + finaleOffset
        : cinematic
          ? journeyTop + (sceneStarts[previous] / storySpan) * travel
          : scenes[previous].getBoundingClientRect().top + scrollY;
      jumpTo(top);
    }
    renderScroll();
    if (wasAutoScrolling) {
      autoScrolling = true;
      autoScrollPosition = scrollY;
      autoScrollLast = performance.now();
      updateAutoScrollButton();
      if (!autoScrollFrame && !wasEntering)
        autoScrollFrame = requestAnimationFrame(advanceAutoScroll);
    }
  }
  let lastRenderSample = 0;
  function renderScroll(now = performance.now()) {
    frame = 0;
    if (iOSWebKit && autoScrolling) {
      const renderInterval = (lowPowerRender || longFrameScore >= 4) ? 80 : 50;
      if (iosAutoLastRender && now - iosAutoLastRender < renderInterval) return;
      iosAutoLastRender = now;
    }
    if (lastRenderSample) noteFrameCost(now - lastRenderSample);
    lastRenderSample = now;
    // Wheel, touch, keyboard and restored scroll positions cannot open a sealed box.
    if (cinematic) {
      // Once the invitation has opened, keep the journey unlocked until an explicit
      // reload/reset. iOS elastic overscroll can momentarily report the top position
      // and used to relock the entire story.
      root.classList.toggle("invitation-locked", !entryUnlocked);
      root.classList.toggle("manual-scroll-owned", entryUnlocked && !iOSWebKit);
      if (!entryUnlocked && scrollY !== journeyTop)
        jumpTo(journeyTop);
    }
    const journeyEnd = journeyTop + travel;
    root.classList.toggle("journey-finished", cinematic && scrollY >= journeyEnd - 1);
    root.style.setProperty(
      "--progress",
      clamp(scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(5),
    );
    if (!cinematic) {
      soundtrack?.setScene(1.42);
      let nearest = 0,
        distance = Infinity;
      scenes.forEach((s, i) => {
        const r = Math.abs(s.getBoundingClientRect().top);
        if (r < distance) {
          distance = r;
          nearest = i;
        }
      });
      activeIndex = nearest;
      return;
    }
    const cursor = clamp((scrollY - journeyTop) / travel) * storySpan;
    if (entryUnlocked) soundtrack?.setScene(cursor);
    animateElephant(cursor);
    let base = scenes.length - 1;
    while (base > 0 && cursor < sceneStarts[base]) base--;
    hydrateScene(base);
    hydrateScene(base + 1);
    const local = clamp((cursor - sceneStarts[base]) / sceneSpans[base]);
    const blendStart = scenes[base]?.id === "the-invitation" ? 0.94 : 0.7;
    const blendWindow = scenes[base]?.id === "the-invitation" ? 0.06 : 0.3;
    const blend = base < scenes.length - 1 ? ease((local - blendStart) / blendWindow) : 0;
    const selected = blend > 0.5 ? base + 1 : base;
    scenes.forEach((scene, i) => {
      const isBase = i === base;
      const isNext = i === base + 1 && blend > 0;
      const visible = isBase || isNext;
      const active = i === selected;
      scene.classList.toggle("is-visible", visible);
      scene.classList.toggle("is-active", active);
      scene.classList.toggle("is-nearby", Math.abs(i - selected) <= 1);
      scene.inert = !active;
      scene.setAttribute("aria-hidden", String(!active));
      if (!(iOSWebKit && autoScrolling) && i <= selected + 1)
        scene.querySelectorAll("img[loading=lazy]").forEach((img) => {
          img.loading = "eager";
        });
      if (!visible) return;
      const progress = isBase ? local : 0;
      animateStory(scene, progress);
      if (["partner-road", "the-invitation", "celebration"].includes(scene.id))
        scene.dispatchEvent(new CustomEvent("story-progress", { detail: progress }));
      scene.style.setProperty("--scene-opacity", isBase ? 1 : blend.toFixed(4));
      scene.style.setProperty(
        "--copy-opacity",
        isBase
          ? (1 - ease(blend * 2)).toFixed(4)
          : ease((blend - 0.45) / 0.55).toFixed(4),
      );
      scene.style.setProperty(
        "--copy-y",
        `${(isBase ? -blend * 18 : (1 - blend) * 18).toFixed(2)}px`,
      );
      scene.style.setProperty("--zoom", (1.035 + progress * 0.045).toFixed(4));
      scene.style.setProperty("--pan", `${(progress * -10).toFixed(2)}px`);
      if (scene === opening)
        updateOpening(
          ease((progress - 0.05) / 0.4),
          ease((progress - 0.24) / 0.6),
        );
    });
    const layoutNow = performance.now();
    const dialogueLayoutInterval = iOSWebKit ? (autoScrolling ? 360 : 72) : 0;
    if (!dialogueLayoutInterval || layoutNow - lastDialogueLayout >= dialogueLayoutInterval) {
      scenes.filter((scene) => scene.classList.contains("is-visible")).forEach(positionDialogue);
      lastDialogueLayout = layoutNow;
    }
    const photoButton = document.querySelector("#take-story-photo");
    if (photoButton) photoButton.disabled = false;
    if (focusStoryOnArrival && scenes[selected].id === "beginning") {
      focusStoryOnArrival = false;
      document.querySelector("#beginning-title").focus({ preventScroll: true });
    }
    activeIndex = selected;
    document.querySelector("#current-chapter").textContent =
      scenes[selected].dataset.label;
    stage.style.setProperty("--dust-y", `${(cursor * -9).toFixed(2)}px`);
  }
  let lastDialogueLayout = 0;
  function schedule() {
    if (!frame) frame = requestAnimationFrame(renderScroll);
  }
  // Re-anchor after responsive art and Gujarati fonts finish decoding/layout.
  document.addEventListener("load", (event) => {
    if (event.target instanceof HTMLImageElement) {
      readingZonesDirty = true;
      schedule();
    }
  }, true);
  document.fonts?.ready.then(schedule);
  if ("ResizeObserver" in window) {
    const readingResizeObserver = new ResizeObserver(() => {
      readingZonesDirty = true;
    });
    readingResizeObserver.observe(journey);
    const details = document.querySelector("#details");
    if (details) readingResizeObserver.observe(details);
  }
  function scrollToScene(scene, behavior = "smooth") {
    cancelManualScroll();
    stopAutoScroll();
    cancelEntry();
    const index = scenes.indexOf(scene);
    const top = cinematic
      ? journeyTop + ((sceneStarts[index] + 0.06) / storySpan) * travel
      : scene.getBoundingClientRect().top + scrollY;
    if (reduced.matches || behavior === "instant" || behavior === "auto") jumpTo(top); else window.scrollTo({ top, behavior });
  }
  document.querySelectorAll('a[href^="#"]').forEach((link) =>
    link.addEventListener("click", (event) => {
      const scene = scenes.find(
        (s) => `#${s.id}` === link.getAttribute("href"),
      );
      if (!scene) return;
      event.preventDefault();
      scrollToScene(scene);
    }),
  );
  openingButtons.forEach((button) => button.addEventListener("click", beginEntry));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener(
    "resize",
    () => {
      const widthChanged = innerWidth !== lastWidth;
      const modeChanged = !iOSWebKit && (innerHeight >= 640) !== (lastHeight >= 640);
      lastWidth = innerWidth;
      lastHeight = innerHeight;
      if (widthChanged || modeChanged) {
        updateStableViewport(true);
        setMotion(true);
      } else {
        updateStableViewport(false);
        measure();
        if (autoScrolling && !iOSWebKit) {
          autoScrollPosition = scrollY;
          autoScrollLast = performance.now();
        }
        schedule();
      }
    },
    { passive: true },
  );
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (!iOSWebKit) return;
      updateStableViewport(false);
      measure();
      readingZonesDirty = true;
      schedule();
    }, { passive:true });
  }
  addEventListener("orientationchange", () => {
    setTimeout(() => {
      updateStableViewport(true);
      setMotion(true);
    }, 120);
  }, { passive:true });
  reduced.addEventListener("change", () => setMotion(true));
  setMotion();
  document.fonts?.ready.then(() => {
    measure();
    schedule();
  });
  const hashScene = scenes.find((s) => `#${s.id}` === location.hash);
  if (hashScene)
    requestAnimationFrame(() => scrollToScene(hashScene, "instant"));
  addEventListener("hashchange", () => {
    const target = scenes.find((s) => `#${s.id}` === location.hash);
    if (target) scrollToScene(target, "instant");
  });
  document
    .querySelector("#take-story-photo")
    .addEventListener("click", (event) => {
      const button = event.currentTarget;
      const photoScene = document.querySelector("#a-memory");
      const show = button.getAttribute("aria-pressed") !== "true";
      photoScene.dataset.photo = String(show);
      button.setAttribute("aria-pressed", String(show));
      button.querySelector(".control-label").textContent = show ? "Back to the moment" : "Take their photo";
      schedule();
    });
  const invitationViewer = document.querySelector("#original-invitation-dialog");
  let invitationOpener, invitationScroll = 0;
  document.querySelectorAll("[data-view-original]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      cancelEntry();
      invitationOpener = link;
      invitationScroll = scrollY;
      invitationViewer.showModal();
    });
  });
  invitationViewer.addEventListener("close", () => {
    jumpTo(invitationScroll);
    invitationOpener?.focus({ preventScroll: true });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog
      .querySelector("[data-close]")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    });
  });

  document
    .querySelector("#share-invitation")
    .addEventListener("click", async () => {
      const url = location.origin + location.pathname;
      const data = {
        title: "The Garba Experience",
        text: "Join me for an evening with Kinjal Dave. 9 October 2026 · 7:30 pm onwards · Ahmedabad.",
        url,
      };
      try {
        if (navigator.share) await navigator.share(data);
        else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          notify("Invitation link copied. See you in the circle.");
        } else {
          window.prompt("Copy the invitation link:", url);
        }
      } catch (error) {
        if (error.name !== "AbortError")
          notify(
            "Sharing is unavailable. You can copy the address from your browser.",
          );
      }
    });

  // Local-only photo keepsake: no upload, camera access, account or storage service.
  const memory = document.querySelector("#memory-dialog");
  const canvas = document.querySelector("#memory-canvas");
  const context = canvas.getContext("2d");
  const download = document.querySelector("#download-memory");
  const status = document.querySelector("#memory-status");
  const initialMemoryStatus = status.textContent;
  let photoVersion = 0;
  let downloadUrl;
  document
    .querySelector("#make-memory")
    .addEventListener("click", () => memory.showModal());
  document
    .querySelector("#memory-photo")
    .addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const version = ++photoVersion;
      download.hidden = true;
      canvas.classList.remove("has-photo");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        status.textContent = "Please choose a JPG, PNG or WebP photo.";
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        status.textContent = "Please choose a photo smaller than 20 MB.";
        return;
      }
      status.textContent = "Creating your keepsake…";
      let photo;
      try {
        photo = await createImageBitmap(file);
        await document.fonts.ready;
        if (version !== photoVersion) return;
        const w = 1080,
          h = 1350;
        context.fillStyle = "#183b31";
        context.fillRect(0, 0, w, h);
        context.strokeStyle = "#c7a66b";
        context.lineWidth = 2;
        context.strokeRect(28, 28, w - 56, h - 56);
        context.strokeRect(39, 39, w - 78, h - 78);
        context.fillStyle = "#eadbb6";
        context.textAlign = "center";
        context.font = "22px Manrope, Arial";
        context.fillText("THE GARBA EXPERIENCE", w / 2, 105);
        const x = 80,
          y = 150,
          pw = 920,
          ph = 900;
        const scale = Math.max(pw / photo.width, ph / photo.height);
        context.save();
        context.beginPath();
        context.rect(x, y, pw, ph);
        context.clip();
        context.drawImage(
          photo,
          x + (pw - photo.width * scale) / 2,
          y + (ph - photo.height * scale) / 2,
          photo.width * scale,
          photo.height * scale,
        );
        context.restore();
        context.font = 'italic 68px "Cormorant Garamond", Georgia';
        context.fillText("Our night to remember.", w / 2, 1160);
        context.font = "20px Manrope, Arial";
        context.fillText("AHMEDABAD  ·  09 OCTOBER 2026", w / 2, 1224);
        context.font = "17px Manrope, Arial";
        context.fillText("Devotion. Rhythm. Togetherness.", w / 2, 1270);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (version !== photoVersion) return;
        if (!blob) throw new Error("Canvas export failed");
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(blob);
        download.href = downloadUrl;
        download.hidden = false;
        canvas.classList.add("has-photo");
        status.textContent =
          "Your keepsake is ready. Save it to share with your friends.";
      } catch {
        if (version === photoVersion)
          status.textContent =
            "That photo could not be opened. Please try another JPG, PNG or WebP.";
      } finally {
        photo?.close();
      }
    });
  function resetReloadState() {
    cancelManualScroll();
    stopAutoScroll();
    soundtrack?.reset();
    cancelEntry();
    document
      .querySelectorAll("dialog[open]")
      .forEach((dialog) => dialog.close());
    document.querySelectorAll("details[open]").forEach((details) => {
      details.open = false;
    });
    document.activeElement?.blur();
    clearTimeout(toastTimer);
    toast.classList.remove("visible");
    readingBoxOpen = false;
    entryUnlocked = false;
    root.classList.remove("manual-scroll-owned");
    focusStoryOnArrival = false;
    const photoScene = document.querySelector("#a-memory");
    delete photoScene.dataset.photo;
    photoScene.style.setProperty("--photo-opacity", "0");
    photoScene.style.setProperty("--photo-scale", "0.85");
    photoScene.style.setProperty("--dialogue-opacity", "1");
    const photoButton = document.querySelector("#take-story-photo");
    photoButton.setAttribute("aria-pressed", "false");
    photoButton.querySelector(".control-label").textContent = "Take their photo";
    ++photoVersion; // Ignore any photo processing that was still pending.
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = undefined;
    download.removeAttribute("href");
    download.hidden = true;
    document.querySelector("#memory-photo").value = "";
    canvas.classList.remove("has-photo");
    canvas.width = canvas.width;
    status.textContent = initialMemoryStatus;
    jumpTo(0, 0);
    setMotion();
    updateOpening(0);
  }
  // Reset immediately, then again after the browser restores form/page state.
  if (isReload) resetReloadState();
  addEventListener("pageshow", (event) => {
    if (isReload && !event.persisted) resetReloadState();
  });

  // Retire older cache-first versions without caching personal photos.
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
