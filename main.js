// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu after tapping a link (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Contact form — no backend for this yet, so just confirm receipt in-page
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const button = contactForm.querySelector('button');
    const originalText = button.textContent;
    button.textContent = 'Message sent';
    button.disabled = true;
    contactForm.reset();
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2500);
  });
}

// Animate the sample score counting up from 0 on load
const scoreEl = document.querySelector('.score-glow');
if (scoreEl && scoreEl.firstChild) {
  const target = parseInt(scoreEl.textContent, 10) || 0;
  let current = 0;
  const step = Math.max(1, Math.round(target / 40));
  const interval = setInterval(() => {
    current = Math.min(target, current + step);
    scoreEl.firstChild.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 20);
}
