// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Highlight the nav link for the section currently in view
const navLinks = Array.from(document.querySelectorAll('nav ul a'));
const sections = navLinks.map(link => document.querySelector(link.hash));

function updateActiveLink() {
  const marker = window.scrollY + window.innerHeight * 0.35;
  let current = -1;

  sections.forEach((section, i) => {
    if (section.offsetTop <= marker) {
      current = i;
    }
  });

  navLinks.forEach((link, i) => {
    link.classList.toggle('active', i === current);
  });
}

window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();

// Fade elements in the first time they scroll into view
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Move the glow on project cards with the mouse
document.querySelectorAll('.project').forEach(card => {
  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', (e.clientX - rect.left) + 'px');
    card.style.setProperty('--y', (e.clientY - rect.top) + 'px');
  });
});
