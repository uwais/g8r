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
import morgan from 'morgan';
import winston from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Winston Logger Configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pharmacy-ecommerce' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service !== 'pharmacy-ecommerce') {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      )
    }),
    // Write errors to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.json()
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.json()
    })
  ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Morgan HTTP request logger with Winston
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static('public'));

logger.info('Application starting...');

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.warn('Unauthorized access attempt', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    logger.debug('User authenticated', { userId: decoded.id, email: decoded.email });
    next();
  } catch (error) {
    logger.warn('Invalid token', { error: error.message, ip: req.ip });
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
    image: 'https://placehold.co/300x300/3498db/ffffff?text=Laptop',
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
    image: 'https://placehold.co/300x300/e74c3c/ffffff?text=Ibuprofen',
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
    image: 'https://placehold.co/300x300/95a5a6/ffffff?text=Ibuprofen+Generic',
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
    image: 'https://placehold.co/300x300/e67e22/ffffff?text=Amoxicillin',
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
    image: 'https://placehold.co/300x300/9b59b6/ffffff?text=Cough+Syrup',
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
  try {
    const { email, password, name, address, role } = req.body;
    
    logger.info('Registration attempt', { email, role: role || 'customer' });
    
    if (users.find(u => u.email === email)) {
      logger.warn('Registration failed - email exists', { email });
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
    
    logger.info('User registered successfully', { userId: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    logger.info('Login attempt', { email, role });
    
    const user = users.find(u => u.email === email && u.role === role);
    
    if (!user) {
      logger.warn('Login failed - user not found', { email, role });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simple password check for demo (in production, use bcrypt.compare)
    const validPassword = password === 'password123' || await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn('Login failed - invalid password', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    
    logger.info('User logged in successfully', { userId: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.storeId } });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Login failed' });
  }
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
    if (!req.file) {
      logger.warn('Prescription upload failed - no file', { userId: req.user.id });
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Validate file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      logger.warn('Prescription upload failed - invalid file type', { 
        userId: req.user.id, 
        fileName: req.file.originalname,
        fileType: ext
      });
      fs.unlinkSync(req.file.path); // Delete invalid file
      return res.status(400).json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' });
    }
    
    const prescription = {
      id: nextPrescriptionId++,
      userId: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadDate: new Date(),
      status: 'pending',
      doctorName: req.body.doctorName,
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate
    };
    
    prescriptions.push(prescription);
    
    logger.info('Prescription uploaded successfully', { 
      prescriptionId: prescription.id,
      userId: req.user.id,
      fileName: prescription.fileName,
      fileSize: prescription.fileSize
    });
    
    res.json(prescription);
  } catch (error) {
    logger.error('Prescription upload error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id
    });
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/prescriptions', authMiddleware, (req, res) => {
  const userPrescriptions = prescriptions.filter(p => p.userId === req.user.id);
  res.json(userPrescriptions);
});

app.get('/api/prescriptions/:id/file', authMiddleware, (req, res) => {
  try {
    const prescriptionId = parseInt(req.params.id);
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    
    if (!prescription) {
      logger.warn('Prescription file not found', { prescriptionId });
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    // Check authorization
    const user = users.find(u => u.id === req.user.id);
    const isOwner = prescription.userId === req.user.id;
    const isSeller = user.role === 'seller';
    
    if (!isOwner && !isSeller) {
      logger.warn('Unauthorized prescription access attempt', { 
        prescriptionId, 
        userId: req.user.id 
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const filePath = path.resolve(prescription.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('Prescription file missing from disk', { 
        prescriptionId, 
        filePath 
      });
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file extension and set proper content type
    const ext = path.extname(prescription.fileName).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers for proper display and download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${prescription.fileName}"`);
    
    // For PDFs, add additional headers to ensure inline display
    if (ext === '.pdf') {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    logger.info('Prescription file accessed', { 
      prescriptionId, 
      userId: req.user.id,
      fileName: prescription.fileName,
      contentType
    });
    
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving prescription file', { 
      error: error.message, 
      stack: error.stack,
      prescriptionId: req.params.id
    });
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

// Checkout API
app.post('/api/checkout', authMiddleware, (req, res) => {
  try {
    const { items, deliveryOption, deliveryAddress, prescriptionId, pickupStoreId } = req.body;
    
    logger.info('Checkout initiated', { 
      userId: req.user.id, 
      itemCount: items.length, 
      deliveryOption,
      requiresPrescription: items.some(i => {
        const catalogItem = catalog.find(c => c.id === i.id);
        return catalogItem?.prescriptionRequired;
      })
    });
    
    // Validate stock
    for (const item of items) {
      const catalogItem = catalog.find(c => c.id === item.id);
      if (!catalogItem || catalogItem.stock < item.quantity) {
        logger.warn('Checkout failed - insufficient stock', { 
          userId: req.user.id, 
          itemId: item.id, 
          itemName: item.name,
          requested: item.quantity,
          available: catalogItem?.stock || 0
        });
        return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
      }
    }
    
    // Check if prescription is required
    const requiresPrescription = items.some(item => {
      const catalogItem = catalog.find(c => c.id === item.id);
      return catalogItem && catalogItem.prescriptionRequired;
    });
    
    if (requiresPrescription && !prescriptionId) {
      logger.warn('Checkout failed - prescription required', { userId: req.user.id });
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
        logger.debug('Stock updated', { 
          itemId: catalogItem.id, 
          itemName: catalogItem.name, 
          newStock: catalogItem.stock 
        });
      }
    });
    
    logger.info('Order created successfully', { 
      orderId: order.id, 
      userId: req.user.id, 
      total: order.total,
      status: order.status
    });
    
    res.json(order);
  } catch (error) {
    logger.error('Checkout error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Checkout failed' });
  }
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
  try {
    const orderId = parseInt(req.params.orderId);
    const { approved, notes } = req.body;
    const user = users.find(u => u.id === req.user.id);
    
    logger.info('Prescription verification attempt', { 
      orderId, 
      sellerId: req.user.id, 
      approved 
    });
    
    if (user.role !== 'seller') {
      logger.warn('Unauthorized prescription verification attempt', { 
        userId: req.user.id, 
        role: user.role 
      });
      return res.status(403).json({ error: 'Only sellers can verify prescriptions' });
    }
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      logger.warn('Prescription verification failed - order not found', { orderId });
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order belongs to seller's store
    const belongsToStore = order.items.some(item => {
      const product = catalog.find(p => p.id === item.id);
      return product && product.storeId === user.storeId;
    });
    
    if (!belongsToStore) {
      logger.warn('Prescription verification failed - wrong store', { 
        orderId, 
        sellerId: req.user.id, 
        sellerStoreId: user.storeId 
      });
      return res.status(403).json({ error: 'Order does not belong to your store' });
    }
    
    order.status = approved ? 'confirmed' : 'rejected';
    order.prescriptionVerified = approved;
    order.verificationNotes = notes;
    order.verifiedAt = new Date();
    order.verifiedBy = req.user.id;
    
    logger.info('Prescription verification completed', { 
      orderId, 
      approved, 
      sellerId: req.user.id,
      newStatus: order.status
    });
    
    res.json(order);
  } catch (error) {
    logger.error('Prescription verification error', { 
      error: error.message, 
      stack: error.stack,
      orderId: req.params.orderId,
      sellerId: req.user.id
    });
    res.status(500).json({ error: 'Verification failed' });
  }
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

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server started successfully on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
  console.log(`Server running on port ${PORT}`);
});
