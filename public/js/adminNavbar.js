
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('adminNavbarLinks');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

