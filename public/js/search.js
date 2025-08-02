const input = document.getElementById('searchInput');
const resultsDiv = document.getElementById('searchResults');
const clearBtn = document.getElementById('clearSearch');

const productResults = document.getElementById("product-results");

input.addEventListener('input', async function () {
  const query = input.value.trim();

  clearBtn.style.display = query ? 'block' : 'none'; // Toggle ✖ icon

  if (query === '') {
    resultsDiv.innerHTML = '';
    return;
  }

  try {

    const res = await fetch(`/search-products?q=${encodeURIComponent(query)}`);
    const products = await res.json();
    if (products.length === 0) {
      productResults.innerHTML = `<p>No products found.</p>`;
      return;
    }
    productResults.innerHTML = "";
    products.forEach(product => {
      const card = createProductCard(product);
      productResults.appendChild(card);
    });
    
  } catch (err) {
    console.error(err);
    productResults.innerHTML = `<p>Error fetching results</p>`;
  }
});

clearBtn.addEventListener('click', function () {
  input.value = '';
  input.blur(); // Remove cursor/focus
  // resultsDiv.innerHTML = '';
  productResults.innerHTML = '';
  clearBtn.style.display = 'none';
});

function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <a href="/products/${product.id}" class="product-card-link">
          <div class="product-image-wrapper">
            <img src="${product.image_url}" alt="${product.name}" class="product-image">
          </div>
          <p class="customisable-tag">Customisable</p>
          <div class="product-info">
            <p class="product-name">${product.name}</p>
            <!-- ⭐ Rating Section -->
            <div class="product-rating">
              <span class="stars">★</span>
              <span class="rating-value">4.3</span>
              <span class="rating-count">(124)</span>
            </div>
            <p class="product-price">₹${product.price}</p>
            
          </div>
        </a>
    `;

    return card;
  }






