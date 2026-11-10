// KIMI design layer for model3.html: decoration + motion only.
// Content, links and script.js logic (tabs, slider, menu toggle) are untouched.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rootStyle = getComputedStyle(document.documentElement);
  const token = (name) => rootStyle.getPropertyValue(name).trim();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isMobile = () => innerWidth < 768;

  /* ---------- One shared rAF ticker ---------- */
  const subs = new Set();
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(64, now - last);
    last = now;
    subs.forEach((fn) => fn(now, dt));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const onTick = (fn) => { subs.add(fn); return () => subs.delete(fn); };

  /* ---------- Spring (react-spring style integration, 1ms steps, mass 1) ---------- */
  class Spring {
    constructor(value, config = { tension: 90, friction: 26 }) {
      this.v = value; this.target = value; this.vel = 0; this.config = config; this.off = null; this.cb = null; this.end = null;
    }
    to(target, delay = 0) {
      this.target = target;
      const start = () => { if (!this.off) this.off = onTick((_, dt) => this.step(dt)); };
      delay ? setTimeout(start, delay) : start();
      return this;
    }
    step(dt) {
      const { tension, friction } = this.config;
      for (let i = 0; i < dt; i++) {
        const force = -tension * 1e-6 * (this.v - this.target) - friction * 1e-3 * this.vel;
        this.vel += force;
        this.v += this.vel;
      }
      if (Math.abs(this.vel) < 1e-5 && Math.abs(this.v - this.target) < 1e-4) {
        this.v = this.target; this.vel = 0;
        this.off(); this.off = null;
        this.cb && this.cb(this.v);
        this.end && this.end();
        return;
      }
      this.cb && this.cb(this.v);
    }
    on(cb) { this.cb = cb; cb(this.v); return this; }
  }

  // Fade + rise into place: {opacity 0, translateY(offset)} -> {1, 0}
  const animateIn = (el, delay = 0, offset = '1.25rem', config) => {
    if (reduce) { el.style.opacity = '1'; return; }
    const s = new Spring(0, config).on((v) => {
      el.style.opacity = String(clamp(v, 0, 1));
      el.style.transform = `translateY(calc(${1 - v} * ${offset}))`;
    });
    // clear transform at rest so it never becomes a containing block (menu sheet is position:fixed)
    s.end = () => { el.style.transform = ''; };
    s.to(1, delay);
  };

  /* ---------- Lenis smooth scroll on the shared ticker ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ autoRaf: false, lerp: 0.1 });
    onTick((now) => lenis.raf(now));
  }

  const sections = [...document.querySelectorAll('main > section')];
  const isDark = (s) => getComputedStyle(s).getPropertyValue('--k-dark').trim() === '1';

  /* ---------- Image plates ---------- */
  const makePlate = (box, imgs) => {
    box.classList.add('plate');
    const fill = document.createElement('div');
    fill.className = 'plate__fill';
    imgs.forEach((img) => fill.appendChild(img));
    box.appendChild(fill);
  };
  document.querySelectorAll('.m3-card > img, .m3-feature > img, .m3-split > img, .m3-banner > img, .hero__bg').forEach((img) => {
    const box = document.createElement('div');
    if (img.classList.contains('hero__bg')) box.classList.add('plate--hero');
    img.replaceWith(box);
    makePlate(box, [img]);
  });
  document.querySelectorAll('.m3-explore__media, .card__media').forEach((box) => makePlate(box, [...box.querySelectorAll('img')]));

  /* ---------- Text split (screen readers keep the plain text) ---------- */
  const splitWords = (el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'k-sr'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const parts = text.split(/\s+/).map((word, i, all) => {
      const span = document.createElement('span'); span.className = 'k-word'; span.textContent = word;
      vis.appendChild(span);
      if (i < all.length - 1) vis.appendChild(document.createTextNode(' '));
      return span;
    });
    el.append(sr, vis);
    return parts;
  };
  const splitChars = (dt) => {
    const node = dt.firstChild;
    if (!node || node.nodeType !== 3) return [];
    const text = node.textContent;
    const sr = document.createElement('span'); sr.className = 'k-sr'; sr.textContent = text.trim();
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const chars = [...text].map((ch) => {
      const span = document.createElement('span'); span.className = 'k-char'; span.textContent = ch === ' ' ? ' ' : ch;
      vis.appendChild(span);
      return span;
    });
    dt.replaceChild(vis, node);
    dt.insertBefore(sr, vis);
    return chars;
  };
  const reveal = (parts, { stagger, offset, delay = 0 }) => {
    parts.forEach((p, i) => {
      if (reduce) { p.style.opacity = '1'; return; }
      const s = new Spring(0, { tension: 90, friction: 26 }).on((v) => {
        p.style.opacity = String(clamp(v, 0, 1));
        p.style.transform = `translateY(${(1 - v) * offset}em)`;
      });
      s.to(1, delay + i * stagger);
    });
  };
  const hide = (parts) => parts.forEach((p) => { if (!reduce) p.style.opacity = '0'; });

  const heroTitle = document.querySelector('main > section:first-child .hero__title');
  const heroWords = heroTitle ? splitWords(heroTitle) : [];
  hide(heroWords);

  // Section headings: word by word, once, when scrolled into view
  const headingIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      headingIO.unobserve(e.target);
      reveal(e.target._parts, { stagger: 110, offset: 0.35 });
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('main .h2, main .hero__title').forEach((el) => {
    if (el === heroTitle) return;
    el._parts = splitWords(el);
    hide(el._parts);
    headingIO.observe(el);
  });

  // Numbers: letter by letter, every time they become visible (tabs re-trigger it)
  const numberIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) reveal(e.target._parts, { stagger: 26, offset: 0.3 });
      else hide(e.target._parts);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.m3-stats dt').forEach((dt) => {
    dt._parts = splitChars(dt);
    hide(dt._parts);
    numberIO.observe(dt);
  });

  /* ---------- Contour backdrop (marching squares over 4 sine fields) ---------- */
  const SEGMENTS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  const LEVELS = [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4];
  const addContour = (section) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'k-contour';
    canvas.setAttribute('aria-hidden', 'true');
    section.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const color = token('--surface-soft');
    const step = 18;
    let w = 0, h = 0, visible = false, lastDraw = 0;
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = section.clientWidth; h = section.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const field = (x, y, t) =>
      Math.sin(x * 0.004 + t * 0.00020) +
      Math.sin(y * 0.005 - t * 0.00015) +
      Math.sin((x + y) * 0.003 + t * 0.00010) +
      Math.sin((x - y) * 0.0025 - t * 0.00012);
    const draw = (t) => {
      const cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1;
      const v = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = field(i * step, j * step, t);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const lvl of LEVELS) {
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = v[j * cols + i], b = v[j * cols + i + 1], c = v[(j + 1) * cols + i + 1], d = v[(j + 1) * cols + i];
            const idx = (a > lvl) * 8 + (b > lvl) * 4 + (c > lvl) * 2 + (d > lvl);
            if (idx === 0 || idx === 15) continue;
            const x = i * step, y = j * step;
            const pt = (e) => {
              if (e === 0) return [x + ((lvl - a) / (b - a)) * step, y];
              if (e === 1) return [x + step, y + ((lvl - b) / (c - b)) * step];
              if (e === 2) return [x + ((lvl - d) / (c - d)) * step, y + step];
              return [x, y + ((lvl - a) / (d - a)) * step];
            };
            for (const [e1, e2] of SEGMENTS[idx]) {
              const p1 = pt(e1), p2 = pt(e2);
              ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
            }
          }
        }
      }
      ctx.stroke();
    };
    size();
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(section);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
    draw(0);
    if (!reduce) onTick((now) => {
      if (!visible || now - lastDraw < 33) return; // ~30fps
      lastDraw = now;
      draw(now);
    });
  };

  /* ---------- Chequered dissolve at light → dark boundaries ---------- */
  const addChequer = (section) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'k-chequer';
    canvas.setAttribute('aria-hidden', 'true');
    section.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const light = token('--background'), accent = token('--accent');
    const cell = 24, rows = 8;
    let w = 0, cols = 0, seeds = [], lastP = -1;
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = section.clientWidth; cols = Math.ceil(w / cell);
      canvas.width = w * dpr; canvas.height = rows * cell * dpr;
      canvas.style.height = rows * cell + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seeds = Array.from({ length: cols * rows }, () => ({ r: Math.random(), accent: Math.random() < 0.06 }));
      lastP = -1;
    };
    const draw = (p) => {
      ctx.clearRect(0, 0, w, rows * cell);
      for (let r = 0; r < rows; r++) {
        const threshold = (r / (rows - 1)) * 0.85 + p * 1.2 - 0.2; // top rows solid, bottom rows sparse
        for (let c = 0; c < cols; c++) {
          const s = seeds[r * cols + c];
          if (s.r < threshold) continue;
          ctx.fillStyle = s.accent && r > 0 ? accent : light;
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
    };
    size();
    new ResizeObserver(size).observe(section);
    onTick(() => {
      const top = section.getBoundingClientRect().top;
      const p = clamp((innerHeight - top) / (innerHeight * 0.75), 0, 1);
      if (Math.abs(p - lastP) < 0.004) return;
      lastP = p;
      draw(p);
    });
  };

  sections.forEach((s, i) => {
    if (!isDark(s)) addContour(s);
    else if (!reduce && i > 0 && !isDark(sections[i - 1])) addChequer(s);
  });

  /* ---------- Sticky stack: first 3 sections ---------- */
  sections.forEach((s, i) => { s.style.zIndex = String(i + 1); });
  const stacked = sections.slice(0, 3).map((s) => {
    s.classList.add('is-stacked');
    const inner = document.createElement('div');
    inner.className = 'stack-inner';
    while (s.firstChild) inner.appendChild(s.firstChild);
    s.appendChild(inner);
    const shade = document.createElement('div');
    shade.className = 'stack-shade';
    s.appendChild(shade);
    return { s, inner, shade, next: sections[sections.indexOf(s) + 1] };
  });
  // stick when the section's bottom reaches the viewport bottom, so tall sections are fully seen first
  const setTops = () => stacked.forEach((o) => { o.s.style.top = Math.min(0, innerHeight - o.s.offsetHeight) + 'px'; });
  setTops();
  addEventListener('resize', setTops);
  addEventListener('load', setTops);
  onTick(() => {
    stacked.forEach((o) => {
      if (!o.next) return;
      const p = clamp(1 - o.next.getBoundingClientRect().top / innerHeight, 0, 1);
      o.inner.style.transform = isMobile() || reduce ? '' : `scale(${1 - 0.1 * p})`;
      o.shade.style.opacity = String(0.55 * p);
    });
  });

  /* ---------- Parallax via `top` (each plate its own speed) ---------- */
  const plates = [...document.querySelectorAll('.plate')].map((p) => ({ p, speed: 20 + Math.random() * 40 }));
  if (!reduce) onTick(() => {
    const vh = innerHeight, unit = innerWidth / 1440;
    plates.forEach(({ p, speed }) => {
      const r = p.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.height === 0) return;
      const prog = (vh - r.top) / (vh + r.height); // 0 entering → 1 leaving
      const over = r.height * 0.1;
      const off = clamp(-over / 2 + (prog - 0.5) * speed * unit, -over, 0);
      p.querySelectorAll('.plate__fill img').forEach((img) => { img.style.top = off + 'px'; });
    });
  });

  // Hero text layer drifts slower than the page (110 design px over the hero)
  const heroText = document.querySelector('main > section:first-child .hero__text');
  if (heroText && !reduce) onTick(() => {
    const unit = innerWidth / 1440;
    const p = clamp(scrollY / innerHeight, 0, 1);
    heroText.style.position = 'relative';
    heroText.style.top = (p * 110 * unit) + 'px';
  });

  // Hero plate follows the cursor a little
  const heroPlate = document.querySelector('main > section:first-child .plate--hero');
  if (heroPlate && !reduce) {
    const mx = new Spring(0, { tension: 120, friction: 30 }), my = new Spring(0, { tension: 120, friction: 30 });
    const apply = () => { heroPlate.style.transform = `translate(calc(-50% + ${mx.v}px), calc(-50% + ${my.v}px))`; };
    mx.on(apply); my.on(apply);
    addEventListener('mousemove', (e) => {
      mx.to((e.clientX / innerWidth - 0.5) * 24);
      my.to((e.clientY / innerHeight - 0.5) * 16);
    });
  }

  /* ---------- Entrance: header 0 → name 180 → panels 900 → bottom row 1500 ---------- */
  const nav = document.querySelector('.navbar');
  const heroSection = sections[0];
  animateIn(nav, 0);
  reveal(heroWords, { stagger: 110, offset: 0.35, delay: 180 });
  const sub = heroSection && heroSection.querySelector('.hero__subtitle');
  const actions = heroSection && heroSection.querySelector('.hero__actions');
  if (sub) animateIn(sub, 900);
  if (actions) animateIn(actions, 1500);
  document.documentElement.classList.remove('k-js');

  /* ---------- Burger sheet: links rise in one by one, Esc closes ---------- */
  const toggle = document.querySelector('.navbar__toggle');
  new MutationObserver(() => {
    const open = nav.classList.contains('is-open');
    document.documentElement.classList.toggle('k-lock', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) nav.querySelectorAll('.navbar__links .nav-link').forEach((a, i) => {
      a.style.opacity = '0';
      animateIn(a, 80 + i * 70);
    });
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) toggle.click();
  });
})();
