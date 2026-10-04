/* One audible track: doors, silk descent, then continuous background music. */
(() => {
  "use strict";
  const button = document.querySelector("#soundtrack-toggle");
  const introButton = document.querySelector("#opening-sound");
  const tracks = Object.fromEntries([
    ["door", "door-sound"], ["descent", "descent-sound"], ["music", "site-soundtrack"],
  ].map(([name, id]) => [name, { audio: document.getElementById(id), gain: null, blocked: false, ended: false, request: 0, pending: false }]));
  let context, started = false, muted = false, introEnabled = true;
  let official = false, pageActive = true, introSuppressed = false;
  let phase = "door", musicStarted = false, session = 0;
  let introClockActive = false;
  const current = () => tracks[phase];
  const permitted = () => started && !muted && !official && pageActive && !document.hidden
    && (phase === "music" || (introEnabled && !introSuppressed));
  const audible = track => track === current() && permitted() && !track.blocked && !track.ended;
  const rewind = track => { try { track.audio.currentTime = 0; } catch {} };

  function updateControl() {
    button.hidden = !started;
    const retry = current().blocked && permitted();
    button.dataset.state = retry ? "retry" : muted ? "muted"
      : !permitted() ? "paused" : phase === "music" ? "playing" : "opening";
    button.setAttribute("aria-pressed", String(!muted && !retry));
    const label = retry ? "Play website sound" : muted ? "Unmute website sound" : "Mute website sound";
    button.setAttribute("aria-label", label);
    button.title = label;
    introButton.setAttribute("aria-pressed", String(introEnabled));
    button.querySelector(".control-label").textContent = retry ? "Play sound" : muted ? "Unmute" : "Mute";
    introButton.querySelector(".control-label").textContent = introEnabled ? "Intro sound on" : "Intro sound off";
  }
  function setVolume(track, level) {
    if (track.gain) {
      track.audio.muted = false;
      // Immediate silence prevents the previous effect bleeding into the next.
      track.gain.gain.cancelScheduledValues(context.currentTime);
      track.gain.gain.setValueAtTime(level, context.currentTime);
    } else {
      track.audio.volume = .55;
      track.audio.muted = level === 0;
    }
  }
  function unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!context && Audio) {
      try { context = new Audio(); } catch { /* HTML media fallback. */ }
    }
    if (context) {
      for (const track of Object.values(tracks)) {
        if (track.gain) continue;
        try {
          const gain = context.createGain();
          gain.gain.value = 0;
          const source = context.createMediaElementSource(track.audio);
          source.connect(gain);
          gain.connect(context.destination);
          track.gain = gain;
        } catch { /* Keep this media element on the HTML fallback. */ }
      }
      if (context.state === "suspended") {
        const token = session;
        context.resume().catch(() => {
          if (token !== session || !started) return;
          current().blocked = true;
          sync();
        });
      }
    }
  }
  function play(track, prime = false) {
    const token = session, request = ++track.request;
    track.pending = true;
    const failed = error => {
      if (token !== session || request !== track.request) return;
      track.pending = false;
      if (error.name === "AbortError") { if (audible(track)) sync(); return; }
      track.blocked = true;
      setVolume(track, 0);
      updateControl();
    };
    try {
      const result = track.audio.play();
      result?.then(() => {
        if (token !== session || request !== track.request) return;
        track.pending = false;
        // Noncurrent tracks are unlocked silently in the logo click, then parked.
        if (prime && !audible(track)) {
          track.audio.pause();
          rewind(track);
        }
        if (audible(track) && track.audio.paused) sync();
      }, failed);
      if (!result) track.pending = false;
    } catch (error) { failed(error); }
  }
  function sync() {
    // Stop every noncurrent source before making another source audible.
    for (const track of Object.values(tracks)) {
      if (audible(track)) continue;
      setVolume(track, 0);
      track.audio.pause();
    }
    const track = current();
    if (audible(track)) {
      if (track.audio.paused && !track.pending) play(track);
      setVolume(track, track.blocked ? 0 : .55);
    }
    updateControl();
  }
  function select(next) {
    if (!started || next === phase) return;
    phase = next;
    introSuppressed = false;
    const track = current();
    if (phase !== "music" || !musicStarted) {
      rewind(track);
      track.ended = false;
    }
    if (phase === "music") musicStarted = true;
    sync();
  }
  function begin(animated = true) {
    ++session;
    introClockActive = animated;
    started = true;
    official = introSuppressed = musicStarted = false;
    phase = animated ? "door" : "music";
    for (const track of Object.values(tracks)) {
      track.audio.pause();
      track.blocked = track.ended = track.pending = false;
      rewind(track);
      setVolume(track, 0);
    }
    // Prime all three media elements during the actual activation gesture.
    unlock();
    for (const track of Object.values(tracks)) {
      if (track.audio.error) track.audio.load();
      play(track, true);
    }
    musicStarted = !animated;
    sync();
  }
  function reset() {
    ++session;
    introClockActive = false;
    started = official = introSuppressed = musicStarted = false;
    for (const track of Object.values(tracks)) {
      track.audio.pause();
      rewind(track);
      track.blocked = track.ended = track.pending = false;
    }
    sync();
  }
  window.garbaSoundtrack = {
    begin,
    setScene(cursor) {
      if (introClockActive) return;
      select(cursor < 1 ? "door" : cursor < 1.42 - 1e-6 ? "descent" : "music");
    },
    setIntroElapsed(elapsedMs) {
      if (!started || !introClockActive) return;
      if (elapsedMs < 1900) select("door");
      else if (elapsedMs < 4700) select("descent");
      else {
        introClockActive = false;
        select("music");
      }
    },
    finishIntroClock() {
      introClockActive = false;
      select("music");
    },
    cancelIntro() {
      introClockActive = false;
      if (phase !== "music") { introSuppressed = true; sync(); }
    },
    pauseForOfficial() { official = true; sync(); },
    resumeFromOfficial() { if (official) { official = false; sync(); } },
    reset,
  };
  button.addEventListener("click", () => {
    const track = current();
    if (track.blocked) {
      track.blocked = false;
      muted = false;
      if (track.audio.error) track.audio.load();
    } else muted = !muted;
    if (!muted) unlock();
    sync();
  });
  introButton.addEventListener("click", () => {
    introEnabled = !introEnabled;
    if (introEnabled && started) unlock();
    sync();
  });
  for (const track of Object.values(tracks)) {
    track.audio.addEventListener("ended", () => { track.ended = true; sync(); });
    track.audio.addEventListener("error", () => {
      if (!started) return;
      track.blocked = true;
      sync();
    });
  }
  document.addEventListener("visibilitychange", sync);
  addEventListener("pagehide", () => { pageActive = false; sync(); });
  addEventListener("pageshow", () => { pageActive = true; sync(); });
  updateControl();
})();
