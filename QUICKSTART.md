# Quick Start Guide

## Installation

```bash
npm install
npm start
```

Visit http://localhost:3000

## Demo Accounts

**Customer Account:**
- Email: customer@test.com
- Password: password123
- Has delivery address for distance calculations

**Seller Account:**
- Email: seller@test.com
- Password: password123
- Manages City Pharmacy (Store ID: 2)

## Customer Features Demo

1. **Login**: Go to `/login.html` or register a new account
2. **Browse**: View all products with images, prices, and store info
3. **Search**: Try searching for "Ibuprofen" to see multi-seller comparison
4. **Filter**: Use price range, prescription filter, and sort options
5. **Distance**: Products show distance from your delivery address
6. **Reviews**: Click "Write Review" on any store
7. **Cart**: Add items with quantities, view cart total
8. **Checkout**: Choose delivery or pickup, complete order
9. **Recommendations**: After ordering, see personalized recommendations

## Seller Features Demo

1. **Login**: Go to `/seller-login.html`
2. **Select Store**: Choose which store to manage
3. **Add Product**: Click "Add New Item"
   - For pharmacy items, select "Pharmacy Product" category
   - Fill in drug name, brand, generic equivalent
   - Check "Prescription Required" if needed
   - Add image URL (or use placeholder)
4. **Edit/Delete**: Manage existing inventory
5. **CSV Upload**: Bulk upload products (see sample-pharmacy.csv)

## Testing Filters

**Price Range:**
- Min: 10, Max: 15 (shows Ibuprofen products)

**Prescription Filter:**
- Check "Prescription Required Only" (shows Amoxicillin)

**Sort Options:**
- Price: Cheapest first
- Distance: Nearest stores first
- Rating: Best-rated stores first

## CSV Upload Format

See `sample-pharmacy.csv` for pharmacy products format.

## Next Steps

- Add PostgreSQL database for persistence
- Implement real geocoding for addresses
- Add payment processing
- Email notifications for orders
- Real-time inventory sync
