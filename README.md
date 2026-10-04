# The Garba Experience

A continuous, scroll-driven Gujarati invitation with the original illustrated friends and short conversations. The closed invitation box fills the opening screen. Click the centre logo for a automatic 1.9-second door-opening and entry sequence, using the supplied door-opening MP3. The next 2.8-second character descent uses its own MP3; both effects share the intro mute control. Scroll, touch the scene or press Escape to take over. The sequence moves straight into the friends’ story through the courtyard inside. Native scrolling drives the same reversible entry animation. The original card remains available later in the story. They meet, decide on a Garba night, catch their ride, travel through Ahmedabad, enter the venue, take a selfie, hear Kinjal Dave, share a prayer and join the circle.

## Run locally

```sh
python3 -m http.server 8765 --directory dist
```

Open http://localhost:8765. The site is static: no build or production dependencies.

## Self-contained website folder

`dist/` contains the complete website: HTML, CSS, JavaScript, artwork, logos,
fonts, the invitation, calendar and all three audio recordings. The audio's
single location is `dist/assets/audio/`; the duplicate root `Audio_folder/`
has been consolidated into those byte-identical files. The page already uses
relative paths to these files, so no playback URL change is needed.

ZIP `dist/` yourself, preserving its files and subfolders. The hosting team
should place its contents in the domain's public root, with `index.html`
directly in that root. No other repository folder is required. No OpenAI API,
backend, database or build step is required. The booking and maps links use their external services.

## Current implementation

The header includes a gold oval **Autoscroll** button with green detailing. A fresh start now follows a fixed **65-second full-page schedule from the invitation opening to the absolute document bottom**. The opening uses 3.5 seconds, the main invitation/pass conversation keeps 12 seconds, entrance decor 4.8 seconds, the photobooth 3 seconds, the trimmed stage 2.3 seconds, **Partners & Sponsors receives exactly 20 seconds**, and the one-screen Thank You/details/footer receives 8 seconds. The remaining interludes are deliberately short. Manual scrolling, other actions, leaving the tab and reaching the bottom stop Autoscroll. The sound controls remain independent.

- `dist/index.html`: ten ordered story scenes, original printed invitation, unchanged event details, background Garba music and local photo keepsake.
- `dist/experience.css`: shared cinematic stage, event details, sound controls and keepsake layout.
- `dist/storybook.css`: illustrated scenes, character poses, speech bubbles, mobile compositions and a complete unpinned reading layout.
- `dist/experience.js`: controlled manual scrolling with dialogue checkpoints, character movement, short dialogue beats, reversible hamper doors, selfie moment, reading mode, the automatic opening and its sound effect, sharing and photo export.
- `dist/assets/story/scroll/`: optimized original illustrated characters, entrance, concert and Garba-circle artwork.
- `dist/assets/story/locations/`: five painted environments matched to the action: home courtyard, pickup street, driving road, selfie corner and shrine courtyard. The later realistic story backgrounds and city collage are no longer loaded.
- `dist/brand-controls.css` and `dist/assets/ui-icons.svg`: prominent logo plaques for The Garba Experience and the three lead partners, responsive handoff spacing, and icons with visible action labels.
- `dist/thank-you.css`: the closing invitation with larger event details, contrasting action buttons and room for the original decorative artwork.

`CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/verify-autoscroll.cjs` (with Playwright available) checks start/pause, the opening handoff, manual takeover, keyboard and touch controls, tab visibility, dialogs, resize/reload, end-of-page stopping, reduced motion, no JavaScript and nine header sizes.

Manual wheel, trackpad, touch and keyboard input now use one bounded continuous scroll controller. Normal speed targets about 1.6× viewport height per second, clamped to 800–1600 px/s, with at most min(700 px, 85% of the viewport) queued. Dialogue and other key reading areas apply a smooth symmetric slowdown to about 22% speed at their center, using a viewport-scaled 160–260 px radius. There are no mandatory pauses, checkpoints, snaps or fresh-gesture requirements. Reverse scrolling uses the same slowdown curve. Dialogs, independently scrollable controls, horizontal gestures, browser zoom and shortcuts remain native. Reduced motion uses bounded immediate movements. Autoscroll remains separate on the fixed 65-second schedule and any manual interaction interrupts it.

Reloading returns to the top of the closed invitation box and clears open music, dialogs, the selfie reveal and the local keepsake. A scene anchor is removed on reload; fresh direct links still work. Reduced-motion preferences remain respected.

“Read without animation” exposes all scenes in normal document flow. Reduced-motion preferences, short viewports and oversized text use the reading layout automatically. All story content is available without JavaScript.

The supplied door-opening MP3 plays when the logo is clicked. At the end of the 1.9-second door phase, the descent MP3 plays as the friends lower into view. Vichudo begins from the start when they land, at about 4.7 seconds, and loops throughout the remaining website. The header speaker mutes all website sound; the intro control mutes both effects. Only one track is audible. Scrolling back into an intro phase replaces music with its effect and restores the song position afterward. In static/reduced-motion mode, the logo click starts Vichudo directly. Hidden pages pause audio; reload resets it. Playback failures offer a retry button. All three original recordings reside in `dist/assets/audio/`, which is their single maintained location and is included when serving or uploading only `dist`.

Photo keepsakes remain entirely in the visitor's browser, with no upload or persistence. Calendar, District booking, venue directions, the original invitation and entry-pass wording are preserved.

## Verification

`node --check dist/experience.js`

`tests/verify-experience.cjs` requires `jsdom` and `postcss` in the Node module search path. It checks scene traversal and reversal, dissolves, hamper opening, reading/reduced-motion modes, silent defaults, audio controls, player cleanup, asset references, sharing, keepsake validation and event details. These are DOM-level tests. The background correction was also rendered in Chromium at 1440×900, 390×844 and 320×700, with image loading, scroll scene selection, overflow and screenshot checks. This does not establish audio quality or third-party playback.

See `PRODUCTION-BRIEF.md` for verified results and remaining checks. The existing Sites project ID is preserved. Pushing source changes does not publish the live Sites website.

`CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/verify-responsive.cjs` requires Playwright in the Node module search path. It checks 16 viewport sizes from 320×568 to 2560×1080, all cinematic scenes, handoff logo clearance, labelled controls, the final page, dialogs, reduced motion and no-JavaScript content. Set `SCREENSHOT_DIR` to retain review images. The 2 October 2026 run passed in headless Chromium; Safari, Firefox and physical devices were not tested.

`CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/verify-brand-cards.cjs` checks the clickable logo plaques and centered name/logo cards, keyboard and focus behavior, and final-page reflow at 12 sizes with normal and doubled text. Ethereum's artwork is enlarged within its bottom plaque. The closing artwork now occupies its own responsive row, while event facts and buttons wrap to their available content width.

`CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/verify-final-card.cjs` specifically checks the closing details card: its height on common phone screens, text/control containment, live resizing, independently constrained widths and enlarged text. The card uses its own container breakpoints and spacing to avoid legacy margins making it unnecessarily tall.

`node tests/verify-soundtrack.cjs` (with `jsdom` in the Node module search path) checks door/descent/music sequencing, mute, official-player exclusivity, lifecycle cleanup, autoplay/error recovery, and the HTML media fallback. `dist/site-soundtrack.js` owns this playback lifecycle; the original supplied MP3 and source note are in `dist/assets/audio/`.

`CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/verify-manual-scroll.cjs` checks all eleven dialogue stops, hard and gentle gestures, continuous momentum, reverse scrolling, bounded speed/distance, keyboard, real browser touch input, dialog/zoom exemptions and reduced-motion reading.

The separate Aarti, Play Kinjal Dave and Play Garba buttons and their music-selection player have been removed. The Aarti/Garba story scenes and existing background soundtrack remain.

Home and View controls show only their logos, with click actions and accessible names retained.
