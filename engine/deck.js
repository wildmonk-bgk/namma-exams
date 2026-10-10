/* Namma Exams deck engine: shared by every lesson deck. See engine/README.md.
   Needs engine/perfect-freehand.js loaded first (the engine adds it automatically if a deck forgets). */
(() => {
  'use strict';

  const W = 1280, H = 720;      // logical stage size (16:9)
  const BAND_MIN = 64;          // screen px always kept free above and below the stage for controls
  const TAP_BACK = 0.35;        // taps on the left 35% of the stage go back
  const SWIPE_MIN = 60;         // screen px
  const TAP_SLOP = 16;          // screen px a tap may move
  const PALM_MS = 500;          // finger taps this soon after the Pencil lifts are ignored (palm lifting off)
  const PALM_SIZE = 44;         // touch contacts wider than this (CSS px) are palms, never navigation
  const HOLD_MS = 550;          // draw and hold this long to snap a stroke to a shape
  const LASER_MS = 2000;        // laser trail fades over this time
  const INTERACTIVE = 'button, a, input, select, textarea, label, [data-interactive]';
  const TYPES = ['title', 'illustration', 'diagram', 'map', 'blank-map', 'whiteboard', 'image', 'recap', 'end'];
  const PAGE_STYLES = [['white', 'White'], ['lined', 'Lined'], ['grid', 'Grid'], ['dotted', 'Dotted'], ['dark', 'Dark board']];

  const ENGINE = new URL('./', document.currentScript.src);
  const ROOT = new URL('../', ENGINE);
  const LESSON = location.pathname.replace(/[^/]*$/, '');      // lesson folder: key for ink and chapters

  const INK = ['#E3182D', '#1660E8', '#12A150', '#F57C00', '#8E24AA', 'auto'];   // 'auto' = black, or white on a dark page
  const HL = ['#FFE600', '#7CFF4F', '#FF6FD8', '#4FE3FF', '#FFA53D', '#B98CFF'];
  const LASER = ['#FF2D55', '#FFE600', '#38E1FF', '#7CFF4F', '#FF6FD8', '#FFFFFF'];
  const TOOLS = {
    pen: { label: 'Pen', sizes: [3, 5, 9], colors: INK },
    hl: { label: 'Highlighter', sizes: [16, 28, 44], colors: HL },
    eraser: { label: 'Eraser', sizes: [10, 20, 40] },
    shape: { label: 'Shapes (draw, then hold or lift to snap)', sizes: [3, 5, 9], colors: INK },
    lasso: { label: 'Lasso' },
    text: { label: 'Text', sizes: [32, 44, 60], colors: INK },
    laser: { label: 'Laser pointer', colors: LASER },
  };

  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    pen: svg('<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="M13.5 6.5l4 4"/>'),
    hl: svg('<path d="M9 11l-5 5v4h4l5-5"/><path d="M9 11l6-6 4 4-6 6z"/><path d="M14 20h7" stroke="#FFE600" stroke-width="3"/>'),
    eraser: svg('<path d="M7 20h13"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19H8z"/><path d="M9 11l5 5"/>'),
    shape: svg('<circle cx="8" cy="15" r="5"/><path d="M12 3h9v9h-9z"/>'),
    lasso: svg('<path d="M7 17c-3-1.5-4-3.5-4-5.5C3 7 7.5 4 12.5 4S21 6.5 21 10s-4 6-9 6c-1.6 0-3-.2-4.3-.6" stroke-dasharray="3 2.6"/><path d="M7 17c0 2 1 3 3 3"/>'),
    text: svg('<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>'),
    laser: svg('<path d="M4 20l7.5-7.5"/><circle cx="14.5" cy="9.5" r="2.5" fill="currentColor"/><path d="M14.5 3v1.5M21 9.5h-1.5M19.2 4.8l-1 1M19.2 14.2l-1-1M9.8 4.8l1 1"/>'),
    hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4L2.4 16a2 2 0 0 1 2.8-2.8L7 15"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    clear: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    prev: svg('<path d="M15 18l-6-6 6-6"/>'),
    next: svg('<path d="M9 18l6-6-6-6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    delPage: svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9.5 10.5l5 5M14.5 10.5l-5 5"/>'),
    rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#FF3B4E"/></svg>',
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  };
  const sizeIcon = w => `<svg viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/></svg>`;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const now = () => performance.now();

  registerServiceWorker();
  const deckEl = document.querySelector('.deck');
  if (!deckEl) return;           // library and YouTube pages: only the service worker

  // DOM
  let stage, inkWrap, inkCanvas, liveCanvas, laserCanvas, bandTop, bandBottom, counterEl, dotsEl, menu, probe;
  let toolbar = {}, bottom = {};
  // Navigation
  let slides = [], cur = -1, step = 0, scale = 1, stageRect = null;
  // Ink: pages[pageId] = array of items; hist[pageId] = { undo: [], redo: [] }
  let pages = {}, hist = {}, boards = [], boardCount = 0, saveTimer = 0;
  let live = null, sel = null, textEdit = null, lastPenUp = -1e9, wakeLock = null;
  const touches = new Map();
  const laser = { pts: [] };
  const pathCache = new WeakMap();
  let frame = 0, inkDirty = false, liveDirty = false;
  // Chapter timer
  const chapterKey = 'nammaChapters:' + location.pathname;
  const savedChaptersKey = 'nammaChapters:' + LESSON;
  let rec = null, timerEl, timerTick = 0, msgTimer = 0;   // rec = { start: epoch ms, log: [{ id, t, title }] }

  const pref = loadPrefs();

  init();

  async function init() {
    if (!window.PerfectFreehand) await loadScript(ENGINE + 'perfect-freehand.js');
    await includeSvgs();
    slides = [...deckEl.querySelectorAll(':scope > .slide')];
    assignIds();
    const stored = await loadStore();
    if (stored) {
      pages = stored.pages || {};
      boards = stored.boards || [];
      boardCount = stored.boardCount || boards.length;
      boards.forEach(placeBoard);
      slides = [...deckEl.querySelectorAll(':scope > .slide')];
    }
    slides.forEach(prepSlide);
    buildChrome();
    loadChapters();
    layout();
    addEventListener('resize', layout);
    addEventListener('orientationchange', () => setTimeout(layout, 300));
    bindInput();
    go(hashSlide(), 0);
    addEventListener('hashchange', () => { const i = hashSlide(); if (i !== cur) go(i, 0); });
    document.fonts?.ready.then(() => { inkDirty = true; requestDraw(); });
    watchForUpdates();
  }

  function loadScript(src) {
    return new Promise(res => { const s = el('script'); s.src = src; s.onload = s.onerror = res; document.head.append(s); });
  }

  /* ---------- Inline SVG maps: <div class="map-frame" data-svg="…svg" data-layers="rivers forest cities"> ----------
     Groups in the file marked data-layer="base" always show. Listed layers switch on one per step, in order
     ("name@0" = shown from the start, "name@3" = at step 3). Unlisted layers are removed. */
  async function includeSvgs() {
    await Promise.all([...deckEl.querySelectorAll('[data-svg]')].map(async box => {
      try {
        const res = await fetch(box.dataset.svg);
        if (!res.ok) throw new Error(res.status);
        box.innerHTML = (await res.text()).replace(/^[\s\S]*?(?=<svg)/, '');
        const at = {};
        let n = (+box.dataset.layersFrom || 1) - 1;
        for (const tok of (box.dataset.layers || '').split(/[\s,]+/).filter(Boolean)) {
          const [name, s] = tok.split('@');
          if (s === undefined) at[name] = ++n; else { at[name] = +s; n = Math.max(n, +s); }
        }
        box.querySelectorAll('[data-layer]').forEach(g => {
          const name = g.dataset.layer;
          if (name === 'base') return;
          if (!(name in at)) g.remove();
          else if (at[name] > 0) g.dataset.step = at[name];
        });
      } catch (err) {
        box.innerHTML = `<p class="svg-error">Could not load ${esc(box.dataset.svg)}. Open decks through the local server or GitHub Pages, not as a file.</p>`;
      }
    }));
  }

  // Stable page ids so saved ink stays with its slide: data-id, else "type:label" (numbered if repeated).
  function assignIds() {
    const seen = {};
    for (const s of slides) {
      if (s.dataset.pageId) continue;
      const base = s.dataset.id || `${slideType(s)}:${slideLabel(s)}`;
      const n = seen[base] = (seen[base] || 0) + 1;
      s.dataset.pageId = n > 1 ? `${base}#${n}` : base;
    }
  }

  function prepSlide(s) {
    if (s._prepped) return;
    s._prepped = true;
    if (!s.querySelector(':scope > .brand-mark')) {
      s.append(el('div', 'brand-mark', `<img src="${ENGINE}icons/mark.png" alt=""><span>Namma Exams <span class="kn">(ನಮ್ಮ ಎಕ್ಸಾಮ್ಸ್)</span></span>`));
    }
    let auto = 0;
    s.querySelectorAll('.step:not([data-step])').forEach(e => { e.dataset.step = ++auto; });
    let max = 0;
    s.querySelectorAll('[data-step], [data-on], [data-off]').forEach(e => {
      for (const k of ['step', 'on', 'off']) if (e.dataset[k]) max = Math.max(max, +e.dataset[k]);
    });
    s._steps = max;
  }

  /* ---------- Navigation ---------- */
  function go(i, n = 0) {
    i = clamp(i | 0, 0, slides.length - 1);
    const s = slides[i];
    if (n === 'end') n = s._steps;
    n = clamp(n, 0, s._steps);
    if (i !== cur || !s.classList.contains('active')) {
      commitText();
      cancelLive();
      sel = null;
      const old = slides[cur];
      if (old && old !== s) { old.classList.remove('active'); old.dispatchEvent(new CustomEvent('deck:leave', { bubbles: true })); }
      cur = i;
      s.classList.add('active');
      inkDirty = liveDirty = true;
      requestDraw();
      s.dispatchEvent(new CustomEvent('deck:enter', { bubbles: true, detail: { step: n } }));
      history.replaceState(null, '', '#' + (i + 1));
      logChapter();
      renderToolbar();
      updatePageButtons();
    }
    step = n;
    s.dataset.at = n;
    s.querySelectorAll('[data-step]').forEach(e => e.classList.toggle('on', +e.dataset.step <= n));
    s.querySelectorAll('[data-on]').forEach(e => e.classList.toggle('on', +e.dataset.on <= n));
    s.querySelectorAll('[data-off]').forEach(e => e.classList.toggle('off', +e.dataset.off <= n));
    s.dispatchEvent(new CustomEvent('deck:step', { bubbles: true, detail: { step: n } }));
    updateCounter();
  }
  function next() { if (step < slides[cur]._steps) go(cur, step + 1); else if (cur < slides.length - 1) go(cur + 1, 0); }
  function prev() { if (step > 0) go(cur, step - 1); else if (cur > 0) go(cur - 1, 'end'); }
  function hashSlide() { return Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1); }

  window.Deck = {
    go, next, prev,
    get slide() { return cur; }, get step() { return step; },
    get pageId() { return pageId(); },
    get items() { return items().map(it => ({ ...it })); },
    setTool, insertPage,
  };

  /* ---------- Blank pages inserted while teaching ---------- */
  function boardSlide(b) {
    const s = el('section', `slide whiteboard board ${b.style}`);
    s.dataset.label = 'Board ' + b.n;
    s.dataset.pageId = b.id;
    s.dataset.board = b.style;
    return s;
  }
  function placeBoard(b) {
    const s = boardSlide(b);
    const after = [...deckEl.children].find(x => x.dataset.pageId === b.after);
    if (after) after.after(s);
    else { const end = deckEl.querySelector(':scope > .slide.end'); end ? end.before(s) : deckEl.append(s); }
  }
  function insertPage(style) {
    const b = { id: 'board-' + Date.now().toString(36), after: pageId(), style, n: ++boardCount };
    boards.push(b);
    const s = boardSlide(b);
    slides[cur].after(s);
    prepSlide(s);
    slides = [...deckEl.querySelectorAll(':scope > .slide')];
    saveSoon();
    go(cur + 1, 0);
  }
  function deletePage() {
    const id = pageId(), b = boards.find(x => x.id === id);
    if (!b || !confirm(`Delete ${slideLabel(slides[cur])} and its ink?`)) return;
    boards = boards.filter(x => x !== b);
    boards.forEach(x => { if (x.after === id) x.after = b.after; });
    delete pages[id]; delete hist[id];
    const i = cur;
    slides[i].remove();
    slides = [...deckEl.querySelectorAll(':scope > .slide')];
    cur = -1;
    saveSoon();
    go(Math.max(0, i - 1), 'end');
  }

  /* ---------- Chrome: stage, bands, menu ---------- */
  function buildChrome() {
    document.body.classList.add('deck-app');
    stage = el('div', 'stage');
    inkCanvas = el('canvas', 'ink-layer');
    liveCanvas = el('canvas', 'ink-layer');
    laserCanvas = el('canvas', 'ink-layer');
    stage.append(deckEl, el('div', 'guides'));
    // Ink canvases sit outside the scaled stage, sized to it in real screen pixels, so strokes are never resampled.
    inkWrap = el('div', 'ink-wrap');
    inkWrap.append(inkCanvas, liveCanvas, laserCanvas);

    bandTop = el('div', 'band band-top');
    buildToolbar();
    bandBottom = el('div', 'band band-bottom');
    buildBottomBand();

    menu = buildMenu();
    probe = el('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.append(stage, inkWrap, bandTop, bandBottom, menu, probe);
  }

  /* Buttons act on pointerup (finger, Pencil and mouse alike), so they never depend on iOS turning a tap into a click.
     A real click still works (keyboard, accessibility) and is ignored right after a pointer tap. */
  function onTap(node, fn) {
    let down = null;
    node.addEventListener('pointerdown', e => { if (e.button > 0) return; down = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    node.addEventListener('pointerup', e => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 30 || node.disabled) return;
      node._tapped = now();
      fn(e);
    });
    node.addEventListener('pointercancel', () => { down = null; });
    node.addEventListener('click', e => {
      if (node.tagName !== 'LABEL') e.preventDefault();
      if (now() - (node._tapped || -1e9) < 800 || node.disabled) return;
      fn(e);
    });
    return node;
  }
  function button(html, label, fn, cls) {
    const b = el('button', cls, html);
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    return onTap(b, fn);
  }
  const sep = () => el('span', 'sep');

  function buildToolbar() {
    const tb = el('div', 'toolbar');
    const tools = el('div', 'tb-group');
    for (const t in TOOLS) tools.append(button(ICONS[t], TOOLS[t].label, () => setTool(t), 'tool tool-' + t));
    toolbar.ctx = el('div', 'tb-group ctx');
    toolbar.colors = el('div', 'tb-group colors');
    toolbar.hand = button(ICONS.hand, 'Hand: Pencil taps and swipes change slides', () => { pref.hand = !pref.hand; savePrefs(); renderToolbar(); }, 'hand');
    tb.append(tools, sep(), toolbar.ctx, sep(), toolbar.colors, sep(), toolbar.hand);
    bandTop.append(tb);
  }

  // Context group (sizes, eraser mode, lasso delete) and colours follow the selected tool.
  function renderToolbar() {
    if (!toolbar.ctx) return;
    const t = pref.tool, def = TOOLS[t];
    bandTop.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.classList.contains('tool-' + t)));
    toolbar.hand.classList.toggle('active', pref.hand);
    bandTop.classList.toggle('hand-mode', pref.hand);

    toolbar.ctx.replaceChildren();
    if (t === 'eraser') {
      toolbar.ctx.append(
        button('Whole', 'Erase whole strokes', () => { pref.eraseMode = 'stroke'; savePrefs(); renderToolbar(); }, 'txt' + (pref.eraseMode === 'stroke' ? ' active' : '')),
        button('Part', 'Erase part of a stroke', () => { pref.eraseMode = 'partial'; savePrefs(); renderToolbar(); }, 'txt' + (pref.eraseMode === 'partial' ? ' active' : '')));
    }
    if (t === 'lasso') {
      const del = button(ICONS.clear + '<span>Delete</span>', 'Delete selection', deleteSelection, 'txt icon-txt');
      del.disabled = !sel;
      toolbar.ctx.append(del);
      toolbar.del = del;
    }
    if (def.sizes) {
      def.sizes.forEach((w, i) => toolbar.ctx.append(
        button(sizeIcon([1.5, 3.5, 6][i]), `${['Thin', 'Medium', 'Thick'][i]}`, () => { pref.size[t] = i; savePrefs(); renderToolbar(); }, 'size' + (pref.size[t] === i ? ' active' : ''))));
    }
    toolbar.ctx.classList.toggle('empty', !toolbar.ctx.children.length);

    toolbar.colors.replaceChildren();
    toolbar.colors.classList.toggle('off', !def.colors);
    const palette = def.colors || INK;
    for (const c of palette) {
      const b = button(`<span class="swatch${c === 'auto' ? ' auto' : ''}" style="--c:${c === 'auto' ? autoColor() : c}"></span>`,
        c === 'auto' ? 'Black (white on dark pages)' : 'Colour', () => { if (!def.colors) return; pref.color[t] = c; savePrefs(); renderToolbar(); },
        'color' + (def.colors && pref.color[t] === c ? ' active' : ''));
      b.disabled = !def.colors;
      toolbar.colors.append(b);
    }
    // Custom colour: the native colour input sits over the swatch so a tap opens the picker directly.
    const custom = def.colors && !palette.includes(pref.color[t]) ? pref.color[t] : '';
    const lab = el('label', 'color custom' + (custom ? ' active' : ''), `<span class="swatch" style="--c:${custom || 'conic-gradient(#f33, #fd0, #3c3, #39f, #a3f, #f33)'}"></span>`);
    lab.title = 'Custom colour';
    const input = el('input');
    input.type = 'color';
    input.value = /^#[0-9a-f]{6}$/i.test(custom) ? custom : '#00A3A3';
    input.disabled = !def.colors;
    input.addEventListener('input', () => {
      pref.color[t] = input.value;
      savePrefs();
      lab.querySelector('.swatch').style.setProperty('--c', input.value);
      toolbar.colors.querySelectorAll('.color').forEach(b => b.classList.toggle('active', b === lab));
    });
    lab.append(input);
    // Open the picker from pointerup too, in case iOS doesn't turn the tap into a click.
    lab.addEventListener('pointerup', () => { if (!input.disabled && input.showPicker) try { input.showPicker(); lab._opened = now(); } catch (_) {} });
    lab.addEventListener('click', e => { if (now() - (lab._opened || -1e9) < 800) e.preventDefault(); });
    toolbar.colors.append(lab);
  }

  function setTool(t) {
    if (!TOOLS[t]) return;
    commitText();
    if (t !== 'lasso') sel = null;
    pref.tool = t;
    savePrefs();
    liveDirty = true; requestDraw();
    renderToolbar();
  }
  function autoColor() { return slides[cur]?.classList.contains('dark') ? '#FFFFFF' : '#111111'; }
  function colorFor(t) { const c = pref.color[t] || (TOOLS[t].colors || INK)[0]; return c === 'auto' ? autoColor() : c; }
  function sizeFor(t) { const s = TOOLS[t].sizes; return s ? s[clamp(pref.size[t] ?? 1, 0, 2)] : 0; }

  function buildBottomBand() {
    const left = el('div', 'band-side');
    left.append(button(ICONS.menu, 'Menu', openMenu));
    const yt = el('a', 'band-link yt-link', 'YouTube');
    yt.href = 'youtube.html';
    yt.hidden = true;
    fetch(yt.href, { method: 'HEAD' }).then(r => { yt.hidden = !r.ok; }).catch(() => {});
    onTap(yt, () => { saveNow(); location.href = yt.href; });
    bottom.add = button(ICONS.plus, 'Insert a blank page after this slide', () => bandBottom.classList.add('choosing'), 'add-page');
    bottom.del = button(ICONS.delPage, 'Delete this blank page', deletePage, 'del-page');
    bottom.update = button('↻ Update', 'A new version is published: reload', () => { saveNow().finally(() => location.reload()); }, 'band-link update');
    bottom.update.hidden = true;
    left.append(yt, bottom.add, bottom.del, bottom.update);

    const mid = el('div', 'nav');
    const ctr = el('div', 'counter-wrap');
    counterEl = el('div', 'counter');
    dotsEl = el('div', 'dots');
    ctr.append(counterEl, dotsEl);
    // Band arrows jump whole slides (screen taps and swipes step through reveals).
    mid.append(button(ICONS.prev, 'Previous slide', () => go(cur - 1, 'end')), ctr, button(ICONS.next, 'Next slide', () => go(cur + 1, 0)));

    const right = el('div', 'band-side right');
    bottom.undo = button(ICONS.undo, 'Undo', undoInk);
    bottom.redo = button(ICONS.redo, 'Redo', redoInk);
    timerEl = el('div', 'timer-time');
    right.append(bottom.undo, bottom.redo, button(ICONS.clear, 'Clear page', clearPage), sep(),
      button(ICONS.rec + '<span>Start</span>', 'Start chapter timer', startTimer, 'timer-start'), timerEl,
      button(ICONS.copy, 'Copy chapters', copyChapters, 'timer-copy'));

    const chooser = el('div', 'page-chooser');
    chooser.append(el('span', 'chooser-label', 'New page'));
    for (const [style, name] of PAGE_STYLES) {
      chooser.append(button(`<i class="page-swatch ${style}"></i><span>${name}</span>`, `Insert a ${name.toLowerCase()} page`,
        () => { bandBottom.classList.remove('choosing'); insertPage(style); }, 'page-opt'));
    }
    chooser.append(button('Cancel', 'Cancel', () => bandBottom.classList.remove('choosing'), 'txt'));
    bandBottom.append(left, mid, right, chooser);
  }

  function updatePageButtons() {
    if (!bottom.del) return;
    bottom.del.hidden = !slides[cur]?.classList.contains('board');
    const h = hist[pageId()];
    bottom.undo.disabled = !h?.undo.length;
    bottom.redo.disabled = !h?.redo.length;
    if (toolbar.del) toolbar.del.disabled = !sel;
  }

  function layout() {
    const cs = getComputedStyle(probe);
    const sa = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    const vw = innerWidth, vh = innerHeight;
    const availW = vw - sa.l - sa.r, availH = vh - sa.t - sa.b - 2 * BAND_MIN;
    scale = Math.max(0.1, Math.min(availW / W, availH / H));
    const sw = W * scale, sh = H * scale;
    const dpr = devicePixelRatio || 1, px = v => Math.round(v * dpr) / dpr;    // align to device pixels
    const x = px(sa.l + (availW - sw) / 2);
    const y = px(sa.t + BAND_MIN + (availH - sh) / 2);
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    bandTop.style.height = y + 'px';
    bandBottom.style.top = (y + sh) + 'px';
    bandBottom.style.height = (vh - y - sh) + 'px';
    for (const b of [bandTop, bandBottom]) { b.style.paddingLeft = Math.max(x, 8) + 'px'; b.style.paddingRight = Math.max(vw - x - sw, 8) + 'px'; }
    // One canvas pixel per device pixel: the canvas is drawn at screen size, not scaled by CSS.
    const cw = Math.round(sw * dpr), ch = Math.round(sh * dpr);
    Object.assign(inkWrap.style, { left: x + 'px', top: y + 'px', width: cw / dpr + 'px', height: ch / dpr + 'px' });
    for (const c of [inkCanvas, liveCanvas, laserCanvas]) {
      c.width = cw;
      c.height = ch;
      c.getContext('2d').setTransform(cw / W, 0, 0, ch / H, 0, 0);
    }
    stageRect = null;
    inkDirty = liveDirty = true;
    requestDraw();
  }

  function updateCounter() {
    counterEl.textContent = `${cur + 1} / ${slides.length}`;
    const n = slides[cur]._steps;
    dotsEl.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < step ? 'on' : ''}"></i>`).join('');
  }

  function slideType(s) { return TYPES.find(t => s.classList.contains(t)) || 'slide'; }
  function slideLabel(s) { return s.dataset.label || s.querySelector('h1, h2')?.textContent.trim().replace(/\s+/g, ' ') || slideType(s); }

  function buildMenu() {
    const m = el('div', 'deck-menu');
    const actions = el('div', 'menu-actions');
    const act = (text, fn) => { const b = button(text, text, () => fn(b)); actions.append(b); return b; };
    act('✕ Close', closeMenu);
    act('Library', () => { saveNow(); location.href = new URL('index.html', ROOT).href; });
    const de = document.documentElement;
    if ((de.requestFullscreen || de.webkitRequestFullscreen) && !navigator.standalone) act('Full screen', () => { closeMenu(); toggleFullscreen(); });
    act('Safe-zone guides', b => { stage.classList.toggle('show-guides'); b.classList.toggle('on', stage.classList.contains('show-guides')); });
    act('Reset chapter timer', () => { if (!rec || confirm('Reset the chapter timer?')) { closeMenu(); resetTimer(); } });
    act('Clear all ink in this lesson', () => {
      if (!confirm('Clear the ink on every page of this lesson? This cannot be undone.')) return;
      pages = {}; hist = {}; sel = null;
      saveNow(); inkDirty = liveDirty = true; requestDraw(); updatePageButtons(); closeMenu();
    });
    act('Reload latest version', () => forceRefresh());
    m._grid = el('div', 'menu-slides');
    const tip = el('div', 'menu-tip', 'Pencil writes with the selected tool · finger taps: right = next, left = back · swipe left/right · Hand button: Pencil taps change slides<br>Pen, highlighter or shapes: draw and hold to snap to a line, arrow, circle or rectangle<br>Mac: the mouse acts as the Pencil · ← → keys · P H E S L T K tools · Z undo · Y redo · G guides · M menu · F full screen');
    m.append(actions, m._grid, tip);
    return m;
  }
  function openMenu() {
    commitText();
    menu._grid.replaceChildren(...slides.map((s, i) => {
      const b = button(`<b>${i + 1}</b><span>${esc(slideLabel(s))}</span><small>${s.classList.contains('board') ? 'blank page' : slideType(s)}</small>`,
        slideLabel(s), () => { closeMenu(); go(i, 0); }, i === cur ? 'current' : '');
      return b;
    }));
    menu.classList.add('open');
  }
  function closeMenu() { menu.classList.remove('open'); }
  function toggleFullscreen() {
    const d = document, de = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de);
  }

  /* ---------- Input ----------
     Only a pointerdown ON THE STAGE can start drawing or navigation; the bands handle their own buttons.
     Pencil (and the Mac mouse) use the selected tool; fingers only navigate. Hand mode: Pencil/mouse navigate too. */
  function bindInput() {
    stage.addEventListener('pointerdown', onDown);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onCancel);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('gesturestart', e => e.preventDefault());
    addEventListener('keydown', onKey);
    addEventListener('pagehide', () => { saveChapters(); saveNow(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { saveChapters(); saveNow(); }
      else wakeLock = null;
    });
  }

  function onDown(e) {
    keepAwake();
    if (e.target.closest('.ink-text-edit')) return;
    if (e.pointerType === 'touch') return touchDown(e);
    if (e.button > 0) return;
    if (pref.hand) return navDown(e);
    if (live) return;
    e.preventDefault();
    commitText();
    for (const g of touches.values()) g.ignore = true;     // a palm already resting
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    stageRect = stage.getBoundingClientRect();
    startTool(e, point(e));
  }

  function touchDown(e) {
    const palm = (live && live.type === 'pen') || e.width > PALM_SIZE || e.height > PALM_SIZE;
    navDown(e, { ignore: palm, noTap: now() - lastPenUp < PALM_MS });
    if (touches.size > 1) for (const g of touches.values()) g.multi = true;
  }
  function navDown(e, o = {}) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now(), target: e.target, ...o });
  }

  function onMove(e) {
    if (!live || e.pointerId !== live.pid) return;
    const list = e.getCoalescedEvents?.() || [];
    for (const ev of list.length ? list : [e]) toolMove(point(ev), ev);
    const pred = e.getPredictedEvents?.() || [];
    live.pred = pred.map(ev => pressurePoint(point(ev), ev));
    liveDirty = true;
    requestDraw();
  }

  function onUp(e) {
    if (live && e.pointerId === live.pid) {
      if (live.type === 'pen') lastPenUp = now();
      finishTool(e);
      return;
    }
    const g = touches.get(e.pointerId);
    if (!g) return;
    touches.delete(e.pointerId);
    if (g.ignore || g.multi || (live && live.type === 'pen')) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy)) { dx < 0 ? next() : prev(); return; }
    if (g.noTap || Math.hypot(dx, dy) > TAP_SLOP || now() - g.t > 700) return;
    if (g.target.closest?.(INTERACTIVE)) return;
    const r = stage.getBoundingClientRect();
    (e.clientX - r.left) / r.width < TAP_BACK ? prev() : next();
  }

  function onCancel(e) {
    if (live && e.pointerId === live.pid) finishTool(e);
    touches.delete(e.pointerId);
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.target.closest?.('textarea, input')) return;
    if (menu.classList.contains('open')) { if (e.key === 'Escape' || e.key === 'm') closeMenu(); return; }
    const toolKeys = { p: 'pen', h: 'hl', e: 'eraser', s: 'shape', l: 'lasso', t: 'text', k: 'laser' };
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': prev(); break;
      case 'Home': go(0, 0); break;
      case 'End': go(slides.length - 1, 'end'); break;
      case 'Backspace': case 'Delete': if (sel) deleteSelection(); else prev(); break;
      case 'Escape': sel = null; liveDirty = true; requestDraw(); renderToolbar(); break;
      case 'g': stage.classList.toggle('show-guides'); break;
      case 'm': openMenu(); break;
      case 'f': toggleFullscreen(); break;
      case 'z': undoInk(); break;
      case 'y': case 'Z': redoInk(); break;
      default:
        if (toolKeys[e.key]) setTool(toolKeys[e.key]); else return;
    }
    e.preventDefault();
  }

  async function keepAwake() {
    if (wakeLock || !navigator.wakeLock) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (_) {}
  }

  function point(e) {
    const r = stageRect || stage.getBoundingClientRect();
    const s = r.width / W;
    return [Math.round((e.clientX - r.left) / s * 10) / 10, Math.round((e.clientY - r.top) / s * 10) / 10];
  }
  function pressurePoint(p, e) {
    return [p[0], p[1], e.pointerType === 'pen' ? Math.round(clamp(e.pressure || 0.5, 0.05, 1) * 100) / 100 : 0.5];
  }

  /* ---------- Tools ---------- */
  function startTool(e, p) {
    const t = pref.tool;
    live = { pid: e.pointerId, type: e.pointerType, tool: t, start: p, pred: [] };
    if (t === 'pen' || t === 'hl' || t === 'shape') {
      live.item = { t: t === 'hl' ? 'hl' : 'pen', c: colorFor(t), w: sizeFor(t), p: [pressurePoint(p, e)] };
      if (e.pointerType !== 'pen' || t === 'shape') live.item.sim = true;
      live.still = p;
      armHold();
    } else if (t === 'eraser') {
      live.before = items();
      live.at = p;
      eraseAt(p);
    } else if (t === 'lasso') {
      const box = sel && selBox();
      if (box && dist(p, [box[2], box[3]]) < 30) {
        live.mode = 'scale'; live.before = items(); live.orig = sel.map(i => items()[i]);
        live.anchor = [box[0], box[1]]; live.d0 = Math.max(10, dist(live.anchor, p));
      } else if (box && p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3]) {
        live.mode = 'move'; live.before = items(); live.orig = sel.map(i => items()[i]);
      } else {
        sel = null; live.mode = 'lasso'; live.path = [p];
        renderToolbar();
      }
    } else if (t === 'laser') {
      laserAdd(p, true);
    }
    liveDirty = true;
    requestDraw();
  }

  function toolMove(p, e) {
    const t = live.tool;
    if (live.item || live.snap) {
      if (live.snap) { live.snap = resizeSnap(live.snap, p); return; }
      const pts = live.item.p, q = pts[pts.length - 1];
      if (dist(p, q) >= 0.6) pts.push(pressurePoint(p, e));
      if (dist(p, live.still) > 5) { live.still = p; armHold(); }
    } else if (t === 'eraser') {
      // interpolate so fast eraser moves don't skip strokes
      const a = live.at, n = Math.ceil(dist(a, p) / 6);
      for (let i = 1; i <= n; i++) eraseAt([a[0] + (p[0] - a[0]) * i / n, a[1] + (p[1] - a[1]) * i / n]);
      live.at = p;
    } else if (t === 'lasso') {
      if (live.mode === 'lasso') live.path.push(p);
      else {
        const f = live.mode === 'move'
          ? (dx => dy => q => [q[0] + dx, q[1] + dy])(p[0] - live.start[0])(p[1] - live.start[1])
          : (s => q => [live.anchor[0] + (q[0] - live.anchor[0]) * s, live.anchor[1] + (q[1] - live.anchor[1]) * s])(Math.max(0.1, dist(live.anchor, p) / live.d0));
        const s = live.mode === 'scale' ? Math.max(0.1, dist(live.anchor, p) / live.d0) : 1;
        const arr = live.before.slice();
        sel.forEach((idx, k) => { arr[idx] = transformItem(live.orig[k], f, s); });
        pages[pageId()] = arr;
        live.moved = true;
        inkDirty = true;
      }
    } else if (t === 'laser') {
      laserAdd(p);
    }
  }

  function finishTool(e) {
    const L = live;
    live = null;
    clearTimeout(L.hold);
    stageRect = null;
    const t = L.tool;
    if (L.item) {
      let item = L.snap || L.item;
      if (t === 'shape' && !L.snap) { const s = recognize(L.item.p, 'shape'); if (s) item = shapeItem(s, L.item); }
      addItem(item);
    } else if (t === 'eraser') {
      if (L.changed) record(pageId(), L.before), saveSoon();
    } else if (t === 'lasso') {
      if (L.mode === 'lasso') selectInside(L.path);
      else if (L.moved) { record(pageId(), L.before); saveSoon(); }
      renderToolbar();
    } else if (t === 'text') {
      if (e.type !== 'pointercancel' && dist(point(e), L.start) < 12) openText(L.start);
    } else if (t === 'laser') {
      laser.down = false;
    }
    liveDirty = inkDirty = true;
    requestDraw();
    updatePageButtons();
  }

  function cancelLive() {
    if (!live) return;
    clearTimeout(live.hold);
    live = null;
    liveDirty = true;
  }

  // Draw and hold: snap the stroke so far to a line, arrow, circle or rectangle.
  function armHold() {
    clearTimeout(live.hold);
    const L = live;
    L.hold = setTimeout(() => {
      if (live !== L || L.snap || !L.item) return;
      const s = recognize(L.item.p, L.tool);
      if (!s) return;
      L.snap = L.tool === 'hl' ? { ...L.item, p: [s.a.concat(0.5), s.b.concat(0.5)] } : shapeItem(s, L.item);
      L.snap.kind = s.kind;
      liveDirty = true;
      requestDraw();
    }, HOLD_MS);
  }
  function shapeItem(s, from) { return { t: 'shape', kind: s.kind, a: s.a, b: s.b, c: from.c, w: from.w }; }
  // After a snap, keep holding and move to adjust the end of a straight line; other shapes stay as snapped.
  function resizeSnap(it, p) {
    if (it.t === 'hl') return { ...it, p: [it.p[0], [p[0], p[1], 0.5]] };
    return it.kind === 'line' ? { ...it, b: p } : it;
  }

  /* Shape recognition. Returns { kind, a, b } or null.
     line/arrow: a = start, b = end (tip). circle/ellipse/rect: a, b = opposite corners of the box. */
  function recognize(raw, tool) {
    const P = raw.map(q => [q[0], q[1]]);
    if (P.length < 3) return null;
    const xs = P.map(q => q[0]), ys = P.map(q => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = x1 - x0, h = y1 - y0, diag = Math.hypot(w, h);
    if (diag < 20) return null;
    const S = P[0], E = P[P.length - 1];
    const devFrom = (pts, a, b) => Math.max(...pts.map(q => segDist(q, a, b)));
    // straight line
    if (dist(S, E) > 25 && devFrom(P, S, E) < Math.max(7, 0.07 * dist(S, E))) return { kind: 'line', a: S, b: E };
    if (tool === 'hl') return null;
    // arrow drawn in one stroke: straight shaft to the tip, then a short head near the tip
    let ti = 0;
    P.forEach((q, i) => { if (dist(S, q) > dist(S, P[ti])) ti = i; });
    const tip = P[ti], shaft = dist(S, tip);
    if (shaft > 50 && ti < P.length - 3) {
      const head = P.slice(ti);
      let headLen = 0;
      for (let i = 1; i < head.length; i++) headLen += dist(head[i - 1], head[i]);
      if (devFrom(P.slice(0, ti + 1), S, tip) < Math.max(9, 0.08 * shaft) && headLen > 0.12 * shaft &&
        head.every(q => dist(q, tip) < 0.45 * shaft)) return { kind: 'arrow', a: S, b: tip };
    }
    // closed shapes
    if (dist(S, E) < 0.3 * diag && w > 20 && h > 20) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let eErr = 0, rErr = 0;
      for (const q of P) {
        const u = (q[0] - cx) / (w / 2), v = (q[1] - cy) / (h / 2);
        eErr += Math.abs(Math.hypot(u, v) - 1);
        rErr += 1 - Math.max(Math.abs(u), Math.abs(v));
      }
      eErr /= P.length; rErr /= P.length;
      const a = [x0, y0], b = [x1, y1];
      if (rErr < eErr && rErr < 0.14) return { kind: 'rect', a, b };
      if (eErr < 0.2) {
        if (Math.max(w, h) / Math.min(w, h) < 1.2) {            // nearly round: make it a circle
          const d = (w + h) / 2;
          return { kind: 'circle', a: [cx - d / 2, cy - d / 2], b: [cx + d / 2, cy + d / 2] };
        }
        return { kind: 'ellipse', a, b };
      }
    }
    return null;
  }

  function addItem(item) {
    const id = pageId();
    record(id, items());
    pages[id] = items().concat([item]);
    inkDirty = true;
    saveSoon();
  }

  /* ---------- Eraser ---------- */
  function eraseAt(p) {
    const r = sizeFor('eraser'), arr = items();
    let changed = false;
    const out = [];
    for (const it of arr) {
      const b = bounds(it);
      if (p[0] < b[0] - r || p[0] > b[2] + r || p[1] < b[1] - r || p[1] > b[3] + r || !hitItem(it, p, r)) { out.push(it); continue; }
      changed = true;
      if (pref.eraseMode === 'partial' && it.t !== 'text') out.push(...splitItem(it, p, r));
    }
    if (changed) { pages[pageId()] = out; live.changed = true; inkDirty = true; }
  }
  // Partial eraser: cut the stroke where the eraser touches it. Shapes become plain polylines first.
  function splitItem(it, p, r) {
    const lines = it.t === 'shape' ? shapeLines(it) : [it.p];
    const base = it.t === 'shape' ? { t: 'poly', c: it.c, w: it.w } : { ...it };
    delete base.p;
    const rr = r + it.w * (it.t === 'hl' ? 0.25 : 0.4);
    const out = [];
    for (const line of lines) {
      let run = [];
      for (const q of densify(line, 3)) {
        if (dist(q, p) <= rr) { if (run.length > 1) out.push({ ...base, p: run }); run = []; }
        else run.push(q);
      }
      if (run.length > 1) out.push({ ...base, p: run });
    }
    return out;
  }
  function densify(line, step) {
    const out = [line[0]];
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i], n = Math.ceil(dist(a, b) / step);
      for (let k = 1; k <= n; k++) {
        const f = k / n, q = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        if (a.length > 2) q.push(a[2] + (b[2] - a[2]) * f);
        out.push(q);
      }
    }
    return out;
  }

  /* ---------- Lasso ---------- */
  function selectInside(path) {
    sel = null;
    if (path.length < 3) return;
    const arr = items(), idx = [];
    arr.forEach((it, i) => {
      const pts = samplePoints(it);
      const inside = pts.filter(q => inPoly(q, path)).length;
      if (inside >= Math.max(1, pts.length * 0.5)) idx.push(i);
    });
    if (idx.length) sel = idx;
  }
  function selBox() {
    const arr = items();
    let b = null;
    for (const i of sel) {
      if (!arr[i]) continue;
      const q = bounds(arr[i]);
      b = b ? [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])] : q;
    }
    return b && [b[0] - 10, b[1] - 10, b[2] + 10, b[3] + 10];
  }
  function deleteSelection() {
    if (!sel) return;
    const id = pageId(), drop = new Set(sel);
    record(id, items());
    pages[id] = items().filter((_, i) => !drop.has(i));
    sel = null;
    inkDirty = liveDirty = true;
    requestDraw();
    saveSoon();
    renderToolbar();
    updatePageButtons();
  }
  function transformItem(it, f, s) {
    switch (it.t) {
      case 'text': { const [x, y] = f([it.x, it.y]); return { ...it, x, y, size: it.size * s }; }
      case 'shape': return { ...it, a: f(it.a), b: f(it.b), w: it.w * Math.sqrt(s) };
      default: return { ...it, w: it.w * Math.sqrt(s), p: it.p.map(q => { const r = f(q); return q.length > 2 ? [r[0], r[1], q[2]] : r; }) };
    }
  }
  function inPoly(q, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  /* ---------- Text ---------- */
  const font = size => `600 ${size}px Poppins, "Noto Sans Kannada", sans-serif`;
  function openText(p) {
    const arr = items();
    let index = -1;
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t === 'text' && inBox(p, bounds(arr[i]), 6)) { index = i; break; }
    const it = index >= 0 ? arr[index] : { t: 'text', x: p[0], y: p[1] - sizeFor('text') * 0.6, size: sizeFor('text'), c: colorFor('text'), text: '' };
    const ta = el('textarea', 'ink-text-edit');
    ta.value = it.text;
    ta.setAttribute('autocapitalize', 'sentences');
    Object.assign(ta.style, { left: it.x - 6 + 'px', top: it.y - 4 + 'px', fontSize: it.size + 'px', color: it.c });
    textEdit = { ta, index, it };
    const fit = () => {
      const ctx = inkCanvas.getContext('2d');
      ctx.font = font(it.size);
      const lines = ta.value.split('\n');
      ta.style.width = Math.max(it.size * 4, ...lines.map(l => ctx.measureText(l).width)) + it.size + 'px';
      ta.style.height = lines.length * it.size * 1.25 + 12 + 'px';
    };
    ta.addEventListener('input', fit);
    ta.addEventListener('blur', () => commitText());
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') ta.blur(); });
    fit();
    stage.append(ta);
    inkDirty = true;
    requestDraw();
    ta.focus();
  }
  function commitText() {
    if (!textEdit) return;
    const { ta, index, it } = textEdit;
    textEdit = null;
    const text = ta.value.replace(/\s+$/, '');
    ta.remove();
    inkDirty = true;
    requestDraw();
    if (text === it.text) return;
    const id = pageId(), arr = items().slice();
    record(id, items());
    if (index >= 0) { if (text) arr[index] = { ...it, text }; else arr.splice(index, 1); }
    else arr.push({ ...it, text });
    pages[id] = arr;
    saveSoon();
    updatePageButtons();
  }

  /* ---------- Laser pointer: glowing trail that fades, never saved ---------- */
  function laserAdd(p, startStroke) {
    laser.pts.push({ x: p[0], y: p[1], t: now(), brk: !!startStroke });
    laser.down = true;
    laser.color = colorFor('laser');
    requestDraw();
  }
  // Each trail is smoothed, then drawn as a few continuous paths grouped by fade level, so it has no beads or corners.
  function drawLaser() {
    const ctx = wipe(laserCanvas), t = now();
    laser.pts = laser.pts.filter(q => t - q.t < LASER_MS);
    if (!laser.pts.length) return false;
    const trails = [];
    for (const q of laser.pts) (q.brk || !trails.length ? trails[trails.push([]) - 1] : trails[trails.length - 1]).push([q.x, q.y, q.t]);
    const LEVELS = 16, level = q => Math.min(LEVELS - 1, Math.floor((t - q[2]) / LASER_MS * LEVELS));
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const pass of [{ w: 11, blur: 16, c: laser.color }, { w: 4, blur: 0, c: '#FFFFFF' }]) {
      ctx.lineWidth = pass.w;
      ctx.shadowBlur = pass.blur;
      ctx.shadowColor = laser.color;
      ctx.strokeStyle = pass.c;
      for (const raw of trails) {
        const pts = smoothPoints(raw, 2);
        let i = 1;
        while (i < pts.length) {
          const lv = level(pts[i]);
          ctx.globalAlpha = 1 - lv / LEVELS;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
          while (i < pts.length && level(pts[i]) === lv) { ctx.lineTo(pts[i][0], pts[i][1]); i++; }
          ctx.stroke();
        }
      }
    }
    if (laser.down) {
      const q = laser.pts[laser.pts.length - 1];
      ctx.globalAlpha = 1; ctx.shadowBlur = 22; ctx.fillStyle = laser.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return true;
  }

  // Centripetal Catmull-Rom curve through the Pencil's samples, resampled every `step` px, so fast strokes stay
  // round without overshooting. A third value (pressure, or time for the laser) is interpolated linearly.
  function smoothPoints(P, step = 1.5) {
    if (P.length < 3) return P;
    const out = [P[0]], n = P.length;
    const ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];
    const lerp = (a, b, ta, tb, t) => { const u = (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
    for (let i = 0; i < n - 1; i++) {
      const p1 = P[i], p2 = P[i + 1];
      const p0 = i > 0 ? P[i - 1] : ext(p1, p2), p3 = i < n - 2 ? P[i + 2] : ext(p2, p1);
      const t0 = 0, t1 = t0 + Math.max(1e-4, Math.sqrt(dist(p0, p1)));
      const t2 = t1 + Math.max(1e-4, Math.sqrt(dist(p1, p2))), t3 = t2 + Math.max(1e-4, Math.sqrt(dist(p2, p3)));
      const segs = Math.max(1, Math.ceil(dist(p1, p2) / step));
      for (let k = 1; k <= segs; k++) {
        const t = t1 + (t2 - t1) * k / segs;
        const a1 = lerp(p0, p1, t0, t1, t), a2 = lerp(p1, p2, t1, t2, t), a3 = lerp(p2, p3, t2, t3, t);
        const q = lerp(lerp(a1, a2, t0, t2, t), lerp(a2, a3, t1, t3, t), t1, t2, t);
        if (p1.length > 2) q.push(p1[2] + (p2[2] - p1[2]) * k / segs);
        out.push(q);
      }
    }
    return out;
  }

  /* ---------- Rendering (one requestAnimationFrame per screen refresh) ---------- */
  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (cur < 0) return;
    if (inkDirty) { inkDirty = false; drawInk(); }
    if (liveDirty) { liveDirty = false; drawLive(); }
    if (drawLaser() || laser.down) requestDraw();
  }
  function wipe(c) {
    const ctx = c.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore();
    return ctx;
  }
  function drawInk() {
    const ctx = wipe(inkCanvas), arr = items(), skip = textEdit && textEdit.index >= 0 ? arr[textEdit.index] : null;
    for (const it of arr) if (it.t === 'hl' && it !== skip) drawItem(ctx, it);      // highlighter under everything
    for (const it of arr) if (it.t !== 'hl' && it !== skip) drawItem(ctx, it);
  }
  function drawLive() {
    const ctx = wipe(liveCanvas);
    if (live?.snap) drawItem(ctx, live.snap);
    else if (live?.item) {
      const it = live.pred.length ? { ...live.item, p: live.item.p.concat(live.pred) } : live.item;
      drawItem(ctx, it, false);
    }
    if (live?.tool === 'eraser') {
      ctx.save();
      ctx.beginPath(); ctx.arc(live.at[0], live.at[1], sizeFor('eraser'), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    if (live?.mode === 'lasso' && live.path.length > 1) {
      ctx.save();
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = '#1660E8'; ctx.fillStyle = 'rgba(22,96,232,.06)';
      ctx.beginPath(); live.path.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const box = sel && selBox();
    if (box) {
      ctx.save();
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = '#1660E8';
      ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
      ctx.setLineDash([]); ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(box[2], box[3], 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawItem(ctx, it, cache = true) {
    ctx.save();
    if (it.t === 'pen' || it.t === 'hl') {
      let path = cache && pathCache.get(it);
      if (!path) {
        path = outlinePath(PerfectFreehand.getStroke(smoothPoints(it.p), freehandOptions(it, cache)));
        if (cache) pathCache.set(it, path);
      }
      ctx.fillStyle = it.c;
      if (it.t === 'hl') ctx.globalAlpha = 0.38;
      ctx.fill(path);
    } else if (it.t === 'poly' || it.t === 'shape') {
      ctx.strokeStyle = it.c; ctx.lineWidth = it.w; ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const line of it.t === 'poly' ? [it.p] : shapeLines(it)) line.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke();
    } else if (it.t === 'text') {
      ctx.fillStyle = it.c; ctx.font = font(it.size); ctx.textBaseline = 'top';
      it.text.split('\n').forEach((l, i) => ctx.fillText(l, it.x, it.y + i * it.size * 1.25));
    }
    ctx.restore();
  }
  function freehandOptions(it, last) {
    return it.t === 'hl'
      ? { size: it.w, thinning: 0, smoothing: 0.6, streamline: 0.45, simulatePressure: false, last }
      : { size: it.w, thinning: 0.6, smoothing: 0.55, streamline: 0.3, simulatePressure: !!it.sim, last, start: { cap: true, taper: 0 }, end: { cap: true, taper: 0 } };
  }
  function outlinePath(pts) {
    const p = new Path2D();
    if (!pts.length) return p;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    p.closePath();
    return p;
  }

  // Geometry shared by drawing, erasing and the lasso.
  function shapeLines(it) {
    const [ax, ay] = it.a, [bx, by] = it.b;
    if (it.kind === 'line') return [[it.a, it.b]];
    if (it.kind === 'arrow') {
      const ang = Math.atan2(by - ay, bx - ax), len = Math.max(22, it.w * 4.5), sp = 0.5;
      const h1 = [bx - len * Math.cos(ang - sp), by - len * Math.sin(ang - sp)];
      const h2 = [bx - len * Math.cos(ang + sp), by - len * Math.sin(ang + sp)];
      return [[it.a, it.b], [h1, it.b, h2]];
    }
    if (it.kind === 'rect') return [[[ax, ay], [bx, ay], [bx, by], [ax, by], [ax, ay]]];
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, rx = Math.abs(bx - ax) / 2, ry = Math.abs(by - ay) / 2, pts = [];
    for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return [pts];
  }
  function textBox(it) {
    const ctx = inkCanvas.getContext('2d');
    ctx.font = font(it.size);
    const lines = it.text.split('\n');
    return [it.x, it.y, it.x + Math.max(...lines.map(l => ctx.measureText(l).width)), it.y + lines.length * it.size * 1.25];
  }
  function samplePoints(it) {
    if (it.t === 'text') { const b = textBox(it); return [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]], [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]]; }
    return it.t === 'shape' ? shapeLines(it).flat() : it.p;
  }
  function bounds(it) {
    if (it.t === 'text') return textBox(it);
    const pts = samplePoints(it), pad = it.w / 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  }
  function inBox(p, b, pad = 0) { return p[0] >= b[0] - pad && p[0] <= b[2] + pad && p[1] >= b[1] - pad && p[1] <= b[3] + pad; }
  function hitItem(it, p, r) {
    if (it.t === 'text') return inBox(p, textBox(it), r);
    const rr = r + it.w / 2;
    for (const line of it.t === 'shape' ? shapeLines(it) : [it.p]) {
      if (line.length === 1 && dist(line[0], p) <= rr) return true;
      for (let i = 1; i < line.length; i++) if (segDist(p, line[i - 1], line[i]) <= rr) return true;
    }
    return false;
  }
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
    const t = len ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len, 0, 1) : 0;
    return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
  }

  /* ---------- Undo / redo / clear (per page) ---------- */
  function pageId() { return slides[cur]?.dataset.pageId || ''; }
  function items() { return pages[pageId()] || []; }
  function record(id, before) {
    const h = hist[id] || (hist[id] = { undo: [], redo: [] });
    h.undo.push(before);
    if (h.undo.length > 100) h.undo.shift();
    h.redo.length = 0;
    updatePageButtons();
  }
  function undoInk() { stepHistory('undo', 'redo'); }
  function redoInk() { stepHistory('redo', 'undo'); }
  function stepHistory(from, to) {
    commitText();
    const id = pageId(), h = hist[id];
    if (!h?.[from].length) return;
    h[to].push(items());
    pages[id] = h[from].pop();
    sel = null;
    inkDirty = liveDirty = true;
    requestDraw();
    saveSoon();
    updatePageButtons();
    renderToolbar();
  }
  function clearPage() {
    commitText();
    if (!items().length) return;
    record(pageId(), items());
    pages[pageId()] = [];
    sel = null;
    inkDirty = liveDirty = true;
    requestDraw();
    saveSoon();
    renderToolbar();
  }

  /* ---------- Saving: ink and blank pages per lesson, in IndexedDB on this device ---------- */
  function openDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('namma-exams', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('lessons');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function loadStore() {
    try {
      const db = await openDb();
      return await new Promise((res, rej) => {
        const r = db.transaction('lessons').objectStore('lessons').get(LESSON);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
    } catch (_) { return null; }
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
  async function saveNow() {
    clearTimeout(saveTimer);
    const keep = {};
    for (const id in pages) if (pages[id].length) keep[id] = pages[id];
    try {
      const db = await openDb();
      await new Promise((res, rej) => {
        const tx = db.transaction('lessons', 'readwrite');
        tx.objectStore('lessons').put({ v: 1, pages: keep, boards, boardCount, saved: Date.now() }, LESSON);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
    } catch (_) {}
  }

  function loadPrefs() {
    const d = { tool: 'pen', hand: false, eraseMode: 'stroke', size: { pen: 1, hl: 1, eraser: 1, shape: 1, text: 0 },
      color: { pen: INK[0], hl: HL[0], shape: INK[1], text: 'auto', laser: LASER[0] } };
    try {
      const s = JSON.parse(localStorage.getItem('nammaPrefs'));
      if (s) return { ...d, ...s, size: { ...d.size, ...s.size }, color: { ...d.color, ...s.color }, tool: TOOLS[s.tool] ? s.tool : 'pen' };
    } catch (_) {}
    return d;
  }
  function savePrefs() { try { localStorage.setItem('nammaPrefs', JSON.stringify(pref)); } catch (_) {} }

  /* ---------- Chapter timer: tap Start when recording begins; logs when each page first appears ---------- */
  function startTimer() {
    rec = { start: Date.now(), log: [] };
    logChapter();
    showTimer();
  }
  function resetTimer() { rec = null; try { sessionStorage.removeItem(chapterKey); } catch (_) {} showTimer(); }
  function logChapter() {
    const id = pageId();
    if (!rec || !id || rec.log.some(c => c.id === id)) return;
    rec.log.push({ id, t: Math.round((Date.now() - rec.start) / 1000), title: chapterTitle(slides[cur]) });
    try { sessionStorage.setItem(chapterKey, JSON.stringify(rec)); } catch (_) {}
    saveChapters();
  }
  function saveChapters() {
    if (!rec) return;
    const list = chapters();
    try {
      localStorage.setItem(savedChaptersKey, JSON.stringify({
        text: list.map(c => `${clock(c.t)} ${c.title}`).join('\n'), count: list.length,
        recorded: rec.start, saved: Date.now(), deck: document.title }));
    } catch (_) {}
    return list;
  }
  function loadChapters() {
    try {
      const r = JSON.parse(sessionStorage.getItem(chapterKey));
      if (r && r.start && Array.isArray(r.log) && r.log.every(c => c.id)) rec = r;
    } catch (_) {}
    showTimer();
  }
  function showTimer(msg) {
    bandBottom.classList.toggle('recording', !!rec);
    clearInterval(timerTick);
    clearTimeout(msgTimer);
    let n = 0;
    const tick = () => {
      timerEl.textContent = msg || (rec ? '● ' + clock((Date.now() - rec.start) / 1000) : '');
      if (rec && ++n % 10 === 0) saveChapters();     // keep the saved end time current
    };
    tick();
    if (msg) msgTimer = setTimeout(() => showTimer(), 2500);
    else if (rec) timerTick = setInterval(tick, 1000);
  }
  function clock(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = String(sec % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  // YouTube rules: first chapter at 0:00, at least 3 chapters, each at least 10 s long.
  function chapters() {
    const end = Math.round((Date.now() - rec.start) / 1000);
    const list = rec.log.slice().sort((a, b) => a.t - b.t).map(c => ({ t: c.t, title: c.title }));
    if (list.length) list[0].t = 0;
    for (let i = 0; i < list.length;) {
      const dur = (i + 1 < list.length ? list[i + 1].t : end) - list[i].t;
      if (dur >= 10 || list.length === 1) { i++; continue; }
      if (i === 0) { list[1].t = 0; list.shift(); }     // too-short opening: the next chapter starts at 0:00
      else list.splice(i, 1);                           // too short: merge into the previous chapter
      i = Math.max(0, i - 1);
    }
    return list;
  }
  function chapterTitle(s) { return (s.dataset.chapter || slideLabel(s)).replace(/\s+/g, ' '); }

  async function copyChapters() {
    if (!rec) return showTimer('Tap Start first');
    const list = saveChapters();
    const text = list.map(c => `${clock(c.t)} ${c.title}`).join('\n');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {
      const ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    if (!ok) return showTimer('Copy failed');
    showTimer(list.length < 3 ? `Copied ${list.length}: YouTube needs 3+` : `Copied ${list.length} chapters`);
  }
  Object.assign(window.Deck, { chapters: () => rec ? chapters() : [] });

  /* ---------- Updates: notice a newly published version and offer a reload ---------- */
  function watchForUpdates() {
    if (!/^https?:$/.test(location.protocol)) return;
    const urls = [location.pathname, ENGINE + 'deck.js', ENGINE + 'deck.css'];
    const stamp = u => fetch(u, { method: 'HEAD', cache: 'no-store' })
      .then(r => r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '').catch(() => '');
    let base = null;
    const check = async () => {
      const s = await Promise.all(urls.map(stamp));
      if (!base) { base = s; return; }
      if (s.some((v, i) => v && base[i] && v !== base[i])) bottom.update.hidden = false;
      navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
    };
    window.Deck.checkForUpdate = check;
    check();
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  }
  async function forceRefresh() {
    await saveNow();
    try {
      for (const r of await navigator.serviceWorker?.getRegistrations() || []) await r.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
    } catch (_) {}
    location.reload();
  }

  /* ---------- Offline ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register(new URL('sw.js', ROOT).href, { scope: ROOT.pathname }).catch(() => {});
  }
})();
