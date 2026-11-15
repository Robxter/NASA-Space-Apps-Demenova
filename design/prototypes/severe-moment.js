// Prototype harness: three variants of "a lot turns Severe" on the demo farm map (D-033, A4).
// Data: severe-moment-data.js (generated from app/public/data/demo). Picker wiring from prototype/PICKER.md.
(function () {
  const P = window.DN_PROTO;
  const WORD = { normal: 'Normal', watch: 'Watch', warning: 'Warning', severe: 'Severe', stale: 'Out of date' };
  const DAY_LABEL = { before: 'Fri, 6 Feb 2026', after: 'Sat, 7 Feb 2026' };
  const NAMES = ['ripple', 'flood', 'label'];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const labelled = P.lots.filter((l) => l.after === 'severe');
  let state = 'before';
  let timers = [];
  let epoch = 0;

  function core() {
    return '<svg class="core" viewBox="0 0 14 18" aria-hidden="true">' +
      '<rect class="core-water" x="2.5" y="2.5" width="9" height="13" rx="1"/>' +
      '<rect class="core-outline" x="1" y="1" width="12" height="16" rx="3"/></svg>';
  }

  function render(variant) {
    const { width, height } = P.view;
    const shapes = P.lots.map((l, i) => `<path class="lot" data-i="${i}" data-level="${l.before}" d="${l.d}"><title>${l.name}</title></path>`).join('');
    const rings = P.lots.map((l, i) => (l.before !== l.after ? `<path class="ring" data-i="${i}" d="${l.d}"/>` : '')).join('');
    const labels = labelled.map((l) => {
      const i = P.lots.indexOf(l);
      const left = ((l.cx / width) * 100).toFixed(2);
      const top = ((l.cy / height) * 100).toFixed(2);
      return `<span class="label" data-i="${i}" data-level="${l.before}" data-left="${left}" data-top="${top}">${core()}<span class="word">${WORD[l.before]}</span></span>`;
    }).join('');
    return `<div class="map" data-variant="${variant}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Demo farm lots by level"><defs></defs>${shapes}${rings}</svg>${labels}</div>`;
  }

  // Labels are positioned from data attributes (no inline style in the markup string).
  function placeLabels(root) {
    root.querySelectorAll('.label').forEach((el) => {
      el.style.left = el.dataset.left + '%';
      el.style.top = el.dataset.top + '%';
    });
  }

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Flood: a hard gradient stop sweeps bottom to top inside the lot shape.
  function flood(svg, path, i, duration, done) {
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'linearGradient');
    g.id = 'flood-' + i;
    ['x1', 'y1', 'x2', 'y2'].forEach((a, k) => g.setAttribute(a, ['0', '1', '0', '0'][k]));
    const stops = [
      ['0', 'var(--dn-severe-fill)', 0.75],
      ['0', 'var(--dn-severe-fill)', 0.75],
      ['0', 'var(--dn-warning-fill)', 0.55],
      ['1', 'var(--dn-warning-fill)', 0.55],
    ].map(([o, c, op]) => {
      const s = document.createElementNS(ns, 'stop');
      s.setAttribute('offset', o);
      s.style.stopColor = c;
      s.style.stopOpacity = String(op);
      g.appendChild(s);
      return s;
    });
    svg.querySelector('defs').appendChild(g);
    path.style.fill = `url(#${g.id})`;
    path.style.fillOpacity = '1';
    const t0 = performance.now();
    const mine = epoch;
    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const o = easeInOut(t).toFixed(3);
      stops[1].setAttribute('offset', o);
      stops[2].setAttribute('offset', o);
      if (t < 1 && mine === epoch) requestAnimationFrame(frame);
      else {
        path.style.fill = '';
        path.style.fillOpacity = '';
        g.remove();
        if (mine === epoch) done(); // interrupted sweeps leave the level set by the newer step
      }
    }
    requestAnimationFrame(frame);
  }

  function setDay(next, animate) {
    const root = document.querySelector('#stage .map');
    if (!root) return;
    timers.forEach(clearTimeout);
    timers = [];
    epoch += 1;
    state = next;
    document.getElementById('day').textContent = DAY_LABEL[next];
    document.getElementById('step').textContent = next === 'before' ? 'Show 7 Feb' : 'Show 6 Feb';
    const variant = root.dataset.variant;
    const svg = root.querySelector('svg');
    const forward = next === 'after' && animate && !reduce.matches;

    P.lots.forEach((l, i) => {
      const level = l[next];
      const path = svg.querySelector(`.lot[data-i="${i}"]`);
      const ring = svg.querySelector(`.ring[data-i="${i}"]`);
      const label = root.querySelector(`.label[data-i="${i}"]`);
      const changes = l.before !== l.after;
      if (ring) ring.classList.remove('is-on');
      if (label) label.classList.remove('is-on');
      const setLabel = () => {
        if (!label) return;
        label.dataset.level = level;
        label.querySelector('.word').textContent = WORD[level];
      };
      if (!forward || !changes) {
        path.dataset.level = level;
        setLabel();
        return;
      }
      void (ring && ring.getBoundingClientRect());
      if (variant === 'ripple') {
        path.dataset.level = level;
        setLabel();
        ring.classList.add('is-on');
      } else if (variant === 'flood') {
        flood(svg, path, i, 700, () => { path.dataset.level = level; });
        timers.push(setTimeout(setLabel, 350));
        if (label) label.dataset.level = level; // the core's water rises with the shape; the word follows at 350 ms
        ring.classList.add('is-on');
      } else {
        path.dataset.level = level;
        setLabel();
        if (label) label.classList.add('is-on');
      }
    });
  }

  // Picker (prototype/PICKER.md reference wiring).
  const variants = NAMES.map((n) => () => render(n));
  const stage = document.getElementById('stage');
  const picker = document.querySelector('.proto-picker');
  const highlight = picker.querySelector('.proto-picker-highlight');
  const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
  const replay = picker.querySelector('.proto-picker-replay');
  let current = 0;

  function moveHighlight() {
    const el = items[current];
    highlight.style.width = el.offsetWidth + 'px';
    highlight.style.transform = `translateX(${el.offsetLeft}px)`;
  }

  function mount(i) {
    stage.innerHTML = '';
    timers.forEach(clearTimeout);
    requestAnimationFrame(() => {
      stage.innerHTML = variants[i]();
      placeLabels(stage);
      setDay('before', false);
      timers.push(setTimeout(() => setDay('after', true), 700));
    });
  }

  function setActive(i) {
    if (i < 0 || i >= variants.length) return;
    current = i;
    items.forEach((el, j) => {
      el.toggleAttribute('data-active', j === i);
      if (j === i) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    moveHighlight();
    const url = new URL(location);
    url.searchParams.set('v', i + 1);
    history.replaceState(null, '', url);
    mount(i);
  }

  items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
  replay?.addEventListener('click', () => mount(current));
  window.addEventListener('resize', moveHighlight);
  document.getElementById('step').addEventListener('click', () => setDay(state === 'before' ? 'after' : 'before', true));

  document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= variants.length) setActive(num - 1);
    else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
    else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
    else if (e.key === 'r' || e.key === 'R') mount(current);
  });

  const requested = parseInt(new URLSearchParams(location.search).get('v'), 10);
  setActive(requested >= 1 && requested <= variants.length ? requested - 1 : 0);
  requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
})();
