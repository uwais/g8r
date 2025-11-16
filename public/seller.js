// Check authentication
const user = checkAuth('seller');
if (user) {
  document.getElementById('userInfo').textContent = `Welcome, ${user.name}!`;
  // Set store selector to user's store
  if (user.storeId) {
    document.getElementById('storeSelect').value = user.storeId;
  }
}

async function loadItems() {
  const storeId = document.getElementById('storeSelect').value;
  const response = await authFetch(`/api/seller/items?storeId=${storeId}`);
  const items = await response.json();
  
  const tbody = document.getElementById('itemsBody');
  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.category || 'general'}</td>
      <td>${item.name}</td>
      <td>${item.drugName || '-'}</td>
      <td>${item.brandName || '-'}</td>
      <td>${item.prescriptionRequired ? '✓' : '-'}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>${item.stock}</td>
      <td>
        <button class="action-btn edit-btn" onclick="editItem(${item.id})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteItem(${item.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function showAddForm() {
  document.getElementById('addForm').style.display = 'flex';
  clearForm();
}

function hideAddForm() {
  document.getElementById('addForm').style.display = 'none';
}

function clearForm() {
  document.getElementById('itemId').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemDescription').value = '';
  document.getElementById('itemStock').value = '';
  document.getElementById('itemImage').value = '';
  document.getElementById('itemCategory').value = 'general';
  document.getElementById('drugName').value = '';
  document.getElementById('brandName').value = '';
  document.getElementById('genericEquivalent').value = '';
  document.getElementById('prescriptionRequired').checked = false;
  togglePharmacyFields();
}

function togglePharmacyFields() {
  const category = document.getElementById('itemCategory').value;
  const pharmacyFields = document.getElementById('pharmacyFields');
  pharmacyFields.style.display = category === 'pharmacy' ? 'block' : 'none';
}

async function editItem(id) {
  const storeId = document.getElementById('storeSelect').value;
  const response = await authFetch(`/api/seller/items?storeId=${storeId}`);
  const items = await response.json();
  const item = items.find(i => i.id === id);
  
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemDescription').value = item.description;
  document.getElementById('itemStock').value = item.stock;
  document.getElementById('itemImage').value = item.image || '';
  document.getElementById('itemCategory').value = item.category || 'general';
  
  if (item.category === 'pharmacy') {
    document.getElementById('drugName').value = item.drugName || '';
    document.getElementById('brandName').value = item.brandName || '';
    document.getElementById('genericEquivalent').value = item.genericEquivalent || '';
    document.getElementById('prescriptionRequired').checked = item.prescriptionRequired || false;
  }
  
  togglePharmacyFields();
  showAddForm();
}

async function saveItem() {
  const id = document.getElementById('itemId').value;
  const category = document.getElementById('itemCategory').value;
  const storeId = document.getElementById('storeSelect').value;
  
  const item = {
    name: document.getElementById('itemName').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    description: document.getElementById('itemDescription').value,
    stock: parseInt(document.getElementById('itemStock').value),
    image: document.getElementById('itemImage').value || 'https://placehold.co/300x300/3498db/ffffff?text=Product',
    category: category,
    storeId: parseInt(storeId),
    deliveryOptions: ['pickup', 'delivery']
  };
  
  if (category === 'pharmacy') {
    item.drugName = document.getElementById('drugName').value;
    item.brandName = document.getElementById('brandName').value;
    item.genericEquivalent = document.getElementById('genericEquivalent').value;
    item.prescriptionRequired = document.getElementById('prescriptionRequired').checked;
  }
  
  const url = id ? `/api/seller/items/${id}` : '/api/seller/items';
  const method = id ? 'PUT' : 'POST';
  
  await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  
  hideAddForm();
  loadItems();
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  
  await authFetch(`/api/seller/items/${id}`, { method: 'DELETE' });
  loadItems();
}

async function uploadCSV() {
  const fileInput = document.getElementById('csvFile');
  if (!fileInput.files[0]) {
    alert('Please select a CSV file');
    return;
  }
  
  const storeId = document.getElementById('storeSelect').value;
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('storeId', storeId);
  
  const token = localStorage.getItem('token');
  const response = await fetch('/api/seller/upload-csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const result = await response.json();
  alert(result.error || `Successfully added ${result.itemsAdded} items`);
  fileInput.value = '';
  loadItems();
}

loadItems();
