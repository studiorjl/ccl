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

// Home page entrance: the page settles in sequence instead of appearing at
// once. Elements lift ~14px and fade. Only armed when this script runs, so
// copy is never left hidden if JS fails, and skipped entirely for anyone who
// prefers reduced motion.
(() => {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!items.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.body.classList.add('reveal-ready');

  const reveal = (el, delay) => {
    if (delay) el.style.transitionDelay = delay + 'ms';
    el.classList.add('is-in');
  };

  // the intro overlay holds the first screen for ~4s, so the sequence would
  // otherwise play out behind it and be missed entirely
  const overlay = document.querySelector('.intro');
  const held = overlay && getComputedStyle(overlay).display !== 'none' && !overlay.classList.contains('done');
  const start = held ? 3150 : 120;

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, index) => {
            observer.unobserve(entry.target);
            reveal(entry.target, index * 80);
          });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 })
    : null;

  const arm = () => {
    const fold = window.innerHeight * 0.94;
    const above = [];
    const below = [];
    items.forEach((el) => {
      const box = el.getBoundingClientRect();
      (box.top < fold && box.bottom > 0 ? above : below).push(el);
    });
    above.forEach((el, index) => reveal(el, index * 90));
    if (!observer) {
      below.forEach((el) => reveal(el, 0));
      return;
    }
    below.forEach((el) => observer.observe(el));
  };

  window.setTimeout(arm, start);
  // safety net: nothing stays invisible because it missed its cue
  window.setTimeout(() => items.forEach((el) => el.classList.add('is-in')), start + 6000);
})();
