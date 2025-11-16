checkAuth('customer');

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function loadProductDetails() {
  const response = await authFetch(`/api/products/${productId}`);
  const product = await response.json();
  
  const detailsDiv = document.getElementById('productDetails');
  const isPrescription = product.prescriptionRequired ? '<span class="prescription-badge">⚕️ Prescription Required</span>' : '';
  
  detailsDiv.innerHTML = `
    <div class="product-detail-card">
      <div class="product-detail-image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-detail-info">
        <h1>${product.name}</h1>
        ${isPrescription}
        <p class="price">$${product.price.toFixed(2)}</p>
        
        ${product.category === 'pharmacy' ? `
          <div class="pharmacy-details">
            <h3>Medication Details</h3>
            <p><strong>Drug Name:</strong> ${product.drugName}</p>
            <p><strong>Brand:</strong> ${product.brandName}</p>
            <p><strong>Generic:</strong> ${product.genericEquivalent}</p>
            <p><strong>Form:</strong> ${product.dosageForm}</p>
            <p><strong>Strength:</strong> ${product.strength}</p>
            <p><strong>Doses per Pack:</strong> ${product.dosesPerPack}</p>
            <p><strong>Active Ingredients:</strong> ${product.activeIngredients}</p>
            <p class="warnings"><strong>⚠️ Warnings:</strong> ${product.warnings}</p>
          </div>
        ` : ''}
        
        <div class="product-description">
          <h3>Description</h3>
          <p>${product.description}</p>
        </div>
        
        <div class="store-info-box">
          <h3>Sold By</h3>
          <p><strong>${product.store.name}</strong></p>
          <p>📍 ${product.store.address}</p>
          <p>📞 ${product.store.phone}</p>
          <p>📧 ${product.store.email}</p>
          <p>🕒 ${product.store.hours}</p>
          <p>⭐ ${product.store.rating.toFixed(1)} (${product.store.totalReviews} reviews)</p>
          <p>${product.store.distance.toFixed(1)} miles away</p>
          <a href="store-details.html?id=${product.storeId}">View Store Details</a>
        </div>
        
        <div class="delivery-info">
          <h3>Delivery Options</h3>
          ${product.deliveryOptions.includes('delivery') ? '<p>🚚 Home Delivery Available</p>' : ''}
          ${product.deliveryOptions.includes('pickup') ? '<p>🏪 Store Pickup Available</p>' : ''}
        </div>
        
        <div class="stock-info">
          <p><strong>In Stock:</strong> ${product.stock} units</p>
        </div>
        
        <div class="product-actions">
          <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
          <button onclick="addToCartFromDetails()">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
  
  loadProductReviews(product.reviews);
}

function loadProductReviews(reviews) {
  const reviewsDiv = document.getElementById('productReviews');
  
  if (reviews.length === 0) {
    reviewsDiv.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
    return;
  }
  
  reviewsDiv.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
      <p class="review-comment">${review.comment}</p>
      <p class="review-date">${new Date(review.date).toLocaleDateString()}</p>
    </div>
  `).join('');
}

function showProductReviewModal() {
  document.getElementById('productReviewModal').style.display = 'flex';
}

function hideProductReviewModal() {
  document.getElementById('productReviewModal').style.display = 'none';
}

async function submitProductReview() {
  const rating = parseInt(document.getElementById('productReviewRating').value);
  const comment = document.getElementById('productReviewComment').value;
  
  const response = await authFetch(`/api/products/${productId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment })
  });
  
  if (response.ok) {
    alert('Review submitted successfully!');
    hideProductReviewModal();
    loadProductDetails();
  } else {
    alert('Failed to submit review');
  }
}

function addToCartFromDetails() {
  const quantity = parseInt(document.getElementById('quantity').value);
  // Store in localStorage and redirect to main page
  const cartItem = { productId, quantity };
  localStorage.setItem('pendingCartItem', JSON.stringify(cartItem));
  window.location.href = 'index.html';
}

loadProductDetails();
