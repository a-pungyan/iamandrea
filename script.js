document.getElementById('year').textContent = new Date().getFullYear();

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('main-navigation');
let menuPinned = false;
let closeTimer;
let atTop = window.scrollY <= 40;

function setMenuOpen(open) {
  clearTimeout(closeTimer);
  if (atTop) open = true;
  if (!open) menuPinned = false;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navigation.hidden = !open;
}

function updateHeader() {
  const wasAtTop = atTop;
  atTop = window.scrollY <= 40;
  header.classList.toggle('menu-enabled', !atTop);
  menuToggle.hidden = atTop;
  if (atTop || wasAtTop !== atTop) {
    const focusedLink = navigation.contains(document.activeElement);
    setMenuOpen(atTop || focusedLink);
  }
}
setMenuOpen(atTop);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuToggle.addEventListener('click', () => {
  menuPinned = !menuPinned;
  setMenuOpen(menuPinned);
});

// The short delay keeps the menu open while crossing to the dropdown.
for (const element of [menuToggle, navigation]) {
  element.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setMenuOpen(true);
  });
  element.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || menuPinned) return;
    closeTimer = setTimeout(() => {
      if (!navigation.contains(document.activeElement)) setMenuOpen(false);
    }, 180);
  });
}

document.addEventListener('click', (event) => {
  const element = event.target.closest('a, button');
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.animate([
    { transform: 'translateY(2px)' },
    { transform: 'translateY(0)' },
  ], { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    setMenuOpen(false);
    if (!atTop) menuToggle.focus({ preventScroll: true });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!header.contains(event.target)) setMenuOpen(false);
});

header.addEventListener('focusout', (event) => {
  if (!header.contains(event.relatedTarget)) setMenuOpen(false);
});

const cursorMedia = window.matchMedia('(hover: hover) and (pointer: fine) and (forced-colors: none)');
const cursor = document.createElement('div');
cursor.className = 'inverting-cursor';
cursor.setAttribute('aria-hidden', 'true');
cursor.hidden = true;
document.body.append(cursor);
let cursorPop;
let cursorRipple;

document.addEventListener('pointerdown', (event) => {
  if (!cursorMedia.matches || event.pointerType !== 'mouse' || event.button !== 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  cursorPop?.cancel();
  cursorRipple?.remove();
  cursor.style.transform = `translate3d(${event.clientX - 12}px, ${event.clientY - 12}px, 0)`;
  cursorRipple = cursor.cloneNode();
  cursorRipple.hidden = false;
  cursorRipple.style.left = `${event.clientX}px`;
  cursorRipple.style.top = `${event.clientY}px`;
  cursorRipple.style.transform = 'translate(-50%, -50%)';
  document.body.append(cursorRipple);
  const ripple = cursorRipple;
  ripple.animate([
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(2.4)', opacity: 0 },
  ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' })
    .finished.then(() => ripple.remove());

  cursorPop = cursor.animate([
    { opacity: 0 },
    { opacity: 0, offset: 0.82 },
    { opacity: 1 },
  ], { duration: 520, easing: 'ease-out' });
});

function hideCursor() {
  cursorPop?.cancel();
  cursorRipple?.remove();
  cursor.hidden = true;
  document.documentElement.classList.remove('custom-cursor');
}

document.addEventListener('pointermove', (event) => {
  if (!cursorMedia.matches || event.pointerType !== 'mouse') {
    hideCursor();
    return;
  }
  cursor.style.transform = `translate3d(${event.clientX - 12}px, ${event.clientY - 12}px, 0)`;
  cursor.hidden = false;
  document.documentElement.classList.add('custom-cursor');
});

document.documentElement.addEventListener('pointerleave', hideCursor);
document.addEventListener('pointercancel', hideCursor);
window.addEventListener('blur', hideCursor);
cursorMedia.addEventListener('change', hideCursor);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hideCursor();
});

const wordMap = document.querySelector('.word-map');
const lensMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const lensLetters = [];

if (wordMap) {
  wordMap.querySelectorAll('.word-label').forEach((label) => {
    const text = label.textContent;
    label.parentElement.setAttribute('aria-label', text);
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '';
    for (const letter of text) {
      const anchor = document.createElement('span');
      anchor.className = 'lens-char';
      const ink = document.createElement('span');
      ink.className = 'lens-ink';
      ink.textContent = letter;
      anchor.append(ink);
      label.append(anchor);
      lensLetters.push({ anchor, ink });
    }
  });

  let lensFrame;
  function resetLens() {
    cancelAnimationFrame(lensFrame);
    lensLetters.forEach(({ ink }) => ink.style.removeProperty('--zoom'));
  }

  wordMap.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || lensMotion.matches) return;
    cancelAnimationFrame(lensFrame);
    lensFrame = requestAnimationFrame(() => {
      const radius = 90;
      // Measure stationary anchors; only their inner lettering scales.
      const scales = lensLetters.map(({ anchor }) => {
        const rect = anchor.getBoundingClientRect();
        const distance = Math.hypot(event.clientX - rect.left - rect.width / 2,
          event.clientY - rect.top - rect.height / 2);
        const proximity = Math.max(0, 1 - distance / radius);
        const falloff = proximity * proximity * (3 - 2 * proximity);
        return 1 + 0.65 * falloff;
      });
      lensLetters.forEach(({ ink }, index) => ink.style.setProperty('--zoom', scales[index]));
    });
  });
  wordMap.addEventListener('pointerleave', resetLens);
  wordMap.addEventListener('pointercancel', resetLens);
  window.addEventListener('blur', resetLens);
  lensMotion.addEventListener('change', resetLens);
}
