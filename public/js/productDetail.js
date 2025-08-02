document.addEventListener("DOMContentLoaded", () => {
    const swiper = new Swiper(".relatedSwiper", {
    loop: true,
    spaceBetween: 15,
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
    breakpoints: {
        0: {
        slidesPerView: 2,
        },
        600: {
        slidesPerView: 2,
        },
        900: {
        slidesPerView: 3,
        },
        1100: {
            slidesPerView:4
        }
    },
    });


    const reviewSwiper = new Swiper(".mySwiper", {
        loop: true,
        spaceBetween: 20,
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
        breakpoints: {
            0: {
            slidesPerView: 2,
            },
            600: {
            slidesPerView: 2,
            },
            900: {
            slidesPerView: 3,
            },
            1100: {
                slidesPerView:4
            }
        },
      });
});