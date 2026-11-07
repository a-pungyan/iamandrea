document.getElementById('year').textContent = new Date().getFullYear();

const header = document.querySelector('.site-header');
const backToTop = document.createElement('button');
backToTop.className = 'back-to-top';
backToTop.type = 'button';
backToTop.textContent = 'Back to top';
backToTop.hidden = true;
document.body.append(backToTop);

function updateBackToTop() {
  backToTop.hidden = window.scrollY < 300;
}
backToTop.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
  const homeLink = header.querySelector('.name');
  homeLink.focus({ preventScroll: true });
});
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.getElementById('main-navigation');
// Keep the first mobile screen reserved for the intro, even when the header wraps.
function measureIntroHeader() {
  if (!header.classList.contains('menu-enabled')) {
    document.documentElement.style.setProperty('--mobile-header-height', `${header.getBoundingClientRect().height}px`);
  }
}
measureIntroHeader();
window.addEventListener('resize', measureIntroHeader);
document.fonts?.ready.then(measureIntroHeader);
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

const headerMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let headerFlights = [];
let headerAnimations = [];
function clearHeaderMotion() {
  headerAnimations.forEach(animation => animation.cancel());
  headerFlights.forEach(letter => letter.remove());
  headerAnimations = [];
  headerFlights = [];
}
function getNavigationLetters() {
  const letters = [];
  navigation.querySelectorAll('a').forEach(link => {
    const node = link.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const style = getComputedStyle(link);
    for (let index = 0; index < node.length; index++) {
      if (!node.textContent[index].trim()) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      letters.push({ text: node.textContent[index], rect, font: style.font, color: style.color });
    }
  });
  return letters;
}
function animateNavigationLetters(letters, buttonRect, gathering) {
  letters.forEach((letter, index) => {
    const ghost = document.createElement('span');
    ghost.className = 'navigation-letter';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = letter.text;
    Object.assign(ghost.style, { left: `${letter.rect.left}px`, top: `${letter.rect.top}px`, font: letter.font, color: letter.color });
    document.body.append(ghost);
    headerFlights.push(ghost);
    const dx = buttonRect.left + buttonRect.width / 2 - letter.rect.left - letter.rect.width / 2;
    const dy = buttonRect.top + buttonRect.height / 2 - letter.rect.top - letter.rect.height / 2;
    const spread = { transform: 'translate(0, 0) scale(1)', opacity: 1 };
    const collected = { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 };
    const animation = ghost.animate(gathering ? [spread, collected] : [collected, spread], {
      duration: 430,
      delay: index * 6,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    });
    headerAnimations.push(animation);
    animation.finished.then(() => ghost.remove()).catch(() => ghost.remove());
  });
}
function updateHeader(initial = false) {
  const nextAtTop = initial ? window.scrollY <= 40 : (atTop ? window.scrollY < 72 : window.scrollY <= 16);
  if (!initial && nextAtTop === atTop) return;
  clearHeaderMotion();
  const gathering = !nextAtTop;
  const animate = !initial && !headerMotion.matches;
  const lettersBefore = animate && gathering ? getNavigationLetters() : [];
  const oldButtonRect = !gathering ? menuToggle.getBoundingClientRect() : null;
  const focusedLink = navigation.contains(document.activeElement);
  const focusedToggle = document.activeElement === menuToggle;
  atTop = nextAtTop;
  header.classList.toggle('menu-enabled', !atTop);
  menuToggle.hidden = atTop;
  setMenuOpen(atTop || focusedLink);
  if (focusedToggle && atTop) navigation.querySelector('a').focus({ preventScroll: true });
  if (!animate) return;
  const letters = gathering ? lettersBefore : getNavigationLetters();
  const buttonRect = gathering ? menuToggle.getBoundingClientRect() : oldButtonRect;
  animateNavigationLetters(letters, buttonRect, gathering);
  const fadeTarget = gathering ? menuToggle : navigation;
  headerAnimations.push(fadeTarget.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 180, delay: 430 + letters.length * 6, fill: 'backwards',
  }));
}
setMenuOpen(atTop);
updateHeader(true);
window.addEventListener('scroll', () => updateHeader(), { passive: true });
headerMotion.addEventListener('change', clearHeaderMotion);
window.addEventListener('resize', clearHeaderMotion);

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

const intro = document.querySelector('.intro');
const composition = document.querySelector('.intro-composition');
if (intro && composition) {
  let driftFrame = null;
  let previousTime;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  function animateDrift(time) {
    const dt = previousTime === undefined ? 16 : Math.min(time - previousTime, 50);
    previousTime = time;
    const easing = 1 - Math.exp(-dt / 300);
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;
    const settled = Math.hypot(targetX - currentX, targetY - currentY) < 0.015;
    if (settled) { currentX = targetX; currentY = targetY; }
    composition.style.setProperty('--drift-x', `${currentX}px`);
    composition.style.setProperty('--drift-y', `${currentY}px`);
    driftFrame = settled ? null : requestAnimationFrame(animateDrift);
    if (settled) previousTime = undefined;
  }
  function startDrift() {
    if (driftFrame === null) driftFrame = requestAnimationFrame(animateDrift);
  }
  function resetDrift() {
    targetX = 0;
    targetY = 0;
    if (lensMotion.matches || !cursorMedia.matches) {
      cancelAnimationFrame(driftFrame);
      driftFrame = null;
      previousTime = undefined;
      currentX = currentY = 0;
      composition.style.removeProperty('--drift-x');
      composition.style.removeProperty('--drift-y');
    } else startDrift();
  }
  intro.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || lensMotion.matches || !cursorMedia.matches) return;
    const bounds = intro.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + composition.offsetLeft + composition.offsetWidth / 2);
    const dy = event.clientY - (bounds.top + composition.offsetTop + composition.offsetHeight / 2);
    // A broad, continuous falloff avoids sudden direction changes near the center.
    const falloff = Math.exp(-(dx * dx + dy * dy) / (2 * 220 * 220));
    const nextX = -dx / 220 * 6 * falloff;
    const nextY = -dy / 220 * 6 * falloff;
    // Ignore tiny target changes caused by pointer jitter.
    if (Math.hypot(nextX - targetX, nextY - targetY) < 0.15) return;
    targetX = nextX;
    targetY = nextY;
    startDrift();
  });
  intro.addEventListener('pointerleave', resetDrift);
  intro.addEventListener('pointercancel', resetDrift);
  intro.addEventListener('focusin', resetDrift);
  window.addEventListener('blur', resetDrift);
  window.addEventListener('scroll', resetDrift, { passive: true });
  lensMotion.addEventListener('change', resetDrift);
  cursorMedia.addEventListener('change', resetDrift);
}

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

  function updateLens(clientX, clientY) {
    if (lensMotion.matches) return;
    cancelAnimationFrame(lensFrame);
    lensFrame = requestAnimationFrame(() => {
      const radius = 90;
      // Measure stationary anchors; only their inner lettering scales.
      const scales = lensLetters.map(({ anchor }) => {
        const rect = anchor.getBoundingClientRect();
        const distance = Math.hypot(clientX - rect.left - rect.width / 2,
          clientY - rect.top - rect.height / 2);
        const proximity = Math.max(0, 1 - distance / radius);
        const falloff = proximity * proximity * (3 - 2 * proximity);
        return 1 + 0.65 * falloff;
      });
      lensLetters.forEach(({ ink }, index) => ink.style.setProperty('--zoom', scales[index]));
    });
  }
  wordMap.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') updateLens(event.clientX, event.clientY);
  });
  // Passive touch listeners keep the lens active during swipes without blocking scrolling.
  function updateTouchLens(event) {
    if (event.touches.length !== 1) {
      resetLens();
      return;
    }
    const touch = event.touches[0];
    updateLens(touch.clientX, touch.clientY);
  }
  wordMap.addEventListener('touchstart', updateTouchLens, { passive: true });
  wordMap.addEventListener('touchmove', updateTouchLens, { passive: true });
  wordMap.addEventListener('touchend', resetLens, { passive: true });
  wordMap.addEventListener('touchcancel', resetLens, { passive: true });
  wordMap.addEventListener('pointerleave', resetLens);
  wordMap.addEventListener('pointercancel', resetLens);
  window.addEventListener('blur', resetLens);
  lensMotion.addEventListener('change', resetLens);
}

const contactForm = document.querySelector('.contact-form');
contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = contactForm.querySelector('[type="submit"]');
  const status = document.getElementById('contact-help');
  if (button.disabled) return;
  if (!contactForm.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = 'Sending your message…';
  contactForm.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Submission failed');
    contactForm.reset();
    status.textContent = 'Thanks! Your message has been sent.';
  } catch {
    status.textContent = 'Your message could not be sent. Please try again or email andrearenaeten@icloud.com. Your message is still here.';
  } finally {
    button.disabled = false;
    button.textContent = 'Send message';
    contactForm.removeAttribute('aria-busy');
  }
});

const revealSections = document.querySelectorAll('.work-section, .about-section, .contact-section');
const revealMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !revealMotion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
  revealSections.forEach(section => {
    section.classList.add('scroll-reveal', 'reveal-ready');
    revealObserver.observe(section);
    section.addEventListener('focusin', () => {
      section.classList.add('is-visible');
      revealObserver.unobserve(section);
    });
  });
  revealMotion.addEventListener('change', () => {
    if (!revealMotion.matches) return;
    revealSections.forEach(section => section.classList.add('is-visible'));
    revealObserver.disconnect();
  });
}
