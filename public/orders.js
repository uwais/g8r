const user = checkAuth('seller');

async function loadOrders() {
  const response = await authFetch('/api/orders');
  const orders = await response.json();
  
  const pendingOrders = orders.filter(o => o.status === 'pending_prescription_verification');
  const otherOrders = orders.filter(o => o.status !== 'pending_prescription_verification');
  
  displayPendingOrders(pendingOrders);
  displayAllOrders(otherOrders);
}

function displayPendingOrders(orders) {
  const div = document.getElementById('pendingOrders');
  
  if (orders.length === 0) {
    div.innerHTML = '<p>No orders pending verification</p>';
    return;
  }
  
  div.innerHTML = orders.map(order => `
    <div class="order-card pending">
      <div class="order-header">
        <h3>Order #${order.id}</h3>
        <span class="status-badge ${order.status}">${order.status}</span>
      </div>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      <p><strong>Delivery:</strong> ${order.deliveryOption}</p>
      ${order.deliveryOption === 'delivery' ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
      <div class="order-items">
        <strong>Items:</strong>
        ${order.items.map(item => `
          <div class="order-item">
            ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
          </div>
        `).join('')}
      </div>
      <button onclick="viewPrescription(${order.id}, ${order.prescriptionId})" class="verify-btn">
        View & Verify Prescription
      </button>
    </div>
  `).join('');
}

function displayAllOrders(orders) {
  const div = document.getElementById('allOrders');
  
  if (orders.length === 0) {
    div.innerHTML = '<p>No orders</p>';
    return;
  }
  
  div.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <h3>Order #${order.id}</h3>
        <span class="status-badge ${order.status}">${order.status}</span>
      </div>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      <p><strong>Delivery:</strong> ${order.deliveryOption}</p>
      ${order.deliveryOption === 'delivery' ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
      <div class="order-items">
        <strong>Items:</strong>
        ${order.items.map(item => `
          <div class="order-item">
            ${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
          </div>
        `).join('')}
      </div>
      ${order.verificationNotes ? `<p class="verification-notes"><strong>Notes:</strong> ${order.verificationNotes}</p>` : ''}
    </div>
  `).join('');
}

async function viewPrescription(orderId, prescriptionId) {
  document.getElementById('currentOrderId').value = orderId;
  
  const viewer = document.getElementById('prescriptionViewer');
  const fileUrl = `/api/prescriptions/${prescriptionId}/file`;
  
  // Try to display the prescription
  const response = await authFetch(fileUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  if (blob.type.includes('pdf')) {
    viewer.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="500px">`;
  } else if (blob.type.includes('image')) {
    viewer.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 500px;">`;
  } else {
    viewer.innerHTML = `<p>Unable to preview. <a href="${url}" download>Download file</a></p>`;
  }
  
  document.getElementById('prescriptionModal').style.display = 'flex';
}

function hidePrescriptionModal() {
  document.getElementById('prescriptionModal').style.display = 'none';
}

async function verifyPrescription(approved) {
  const orderId = document.getElementById('currentOrderId').value;
  const notes = document.getElementById('verificationNotes').value;
  
  const response = await authFetch(`/api/orders/${orderId}/verify-prescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, notes })
  });
  
  if (response.ok) {
    alert(approved ? 'Order approved!' : 'Order rejected');
    hidePrescriptionModal();
    loadOrders();
  } else {
    alert('Failed to verify prescription');
  }
}

loadOrders();
