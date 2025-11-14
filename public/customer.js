let cart = [];

async function loadCatalog() {
  const response = await fetch('/api/catalog');
  const items = await response.json();
  
  const catalogDiv = document.getElementById('catalog');
  catalogDiv.innerHTML = items.map(item => renderItemCard(item)).join('');
}

function renderItemCard(item) {
  const isPrescription = item.prescriptionRequired ? '<span style="color: red;">⚕️ Prescription Required</span>' : '';
  const pharmacyInfo = item.category === 'pharmacy' ? `
    <p><strong>Drug:</strong> ${item.drugName}</p>
    <p><strong>Brand:</strong> ${item.brandName}</p>
    <p><strong>Generic:</strong> ${item.genericEquivalent}</p>
    ${isPrescription}
  ` : '';
  
  return `
    <div class="item-card ${item.category}">
      <span class="category-badge">${item.category}</span>
      <h3>${item.name}</h3>
      ${pharmacyInfo}
      <p>${item.description}</p>
      <p><strong>Store:</strong> ${item.store?.name || 'Unknown'}</p>
      <p><strong>Location:</strong> ${item.store?.location || 'Unknown'}</p>
      <p class="price">$${item.price.toFixed(2)}</p>
      <p>In stock: ${item.stock}</p>
      <button onclick='addToCart(${JSON.stringify(item)})'>Add to Cart</button>
    </div>
  `;
}

async function searchProducts() {
  const query = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&category=${category}`);
  const grouped = await response.json();
  
  const resultsDiv = document.getElementById('searchResults');
  
  if (Object.keys(grouped).length === 0) {
    resultsDiv.innerHTML = '<p>No results found</p>';
    return;
  }
  
  resultsDiv.innerHTML = '<h2>Search Results</h2>' + Object.entries(grouped).map(([productName, items]) => {
    const sortedByPrice = [...items].sort((a, b) => a.price - b.price);
    const sortedByLocation = [...items].sort((a, b) => a.store.location.localeCompare(b.store.location));
    
    return `
      <div class="product-group">
        <h3>${productName}</h3>
        <div class="sort-options">
          <button onclick="showSorted('${productName}', 'price')">Sort by Price</button>
          <button onclick="showSorted('${productName}', 'location')">Sort by Location</button>
        </div>
        <div id="group-${productName.replace(/\s/g, '-')}" class="catalog-grid">
          ${sortedByPrice.map(item => renderItemCard(item)).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Store grouped data for sorting
  window.searchData = grouped;
}

function showSorted(productName, sortBy) {
  const items = window.searchData[productName];
  const sorted = sortBy === 'price' 
    ? [...items].sort((a, b) => a.price - b.price)
    : [...items].sort((a, b) => a.store.location.localeCompare(b.store.location));
  
  const groupDiv = document.getElementById(`group-${productName.replace(/\s/g, '-')}`);
  groupDiv.innerHTML = sorted.map(item => renderItemCard(item)).join('');
}

function showAllProducts() {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
}

function addToCart(item) {
  cart.push(item);
  updateCart();
}

function updateCart() {
  const cartDiv = document.getElementById('cart-items');
  if (cart.length === 0) {
    cartDiv.innerHTML = '<p>No items selected</p>';
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartDiv.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      ${item.name} - ${item.store?.name || 'Unknown Store'} - $${item.price.toFixed(2)}
      <button onclick="removeFromCart(${index})">Remove</button>
    </div>
  `).join('') + `<p><strong>Total: $${total.toFixed(2)}</strong></p>`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

loadCatalog();
