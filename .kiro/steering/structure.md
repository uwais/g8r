# Project Structure

## Root Directory

```
├── server.js              # Main Express server with all API routes
├── package.json           # Dependencies and npm scripts
├── render.yaml            # Render.com deployment configuration
├── README.md              # Project documentation
├── QUICKSTART.md          # Quick start guide with demo accounts
├── LOGGING.md             # Logging documentation
├── sample-catalog.csv     # Example CSV for general products
├── sample-pharmacy.csv    # Example CSV for pharmacy products
├── public/                # Frontend static files
├── uploads/               # Uploaded prescription files
└── logs/                  # Winston log files (created at runtime)
```

## Public Directory (Frontend)

```
public/
├── index.html             # Customer portal homepage
├── login.html             # Customer login page
├── register.html          # Customer registration page
├── product-details.html   # Individual product view
├── store-details.html     # Individual store view
├── seller-login.html      # Seller login page
├── seller.html            # Seller inventory management
├── orders.html            # Order management (seller)
├── customer.js            # Customer portal logic
├── seller.js              # Seller portal logic
├── orders.js              # Order management logic
├── product-details.js     # Product details page logic
├── store-details.js       # Store details page logic
├── auth.js                # Shared authentication utilities
└── styles.css             # Global styles
```

## Server Architecture (server.js)

**In-Memory Data Stores**
- `stores[]` - Store information with location coordinates
- `users[]` - User accounts (customers and sellers)
- `catalog[]` - Product inventory
- `orders[]` - Order history
- `prescriptions[]` - Uploaded prescription metadata
- `storeReviews[]` - Store ratings and reviews
- `productReviews[]` - Product ratings and reviews

**API Routes**

Authentication (`/api/auth/*`)
- POST `/register` - User registration
- POST `/login` - User login
- GET `/me` - Get current user profile

Customer APIs (`/api/*`)
- GET `/catalog` - All products with store info and distances
- GET `/search` - Search with filters, grouping, and sorting
- GET `/stores` - List all stores
- GET `/stores/:id` - Store details with reviews
- POST `/stores/:id/reviews` - Add store review
- POST `/stores/:id/prefer` - Mark store as preferred
- DELETE `/stores/:id/prefer` - Remove preferred store
- GET `/products/:id` - Product details with reviews
- POST `/products/:id/reviews` - Add product review
- POST `/prescriptions/upload` - Upload prescription file
- GET `/prescriptions` - User's prescription history
- GET `/prescriptions/:id/file` - Download prescription file
- POST `/checkout` - Place order
- GET `/orders` - Order history (customer or seller view)
- GET `/recommendations` - Personalized product recommendations

Seller APIs (`/api/seller/*`)
- GET `/items` - Get store inventory
- POST `/items` - Add new product
- PUT `/items/:id` - Update product
- DELETE `/items/:id` - Delete product
- POST `/upload-csv` - Bulk upload via CSV
- POST `/orders/:id/verify-prescription` - Approve/reject Rx orders

## Frontend Patterns

**Authentication Flow**
- JWT token stored in localStorage
- `auth.js` provides `checkAuth()` and `authFetch()` utilities
- All API requests include `Authorization: Bearer <token>` header
- Redirects to login if unauthorized

**Page-Specific Scripts**
- Each HTML page loads corresponding JS file (e.g., `customer.js`, `seller.js`)
- Shared utilities in `auth.js`
- No build process - direct script loading

**Data Models**

Product (General):
- id, name, price, description, stock, storeId, category, image, deliveryOptions

Product (Pharmacy):
- All general fields plus: drugName, brandName, genericEquivalent, prescriptionRequired, dosageForm, strength, dosesPerPack, activeIngredients, warnings

Store:
- id, name, location, address, phone, email, hours, lat, lng, type, rating, totalReviews

User:
- id, email, password (hashed), role, name, address, lat, lng, storeId (sellers), preferredStores (customers)

Order:
- id, userId, items[], deliveryOption, deliveryAddress, pickupStoreId, prescriptionId, total, status, createdAt

## Key Conventions

- All product IDs are auto-incremented integers
- Coordinates use decimal degrees (lat/lng)
- Distance calculations use Haversine formula (miles)
- Prescription files stored in `uploads/` with multer-generated names
- CSV uploads expect specific column headers (see sample files)
- Category field determines product type: 'general' or 'pharmacy'
