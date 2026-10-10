# Deck engine

Every deck links `engine/deck.css` and `engine/deck.js`. Copy the `<head>` of `demo/index.html` (meta tags, icon, manifest, stylesheet) and put slides inside `<main class="deck">`, with `<script src="../../engine/deck.js">` last.

## Stage
- Slides are drawn on a 1280×720 stage, scaled to fit, with at least 60px bands above and below for controls.
- Keep content inside `--safe-x` / `--safe-y` (5%). Turn on **Safe-zone guides** in the menu (or press G) to check.
- Text sizes: `--fs-label` 32 (minimum), `--fs-body` 36, `--fs-h2` 56, `--fs-h1` 84.

## Slides
`<section class="slide TYPE">` where TYPE is `title`, `illustration`, `diagram`, `map`, `blank-map`, `whiteboard` (add `grid`), `image`, `recap` or `end`.
- `data-label="…"` names the slide in the menu (default: its first heading).
- `data-chapter="…"` overrides the YouTube chapter title (default: the label).
- The brand mark is added to every slide automatically.

## Steps
- `class="step"`: revealed one by one in page order.
- `data-step="n"`: revealed at step n (same n = together). Add `rise` or `pop` for motion.
- `data-on="n"`: always visible, gets class `.on` at step n (use for movement in illustrations).
- `data-off="n"`: hidden from step n.
- Slides fire `deck:enter`, `deck:step` (`e.detail.step`) and `deck:leave` for custom scripts.

## Diagrams
`.cycle` (n1…n4, a1…a4, hub), `.flow`, `.timeline`, `table.compare`, `.node` (colour via `--c`), `.arrow.right|left|up|down`.

## Maps
`<div class="map-frame" data-svg="../../assets/maps/FILE.svg" data-layers="rivers forest cities">`
- In the SVG, mark groups `data-layer="base"` (always shown) or `data-layer="NAME"`.
- Listed layers switch on one per step; `NAME@0` shows from the start, `NAME@3` at step 3. Unlisted layers are hidden, so the same file serves a blank map (`data-layers=""`).
- Legend: `<ul class="legend"><li class="line|dot" data-step="1" style="--c:var(--water)">Rivers</li>`.

## Animations (SVG)
`anim-flow` (moving dashes: wind, rivers), `anim-rain`, `anim-rise` (vapour), `anim-bob`.

## Controls (all in the bands)
- Top: Pen, Highlighter, Eraser, Shapes, Lasso, Text, Laser · tool options (3 thicknesses; eraser Whole/Part; lasso Delete) · 6 colours + custom · Hand mode.
- Bottom: menu, YouTube, + blank page (delete button on inserted pages), ‹ counter + step dots › (arrows jump whole slides; going back always starts a slide from the beginning), undo, redo, clear page, chapter timer, Update (after a publish).
- Pencil uses the tool; fingers navigate (right 65% = next, left 35% = back, swipe). Touches are ignored while the Pencil is down, taps within 0.5 s after it lifts are ignored, and contacts wider than 44px count as palms.
- Strokes: centripetal Catmull-Rom through the samples, then perfect-freehand. The ink canvases are outside the scaled stage (`.ink-wrap`), sized to it in device pixels.
- Draw and hold (0.55 s) snaps pen, highlighter and shape strokes; the Shapes tool also snaps on lift.
- Mac: the mouse acts as the Pencil · ← → keys · P H E S L T K tools · Z undo · Y redo · Delete removes a lasso selection · G guides · M menu · F full screen.
- Ink and inserted pages are saved per lesson in IndexedDB (`namma-exams` → `lessons`, key = lesson folder). Page ids: `data-id` if set, else `type:label`, so give a slide `data-id` if you will rename its heading after teaching with ink on it.
- Load `engine/perfect-freehand.js` before `deck.js` (the engine loads it itself if a deck forgets).

## Chapter timer
Tap **Start** when recording starts. Each slide's first appearance is logged. **Copy chapters** copies YouTube-format lines. The first chapter is 0:00 and chapters under 10 s are merged into the previous one; it warns if there are fewer than 3. Reset it from the menu.
The finished list is also saved on the device (localStorage key `nammaChapters:<lesson folder path>`), refreshed every 10 s, on every slide change and when the page is hidden, for the lesson's YouTube page.

## YouTube package (per lesson folder)
- `youtube.md`: `# Lesson name`, then `## Title`, `## Description`, `## Tags`, `## Hashtags`. The text under each heading is exactly what gets pasted. The description keeps the line `[paste from the deck's Copy chapters button]`.
- `youtube.html`: copy `demo/youtube.html` unchanged (only the `../` depth differs: lessons are two folders deep, so use `../../engine/…`). `engine/youtube.js` reads `youtube.md`, adds Copy buttons and character counts, swaps the chapter placeholder for the saved chapters, and adds **Save thumbnail** (share sheet on iPad, download on Mac).
- `thumbnail.png`: render it with the local server running:
  ```
  engine/make-thumbnail.sh karnataka-geography/01-introduction/thumbnail.png "Karnataka|Introduction" "ಕರ್ನಾಟಕ ಭೂಗೋಳ ಪರಿಚಯ" "Karnataka Geography · 01"
  ```
  (`|` breaks the title line; template: `engine/thumbnail.html`.)
- The deck shows a **YouTube** button in the bottom band when `youtube.html` exists next to it. In `index.html`, give each lesson **Teach** and **YouTube** buttons (see the demo entry).

## Testing locally
Run the server from the project folder, then open http://localhost:8123/:
```
python3 -m http.server 8123
```
Opening a file directly (file://) won't load maps or work offline.
