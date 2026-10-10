# Namma Exams (ನಮ್ಮ ಎಕ್ಸಾಮ್ಸ್): Lesson Decks

## What this project is
- I am Yunus, teaching as Namma Exams (ನಮ್ಮ ಎಕ್ಸಾಮ್ಸ್), a YouTube channel for KAS aspirants in Karnataka.
  - Channel: https://www.youtube.com/@namma-exams
- This folder holds the lesson decks I teach from while recording classes on my iPad, explaining in my own voice. The recordings are published on YouTube.
- The decks support my explanation. They are not self-explanatory videos.
- Current course: Karnataka Geography for KAS.

## Where decks are shown
- iPad in landscape, in Safari opened as a Home Screen web app (full screen).
- Every deck must also work in a Mac browser so I can check it before class.
- Input during class is finger taps and Apple Pencil. There is no keyboard in class, but support arrow keys for testing on the Mac.

## Built for YouTube (16:9)
- YouTube videos are 16:9; the iPad screen is not. So every slide is drawn on a **16:9 stage**, centred on the screen and as large as fits.
- The empty bands above and below the stage are plain dark. **All controls (pen toolbar, slide counter, menu) live in these bands, never on the stage.** I crop each recording to 16:9 afterwards, which removes the bands and every control from the final video.
- Nothing important within 5% of the stage edges.

## Shared deck engine
- Every deck uses the shared files in `engine/` (`deck.css`, `deck.js`, `perfect-freehand.js`).
- Never copy engine code into a lesson. If something needs to change, improve the engine so every deck benefits.
- The engine must provide all of the following:
  - **Navigation.** Tap the right side of the stage or swipe left to go next; tap the left side or swipe right to go back. Within a slide, steps reveal one by one before moving on to the next slide. The ‹ › arrows in the bottom band jump whole slides (‹ shows the previous slide fully built).
  - **Input rules.**
    - Only a pointer that goes down on the stage can draw or navigate. The Apple Pencil uses the selected tool; fingers only navigate (use `pointerType` to tell them apart). On the Mac, the mouse acts as the Pencil.
    - Palm rejection: finger touches on the stage are ignored while the Pencil is down, taps right after it lifts are ignored, and very large contacts are palms. Fingers still swipe between slides.
    - Every band button works with finger and Pencil (acts on `pointerup`, not `click`). No `preventDefault` on document-level touch events; `touch-action: none` only on the stage and bands.
    - Keep every button clear of the iPad home-indicator area.
  - **Toolbar in the top band, GoodNotes 6 style.**
    - Tools: Pen, Highlighter, Eraser (whole stroke or partial), Shapes, Lasso (select ink to move, resize or delete), Text, Laser pointer (glowing trail that fades after 2 seconds, never saved).
    - Draw and hold snaps to a straight line, arrow, circle/ellipse or rectangle (the Shapes tool also snaps on lift).
    - 3 thickness presets; 6 bright colour presets plus a custom colour picker. The selected tool and colour are clearly highlighted.
    - Hand mode: Pencil taps and swipes change slides instead of drawing.
  - **Smooth writing like GoodNotes.** Pointer events with `getCoalescedEvents()` and `getPredictedEvents()`; pressure-sensitive strokes with perfect-freehand, vendored in `engine/` (no CDN, works offline); a smooth curve through the Pencil's samples; rendering in `requestAnimationFrame`. The ink canvases sit outside the scaled stage at exactly one canvas pixel per screen pixel, so pen and laser strokes are never pixelated.
  - **Bottom band.** Menu, YouTube button, "+" blank page, slide counter (small, with step dots), undo, redo, clear page, chapter timer.
  - **Blank pages.** "+" inserts a page after the current slide: white, lined, grid, dotted or dark board. Inserted pages are named "Board 1", "Board 2"… (also in the chapter timer) and can be deleted.
  - **Ink saving.** Each page's ink (and inserted pages) is kept on the device after the app closes (IndexedDB, per lesson). The menu has "Clear all ink in this lesson".
  - **iOS full-screen web-app setup.** Include the meta tags (`apple-mobile-web-app-capable`, `viewport-fit=cover`), safe-area padding and a home-screen icon.
  - **Chapter timer (in the bands).** A Start button that I tap when I start recording. From then on, log the time each slide first appears. After class, a "Copy chapters" button copies the list in YouTube chapter format (`0:00 Title`, then one line per slide), ready to paste into the video description. Also save the chapter list on the device (localStorage, keyed by lesson) so the lesson's YouTube page can include it automatically. Follow YouTube's rules: the first line is 0:00, there are at least 3 chapters, and each chapter is at least 10 seconds long (merge shorter ones into the previous chapter).
  - **Updates.** After I publish, an open deck shows an "Update" button in the bottom band (checked every 5 minutes and whenever the app comes back to the screen). The menu's "Reload latest version" forces a fresh copy.
  - **Offline support (nice to have).** Decks should keep working without internet once loaded.

## Slide types
1. **Title.** Lesson title, course name, Namma Exams branding.
2. **Illustration.** Interactive and animated, advanced by tap.
3. **Diagram.** Builds step by step: flowchart, cycle, timeline, comparison table or cross-section.
4. **Map.** A base map plus layers switched on in order.
5. **Blank map.** An outline map for me to mark by hand.
6. **Whiteboard.** Plain or grid, for free drawing.
7. **Image.** One of my own images, placed for annotation.
8. **Recap.** Key points for revision.
9. **End card.** The last slide of every deck: channel name, @namma-exams and the next lesson's title. Leave the right half mostly empty so YouTube end-screen elements (subscribe button, next video) can sit there.

## Design rules
- **Readable on a phone screen when students watch on YouTube.**
  - Body text at least 28px at iPad landscape size, with large headings.
  - At most about 15 words of text per slide. I explain; the slide shows.
- **Colour.**
  - A bright, colourful palette, defined once as CSS variables in `engine/deck.css` and used in every deck.
  - Strong contrast throughout.
  - Consistent meanings across all decks: water is blue, forest is green, and so on.
- **Language.**
  - Labels are in English.
  - Add the Kannada term in brackets where students know it, e.g. Western Ghats (ಪಶ್ಚಿಮ ಘಟ್ಟಗಳು).
  - Use Noto Sans Kannada for Kannada text.
- **Branding.** A small "Namma Exams (ನಮ್ಮ ಎಕ್ಸಾಮ್ಸ್)" mark in a corner of every slide, inside the stage.
- **No narration, no audio, no auto-play.** Nothing advances unless I tap.

## Maps: strict rules
- **India's boundary.**
  - Maps of India must show the official boundary as per the Survey of India, including all of Jammu & Kashmir and Ladakh (PoK, Gilgit-Baltistan and Aksai Chin).
  - Never use generic world-map boundary data for India.
- **Karnataka's districts.** Use the current district list. Verify the count and names from Government of Karnataka sources before building.
- **Reuse.** Store map data once in `assets/maps/` and reuse it.
- **Sources.** Tell me the data source used for every base map.

## Accuracy
- This content is for competitive exams. Verify every figure against official sources: area, coordinates, lengths, ranks, dates. Examples of official sources are the Government of Karnataka, the Census, the Survey of India and the GSI.
- If you are unsure, or sources conflict, tell me in the chat instead of guessing.
- Record the sources for each lesson in a `sources.md` file inside that lesson's folder, not on the slides.

## Safe to publish on YouTube
- Use only my own images, content you draw, or data and images that are public domain or openly licensed for reuse.
- Never use copyrighted images, maps or graphics from textbooks, coaching material or websites.
- Fonts must be free for commercial use (e.g. Google Fonts).
- List any credits required by a licence in `sources.md` so I can add them to the video description.

## Folder structure
```
engine/                  shared deck engine (css, js, fonts, icons)
assets/maps/             map data, reused across decks
assets/images/           my images
assets/brand/            Namma Exams logo and channel art
index.html               library menu: subjects, then lessons (each lesson has Teach and YouTube buttons)
karnataka-geography/
  01-introduction/
    index.html
    sources.md
    youtube.md           YouTube title, description, tags (auto)
    youtube.html         iPad page with copy buttons for the YouTube package (auto)
    thumbnail.png        YouTube thumbnail (auto)
```

## Workflow for a new lesson
1. I give a topic and outline, or ask you to propose one.
2. Propose a slide-by-slide plan first, and wait for my OK.
3. Build the deck **and, automatically and every time, its YouTube package** (see below). Open the deck in the browser for me to check.
4. After I approve, add it to `index.html` (the library menu).
5. Publish only when I say "publish".
6. In your final message for every lesson, show me the full contents of `youtube.md` so I can copy it straight from the chat.

## YouTube package (automatic with every lesson)
Create these in the lesson folder whenever you build or change a deck, without being asked.

**`youtube.md`**, with each part under its own heading so I can copy it in one go:
- **Title.** Kannada and English, under 100 characters. Put the key search words first. Example pattern: `Karnataka Geography 01: Introduction | ಕರ್ನಾಟಕ ಭೂಗೋಳ ಪರಿಚಯ | KAS`.
- **Description.**
  - A 2–3 line summary of the class, in Kannada and English.
  - What the class covers, as a short list.
  - The line `Chapters:` followed by `[paste from the deck's Copy chapters button]`.
  - The channel link: https://www.youtube.com/@namma-exams
  - Credits required by any licence used in this lesson (from `sources.md`). If none are required, leave this part out.
- **Tags.** 15–25 search keywords, comma-separated, under 500 characters in total. Mix English and Kannada, broad and specific. Examples: KAS geography, Karnataka geography in Kannada, KPSC, KAS prelims, ಕರ್ನಾಟಕ ಭೂಗೋಳ, plus the topic's own terms.
- **Hashtags.** 3 hashtags for the description, e.g. #KAS #KarnatakaGeography #NammaExams.

**`youtube.html`**, the YouTube page I use on the iPad after recording:
- Same content as `youtube.md`, shown as separate boxes: Title, Description, Tags, Hashtags.
- A large **Copy** button on each box. Show "Copied" after tapping.
- The Description box automatically includes this lesson's chapters, read from the device storage saved by the deck's chapter timer, in place of the placeholder line. If no chapters are saved yet, show the placeholder and a short note.
- A **Save thumbnail** button that opens the iPad share sheet (Web Share API with the image file), so I can choose "Save Image" to Photos. Also show the thumbnail so a long-press works as a fallback.
- Large, touch-friendly layout in the Namma Exams style. This page does not need the 16:9 stage.
- Link to it from the lesson's entry in `index.html`, and from a small "YouTube" button in the deck's control band.

**`thumbnail.png`**
- 1280×720, in the deck's style.
- A large title of 3–5 words, readable at small size, with a Kannada line.
- The Namma Exams branding.

## Publishing
- Hosted on GitHub Pages. Publishing means commit and push.

## How to work with me
- Be direct and concise.
- Make precise fixes without long explanations.
