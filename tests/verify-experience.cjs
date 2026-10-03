// Behavioral checks. Run with jsdom and postcss available on NODE_PATH.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const postcss = require("postcss");
const base = path.resolve(__dirname, "../dist");
const html = fs.readFileSync(path.join(base, "index.html"), "utf8");
const script = fs.readFileSync(path.join(base, "experience.js"), "utf8");
const dom = new JSDOM(html, {
  url: "https://garba.example/?source=invitation#celebration",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window,
  d = w.document;
let frame,
  reducedHandler,
  fetches = 0,
  copied,
  contexts = 0;
let hidden = false;
const reduced = {
  matches: false,
  addEventListener: (_, cb) => {
    reducedHandler = cb;
  },
};
w.innerHeight = 900;
w.innerWidth = 1440;
w.scrollY = 8000;
w.performance.getEntriesByType = () => [{ type: "reload" }];
w.matchMedia = () => reduced;
let clock = 0, rafId = 0;
const callbacks = new Map();
w.performance.now = () => clock;
w.requestAnimationFrame = (cb) => { callbacks.set(++rafId, cb); return rafId; };
w.cancelAnimationFrame = (id) => callbacks.delete(id);
frame = (advance = 16) => {
  clock += advance;
  const pending = [...callbacks];
  callbacks.clear();
  pending.forEach(([, cb]) => cb(clock));
};
w.scrollTo = (arg, y) => {
  const top = typeof arg === "number" ? y : arg.top;
  w.scrollY = top;
  w.dispatchEvent(new w.Event("scroll"));
};
Object.defineProperty(d, "hidden", { get: () => hidden });
Object.defineProperty(d.documentElement, "scrollHeight", { get: () => 13200 });
const journey = d.querySelector(".journey"),
  stage = d.querySelector(".journey-stage");
const scenes = [...d.querySelectorAll(".scene")];
const cinematic = () => d.documentElement.classList.contains("cinematic");
Object.defineProperty(stage, "clientHeight", { get: () => 900 });
Object.defineProperty(journey, "offsetHeight", {
  get: () => (cinematic() ? 10692 : 8100),
});
journey.getBoundingClientRect = () => ({ top: -w.scrollY });
scenes.forEach((s, i) => {
  s.getBoundingClientRect = () => ({ top: i * 900 - w.scrollY });
});
w.HTMLCanvasElement.prototype.getContext = () => ({});
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new w.Event("close"));
};
w.fetch = async () => { fetches++; throw new Error("Unexpected fetch"); };
Object.defineProperty(w.navigator, "clipboard", {
  value: {
    writeText: async (s) => {
      copied = s;
    },
  },
});
const param = () => ({
  value: 0,
  setValueAtTime(value) { this.value = value; },
  exponentialRampToValueAtTime() {},
  setTargetAtTime() {},
  cancelScheduledValues() {},
});
w.AudioContext = class {
  constructor() {
    contexts++;
    this.currentTime = 0;
    this.state = "suspended";
    this.destination = {};
  }
  createMediaElementSource() { return { connect() {} }; }
  createGain() {
    return { gain: param(), connect() {}, disconnect() {} };
  }
  createOscillator() {
    return {
      frequency: param(),
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
    };
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
};
const tick = () => new Promise((r) => setImmediate(r));
const scroll = (cursor) => {
  w.scrollY = (cursor / 14) * 9792;
  w.dispatchEvent(new w.Event("scroll"));
  frame?.();
};
(async () => {
  const ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "unique IDs");
  assert.equal(d.querySelectorAll("h1").length, 1);
  assert.equal(scenes.length, 11, "original ten scenes plus the connected walk home");
  const road = d.querySelector('#partner-road');
  assert.equal(road.parentElement, stage, 'road shares the original story stage');
  assert.equal(road.previousElementSibling.id, 'celebration', 'Garba flows into the walk home');
  assert.equal(d.querySelector('main').lastElementChild.id, 'details', 'original static details remain the ending');
  assert.equal(road.querySelectorAll('.partner-shop').length, 16, 'every confirmed sponsor remains');
  assert(road.querySelector('img[src="assets/partners/megma.png"]'), 'Megma uses the supplied logo');
  assert(road.querySelector('img[src="assets/partners/hungrito.svg"]'), 'Hungrito uses the supplied logo');
  assert(road.querySelector('img[src="assets/partners/alpha-hospital.bmp"]'), 'Alpha Hospital uses the supplied logo');
  assert(!script.includes('behavior: "instant"'), 'story controller avoids non-standard instant scroll behavior for iOS Safari');
  assert(!d.querySelector('#the-invitation .original-invitation'), 'early invitation scene no longer shows the poster');
  assert(d.querySelector('#the-invitation .handoff-envelope img').getAttribute('src').includes('logo.webp'), 'she hands him the branded Garba Experience envelope');
  assert(d.querySelector('#the-invitation').textContent.includes('પણ આપણે પહોંચીશું કેવી રીતે?'), 'the pass question extends the existing Gujarati dialogue');
  assert(!d.querySelector('#the-invitation .qr-pass-link'), 'QR is scan-only and not clickable');
  assert.equal(d.querySelector('#the-invitation .qr-pass-code img').getAttribute('src'), 'assets/garba-district-qr-v2.png', 'QR uses the dedicated local PNG asset');
  assert(!d.querySelector('#the-invitation .qr-pass-code').closest('a'), 'scan-only QR is not wrapped in a clickable link');
  assert(fs.existsSync(path.join(base, 'assets/garba-district-qr-v2.png')), 'scan-only District QR asset exists');
  assert([...d.querySelectorAll('#the-invitation q [lang="en"]')].some(line => line.textContent.includes('9th October')), 'date stays in English');
  assert(d.querySelector('#details .entry-note').textContent.includes('valid passes / tickets'), 'the final entry note uses passes instead of the elephant admission rule');
  assert.equal(d.querySelector('.masthead .header-link .control-label').textContent.trim(), 'Grab your passes', 'navbar invitation action becomes Grab your passes');
  for (const el of d.querySelectorAll("[src],[data-src],link[href],a[href]")) {
    const value = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("href");
    if (value.startsWith("#"))
      assert(d.querySelector(value), `anchor ${value}`);
    else if (!/^(https?:|data:)/.test(value))
      assert(
        fs.existsSync(path.join(base, value.split("?")[0])),
        `asset ${value}`,
      );
  }
  for (const file of [
    "experience.css",
    "storybook.css",
    "scene-refinements.css",
    "button-motion.css",
    "partner-road.css",
    "assets/fonts/fonts.css",
  ]) {
    const css = fs.readFileSync(path.join(base, file), "utf8");
    postcss.parse(css);
    for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))
      assert(
        fs.existsSync(path.join(base, path.dirname(file), match[1])),
        `CSS asset ${match[1]}`,
      );
    assert(!/scroll-snap-type/.test(css), "no pagination-like snapping");
  }
  w.eval(fs.readFileSync(path.join(base, 'partner-road.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(base, 'invitation-handoff.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(base, 'aarti-flowers.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(base, 'garba-circle.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(base, 'event-crowds.js'), 'utf8'));
  for (const audio of d.querySelectorAll("audio")) {
    Object.defineProperty(audio, "paused", { value: true, writable: true });
    audio.play = () => { audio.paused = false; return Promise.resolve(); };
    audio.pause = () => { audio.paused = true; };
  }
  w.eval(fs.readFileSync(path.join(base, "site-soundtrack.js"), "utf8"));
  w.eval(script);
  await tick(); // Let the initial pageshow restoration finish before interacting.
  assert.equal(w.scrollY, 0, "reload starts at the top");
  assert.equal(w.location.hash, "", "reload ignores the old scene anchor");
  assert.equal(
    w.location.search,
    "?source=invitation",
    "reload retains URL parameters",
  );
  for (const id of ['arrival', 'the-stage', 'devotion', 'partner-road']) {
    assert(d.querySelectorAll(`#${id} .guest`).length >= 8, `${id} contains separate crowd figures`);
  }
  assert(d.querySelectorAll('#the-stage .guest-performer').length >= 9, 'singer and musicians have animated playing poses');
  assert(d.querySelectorAll('#devotion .guest-pray').length === 8, 'eight guests pray facing the shrine');
  for (const guest of d.querySelectorAll('.guest')) {
    const src = guest.style.getPropertyValue('--sprite').match(/url\(([^)]+)\)/)[1];
    assert(fs.existsSync(path.join(base, src)), `crowd sprite exists: ${src}`);
  }
  assert.equal(fetches, 0, "no unsolicited network audio");
  assert.equal(contexts, 0, "no unsolicited generated audio");
  assert.equal(d.querySelectorAll("iframe").length, 0);
  assert(cinematic());
  assert.equal(d.querySelectorAll(".scene.is-active").length, 1);
  assert.equal(scenes[0].id, "invitation", "box comes before the storyline");
  assert.equal(scenes[1].id, "beginning", "friends meet after the box opens");
  assert.deepEqual(scenes.slice(5, 10).map(s => s.id),
    ['arrival', 'a-memory', 'devotion', 'the-stage', 'celebration'],
    'aarti precedes the stage and garba ground in every viewing mode');
  for (const id of ['arrival', 'a-memory', 'devotion', 'the-stage', 'celebration']) {
    const art = d.querySelector(`#${id} .scene-art img, #${id} .garba-courtyard`);
    const artSource = art.getAttribute('src') || art.getAttribute('data-src') || '';
    assert(artSource.includes('/event-decor/'), `${id} uses the supplied event decor`);
  }

  assert.equal(d.querySelector(".scene.is-active").id, "invitation");
  assert.equal(
    d.querySelector("#invitation-seal").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(d.querySelectorAll(".box-hit-area").length, 1);
  assert(d.querySelector("#invitation-seal img"), "logo is inside the opening button");
  scroll(0.6);
  assert.equal(w.scrollY, 0, 'scrolling cannot bypass the unopened invitation');
  assert.equal(d.querySelector('#invitation').style.getPropertyValue('--open'), '0.0000', 'scrolling alone leaves both doors closed');
  d.querySelector("#invitation-seal").focus();
  d.querySelector("#invitation-seal").click();
  await tick();
  assert(!d.querySelector("#door-sound").paused && d.querySelector("#descent-sound").paused && d.querySelector("#site-soundtrack").paused, "logo click plays only the supplied door sound");
  frame(750);
  frame(0);
  assert.equal(d.querySelector(".scene.is-active").id, "invitation", "opening remains in the box partway through the 1.9-second door phase");
  frame(1150);
  frame(0);
  assert.equal(
    d.querySelector(".scene.is-active").id,
    "beginning",
    "one logo click goes directly to the storyline",
  );
  assert.equal(d.activeElement.id, "beginning-title", "logo activation transfers focus into story");
  w.scrollY = 0;
  w.dispatchEvent(new w.Event("scroll"));
  frame(16);
  assert(!d.documentElement.classList.contains("invitation-locked"), "opened invitation stays unlocked after top/elastic overscroll");
  await tick();
  assert(d.querySelector("#door-sound").paused && !d.querySelector("#descent-sound").paused && d.querySelector("#site-soundtrack").paused, "door transition starts only the descent sound");
  const arrival = d.querySelector('#beginning');
  const descendingMan = arrival.querySelector('.man');
  assert.equal(arrival.style.getPropertyValue('--arrival-copy'), '0.0000', 'dialogue waits for landing');
  const above = parseFloat(descendingMan.style.getPropertyValue('--descent-y'));
  assert(above < -900, 'friends start above the viewport after doors open');
  frame(1000);
  frame(0);
  const midway = parseFloat(descendingMan.style.getPropertyValue('--descent-y'));
  assert(midway > above && midway < 0, 'automatic opening continues into the silk descent');
  frame(1800);
  frame(0);
  assert.equal(descendingMan.style.getPropertyValue('--landed'), '1.0000', 'friends land automatically');
  assert.equal(arrival.style.getPropertyValue('--arrival-copy'), '1.0000', 'conversation appears after landing');
  await tick();
  assert(d.querySelector("#door-sound").paused && d.querySelector("#descent-sound").paused && !d.querySelector("#site-soundtrack").paused, "landing starts Vichudo after both intro phases");
  const landed = descendingMan.getAttribute('style');
  scroll(1.12);
  assert(parseFloat(descendingMan.style.getPropertyValue('--descent-y')) < -100, 'reverse scrolling lifts friends');
  scroll(1.42);
  assert.equal(descendingMan.getAttribute('style'), landed, 'descent is deterministic on replay');
  assert.equal(d.querySelector("#invitation .hamper-interior img").getAttribute("src"),
    d.querySelector("#beginning .scene-art img").getAttribute("src"),
    "box interior leads into the first story scene");
  assert(!d.querySelector("#open-invitation"), "no second continue button");
  // Enter every scene forwards and backwards using native scroll progress.
  for (const sequence of [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ]) {
    for (const i of sequence) {
      scroll(i + 0.25);
      assert.equal(
        d.querySelector(".scene.is-active").id,
        scenes[i].id,
        `scene ${i} reachable`,
      );
      assert.equal(
        scenes.filter((s) => !s.inert).length,
        1,
        "only visible scene interactive",
      );
    }
  }
  const handoff = d.querySelector('.handoff-rig');
  scroll(2.02);
  assert.equal(handoff.dataset.handoff, 'concealed', 'invitation starts behind her back');
  assert.equal(handoff.style.getPropertyValue('--pass-visible'), '0.0000');
  scroll(2.18);
  assert.equal(handoff.dataset.handoff, 'revealing', 'her arm reveals the branded envelope');
  scroll(2.38);
  assert.equal(handoff.dataset.handoff, 'offering', 'she offers it as he reaches');
  const offeredPass = parseFloat(handoff.style.getPropertyValue('--pass-x'));
  scroll(2.65);
  assert.equal(handoff.dataset.handoff, 'received', 'he receives the envelope before it opens');
  assert(parseFloat(handoff.style.getPropertyValue('--pass-x')) < offeredPass, 'envelope transfers toward the man');
  const receivedPose = handoff.getAttribute('style');
  scroll(2.82);
  const passReveal = d.querySelector('.pass-reveal');
  assert(['opening','passes'].includes(passReveal.dataset.state), 'the received envelope opens into the QR pass reveal');
  assert(Number.parseFloat(passReveal.style.getPropertyValue('--reveal')) > 0, 'envelope opening is scroll-driven');
  scroll(2.02);
  assert.equal(handoff.style.getPropertyValue('--pass-visible'), '0.0000', 'reverse scroll conceals it again');
  scroll(2.65);
  assert.equal(handoff.getAttribute('style'), receivedPose, 'handoff replays without stale state');
  scroll(9.85);
  assert(scenes[9].classList.contains('is-visible') && road.classList.contains('is-visible'), 'celebration dissolves directly into the road');
  const shops = [...road.querySelectorAll('.partner-shop')];
  const stillShops = shops.map(shop => shop.getAttribute('style'));
  scroll(10.1);
  const startPosition = road.querySelector('.road-friends').getAttribute('style');
  for (const point of [11,12,13,13.9,10.1]) {
    scroll(point);
    assert.equal(d.querySelector('.scene.is-active'), road);
    assert.deepEqual(shops.map(shop => shop.getAttribute('style')),stillShops,'shops never get scroll transforms or fades');
  }
  assert.equal(road.querySelector('.road-friends').getAttribute('style'),startPosition,'the friends reverse along the same path');
  scroll(12);
  assert.notEqual(road.querySelector('.road-friends').getAttribute('style'),startPosition,'the friends travel across the stationary scene');
  shops[0].querySelector('button').click();
  assert(d.querySelector('#partner-dialog').open,'shop boards open readable details');
  assert.equal(d.querySelector('#partner-dialog-name').textContent,'Eventzz Planet');
  d.querySelector('#partner-dialog [data-close]').click();
  assert(!d.querySelector('#partner-dialog').open);
  // Model shop frontages independently of the path's progress calculation.
  const roadWorld = road.querySelector('.road-world');
  roadWorld.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1440, height: 900 });
  shops.forEach((shop, index) => {
    const left = (70 + index % 4 * 219.3) * 1.44;
    const top = Math.floor(index / 4) * 225;
    shop.getBoundingClientRect = () => ({ left, top, width: 202.1 * 1.44, height: 171, right: left + 202.1 * 1.44, bottom: top + 171 });
  });
  const autoCard = road.querySelector('.partner-auto-card');
  const focusBeforeWalk = d.activeElement;
  const expectedVisits = [0,1,2,3,7,6,5,4,8,9,10,11,15,14,13,12];
  let firstStop;
  for (const direction of [1,-1]) {
    const visits = [];
    let gaps = 0;
    for (let step = 0; step <= 100; step++) {
      const progress = direction === 1 ? step / 100 : 1 - step / 100;
      road.dispatchEvent(new w.CustomEvent('story-progress', { detail: progress }));
      if (autoCard.hidden) { gaps++; continue; }
      const index = Number(road.dataset.nearbyShop);
      if (visits.at(-1) !== index) visits.push(index);
      if (firstStop === undefined) firstStop = progress;
      assert.equal(autoCard.querySelector('.partner-auto-name').textContent, shops[index].querySelector('.shop-name').textContent);
      assert.equal(autoCard.querySelector('img').hidden, !shops[index].querySelector('.shop-logo'), 'missing logos retain a readable name card');
      assert(!d.querySelector('#partner-dialog').open, 'automatic card never opens a blocking modal');
      assert.equal(d.activeElement, focusBeforeWalk, 'automatic cards do not steal focus');
    }
    assert.deepEqual(visits, direction === 1 ? expectedVisits : [...expectedVisits].reverse(), 'all sixteen frontages open in walking order');
    assert(gaps > 8, 'cards close on gaps and corners');
  }
  road.dispatchEvent(new w.CustomEvent('story-progress', { detail: firstStop }));
  assert(!autoCard.hidden);
  const cardMotion = [];
  for (let step = 0; step <= 1000; step++) {
    const progress = step / 1000;
    road.dispatchEvent(new w.CustomEvent('story-progress', { detail: progress }));
    if (road.dataset.nearbyShop === '0') cardMotion.push({ progress,
      y: Number.parseFloat(autoCard.style.getPropertyValue('--partner-card-y')),
      opacity: Number(autoCard.style.getPropertyValue('--partner-card-opacity')) });
  }
  const centered = cardMotion.find(state => state.y === 0 && state.opacity === 1);
  const departing = cardMotion.find(state => state.y > 100 && state.opacity < .6);
  assert(centered && departing && departing.progress > centered.progress, 'partner name holds in the center then descends and fades as friends pass');
  road.dispatchEvent(new w.CustomEvent('story-progress', { detail: centered.progress }));
  assert.equal(autoCard.style.getPropertyValue('--partner-card-y'), '0.00px', 'reverse scrolling restores the centered partner');
  scroll(9.3);
  await tick();
  assert(autoCard.hidden, 'leaving the sponsor scene closes the card');
  assert.equal(d.querySelectorAll('.dialogue-beat').length, 13, 'the extended thirteen-line dialogue script');
  for (const scene of scenes)
    assert(scene.querySelectorAll('.dialogue-beat').length <= (scene.id === 'the-invitation' ? 6 : 2), 'six invitation beats; at most two elsewhere');
  for (const line of d.querySelectorAll('.dialogue-beat q'))
    assert.equal(line.lang, 'gu', 'character dialogue remains Gujarati');
  assert(!d.querySelector('#the-plan .dialogue-track, #the-drive .dialogue-track'), 'pickup and drive tell the story visually');
  assert.equal(d.querySelectorAll('#devotion .flower-petal').length, 36, 'aarti has a bounded flower shower');
  assert.equal(d.querySelector('#devotion .flower-shower').getAttribute('aria-hidden'), 'true', 'flowers are decorative');
  assert(d.querySelector('#a-memory .photobooth-art source').srcset.includes('photobooth-mobile'), 'phone has a composed photobooth background');
  assert(
    !d.querySelector(".scene-description"),
    "no blocks of narrative explanation",
  );
  assert(
    !d.querySelector('img[src^="assets/journey/"]'),
    "photorealistic replacements are inactive",
  );
  scroll(1.1);
  assert.equal(
    d.querySelector("#beginning .is-speaking").dataset.speaker,
    "him",
  );
  scroll(1.65);
  assert.equal(
    d.querySelector("#beginning .is-speaking").dataset.speaker,
    "her",
  );
  assert.equal(d.querySelectorAll("#beginning .is-speaking").length, 1);
  scroll(1.1);
  assert.equal(
    d.querySelector("#beginning .is-speaking").dataset.speaker,
    "him",
    "dialogue reverses",
  );
  const elephantRide = d.querySelector('.journey-elephant');
  assert(elephantRide && !d.querySelector('.story-car, .drive-cockpit'), 'elephant replaces every car and cockpit');
  scroll(3.26);
  assert(!elephantRide.hidden, 'elephant arrives for boarding');
  const waitingRide = Number.parseFloat(elephantRide.style.getPropertyValue('--ride-x'));
  scroll(3.66);
  assert(Number.parseFloat(elephantRide.style.getPropertyValue('--ride-x')) > waitingRide, 'elephant advances after boarding');
  assert.equal(elephantRide.style.getPropertyValue('--riders-opacity'), '1.0000', 'both friends ride together');
  assert.equal(d.querySelector('#the-plan .man').style.getPropertyValue('--person-opacity'), '0.000', 'standing pose clears after mounting');
  for (const point of [3.85, 4.1, 4.85, 5.05]) {
    scroll(point);
    assert(!elephantRide.hidden, 'one elephant persists through scene dissolves');
    assert.equal(elephantRide.style.getPropertyValue('--riders-opacity'), '1.0000');
  }
  const arrivedRide = elephantRide.getAttribute('style');
  scroll(5.5);
  assert.equal(elephantRide.style.getPropertyValue('--riders-opacity'), '0.0000', 'friends dismount at venue');
  scroll(5.75);
  assert(elephantRide.hidden, 'elephant leaves after the friends enter');
  scroll(5.05);
  assert.equal(elephantRide.getAttribute('style'), arrivedRide, 'reverse scroll retraces the same ride');
  assert(d.querySelector('.thank-you-scene .thank-you-details'), 'all final details sit in the thank-you composition');
  scroll(5.6);
  await tick();
  assert.equal(d.querySelector('#arrival').dataset.crowdRunning, 'true', 'entrance guests move while visible');
  hidden = true;
  d.dispatchEvent(new w.Event('visibilitychange'));
  assert(!d.querySelector('#arrival').dataset.crowdRunning, 'entrance guests pause in background tabs');
  hidden = false;
  d.dispatchEvent(new w.Event('visibilitychange'));
  assert.equal(d.querySelector('#arrival').dataset.crowdRunning, 'true', 'guests resume on return');

  assert.equal(
    d.querySelector("#arrival").style.getPropertyValue("--together-opacity"),
    "1.000",
    "friends enter together",
  );
  scroll(5.68);
  assert.equal(d.querySelector('#arrival').style.getPropertyValue('--passage-opacity'), '1.0000', 'lotus passage appears as friends enter');
  scroll(5.2);
  assert.equal(d.querySelector('#arrival').style.getPropertyValue('--passage-opacity'), '0.0000', 'reverse scroll restores entrance gate');
  scroll(6.6);
  assert.equal(
    d.querySelector("#take-story-photo").getAttribute("aria-pressed"),
    "true",
    "selfie appears with scroll",
  );
  d.querySelector("#take-story-photo").click();
  frame();
  assert.equal(
    d.querySelector("#take-story-photo").getAttribute("aria-pressed"),
    "false",
    "photo retake",
  );
  d.querySelector("#take-story-photo").click();
  frame();
  assert.equal(
    d.querySelector("#take-story-photo").getAttribute("aria-pressed"),
    "true",
    "manual snapshot",
  );
  scroll(9.1);
  await tick();
  const danceScene = d.querySelector('#celebration');
  const danceRings = [...danceScene.querySelectorAll('.garba-ring')];
  assert.equal(danceScene.querySelectorAll('.garba-dancer').length, 40, 'the entire group has separate animated dancers');
  assert.equal(danceRings.length, 2, 'two circles surround the fixed shrine');
  assert(danceScene.querySelector('.garba-inner .garba-man') && danceScene.querySelector('.garba-inner .garba-woman'), 'both friends dance in the same inner group');
  assert(d.querySelector('.selfie-print img').src.includes('event-decor/selfie-lotus'), 'selfie uses matching lotus photo wall');
  assert(danceScene.querySelector('.garba-courtyard').src.includes('garba-floor'), 'floor artwork has no fixed dancers');
  const wideZoom = Number(danceScene.style.getPropertyValue('--garba-zoom'));
  scroll(9.6);
  assert(Number(danceScene.style.getPropertyValue('--garba-zoom')) > wideZoom + .7, 'scroll zooms into the complete garba circle');
  scroll(9.1);
  assert.equal(Number(danceScene.style.getPropertyValue('--garba-zoom')), wideZoom, 'camera zoom reverses with scrolling');
  assert(d.querySelector('#the-stage q').textContent.includes('સ્ટેજ તો જો! બહુ જ સરસ'), 'short Gujarati dialogue appreciates the stage');
  const ringState = () => danceRings.map(r => r.style.transform);
  danceScene.dispatchEvent(new w.CustomEvent('story-progress', {detail: .1}));
  const firstDance = ringState();
  danceScene.dispatchEvent(new w.CustomEvent('story-progress', {detail: .6}));
  assert(ringState().every((v,i) => v !== firstDance[i]), 'scroll advances both whole circles');
  danceScene.dispatchEvent(new w.CustomEvent('story-progress', {detail: .1}));
  assert.deepEqual(ringState(), firstDance, 'scroll contribution reverses consistently');
  frame();
  const beforeStep = ringState();
  frame();
  assert(ringState().every((v,i) => v !== beforeStep[i]), 'both circles continue dancing without scrolling');
  const floorStyle = danceScene.querySelector('.garba-courtyard').getAttribute('style');
  hidden = true;
  d.dispatchEvent(new w.Event('visibilitychange'));
  const pausedDance = ringState();
  frame(1000);
  assert.deepEqual(ringState(), pausedDance, 'background tabs pause the full group');
  assert.equal(danceScene.querySelector('.garba-courtyard').getAttribute('style'), floorStyle, 'floor and shrine remain stationary');
  hidden = false;
  d.dispatchEvent(new w.Event('visibilitychange'));
  scroll(0.6);
  assert.equal(
    d.querySelector("#invitation").style.getPropertyValue("--open"),
    "1.0000",
    "hamper opens",
  );
  assert(Number(d.querySelector("#invitation").style.getPropertyValue("--enter")) > 0, "opening zoom advances with scroll");
  scroll(0.01);
  assert.equal(
    d.querySelector("#invitation").style.getPropertyValue("--open"),
    "0.0000",
    "hamper closes on reverse",
  );
  assert.equal(d.querySelector("#invitation").style.getPropertyValue("--enter"), "0.0000", "entry zoom reverses");
  scroll(4.85);
  assert.equal(
    d.querySelectorAll(".scene.is-visible").length,
    2,
    "overlapping dissolve",
  );
  assert.equal(d.querySelectorAll(".scene.is-active").length, 1);
  reduced.matches = true;
  reducedHandler();
  assert(!cinematic(), "reading mode");
  assert.equal(
    d.querySelector("#invitation-seal").getAttribute("aria-expanded"),
    "false",
  );
  d.querySelector("#invitation-seal").click();
  assert.equal(
    d.querySelector("#invitation-seal").getAttribute("aria-expanded"),
    "true",
    "reading mode opens the box",
  );

  assert(
    [...d.querySelectorAll(".dialogue-beat")].every(
      (line) => !line.hasAttribute("aria-hidden"),
    ),
    "full conversations available in reading mode",
  );
  assert(
    scenes.every((s) => !s.inert && !s.hasAttribute("aria-hidden")),
    "all story accessible without motion",
  );
  reduced.matches = false;
  reducedHandler();
  assert(cinematic(), "motion restored");
  reduced.matches = true;
  reducedHandler();
  assert(!cinematic(), "system reduced motion");
  assert(scenes.every((s) => !s.inert));
  reduced.matches = false;
  reducedHandler();
  assert(cinematic());
  assert(!d.querySelector(".sound-controls, #sound-toggle, #sound-volume"), "floating sound bar removed");
  assert(d.querySelector("#opening-sound"), "door sound control remains");
  assert(!d.querySelector('use[href$="#home"], use[href$="#eye"]'), "Home and View icons removed");
  assert(d.querySelector(".wordmark[href]") && d.querySelectorAll(".brand-plaque[href]").length === 12, "home and partner links remain clickable");
  assert(!d.querySelector("[data-track], #music-panel, .player-host, #youtube-source, iframe"), "extra aarti/garba player and controls removed");
  assert(d.querySelector("#devotion") && d.querySelector("#celebration"), "aarti and garba story scenes remain");
  assert.equal(d.querySelector("#site-soundtrack").getAttribute("src"), "assets/audio/vichudo-kinjal-dave.m4a");
  assert(d.querySelector("#site-soundtrack").loop, "background garba keeps looping");
  scroll(8.3);
  assert.equal(d.querySelector(".scene.is-active").id, "the-stage");
  d.querySelector("#share-invitation").click();
  await tick();
  assert.equal(copied, "https://garba.example/");
  scroll(6.2);
  d.querySelector("#make-memory").click();
  assert(d.querySelector("#memory-dialog").open);
  d.querySelector("#memory-dialog [data-close]").click();
  assert(!d.querySelector("#memory-dialog").open);
  const input = d.querySelector("#memory-photo");
  for (const [file, message] of [
    [{ type: "image/heic", size: 100 }, "JPG"],
    [{ type: "image/jpeg", size: 21 * 1024 * 1024 }, "20 MB"],
  ]) {
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new w.Event("change"));
    await tick();
    assert(d.querySelector("#memory-status").textContent.includes(message));
  }
  // A restored reload must clear every expanded control before showing the box.
  scroll(6.6);
  d.querySelector("#a-memory").dataset.photo = "true";
  d.querySelector("#make-memory").click();
  await tick();
  d.querySelector("#invitation-seal").click();
  d.querySelector(".toast").classList.add("visible");
  w.dispatchEvent(new w.PageTransitionEvent("pageshow", { persisted: false }));
  assert.equal(w.scrollY, 0);
  assert(cinematic(), "reload restores the animated opening");
  assert.equal(d.querySelector(".scene.is-active").id, "invitation");
  assert.equal(
    d.querySelector("#invitation-seal").getAttribute("aria-expanded"),
    "false",
  );
  assert(!d.querySelector("dialog[open]"), "reload closes dialogs");
  assert.equal(d.querySelectorAll("iframe").length, 0);
  assert.equal(
    d.querySelector("#take-story-photo").getAttribute("aria-pressed"),
    "false",
  );
  assert(!d.querySelector("#a-memory").hasAttribute("data-photo"));
  assert(d.querySelector("#download-memory").hidden);
  assert(!d.querySelector(".toast").classList.contains("visible"));
  const metadata = JSON.parse(
    d.querySelector('script[type="application/ld+json"]').textContent,
  );
  assert.equal(metadata.startDate, "2026-10-09T19:30:00+05:30");
  // The original full image survives when WebGL cannot initialize.
  w.eval(fs.readFileSync(path.join(base, 'elephant-walk.js'), 'utf8'));
  const ride = d.querySelector('.journey-elephant');
  assert.equal(ride.querySelectorAll('.elephant-mesh').length, 1);
  assert.equal(ride.querySelectorAll('.elephant-fallback image').length, 1);
  assert.equal(ride.querySelectorAll('clipPath, .elephant-leg').length, 0, 'no separate clipped image pieces');
  assert(!ride.classList.contains('mesh-ready'), 'unavailable WebGL preserves the original SVG fallback');
  assert(
    html.includes(
      "https://www.district.in/events/the-garba-experience-with-kinjal-dave-1970-buy-tickets",
    ),
  );
  console.log(
    "PASS: local assets/CSS/anchors; eleven-scene forward and reverse scrolling; stationary sponsor street; moving friends; board details; PDF thank-you ending; illustrated character motion; concise dialogue beats; photo moment; continuous dissolves; reversible hamper; reading/reduced-motion modes; no floating sound bar; retained opening-sound control; removed extra music player; preserved background Garba; Escape/background cleanup; sharing; keepsake controls/validation; event details.",
  );
  console.log(
    "DOM-level checks only; rendering, actual audio output, third-party playback and photo export need real-browser verification.",
  );
  await tick(); // Drain queued scene observers before jsdom destroys document.
  w.close();
})().catch((error) => {
  console.error(error);
  w.close();
  process.exitCode = 1;
});
