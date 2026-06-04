
function handleNav(e, type) {
  e.preventDefault();

  // Upd
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  e.currentTarget.classList.add('active');

  if (type === 'features')  scrollToFeatures();
  if (type === 'how')       openHowItWorks();
  if (type === 'findhelp')  scrollToFooter();
}

// FEATURES — 
function scrollToFeatures() {
  const section = document.getElementById('features-section');
  if (!section) return;

  section.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    const cards = section.querySelectorAll('.feature-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.classList.remove('highlight-pulse');
        void card.offsetWidth;
        card.classList.add('highlight-pulse');
        card.addEventListener('animationend', () => {
          card.classList.remove('highlight-pulse');
        }, { once: true });
      }, i * 150);
    });
  }, 650);
}

// HOW IT WORKS — open 
function openHowItWorks() {
  const page = document.getElementById('how-it-works-page');
  page.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => page.classList.add('visible'));
  });
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}

// Close
function closeHowItWorks() {
  const page = document.getElementById('how-it-works-page');
  page.classList.remove('visible');
  page.addEventListener('transitionend', () => {
    page.classList.add('hidden');
    document.body.style.overflow = '';
  }, { once: true });
}

// FIND HELP 
function scrollToFooter() {
  const footer = document.getElementById('footer-section');
  if (footer) footer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    const icons = document.querySelectorAll('.social-icon');
    icons.forEach((icon, i) => {
      setTimeout(() => {
        icon.classList.remove('highlight-pulse');
        void icon.offsetWidth;
        icon.classList.add('highlight-pulse');
        icon.addEventListener('animationend', () => {
          icon.classList.remove('highlight-pulse');
        }, { once: true });
      }, i * 150);
    });
  }, 650);
}

// Sign In form submission handler
document.getElementById('signinForm') && document.getElementById('signinForm').addEventListener('submit', function (e) {
  e.preventDefault();
  window.location.href = 'signim.html';
});