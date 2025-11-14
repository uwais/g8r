# Store Catalog Webapp

E-commerce webapp with customer and seller portals.

## Local Setup

```bash
npm install
npm start
```

Visit http://localhost:3000

## Deploy to Render

1. Push code to GitHub
2. Go to https://render.com and sign up
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render auto-detects settings from render.yaml
6. Click "Create Web Service"
7. Your app will be live at: `https://your-app-name.onrender.com`

## Features

**Customer Portal** (/)
- User authentication and profiles with delivery address
- Browse catalog with product images
- Advanced filtering (price range, prescription status, category)
- Sort by price, distance, or store rating
- Search products across multiple sellers
- Compare prices and locations for same products
- Product recommendations based on purchase history
- Write and view store reviews/ratings
- Shopping cart with quantity selection
- Checkout with delivery or pickup options
- Real-time stock updates

**Seller Portal** (/seller.html)
- Seller authentication
- View all catalog items by store
- Add/edit/delete individual items
- Product images and delivery options
- Pharmacy-specific fields (drug name, brand, prescription flag)
- Bulk upload via CSV

## CSV Format

**General Products:**
```csv
name,price,description,stock,category
Item Name,99.99,Item description,10,general
```

**Pharmacy Products:**
```csv
name,price,description,stock,category,drugName,brandName,genericEquivalent,prescriptionRequired
Aspirin,8.99,Pain reliever,200,pharmacy,Aspirin,Bayer,Aspirin,false
```

See `sample-catalog.csv` and `sample-pharmacy.csv` for examples.

## New Features

- Multiple stores with different locations
- Pharmacy product category with drug names, brands, and prescription flags
- Product search with grouping by drug name
- Compare prices and locations across sellers
- Sort results by price or store location
