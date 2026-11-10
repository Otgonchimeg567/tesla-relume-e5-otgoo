// Mobile menu toggle
const navbar = document.querySelector('.navbar');
const toggle = document.querySelector('.navbar__toggle');
toggle.addEventListener('click', () => {
  const open = navbar.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
});

// Tabs (model3.html trim explorer): show panels matching the selected tab
document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = root.querySelectorAll('[data-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      root.querySelectorAll('[data-panel]').forEach((p) => {
        p.hidden = p.dataset.panel !== name;
      });
    });
  });
});

// Slider arrows: scroll the track by one item
document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('[data-track]');
  const step = () => {
    const item = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item.getBoundingClientRect().width + gap;
  };
  slider.querySelector('[data-prev]').addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  slider.querySelector('[data-next]').addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
});
