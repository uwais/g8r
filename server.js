import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static('public'));

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// In-memory database
let stores = [
  { 
    id: 1, 
    name: 'Tech Store Downtown', 
    location: 'Downtown',
    address: '123 Main St, New York, NY 10001',
    phone: '(212) 555-0100',
    email: 'contact@techstore.com',
    hours: 'Mon-Fri: 9AM-8PM, Sat-Sun: 10AM-6PM',
    lat: 40.7589,
    lng: -73.9851,
    type: 'general',
    rating: 4.5,
    totalReviews: 120
  },
  { 
    id: 2, 
    name: 'City Pharmacy', 
    location: 'Midtown',
    address: '456 Park Ave, New York, NY 10022',
    phone: '(212) 555-0200',
    email: 'info@citypharmacy.com',
    hours: 'Mon-Sat: 8AM-9PM, Sun: 9AM-7PM',
    lat: 40.7614,
    lng: -73.9776,
    type: 'pharmacy',
    rating: 4.8,
    totalReviews: 89
  },
  { 
    id: 3, 
    name: 'HealthPlus Pharmacy', 
    location: 'Uptown',
    address: '789 Broadway, New York, NY 10003',
    phone: '(212) 555-0300',
    email: 'hello@healthplus.com',
    hours: 'Mon-Fri: 8AM-10PM, Sat-Sun: 9AM-8PM',
    lat: 40.7505,
    lng: -73.9934,
    type: 'pharmacy',
    rating: 4.3,
    totalReviews: 56
  }
];

let users = [
  {
    id: 1,
    email: 'customer@test.com',
    password: '$2a$10$XQqz8Z0Z0Z0Z0Z0Z0Z0Z0uK', // 'password123'
    role: 'customer',
    name: 'John Doe',
    address: '100 Customer St, New York, NY 10001',
    lat: 40.7580,
    lng: -73.9855,
    preferredStores: [2]
  },
  {
    id: 2,
    email: 'seller@test.com',
    password: '$2a$10$XQqz8Z0Z0Z0Z0Z0Z0Z0Z0uK', // 'password123'
    role: 'seller',
    name: 'Jane Smith',
    storeId: 2
  }
];

let catalog = [
  { 
    id: 1, 
    name: 'Laptop', 
    price: 999.99, 
    description: 'High-performance laptop', 
    stock: 10,
    storeId: 1,
    category: 'general',
    image: 'https://via.placeholder.com/300x300?text=Laptop',
    deliveryOptions: ['pickup', 'delivery']
  },
  { 
    id: 2, 
    name: 'Ibuprofen', 
    price: 12.99, 
    description: 'Pain reliever and fever reducer',
    stock: 100,
    storeId: 2,
    category: 'pharmacy',
    drugName: 'Ibuprofen',
    brandName: 'Advil',
    genericEquivalent: 'Ibuprofen',
    prescriptionRequired: false,
    image: 'https://via.placeholder.com/300x300?text=Ibuprofen',
    deliveryOptions: ['pickup', 'delivery'],
    dosageForm: 'Tablet',
    dosesPerPack: 50,
    strength: '200mg',
    activeIngredients: 'Ibuprofen 200mg',
    warnings: 'Do not exceed recommended dose. Consult doctor if pregnant.'
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
    prescriptionRequired: false,
    image: 'https://via.placeholder.com/300x300?text=Ibuprofen+Generic',
    deliveryOptions: ['pickup', 'delivery'],
    dosageForm: 'Tablet',
    dosesPerPack: 100,
    strength: '200mg',
    activeIngredients: 'Ibuprofen 200mg',
    warnings: 'Do not exceed recommended dose. Consult doctor if pregnant.'
  },
  { 
    id: 4, 
    name: 'Amoxicillin', 
    price: 24.99, 
    description: 'Antibiotic for bacterial infections',
    stock: 50,
    storeId: 2,
    category: 'pharmacy',
    drugName: 'Amoxicillin',
    brandName: 'Amoxil',
    genericEquivalent: 'Amoxicillin',
    prescriptionRequired: true,
    image: 'https://via.placeholder.com/300x300?text=Amoxicillin',
    deliveryOptions: ['pickup'],
    dosageForm: 'Capsule',
    dosesPerPack: 30,
    strength: '500mg',
    activeIngredients: 'Amoxicillin 500mg',
    warnings: 'Complete full course. May cause allergic reactions.'
  },
  { 
    id: 5, 
    name: 'Cough Syrup', 
    price: 15.99, 
    description: 'Relief from cough and cold',
    stock: 75,
    storeId: 3,
    category: 'pharmacy',
    drugName: 'Dextromethorphan',
    brandName: 'Robitussin',
    genericEquivalent: 'Dextromethorphan',
    prescriptionRequired: false,
    image: 'https://via.placeholder.com/300x300?text=Cough+Syrup',
    deliveryOptions: ['pickup', 'delivery'],
    dosageForm: 'Syrup',
    dosesPerPack: 20,
    strength: '10mg/5ml',
    activeIngredients: 'Dextromethorphan HBr 10mg per 5ml',
    warnings: 'Do not drive after taking. May cause drowsiness.'
  }
];

let storeReviews = [
  { id: 1, storeId: 2, userId: 1, rating: 5, comment: 'Great service!', date: new Date() },
  { id: 2, storeId: 2, userId: 1, rating: 4, comment: 'Fast delivery', date: new Date() }
];

let productReviews = [
  { id: 1, productId: 2, userId: 1, rating: 5, comment: 'Works great for headaches!', date: new Date() },
  { id: 2, productId: 2, userId: 1, rating: 4, comment: 'Good value', date: new Date() }
];

let prescriptions = [];

let orders = [];

let nextId = 6;
let nextUserId = 3;
let nextStoreReviewId = 3;
let nextProductReviewId = 3;
let nextPrescriptionId = 1;
let nextOrderId = 1;

// Auth API
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, address, role } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: nextUserId++,
    email,
    password: hashedPassword,
    name,
    address,
    role: role || 'customer',
    lat: 40.7580 + (Math.random() - 0.5) * 0.1,
    lng: -73.9855 + (Math.random() - 0.5) * 0.1
  };
  
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  const user = users.find(u => u.email === email && u.role === role);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Simple password check for demo (in production, use bcrypt.compare)
  const validPassword = password === 'password123' || await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.storeId } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Customer API - Get catalog with store info (requires auth for distance calculation)
app.get('/api/catalog', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  const catalogWithStores = catalog
    .filter(item => item.stock > 0)
    .map(item => {
      const store = stores.find(s => s.id === item.storeId);
      const distance = user && user.lat && user.lng ? 
        calculateDistance(user.lat, user.lng, store.lat, store.lng) : 0;
      
      return {
        ...item,
        store: { ...store, distance }
      };
    });
  res.json(catalogWithStores);
});

// Customer API - Search products with filters
app.get('/api/search', authMiddleware, (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  const category = req.query.category;
  const minPrice = parseFloat(req.query.minPrice) || 0;
  const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
  const prescriptionRequired = req.query.prescriptionRequired;
  const sortBy = req.query.sortBy || 'price';
  
  const user = users.find(u => u.id === req.user.id);
  
  let results = catalog.filter(item => 
    item.stock > 0 && 
    (item.name.toLowerCase().includes(query) || 
     item.description?.toLowerCase().includes(query) ||
     item.drugName?.toLowerCase().includes(query)) &&
    item.price >= minPrice &&
    item.price <= maxPrice
  );
  
  if (category) {
    results = results.filter(item => item.category === category);
  }
  
  if (prescriptionRequired !== undefined) {
    results = results.filter(item => item.prescriptionRequired === (prescriptionRequired === 'true'));
  }
  
  // Group by product name for pharmacy items
  const grouped = {};
  results.forEach(item => {
    const store = stores.find(s => s.id === item.storeId);
    const distance = user ? calculateDistance(user.lat, user.lng, store.lat, store.lng) : 0;
    
    const key = item.category === 'pharmacy' ? item.drugName : item.name;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({
      ...item,
      store: { ...store, distance }
    });
  });
  
  // Sort items within each group
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'distance') return a.store.distance - b.store.distance;
      if (sortBy === 'rating') return b.store.rating - a.store.rating;
      return 0;
    });
  });
  
  res.json(grouped);
});

// Get stores
app.get('/api/stores', (req, res) => {
  res.json(stores);
});

// Store Details API
app.get('/api/stores/:storeId', (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const store = stores.find(s => s.id === storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  
  const reviews = storeReviews.filter(r => r.storeId === storeId);
  res.json({ ...store, reviews });
});

// Store Reviews API
app.get('/api/stores/:storeId/reviews', (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const reviews = storeReviews.filter(r => r.storeId === storeId);
  res.json(reviews);
});

app.post('/api/stores/:storeId/reviews', authMiddleware, (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const { rating, comment } = req.body;
  
  const review = {
    id: nextStoreReviewId++,
    storeId,
    userId: req.user.id,
    rating,
    comment,
    date: new Date()
  };
  
  storeReviews.push(review);
  
  // Update store rating
  const reviews = storeReviews.filter(r => r.storeId === storeId);
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const store = stores.find(s => s.id === storeId);
  if (store) {
    store.rating = avgRating;
    store.totalReviews = reviews.length;
  }
  
  res.json(review);
});

// Product Details API
app.get('/api/products/:productId', authMiddleware, (req, res) => {
  const productId = parseInt(req.params.productId);
  const product = catalog.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  const store = stores.find(s => s.id === product.storeId);
  const reviews = productReviews.filter(r => r.productId === productId);
  const user = users.find(u => u.id === req.user.id);
  const distance = user && user.lat && user.lng ? 
    calculateDistance(user.lat, user.lng, store.lat, store.lng) : 0;
  
  res.json({ 
    ...product, 
    store: { ...store, distance },
    reviews 
  });
});

// Product Reviews API
app.post('/api/products/:productId/reviews', authMiddleware, (req, res) => {
  const productId = parseInt(req.params.productId);
  const { rating, comment } = req.body;
  
  const review = {
    id: nextProductReviewId++,
    productId,
    userId: req.user.id,
    rating,
    comment,
    date: new Date()
  };
  
  productReviews.push(review);
  res.json(review);
});

// Preferred Stores API
app.post('/api/stores/:storeId/prefer', authMiddleware, (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const user = users.find(u => u.id === req.user.id);
  
  if (!user.preferredStores) user.preferredStores = [];
  
  if (!user.preferredStores.includes(storeId)) {
    user.preferredStores.push(storeId);
  }
  
  res.json({ preferredStores: user.preferredStores });
});

app.delete('/api/stores/:storeId/prefer', authMiddleware, (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const user = users.find(u => u.id === req.user.id);
  
  if (user.preferredStores) {
    user.preferredStores = user.preferredStores.filter(id => id !== storeId);
  }
  
  res.json({ preferredStores: user.preferredStores });
});

// Prescription API
app.post('/api/prescriptions/upload', authMiddleware, upload.single('prescription'), (req, res) => {
  try {
    const prescription = {
      id: nextPrescriptionId++,
      userId: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      uploadDate: new Date(),
      status: 'pending',
      doctorName: req.body.doctorName,
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate
    };
    
    prescriptions.push(prescription);
    res.json(prescription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/prescriptions', authMiddleware, (req, res) => {
  const userPrescriptions = prescriptions.filter(p => p.userId === req.user.id);
  res.json(userPrescriptions);
});

app.get('/api/prescriptions/:id/file', authMiddleware, (req, res) => {
  const prescriptionId = parseInt(req.params.id);
  const prescription = prescriptions.find(p => p.id === prescriptionId);
  
  if (!prescription) {
    return res.status(404).json({ error: 'Prescription not found' });
  }
  
  // Check authorization
  const user = users.find(u => u.id === req.user.id);
  const isOwner = prescription.userId === req.user.id;
  const isSeller = user.role === 'seller';
  
  if (!isOwner && !isSeller) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.sendFile(path.resolve(prescription.filePath));
});

// Checkout API
app.post('/api/checkout', authMiddleware, (req, res) => {
  const { items, deliveryOption, deliveryAddress, prescriptionId, pickupStoreId } = req.body;
  
  // Validate stock
  for (const item of items) {
    const catalogItem = catalog.find(c => c.id === item.id);
    if (!catalogItem || catalogItem.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
    }
  }
  
  // Check if prescription is required
  const requiresPrescription = items.some(item => {
    const catalogItem = catalog.find(c => c.id === item.id);
    return catalogItem && catalogItem.prescriptionRequired;
  });
  
  if (requiresPrescription && !prescriptionId) {
    return res.status(400).json({ error: 'Prescription required for this order' });
  }
  
  // Create order
  const order = {
    id: nextOrderId++,
    userId: req.user.id,
    items,
    deliveryOption,
    deliveryAddress,
    pickupStoreId,
    prescriptionId,
    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    status: requiresPrescription ? 'pending_prescription_verification' : 'pending',
    createdAt: new Date()
  };
  
  orders.push(order);
  
  // Update stock
  items.forEach(item => {
    const catalogItem = catalog.find(c => c.id === item.id);
    if (catalogItem) {
      catalogItem.stock -= item.quantity;
    }
  });
  
  res.json(order);
});

// Get user orders
app.get('/api/orders', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (user.role === 'seller') {
    // Sellers see orders for their store
    const storeOrders = orders.filter(o => 
      o.items.some(item => {
        const product = catalog.find(p => p.id === item.id);
        return product && product.storeId === user.storeId;
      })
    );
    res.json(storeOrders);
  } else {
    // Customers see their own orders
    const userOrders = orders.filter(o => o.userId === req.user.id);
    res.json(userOrders);
  }
});

// Seller: Verify prescription and update order status
app.post('/api/orders/:orderId/verify-prescription', authMiddleware, (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const { approved, notes } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (user.role !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can verify prescriptions' });
  }
  
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Check if order belongs to seller's store
  const belongsToStore = order.items.some(item => {
    const product = catalog.find(p => p.id === item.id);
    return product && product.storeId === user.storeId;
  });
  
  if (!belongsToStore) {
    return res.status(403).json({ error: 'Order does not belong to your store' });
  }
  
  order.status = approved ? 'confirmed' : 'rejected';
  order.prescriptionVerified = approved;
  order.verificationNotes = notes;
  order.verifiedAt = new Date();
  order.verifiedBy = req.user.id;
  
  res.json(order);
});

// Product recommendations
app.get('/api/recommendations', authMiddleware, (req, res) => {
  const userOrders = orders.filter(o => o.userId === req.user.id);
  const purchasedCategories = new Set();
  
  userOrders.forEach(order => {
    order.items.forEach(item => {
      const catalogItem = catalog.find(c => c.id === item.id);
      if (catalogItem) purchasedCategories.add(catalogItem.category);
    });
  });
  
  // Recommend items from purchased categories
  const recommendations = catalog
    .filter(item => 
      item.stock > 0 && 
      purchasedCategories.has(item.category) &&
      !userOrders.some(o => o.items.some(i => i.id === item.id))
    )
    .slice(0, 6)
    .map(item => ({
      ...item,
      store: stores.find(s => s.id === item.storeId)
    }));
  
  res.json(recommendations);
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
