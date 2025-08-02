
let currentSlide = 0;
const slides = document.querySelectorAll(".home-banner-image");

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.remove("active");
    if (i === index) {
      slide.classList.add("active");
    }
  });
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}

setInterval(nextSlide, 3000);


// loader for send contact message

const loader = document.getElementById('loader');
const sendMsgBtn = document.getElementById('send-cont-msg');
let resendInterval;

sendMsgBtn.addEventListener('click', async ()=> {
  loader.classList.remove("hidden");

  const response = await fetch ('/contact', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({name, email, message})
  });
  const result = await response.json();
  if(result.success === true) {
    loader.classList.add("hidden");

  }
});


