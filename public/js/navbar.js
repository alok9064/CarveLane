function updateActiveLink() {
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const fullPath = currentPath + currentHash;

  const navLinks = document.querySelectorAll(".nav-links a");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");

    link.classList.remove("active");

    if (href === fullPath) {
      link.classList.add("active");
    } else if (href === "/" && currentPath === "/" && currentHash === "") {
      link.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", updateActiveLink);
window.addEventListener("hashchange", updateActiveLink);




// Toggle mobile menu
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    
    // Change icon
    const icon = menuToggle.querySelector('i');
    if (mobileMenu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        mobileMenu.classList.remove('active');
        const icon = menuToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});