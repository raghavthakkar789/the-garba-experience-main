# Sponsor road asset audit

Source: https://drive.google.com/drive/folders/1CX5Z0ul_NA9RgI9p_439_QE7khvmQTyw

Checked 28 September 2026. The final road contains all 16 confirmed presenter, sponsor and partner names, with their supplied roles. Supplied artwork is preserved, cropped for surrounding whitespace and optimized to WebP. Brand names are also live HTML text.

Updated 2 October 2026: rechecked the supplied Eventzz Planet PNG, Saregama logo PDF and Ethereum Infracon JPEG against the existing optimized images. These three partners now receive prominent logo-only plaques alongside The Garba Experience in the opening, cinematic backdrop and closing page. Their street boards, automatic cards and dialogs show larger logos with no additional visible name/role captions; names remain available for assistive technology. The other partners retain their existing name/role presentation. Chromium review across 16 viewport sizes verified the responsive layouts, with phone and desktop screenshots reviewed for logo sizing and contrast.

## Logos used

Eventzz Planet, Saregama Entertainment, Ethereum Infracon, MBA Group, Vivanta Group, HST, Eleven Infra, Vishakha, Krish Communication, JG University, Utsav Decor and S House.

## Items requiring confirmation

- Megma, Hungrito and Alpha Hospital: matching supplied files were added on 3 October 2026 and are now used in their respective sponsor boards, automatic cards and details dialogs. Sources: `Megma.png`, `hungrito-logo- (1) (1).svg`, and `Alpha Hospital .bmp`.
- Shah Events: `Shah events .pdf` actually displays **Shah Brothers**, with a printing tagline. Do not assume these are interchangeable. The road uses the requested name Shah Events without that logo until confirmed.
- Hospitality: the supplied text “Dhaval sethvala ni company nu mangavanu” is an internal request for a company name, not a publishable partner name. `Presha logo.png` displays **Presha Hospitality**, but no role mapping was confirmed. Hospitality is intentionally pending confirmation; neither the internal note nor Presha is published.
- `New Logo PDF.pdf` is another JG University logo. The named JG Red Logo is used.
- Duplicate MBA JPG and Krish ZIP were not needed because their matching PNG/PDF versions were available.

## Scene artwork

Built-in image generation created `dist/assets/partners/festival-road.webp`; original project characters were reused in `friends-walking.webp`. No sponsor logos or lettering were generated. The full art prompt is recorded in `dist/assets/partners/ART-PROMPT.md`.

The current scene replaces the moving shop pairs with a complete stationary market. Its new assets are `market-courtyard.webp`, `painted-shop.webp` and `friends-sidewalk.webp`, with prompts in `dist/assets/partners/STATIONARY-STREET-PROMPTS.md`. The previous art remains available for reference but is no longer used by this scene.

## Verification

- Existing `tests/verify-experience.cjs` passes, including the original ten scenes plus the connected road chapter, invitation opening, reduced motion, sound-bar removal and event details.
- Headless Chromium checked the complete street at 1440×900, 390×844 and 320×640. All 16 shops remain visible at once, with unchanged bounding rectangles, opacity and transforms across forward and backward scrolling. Only the friends change position.
- Checked the continuous walking path, reverse scrolling, reduced-motion static layout, reload-to-top behavior and lack of horizontal overflow or browser script errors.
- Visually reviewed desktop, phone, compact phone and reading-mode screenshots. Gujarati heading uses the existing self-hosted Gujarati font.
- All sixteen shop buttons open the correct readable logo, name and role. Escape closes the dialog and returns focus. Board controls are excluded from button motion so interaction never moves a shop.

## Story integration correction

The road now lives inside the original story stage immediately after the Garba circle. The shared story controller drives its longer scroll duration and the transition into the walk home. It has no separate sticky region, scroll listener or resize controller. The original non-animated event-details section is once again the last main section; its HTML is unchanged from before the sponsor-road addition. Its Gujarati text now explicitly uses the existing Gujarati font to prevent missing-glyph boxes. The redundant chapter caption is hidden during the road so it does not cross over the walking characters.
