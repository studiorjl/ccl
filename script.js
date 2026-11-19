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

  // Cadence. Each block carries its own beat: the defaults below, or the
  // step and gap an element declares with data-reveal-step / data-reveal-gap
  // when a page needs a slower, more deliberate cascade.
  const sequence = (list, start) => {
    let cursor = start;
    list.forEach((el) => {
      const step = Number(el.dataset.revealStep) || LINE;
      const gap = el.dataset.revealGap != null ? Number(el.dataset.revealGap) : GAP;
      cursor += reveal(el, cursor, step) * step + gap;
    });
  };

  const reveal = (el, start, step = LINE) => {
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
    // Group the wrapped words into the visual lines the browser chose, then
    // hand each line its own beat.
    const lines = [];
    let top = null;
    words.forEach((word) => {
      const y = Math.round(word.getBoundingClientRect().top);
      if (top === null || Math.abs(y - top) > 4) {
        lines.push([]);
        top = y;
      }
      lines[lines.length - 1].push(word);
    });
    // A long block tightens its own cadence so a twenty five line paragraph
    // still settles in a breath or two instead of crawling down the page.
    const span = Number(el.dataset.revealSpan) || 1700;
    const beat = lines.length * step > span ? span / lines.length : step;
    lines.forEach((line, i) => {
      line.forEach((word) => {
        word.style.transitionDelay = Math.round(start + i * beat) + 'ms';
      });
    });
    el.classList.add('is-in');
    return lines.length;
  };

  // Wrap each word of a plain-text block so lines can be measured and then
  // staggered. Blocks that hold other markup are left alone and fade whole.
  const split = (el) => {
    if (el.dataset.split === 'done') return;
    // Blocks that hold real markup are left alone and fade whole, but a block
    // whose only markup is <br> keeps those breaks: the copy was written with
    // them, so the words are wrapped line by line and the breaks go back in.
    const breaks = [...el.children].every((child) => child.tagName === 'BR');
    if (el.children.length && !breaks) return;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    el.dataset.html = el.innerHTML;
    el.dataset.text = text;
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === 1) {
        frag.appendChild(node.cloneNode(false));
        return;
      }
      const words = node.textContent.replace(/\s+/g, ' ').trim();
      if (!words) return;
      words.split(' ').forEach((word, i) => {
        if (i) frag.appendChild(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'rv-w';
        span.textContent = word;
        frag.appendChild(span);
      });
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
        if (el.dataset.html != null) el.innerHTML = el.dataset.html;
        else el.textContent = el.dataset.text;
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

// The director portrait hangs on the centre of the whitespace between the
// name block and the bio, so it overhangs that gap evenly above and below.
// Measured rather than assumed: the name wraps at some widths and the columns
// stack on phones, where the portrait simply sits above the name instead.
(() => {
  const photo = document.querySelector('.profile-photo');
  const name = document.querySelector('.profile-name');
  const bio = document.querySelector('.profile-bio');
  if (!photo || !name || !bio) return;

  const place = () => {
    photo.style.top = '0px';
    const stacked = name.offsetTop >= photo.offsetTop + photo.offsetHeight;
    if (stacked) {
      photo.style.top = '0px';
      return;
    }
    const centre = photo.offsetTop + photo.offsetHeight / 2;
    const gapCentre = (name.offsetTop + name.offsetHeight + bio.offsetTop) / 2;
    photo.style.top = Math.round(gapCentre - centre) + 'px';
  };

  place();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  window.addEventListener('resize', place);
})();

// Project galleries: a left and right arrow pair that steps through the images
// one card at a time. Arrows hide themselves when everything already fits, and
// the track stays a native scroller, so swipe and trackpad still work.
(() => {
  document.querySelectorAll('.gallery').forEach((wrap) => {
    const track = wrap.querySelector('.project-gallery');
    const nav = wrap.querySelector('.gallery-nav');
    const prev = wrap.querySelector('[data-gallery="prev"]');
    const next = wrap.querySelector('[data-gallery="next"]');
    if (!track || !nav || !prev || !next) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const step = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      return first ? first.getBoundingClientRect().width + gap : Math.round(track.clientWidth * 0.8);
    };
    const go = (dir) => {
      track.scrollBy({ left: dir * step(), behavior: reduced.matches ? 'auto' : 'smooth' });
    };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));

    const state = () => {
      const max = track.scrollWidth - track.clientWidth;
      nav.hidden = max <= 1;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
    };

    track.addEventListener('scroll', state, { passive: true });
    window.addEventListener('resize', state);
    state();
  });
})();
