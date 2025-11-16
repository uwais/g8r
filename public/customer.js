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
    <p><strong>Form:</strong> ${item.dosageForm || 'N/A'}</p>
  ` : '';
  
  const distance = item.store?.distance ? `${item.store.distance.toFixed(1)} mi away` : '';
  const rating = item.store?.rating ? `⭐ ${item.store.rating.toFixed(1)} (${item.store.totalReviews})` : '';
  
  return `
    <div class="item-card ${item.category}">
      <a href="product-details.html?id=${item.id}">
        <img src="${item.image}" alt="${item.name}" class="item-image">
      </a>
      <span class="category-badge">${item.category}</span>
      ${isPrescription}
      <h3><a href="product-details.html?id=${item.id}">${item.name}</a></h3>
      ${pharmacyInfo}
      <p>${item.description}</p>
      <div class="store-info">
        <p><strong><a href="store-details.html?id=${item.storeId}">${item.store?.name || 'Unknown'}</a></strong></p>
        <p>${item.store?.location || ''} ${distance}</p>
        <p>${rating}</p>
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

async function showCheckout() {
  const modal = document.getElementById('checkoutModal');
  const itemsDiv = document.getElementById('checkoutItems');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Check if prescription is required
  const requiresPrescription = cart.some(item => item.prescriptionRequired);
  
  itemsDiv.innerHTML = cart.map(item => `
    <div class="checkout-item">
      ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
      ${item.prescriptionRequired ? ' <span class="prescription-badge">⚕️ Rx Required</span>' : ''}
    </div>
  `).join('');
  
  document.getElementById('orderTotal').innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
  
  // Show/hide prescription section
  const prescriptionSection = document.getElementById('prescriptionSection');
  if (requiresPrescription) {
    prescriptionSection.style.display = 'block';
    await loadPrescriptions();
  } else {
    prescriptionSection.style.display = 'none';
  }
  
  modal.style.display = 'flex';
  
  // Set default delivery address
  const userResponse = await authFetch('/api/auth/me');
  const user = await userResponse.json();
  document.getElementById('deliveryAddress').value = user.address || '';
  
  // Load stores for pickup option
  loadPickupStores();
}

async function loadPrescriptions() {
  const response = await authFetch('/api/prescriptions');
  const prescriptions = await response.json();
  
  const select = document.getElementById('prescriptionSelect');
  select.innerHTML = '<option value="">Select a prescription</option>' +
    prescriptions.map(p => `
      <option value="${p.id}">${p.fileName} - Uploaded ${new Date(p.uploadDate).toLocaleDateString()}</option>
    `).join('') +
    '<option value="upload">Upload New Prescription</option>';
}

async function loadPickupStores() {
  const response = await authFetch('/api/stores');
  const stores = await response.json();
  
  // Get unique stores from cart items
  const storeIds = [...new Set(cart.map(item => item.storeId))];
  const relevantStores = stores.filter(s => storeIds.includes(s.id));
  
  const pickupInfo = document.getElementById('pickupStoreInfo');
  pickupInfo.innerHTML = relevantStores.map(store => `
    <div class="pickup-store">
      <p><strong>${store.name}</strong></p>
      <p>📍 ${store.address}</p>
      <p>🕒 ${store.hours}</p>
    </div>
  `).join('');
}

function hideCheckout() {
  document.getElementById('checkoutModal').style.display = 'none';
}

async function completeCheckout() {
  const deliveryOption = document.getElementById('deliveryOption').value;
  const deliveryAddress = document.getElementById('deliveryAddress').value;
  const prescriptionId = document.getElementById('prescriptionSelect')?.value;
  
  if (deliveryOption === 'delivery' && !deliveryAddress) {
    alert('Please enter a delivery address');
    return;
  }
  
  // Check if prescription is required
  const requiresPrescription = cart.some(item => item.prescriptionRequired);
  if (requiresPrescription && !prescriptionId) {
    alert('Please select or upload a prescription for prescription items');
    return;
  }
  
  if (prescriptionId === 'upload') {
    showPrescriptionUpload();
    return;
  }
  
  const pickupStoreId = deliveryOption === 'pickup' ? cart[0].storeId : null;
  
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
      deliveryAddress,
      prescriptionId: prescriptionId || null,
      pickupStoreId
    })
  });
  
  const order = await response.json();
  
  if (order.id) {
    const message = order.status === 'pending_prescription_verification' 
      ? `Order placed! Order ID: ${order.id}\n\nYour prescription is being verified by the pharmacy. You'll be notified once approved.`
      : `Order placed successfully! Order ID: ${order.id}`;
    alert(message);
    cart = [];
    updateCart();
    hideCheckout();
    loadCatalog();
  } else {
    alert(order.error || 'Checkout failed');
  }
}

function showPrescriptionUpload() {
  hideCheckout();
  document.getElementById('prescriptionUploadModal').style.display = 'flex';
}

function hidePrescriptionUpload() {
  document.getElementById('prescriptionUploadModal').style.display = 'none';
}

async function uploadPrescription() {
  const fileInput = document.getElementById('prescriptionFile');
  const doctorName = document.getElementById('doctorName').value;
  const issueDate = document.getElementById('issueDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  
  if (!fileInput.files[0]) {
    alert('Please select a prescription file');
    return;
  }
  
  const formData = new FormData();
  formData.append('prescription', fileInput.files[0]);
  formData.append('doctorName', doctorName);
  formData.append('issueDate', issueDate);
  formData.append('expiryDate', expiryDate);
  
  const token = localStorage.getItem('token');
  const response = await fetch('/api/prescriptions/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  if (result.id) {
    alert('Prescription uploaded successfully!');
    hidePrescriptionUpload();
    showCheckout();
  } else {
    alert(result.error || 'Upload failed');
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
  const pickupInfo = document.getElementById('pickupStoreInfo');
  
  if (e.target.value === 'delivery') {
    addressSection.style.display = 'block';
    pickupInfo.style.display = 'none';
  } else {
    addressSection.style.display = 'none';
    pickupInfo.style.display = 'block';
  }
});

// Check for pending cart item from product details page
const pendingItem = localStorage.getItem('pendingCartItem');
if (pendingItem) {
  const { productId, quantity } = JSON.parse(pendingItem);
  authFetch(`/api/products/${productId}`)
    .then(r => r.json())
    .then(product => {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      localStorage.removeItem('pendingCartItem');
    });
}

loadCatalog();
