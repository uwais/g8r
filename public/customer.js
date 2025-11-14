// Check authentication
const user = checkAuth('customer');
if (user) {
  document.getElementById('userInfo').textContent = `Welcome, ${user.name}!`;
}

let cart = [];

async function loadCatalog() {
  const response = await authFetch('/api/catalog');
  const items = await response.json();
  
  const catalogDiv = document.getElementById('catalog');
  catalogDiv.innerHTML = items.map(item => renderItemCard(item)).join('');
  
  loadRecommendations();
}

async function loadRecommendations() {
  const response = await authFetch('/api/recommendations');
  const items = await response.json();
  
  if (items.length > 0) {
    document.getElementById('recommendations').style.display = 'block';
    document.getElementById('recommendedItems').innerHTML = items.map(item => renderItemCard(item)).join('');
  }
}

function renderItemCard(item) {
  const isPrescription = item.prescriptionRequired ? '<span class="prescription-badge">⚕️ Rx Required</span>' : '';
  const pharmacyInfo = item.category === 'pharmacy' ? `
    <p><strong>Drug:</strong> ${item.drugName}</p>
    <p><strong>Brand:</strong> ${item.brandName}</p>
    <p><strong>Generic:</strong> ${item.genericEquivalent}</p>
  ` : '';
  
  const distance = item.store?.distance ? `${item.store.distance.toFixed(1)} mi away` : '';
  const rating = item.store?.rating ? `⭐ ${item.store.rating.toFixed(1)} (${item.store.totalReviews})` : '';
  
  return `
    <div class="item-card ${item.category}">
      <img src="${item.image}" alt="${item.name}" class="item-image">
      <span class="category-badge">${item.category}</span>
      ${isPrescription}
      <h3>${item.name}</h3>
      ${pharmacyInfo}
      <p>${item.description}</p>
      <div class="store-info">
        <p><strong>${item.store?.name || 'Unknown'}</strong></p>
        <p>${item.store?.location || ''} ${distance}</p>
        <p>${rating} <a href="#" onclick="showReviewModal(${item.storeId}); return false;">Write Review</a></p>
      </div>
      <p class="price">$${item.price.toFixed(2)}</p>
      <p>In stock: ${item.stock}</p>
      <div class="delivery-options">
        ${item.deliveryOptions?.includes('delivery') ? '<span class="badge">🚚 Delivery</span>' : ''}
        ${item.deliveryOptions?.includes('pickup') ? '<span class="badge">🏪 Pickup</span>' : ''}
      </div>
      <div class="item-actions">
        <input type="number" id="qty-${item.id}" value="1" min="1" max="${item.stock}" class="qty-input">
        <button onclick='addToCart(${JSON.stringify(item)})'>Add to Cart</button>
      </div>
    </div>
  `;
}

async function searchProducts() {
  const query = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  const minPrice = document.getElementById('minPrice').value;
  const maxPrice = document.getElementById('maxPrice').value;
  const prescriptionRequired = document.getElementById('prescriptionFilter').checked;
  const sortBy = document.getElementById('sortBy').value;
  
  const params = new URLSearchParams({
    q: query,
    category,
    minPrice: minPrice || 0,
    maxPrice: maxPrice || 999999,
    prescriptionRequired,
    sortBy
  });
  
  const response = await authFetch(`/api/search?${params}`);
  const grouped = await response.json();
  
  const resultsDiv = document.getElementById('searchResults');
  
  if (Object.keys(grouped).length === 0) {
    resultsDiv.innerHTML = '<p>No results found</p>';
    return;
  }
  
  resultsDiv.innerHTML = '<h2>Search Results</h2>' + Object.entries(grouped).map(([productName, items]) => {
    return `
      <div class="product-group">
        <h3>${productName} - ${items.length} seller(s)</h3>
        <div class="catalog-grid">
          ${items.map(item => renderItemCard(item)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function showAllProducts() {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('prescriptionFilter').checked = false;
}

function addToCart(item) {
  const qtyInput = document.getElementById(`qty-${item.id}`);
  const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
  
  const existingItem = cart.find(c => c.id === item.id);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ ...item, quantity });
  }
  
  updateCart();
}

function updateCart() {
  const cartDiv = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  if (cart.length === 0) {
    cartDiv.innerHTML = '<p>No items in cart</p>';
    checkoutBtn.style.display = 'none';
    return;
  }
  
  checkoutBtn.style.display = 'block';
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  cartDiv.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <strong>${item.name}</strong>
        <p>${item.store?.name || 'Unknown Store'}</p>
        <p>$${item.price.toFixed(2)} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}</p>
      </div>
      <button onclick="removeFromCart(${index})">Remove</button>
    </div>
  `).join('') + `<div class="cart-total"><strong>Total: $${total.toFixed(2)}</strong></div>`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

function showCheckout() {
  const modal = document.getElementById('checkoutModal');
  const itemsDiv = document.getElementById('checkoutItems');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  itemsDiv.innerHTML = cart.map(item => `
    <div class="checkout-item">
      ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
    </div>
  `).join('');
  
  document.getElementById('orderTotal').innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
  modal.style.display = 'flex';
  
  // Set default delivery address
  authFetch('/api/auth/me')
    .then(r => r.json())
    .then(user => {
      document.getElementById('deliveryAddress').value = user.address || '';
    });
}

function hideCheckout() {
  document.getElementById('checkoutModal').style.display = 'none';
}

async function completeCheckout() {
  const deliveryOption = document.getElementById('deliveryOption').value;
  const deliveryAddress = document.getElementById('deliveryAddress').value;
  
  if (deliveryOption === 'delivery' && !deliveryAddress) {
    alert('Please enter a delivery address');
    return;
  }
  
  const response = await authFetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        storeId: item.storeId
      })),
      deliveryOption,
      deliveryAddress
    })
  });
  
  const order = await response.json();
  
  if (order.id) {
    alert(`Order placed successfully! Order ID: ${order.id}`);
    cart = [];
    updateCart();
    hideCheckout();
    loadCatalog(); // Refresh to show updated stock
  } else {
    alert(order.error || 'Checkout failed');
  }
}

function showReviewModal(storeId) {
  document.getElementById('reviewStoreId').value = storeId;
  document.getElementById('reviewModal').style.display = 'flex';
}

function hideReviewModal() {
  document.getElementById('reviewModal').style.display = 'none';
}

async function submitReview() {
  const storeId = document.getElementById('reviewStoreId').value;
  const rating = parseInt(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value;
  
  const response = await authFetch(`/api/stores/${storeId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment })
  });
  
  const review = await response.json();
  
  if (review.id) {
    alert('Review submitted successfully!');
    hideReviewModal();
    loadCatalog(); // Refresh to show updated ratings
  } else {
    alert('Failed to submit review');
  }
}

// Handle delivery option change
document.getElementById('deliveryOption')?.addEventListener('change', (e) => {
  const addressSection = document.getElementById('deliveryAddressSection');
  addressSection.style.display = e.target.value === 'delivery' ? 'block' : 'none';
});

loadCatalog();
