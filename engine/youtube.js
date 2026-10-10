/* Namma Exams YouTube page: shared by every lesson's youtube.html.
   Reads the lesson's youtube.md (sections: # Lesson name, ## Title, ## Description, ## Tags, ## Hashtags),
   shows each part with a Copy button, fills in the chapters saved by the deck's chapter timer,
   and offers the thumbnail through the share sheet. */
(() => {
  'use strict';

  const PLACEHOLDER = "[paste from the deck's Copy chapters button]";
  const LIMITS = { Title: 100, Description: 5000, Tags: 500 };
  const ROOT = new URL('../', new URL('./', document.currentScript.src));
  const chaptersKey = 'nammaChapters:' + location.pathname.replace(/[^/]*$/, '');

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const page = el('main', 'yt');
  document.body.append(page);

  load().catch(err => { page.append(el('p', 'yt-error', `Could not load youtube.md (${err.message}). Open this page through the local server or GitHub Pages.`)); });

  async function load() {
    const res = await fetch('youtube.md', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const { name, parts } = parse(await res.text());
    document.title = `YouTube · ${name || 'Lesson'}`;
    page.append(header(name));

    const saved = savedChapters();
    for (const [label, text] of parts) {
      if (label === 'Description' && text.includes(PLACEHOLDER)) {
        const note = saved
          ? `Chapters from the recording on ${new Date(saved.recorded).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} (${saved.count}).` + (saved.count < 3 ? ' YouTube needs at least 3.' : '')
          : 'No chapters saved on this device yet. Tap Start on the deck’s chapter timer when you record, then reopen this page.';
        page.append(card(label, saved ? text.replace(PLACEHOLDER, saved.text) : text, note, !saved || saved.count < 3));
      } else {
        page.append(card(label, text));
      }
    }
    page.append(thumbnailCard(name));
  }

  // "# Name" then "## Part" sections. A part may be wrapped in a ``` fence.
  function parse(md) {
    const name = (md.match(/^#\s+(.+)$/m) || [])[1] || '';
    const parts = [];
    for (const chunk of md.split(/^##\s+/m).slice(1)) {
      const nl = chunk.indexOf('\n');
      const label = chunk.slice(0, nl < 0 ? undefined : nl).trim();
      let body = nl < 0 ? '' : chunk.slice(nl + 1).trim();
      body = body.replace(/^```[^\n]*\n([\s\S]*?)\n```$/, '$1').trim();
      parts.push([label, body]);
    }
    return { name: name.trim(), parts };
  }

  function savedChapters() {
    try {
      const s = JSON.parse(localStorage.getItem(chaptersKey));
      return s && s.text ? s : null;
    } catch (_) { return null; }
  }

  function header(name) {
    const h = el('header', 'yt-head');
    const img = el('img'); img.src = new URL('engine/icons/icon-180.png', ROOT).href; img.alt = '';
    const titles = el('div');
    titles.append(el('small', '', 'YouTube package'), el('h1', '', name || 'Lesson'));
    const nav = el('nav');
    const teach = el('a', '', '▶ Teach'); teach.href = './';
    const lib = el('a', '', 'Library'); lib.href = new URL('index.html', ROOT).href;
    nav.append(teach, lib);
    h.append(img, titles, nav);
    return h;
  }

  function card(label, text, note, warn) {
    const c = el('section', 'yt-card');
    const top = el('div', 'yt-card-top');
    const h = el('h2', '', label);
    const limit = LIMITS[label];
    const count = el('span', 'yt-count', limit ? `${[...text].length} / ${limit}` : '');
    if (limit && [...text].length > limit) count.classList.add('over');
    top.append(h, count, copyButton(() => text));
    c.append(top);
    if (note) c.append(el('p', 'yt-note' + (warn ? ' warn' : ''), note));
    c.append(el('div', 'yt-text', text));
    return c;
  }

  function copyButton(getText) {
    const b = el('button', 'yt-copy', 'Copy');
    b.type = 'button';
    b.addEventListener('click', async () => {
      const ok = await copy(getText());
      b.textContent = ok ? 'Copied ✓' : 'Copy failed';
      b.classList.toggle('done', ok);
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 2000);
    });
    return b;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    const ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.append(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return ok;
  }

  function thumbnailCard(name) {
    const c = el('section', 'yt-card');
    const top = el('div', 'yt-card-top');
    const b = el('button', 'yt-copy', 'Save thumbnail');
    b.type = 'button';
    top.append(el('h2', '', 'Thumbnail'), el('span', 'yt-count', '1280 × 720'), b);
    const img = el('img', 'yt-thumb'); img.src = 'thumbnail.png'; img.alt = 'Thumbnail';
    const note = el('p', 'yt-note', 'Save thumbnail opens the share sheet: choose Save Image. Or long-press the picture.');
    c.append(top, note, img);

    // Load the file now so the share sheet opens straight from the tap.
    let file = null;
    fetch('thumbnail.png').then(r => r.ok ? r.blob() : Promise.reject(new Error(r.status)))
      .then(blob => { file = new File([blob], slug(name) + '-thumbnail.png', { type: 'image/png' }); })
      .catch(() => { note.textContent = 'thumbnail.png not found for this lesson.'; note.classList.add('warn'); b.disabled = true; });

    b.addEventListener('click', async () => {
      if (!file) return;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch (_) { /* cancelled */ }
        return;
      }
      const a = el('a'); a.href = URL.createObjectURL(file); a.download = file.name;   // Mac fallback
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
    return c;
  }

  function slug(s) { return (s || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson'; }
})();
