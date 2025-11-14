import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// In-memory database
let stores = [
  { id: 1, name: 'Tech Store Downtown', location: 'Downtown', type: 'general' },
  { id: 2, name: 'City Pharmacy', location: 'Midtown', type: 'pharmacy' },
  { id: 3, name: 'HealthPlus Pharmacy', location: 'Uptown', type: 'pharmacy' }
];

let catalog = [
  { 
    id: 1, 
    name: 'Laptop', 
    price: 999.99, 
    description: 'High-performance laptop', 
    stock: 10,
    storeId: 1,
    category: 'general'
  },
  { 
    id: 2, 
    name: 'Ibuprofen', 
    price: 12.99, 
    description: 'Pain reliever',
    stock: 100,
    storeId: 2,
    category: 'pharmacy',
    drugName: 'Ibuprofen',
    brandName: 'Advil',
    genericEquivalent: 'Ibuprofen',
    prescriptionRequired: false
  },
  { 
    id: 3, 
    name: 'Ibuprofen', 
    price: 9.99, 
    description: 'Generic pain reliever',
    stock: 150,
    storeId: 3,
    category: 'pharmacy',
    drugName: 'Ibuprofen',
    brandName: 'Generic',
    genericEquivalent: 'Ibuprofen',
    prescriptionRequired: false
  },
  { 
    id: 4, 
    name: 'Amoxicillin', 
    price: 24.99, 
    description: 'Antibiotic',
    stock: 50,
    storeId: 2,
    category: 'pharmacy',
    drugName: 'Amoxicillin',
    brandName: 'Amoxil',
    genericEquivalent: 'Amoxicillin',
    prescriptionRequired: true
  }
];
let nextId = 5;

// Customer API - Get catalog with store info
app.get('/api/catalog', (req, res) => {
  const catalogWithStores = catalog
    .filter(item => item.stock > 0)
    .map(item => ({
      ...item,
      store: stores.find(s => s.id === item.storeId)
    }));
  res.json(catalogWithStores);
});

// Customer API - Search products
app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  const category = req.query.category;
  
  let results = catalog.filter(item => 
    item.stock > 0 && 
    (item.name.toLowerCase().includes(query) || 
     item.description?.toLowerCase().includes(query) ||
     item.drugName?.toLowerCase().includes(query))
  );
  
  if (category) {
    results = results.filter(item => item.category === category);
  }
  
  // Group by product name for pharmacy items
  const grouped = {};
  results.forEach(item => {
    const key = item.category === 'pharmacy' ? item.drugName : item.name;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({
      ...item,
      store: stores.find(s => s.id === item.storeId)
    });
  });
  
  res.json(grouped);
});

// Get stores
app.get('/api/stores', (req, res) => {
  res.json(stores);
});

// Seller API - Get all items for a store
app.get('/api/seller/items', (req, res) => {
  const storeId = parseInt(req.query.storeId) || 1;
  const items = catalog
    .filter(item => item.storeId === storeId)
    .map(item => ({
      ...item,
      store: stores.find(s => s.id === item.storeId)
    }));
  res.json(items);
});

// Seller API - Add item
app.post('/api/seller/items', (req, res) => {
  const item = { 
    id: nextId++, 
    ...req.body,
    storeId: parseInt(req.body.storeId) || 1
  };
  catalog.push(item);
  res.json(item);
});

// Seller API - Update item
app.put('/api/seller/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = catalog.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });
  
  catalog[index] = { ...catalog[index], ...req.body, id };
  res.json(catalog[index]);
});

// Seller API - Delete item
app.delete('/api/seller/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  catalog = catalog.filter(item => item.id !== id);
  res.json({ success: true });
});

// Seller API - Bulk upload CSV
app.post('/api/seller/upload-csv', upload.single('file'), (req, res) => {
  try {
    const storeId = parseInt(req.body.storeId) || 1;
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    records.forEach(record => {
      const item = {
        id: nextId++,
        name: record.name,
        price: parseFloat(record.price),
        description: record.description || '',
        stock: parseInt(record.stock) || 0,
        storeId: storeId,
        category: record.category || 'general'
      };
      
      // Add pharmacy-specific fields
      if (item.category === 'pharmacy') {
        item.drugName = record.drugName || record.name;
        item.brandName = record.brandName || '';
        item.genericEquivalent = record.genericEquivalent || '';
        item.prescriptionRequired = record.prescriptionRequired === 'true' || record.prescriptionRequired === '1';
      }
      
      catalog.push(item);
    });
    
    fs.unlinkSync(req.file.path);
    res.json({ success: true, itemsAdded: records.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
