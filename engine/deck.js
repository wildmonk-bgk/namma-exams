/* Namma Exams deck engine: shared by every lesson deck. See engine/README.md. */
(() => {
  'use strict';

  const W = 1280, H = 720;      // logical stage size (16:9)
  const BAND_MIN = 60;          // screen px always kept free above and below the stage for controls
  const TAP_BACK = 0.35;        // taps on the left 35% of the stage go back
  const SWIPE_MIN = 60;         // screen px
  const PALM_MS = 600;          // ignore finger touches this long after the Pencil lifts
  const ERASER_R = 18;          // logical px
  const INTERACTIVE = 'button, a, input, select, textarea, [data-interactive]';
  const TYPES = ['title', 'illustration', 'diagram', 'map', 'blank-map', 'whiteboard', 'image', 'recap', 'end'];

  const ENGINE = new URL('./', document.currentScript.src);
  const ROOT = new URL('../', ENGINE);

  const TOOLS = {
    pen1: { kind: 'pen', color: '--ink-1', width: 5, label: 'Red pen' },
    pen2: { kind: 'pen', color: '--ink-2', width: 5, label: 'Blue pen' },
    pen3: { kind: 'pen', color: '--ink-3', width: 5, label: 'Black pen' },
    hl: { kind: 'hl', color: '--ink-hl', width: 30, label: 'Highlighter' },
    eraser: { kind: 'eraser', label: 'Eraser' },
  };

  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    hl: svg('<path d="M9 11l-5 5v4h4l5-5"/><path d="M9 11l6-6 4 4-6 6z"/><path d="M14 20h7" stroke="#FFE600" stroke-width="3"/>'),
    eraser: svg('<path d="M7 20h13"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19H8z"/><path d="M9 11l5 5"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    clear: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'),
    hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4L2.4 16a2 2 0 0 1 2.8-2.8L7 15"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    prev: svg('<path d="M15 18l-6-6 6-6"/>'),
    next: svg('<path d="M9 18l6-6-6-6"/>'),
    rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#FF3B4E"/></svg>',
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  };

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  registerServiceWorker();
  const deckEl = document.querySelector('.deck');
  if (!deckEl) return;           // library page: only the service worker

  let stage, inkCanvas, liveCanvas, bandTop, bandBottom, counterEl, dotsEl, menu, probe;
  let slides = [], cur = -1, step = 0, scale = 1, stageRect = null;
  let tool = 'pen1', fingerDraws = false;
  let ink = [], undo = [];
  let pen = null, nav = null, lastPen = 0, wakeLock = null, saveTimer = 0;
  const inkKey = 'nammaInk:' + location.pathname;
  const chapterKey = 'nammaChapters:' + location.pathname;
  // Finished chapter list, kept on the device for the lesson's youtube.html (keyed by lesson folder).
  const savedChaptersKey = 'nammaChapters:' + location.pathname.replace(/[^/]*$/, '');
  let rec = null, timerEl, timerTick = 0, msgTimer = 0;   // rec = { start: epoch ms, log: [{ slide, t }] }

  init();

  async function init() {
    await includeSvgs();
    slides = [...deckEl.querySelectorAll(':scope > .slide')];
    slides.forEach(prepSlide);
    ink = loadInk();
    undo = slides.map(() => []);
    buildChrome();
    loadChapters();
    layout();
    addEventListener('resize', layout);
    addEventListener('orientationchange', () => setTimeout(layout, 300));
    bindInput();
    go(hashSlide(), 0);
    addEventListener('hashchange', () => { const i = hashSlide(); if (i !== cur) go(i, 0); });
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

  function prepSlide(s) {
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
    if (i !== cur) {
      if (pen) { pen = null; stageRect = null; clearLive(); }
      const old = slides[cur];
      if (old) { old.classList.remove('active'); old.dispatchEvent(new CustomEvent('deck:leave', { bubbles: true })); }
      cur = i;
      s.classList.add('active');
      redrawInk();
      s.dispatchEvent(new CustomEvent('deck:enter', { bubbles: true, detail: { step: n } }));
      history.replaceState(null, '', '#' + (i + 1));
      logChapter();
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

  window.Deck = { go, next, prev, get slide() { return cur; }, get step() { return step; } };

  /* ---------- Chrome: stage, bands, menu ---------- */
  function buildChrome() {
    document.body.classList.add('deck-app');
    stage = el('div', 'stage');
    inkCanvas = el('canvas', 'ink-layer');
    liveCanvas = el('canvas', 'ink-layer');
    stage.append(deckEl, inkCanvas, liveCanvas, el('div', 'guides'));

    bandTop = el('div', 'band band-top');
    const tb = el('div', 'toolbar');
    for (const id of ['pen1', 'pen2', 'pen3']) tb.append(button(`<span class="swatch" style="--c:var(${TOOLS[id].color})"></span>`, TOOLS[id].label, () => setTool(id), 'tool-' + id));
    tb.append(
      button(ICONS.hl, 'Highlighter', () => setTool('hl'), 'tool-hl'),
      button(ICONS.eraser, 'Eraser', () => setTool('eraser'), 'tool-eraser'),
      el('span', 'sep'),
      button(ICONS.undo, 'Undo', undoInk),
      button(ICONS.clear, 'Clear slide', clearSlide),
      el('span', 'sep'),
      button(ICONS.hand, 'Draw with finger or mouse', toggleFinger, 'finger'));
    bandTop.append(tb);

    bandBottom = el('div', 'band band-bottom');
    const left = el('div', 'band-side');
    left.append(button(ICONS.menu, 'Menu', openMenu));
    const yt = el('a', 'yt-link', 'YouTube');
    yt.href = 'youtube.html';
    yt.hidden = true;
    fetch(yt.href, { method: 'HEAD' }).then(r => { yt.hidden = !r.ok; }).catch(() => {});
    left.append(yt);
    const mid = el('div', 'nav');
    const ctr = el('div', 'counter-wrap');
    counterEl = el('div', 'counter');
    dotsEl = el('div', 'dots');
    ctr.append(counterEl, dotsEl);
    mid.append(button(ICONS.prev, 'Previous', prev), ctr, button(ICONS.next, 'Next', next));
    const right = el('div', 'band-side timer');
    timerEl = el('div', 'timer-time');
    right.append(button(ICONS.rec + '<span>Start</span>', 'Start chapter timer', startTimer, 'timer-start'), timerEl,
      button(ICONS.copy, 'Copy chapters', copyChapters, 'timer-copy'));
    bandBottom.append(left, mid, right);

    menu = buildMenu();
    probe = el('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.append(stage, bandTop, bandBottom, menu, probe);
    setTool('pen1');
  }

  function button(html, label, fn, cls) {
    const b = el('button', cls, html);
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', e => { e.preventDefault(); fn(); b.blur(); });
    return b;
  }

  function layout() {
    const cs = getComputedStyle(probe);
    const sa = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    const vw = innerWidth, vh = innerHeight;
    const availW = vw - sa.l - sa.r, availH = vh - sa.t - sa.b - 2 * BAND_MIN;
    scale = Math.max(0.1, Math.min(availW / W, availH / H));
    const sw = W * scale, sh = H * scale;
    const x = sa.l + (availW - sw) / 2;
    const y = sa.t + BAND_MIN + (availH - sh) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    bandTop.style.height = y + 'px';
    bandBottom.style.top = (y + sh) + 'px';
    bandBottom.style.height = (vh - y - sh) + 'px';
    for (const b of [bandTop, bandBottom]) { b.style.paddingLeft = x + 'px'; b.style.paddingRight = (vw - x - sw) + 'px'; }
    const k = Math.min(scale * (devicePixelRatio || 1), 3);
    for (const c of [inkCanvas, liveCanvas]) {
      c.width = Math.round(W * k);
      c.height = Math.round(H * k);
      c.getContext('2d').setTransform(k, 0, 0, k, 0, 0);
    }
    redrawInk();
  }

  function updateCounter() {
    counterEl.textContent = `${cur + 1} / ${slides.length}`;
    const n = slides[cur]._steps;
    dotsEl.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < step ? 'on' : ''}"></i>`).join('');
  }

  function slideType(s) { return TYPES.find(t => s.classList.contains(t)) || 'slide'; }
  function slideLabel(s) { return s.dataset.label || s.querySelector('h1, h2')?.textContent.trim() || slideType(s); }

  function buildMenu() {
    const m = el('div', 'deck-menu');
    const actions = el('div', 'menu-actions');
    const act = (text, fn) => { const b = el('button', '', text); b.type = 'button'; b.addEventListener('click', () => fn(b)); actions.append(b); return b; };
    act('✕ Close', closeMenu);
    act('Library', () => { location.href = new URL('index.html', ROOT).href; });
    const de = document.documentElement;
    if ((de.requestFullscreen || de.webkitRequestFullscreen) && !navigator.standalone) act('Full screen', () => { closeMenu(); toggleFullscreen(); });
    act('Safe-zone guides', b => { stage.classList.toggle('show-guides'); b.classList.toggle('on', stage.classList.contains('show-guides')); });
    act('Reset chapter timer', () => { if (!rec || confirm('Reset the chapter timer?')) { closeMenu(); resetTimer(); } });
    act('Clear all ink', () => { if (confirm('Clear the ink on every slide?')) { ink = slides.map(() => []); undo = slides.map(() => []); redrawInk(); saveInk(); } });
    const grid = el('div', 'menu-slides');
    slides.forEach((s, i) => {
      const b = el('button', '', `<b>${i + 1}</b><span>${esc(slideLabel(s))}</span><small>${slideType(s)}</small>`);
      b.type = 'button';
      b.addEventListener('click', () => { closeMenu(); go(i, 0); });
      grid.append(b);
    });
    const tip = el('div', 'menu-tip', 'Pencil draws · finger taps: right = next, left = back · swipe left/right<br>Mac: click right/left · ← → keys · hold ⌥ Option and drag to draw · G guides · M menu · F full screen · Z undo');
    m.append(actions, grid, tip);
    return m;
  }
  function openMenu() {
    [...menu.querySelectorAll('.menu-slides button')].forEach((b, i) => b.classList.toggle('current', i === cur));
    menu.classList.add('open');
  }
  function closeMenu() { menu.classList.remove('open'); }
  function toggleFullscreen() {
    const d = document, de = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de);
  }

  /* ---------- Input: Pencil draws, finger/mouse navigates ---------- */
  function bindInput() {
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onCancel);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('touchmove', e => { if (!e.target.closest('.deck-menu')) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wakeLock = null; });
    addEventListener('keydown', onKey);
    addEventListener('pagehide', saveChapters);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveChapters(); });
  }

  function drawsInk(e) { return e.pointerType === 'pen' || fingerDraws || (e.pointerType === 'mouse' && e.altKey); }

  function onDown(e) {
    keepAwake();
    if (e.pointerType === 'touch' && (pen || performance.now() - lastPen < PALM_MS)) return;   // palm
    if (drawsInk(e)) {
      if (pen || e.button > 0) return;
      e.preventDefault();
      nav = null;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      stageRect = stage.getBoundingClientRect();
      const p = point(e);
      if (tool === 'eraser') { pen = { id: e.pointerId, erase: true, before: ink[cur].slice(), changed: false, at: p }; eraseAt(p); }
      else { const t = TOOLS[tool]; pen = { id: e.pointerId, stroke: { k: t.kind, c: cssVar(t.color), w: t.width, p: [p] } }; }
      drawLive();
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (nav) { nav = null; return; }          // a second finger cancels the gesture
    nav = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), target: e.target };
  }

  function onMove(e) {
    if (!pen || e.pointerId !== pen.id) return;
    const list = e.getCoalescedEvents?.() || [];
    for (const ev of list.length ? list : [e]) {
      const p = point(ev);
      if (pen.erase) { pen.at = p; eraseAt(p); }
      else {
        const pts = pen.stroke.p, q = pts[pts.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 0.8) pts.push(p);
      }
    }
    drawLive();
  }

  function onUp(e) {
    if (pen && e.pointerId === pen.id) {
      finishPen();
      if (e.pointerType === 'pen') lastPen = performance.now();
      return;
    }
    if (!nav || e.pointerId !== nav.id) return;
    const g = nav; nav = null;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy)) { dx < 0 ? next() : prev(); return; }
    if (Math.hypot(dx, dy) < 16 && performance.now() - g.t < 800) {
      if (g.target.closest(INTERACTIVE)) return;
      const r = stage.getBoundingClientRect();
      (e.clientX - r.left) / r.width < TAP_BACK ? prev() : next();
    }
  }

  function onCancel(e) {
    if (pen && e.pointerId === pen.id) finishPen();
    if (nav && e.pointerId === nav.id) nav = null;
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey) return;
    if (menu.classList.contains('open')) { if (e.key === 'Escape' || e.key === 'm') closeMenu(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': prev(); break;
      case 'Home': go(0, 0); break;
      case 'End': go(slides.length - 1, 'end'); break;
      case 'g': stage.classList.toggle('show-guides'); break;
      case 'm': openMenu(); break;
      case 'f': toggleFullscreen(); break;
      case 'z': undoInk(); break;
      default: return;
    }
    e.preventDefault();
  }

  async function keepAwake() {
    if (wakeLock || !navigator.wakeLock) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (_) {}
  }

  /* ---------- Ink ---------- */
  function setTool(id) {
    tool = id;
    for (const k in TOOLS) bandTop.querySelector('.tool-' + k).classList.toggle('active', k === id);
  }
  function toggleFinger() {
    fingerDraws = !fingerDraws;
    bandTop.querySelector('.finger').classList.toggle('active', fingerDraws);
  }

  function point(e) {
    const r = stageRect || stage.getBoundingClientRect();
    const s = r.width / W;
    return [Math.round((e.clientX - r.left) / s * 10) / 10, Math.round((e.clientY - r.top) / s * 10) / 10];
  }

  function drawStroke(ctx, s) {
    const p = s.p;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.c;
    ctx.lineWidth = s.w;
    ctx.globalAlpha = s.k === 'hl' ? 0.4 : 1;
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    if (p.length < 3) {
      const q = p[p.length - 1];
      ctx.lineTo(q[0] + 0.01, q[1]);
    } else {
      for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function wipe(c) {
    const ctx = c.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore();
    return ctx;
  }
  function redrawInk() {
    if (cur < 0 || !inkCanvas) return;
    const ctx = wipe(inkCanvas), list = ink[cur];
    for (const s of list) if (s.k === 'hl') drawStroke(ctx, s);     // highlighter under pen
    for (const s of list) if (s.k !== 'hl') drawStroke(ctx, s);
  }
  function clearLive() { wipe(liveCanvas); }
  function drawLive() {
    const ctx = wipe(liveCanvas);
    if (!pen) return;
    if (!pen.erase) return drawStroke(ctx, pen.stroke);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pen.at[0], pen.at[1], ERASER_R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function finishPen() {
    const p = pen; pen = null; stageRect = null;
    clearLive();
    if (p.erase) { if (p.changed) { pushUndo(p.before); saveInk(); } return; }
    pushUndo(ink[cur].slice());
    ink[cur].push(p.stroke);
    redrawInk();
    saveInk();
  }

  function eraseAt(p) {
    const keep = ink[cur].filter(s => !hits(s, p, ERASER_R + s.w / 2));
    if (keep.length !== ink[cur].length) { ink[cur] = keep; pen.changed = true; redrawInk(); }
  }
  function hits(s, [x, y], r) {
    const p = s.p;
    if (p.length === 1) return Math.hypot(p[0][0] - x, p[0][1] - y) <= r;
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const t = len ? clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
      if (Math.hypot(ax + t * dx - x, ay + t * dy - y) <= r) return true;
    }
    return false;
  }

  function pushUndo(snapshot) { const u = undo[cur]; u.push(snapshot); if (u.length > 50) u.shift(); }
  function undoInk() { if (undo[cur].length) { ink[cur] = undo[cur].pop(); redrawInk(); saveInk(); } }
  function clearSlide() { if (ink[cur].length) { pushUndo(ink[cur].slice()); ink[cur] = []; redrawInk(); saveInk(); } }

  // Ink stays while the deck is open (kept in sessionStorage so an iPad page reload doesn't lose it).
  function loadInk() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(inkKey));
      if (Array.isArray(saved) && saved.length === slides.length) return saved;
    } catch (_) {}
    return slides.map(() => []);
  }
  function saveInk() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { sessionStorage.setItem(inkKey, JSON.stringify(ink)); } catch (_) {} }, 400);
  }

  /* ---------- Chapter timer: tap Start when recording begins; logs when each slide first appears ---------- */
  function startTimer() {
    rec = { start: Date.now(), log: [] };
    logChapter();
    showTimer();
  }
  function resetTimer() { rec = null; try { sessionStorage.removeItem(chapterKey); } catch (_) {} showTimer(); }
  function logChapter() {
    if (!rec || cur < 0 || rec.log.some(c => c.slide === cur)) return;
    rec.log.push({ slide: cur, t: Math.round((Date.now() - rec.start) / 1000) });
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
    try { const r = JSON.parse(sessionStorage.getItem(chapterKey)); if (r && r.start && Array.isArray(r.log)) rec = r; } catch (_) {}
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
    const list = rec.log.slice().sort((a, b) => a.t - b.t).map(c => ({ t: c.t, title: chapterTitle(slides[c.slide]) }));
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

  /* ---------- Offline ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register(new URL('sw.js', ROOT).href, { scope: ROOT.pathname }).catch(() => {});
  }
})();
