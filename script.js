// Mobile menu toggle
const navbar = document.querySelector('.navbar');
const toggle = document.querySelector('.navbar__toggle');
toggle.addEventListener('click', () => {
  const open = navbar.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
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
