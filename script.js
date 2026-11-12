(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-menu');
  const scrim = document.querySelector('.menu-scrim');
  if (!toggle || !menu || !scrim) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    scrim.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  scrim.addEventListener('click', () => setOpen(false));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();

// Page entrance. Copy arrives line by line, following the order the eye
// travels down the page, with a wider cadence between blocks so the page
// feels like it is settling rather than firing. Headings and paragraphs are
// measured into visual lines and each line rises and fades a beat after the
// one above it. Nothing is hidden unless this script actually runs, anyone
// who prefers reduced motion gets the page untouched, and a safety net
// reveals everything if a cue is ever missed.
(() => {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!items.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const LINE = 105;   // ms between one line and the next
  const GAP = 90;     // extra breath between blocks and cards
  const HOLD = 3400;  // the intro overlay holds the first screen this long

  document.body.classList.add('reveal-ready');

  const overlay = document.querySelector('.intro');
  const base = overlay && getComputedStyle(overlay).display !== 'none' ? HOLD : 120;

  const fold = window.innerHeight;
  const index = new Map(items.map((el, i) => [el, i]));

  const observe = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        const batch = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target)
          .sort((a, b) => index.get(a) - index.get(b));
        batch.forEach((el) => observe.unobserve(el));
        sequence(batch, 0);
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 })
    : null;

  // ---- measuring and sequencing -----------------------------------------

  const sequence = (list, start) => {
    let cursor = start;
    list.forEach((el) => {
      cursor += reveal(el, cursor) * LINE + GAP;
    });
  };

  const reveal = (el, start) => {
    if (!el.classList.contains('rv-lines')) {
      el.style.transitionDelay = start + 'ms';
      el.classList.add('is-in');
      return 1;
    }
    const words = [...el.querySelectorAll('.rv-w')];
    if (!words.length) {
      el.classList.add('is-in');
      return 1;
    }
    let top = null;
    let line = -1;
    words.forEach((word) => {
      const y = Math.round(word.getBoundingClientRect().top);
      if (top === null || Math.abs(y - top) > 4) {
        line += 1;
        top = y;
      }
      word.style.transitionDelay = (start + line * LINE) + 'ms';
    });
    el.classList.add('is-in');
    return line + 1;
  };

  // Wrap each word of a plain-text block so lines can be measured and then
  // staggered. Blocks that hold other markup are left alone and fade whole.
  const split = (el) => {
    if (el.dataset.split === 'done' || el.children.length) return;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    el.dataset.text = text;
    const frag = document.createDocumentFragment();
    text.split(' ').forEach((word, i) => {
      if (i) frag.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'rv-w';
      span.textContent = word;
      frag.appendChild(span);
    });
    el.replaceChildren(frag);
    el.dataset.split = 'done';
    el.classList.add('rv-lines');
  };

  const arm = () => {
    const above = [];
    const below = [];
    items.forEach((el) => {
      const box = el.getBoundingClientRect();
      (box.top < fold && box.bottom > 0 ? above : below).push(el);
    });
    sequence(above, base);
    if (!observe) {
      below.forEach((el) => {
        el.style.transitionDelay = '0ms';
        el.classList.add('is-in');
      });
      return;
    }
    below.forEach((el) => observe.observe(el));
  };

  // Re-measure after a resize so lines stay true instead of drifting. The
  // page is already revealed by then, so things land without replaying.
  let width = window.innerWidth;
  let timer = null;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - width) < 24) return;
    width = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      items.forEach((el) => {
        if (!el.classList.contains('rv-lines') || !el.dataset.text) return;
        el.textContent = el.dataset.text;
        el.dataset.split = '';
        el.classList.remove('rv-lines');
        split(el);
        el.querySelectorAll('.rv-w').forEach((word) => {
          word.style.transitionDelay = '0ms';
        });
        el.classList.add('is-in');
      });
    }, 280);
  });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    items.forEach(split);
    window.setTimeout(arm, 30);
    window.setTimeout(() => {
      items.forEach((el) => el.classList.add('is-in'));
    }, base + 7000);
  };

  // measure once the type is in place, with a fallback in case the font
  // promise never settles
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    window.setTimeout(start, 1400);
  } else {
    start();
  }
})();
