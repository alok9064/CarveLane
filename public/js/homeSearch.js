const input = document.getElementById('searchInput');
const resultsDiv = document.getElementById('searchResults');
const clearBtn = document.getElementById('clearSearch');

input.addEventListener('input', async function () {
  const query = input.value.trim();

  clearBtn.style.display = "block" // Toggle ✖ icon

  if (query === '') {
    resultsDiv.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const results = await res.json();

    if (results.length === 0) {
      resultsDiv.style.height = '100vh' ;
      resultsDiv.innerHTML = `<p>No products found.</p>`;
      return;
    }
    // resultsDiv.style.backgroundColor=query ? 'white' : '';
    // resultsDiv.style.opacity=query ? '0.8' : '';
    resultsDiv.style.height = query ? '100vh' : '';

    
    resultsDiv.innerHTML = results
      .map(
        (item) => `
        <div class="search-result-item">
          <img src="${item.image_url}" alt="${item.name}" />
          <a href="/products/${item.id}">${item.name}</a>
        </div>`
      )
      .join('');
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = `<p>Error fetching results</p>`;
  }
});

clearBtn.addEventListener('click', function () {
  input.value = '';
  input.blur(); // Remove cursor/focus
  resultsDiv.innerHTML = '';
  resultsDiv.style.height = '0'
  clearBtn.style.display = 'none';
});
