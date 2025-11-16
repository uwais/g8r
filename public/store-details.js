const user = checkAuth('customer');

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

async function loadStoreDetails() {
  const response = await authFetch(`/api/stores/${storeId}`);
  const store = await response.json();
  
  const userResponse = await authFetch('/api/auth/me');
  const userData = await userResponse.json();
  const isPreferred = userData.preferredStores?.includes(parseInt(storeId));
  
  const detailsDiv = document.getElementById('storeDetails');
  
  detailsDiv.innerHTML = `
    <div class="store-detail-card">
      <h1>${store.name}</h1>
      <div class="store-rating">
        <span class="rating-stars">⭐ ${store.rating.toFixed(1)}</span>
        <span class="rating-count">(${store.totalReviews} reviews)</span>
      </div>
      
      <div class="store-info-section">
        <h3>Contact Information</h3>
        <p>📍 ${store.address}</p>
        <p>📞 ${store.phone}</p>
        <p>📧 ${store.email}</p>
      </div>
      
      <div class="store-info-section">
        <h3>Business Hours</h3>
        <p>🕒 ${store.hours}</p>
      </div>
      
      <div class="store-info-section">
        <h3>Store Type</h3>
        <p>${store.type === 'pharmacy' ? '💊 Pharmacy' : '🏪 General Store'}</p>
      </div>
      
      <div class="store-actions">
        <button id="preferBtn" onclick="togglePreferred()" class="${isPreferred ? 'preferred' : ''}">
          ${isPreferred ? '❤️ Preferred Store' : '🤍 Mark as Preferred'}
        </button>
      </div>
    </div>
  `;
  
  loadStoreReviews(store.reviews);
}

function loadStoreReviews(reviews) {
  const reviewsDiv = document.getElementById('storeReviews');
  
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

function showStoreReviewModal() {
  document.getElementById('storeReviewModal').style.display = 'flex';
}

function hideStoreReviewModal() {
  document.getElementById('storeReviewModal').style.display = 'none';
}

async function submitStoreReview() {
  const rating = parseInt(document.getElementById('storeReviewRating').value);
  const comment = document.getElementById('storeReviewComment').value;
  
  const response = await authFetch(`/api/stores/${storeId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment })
  });
  
  if (response.ok) {
    alert('Review submitted successfully!');
    hideStoreReviewModal();
    loadStoreDetails();
  } else {
    alert('Failed to submit review');
  }
}

async function togglePreferred() {
  const userResponse = await authFetch('/api/auth/me');
  const userData = await userResponse.json();
  const isPreferred = userData.preferredStores?.includes(parseInt(storeId));
  
  const method = isPreferred ? 'DELETE' : 'POST';
  const response = await authFetch(`/api/stores/${storeId}/prefer`, { method });
  
  if (response.ok) {
    loadStoreDetails();
  }
}

loadStoreDetails();
