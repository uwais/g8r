# Email-Based Inventory Management Setup

## Overview

Store owners can update their inventory by sending emails with CSV or PDF attachments to their dedicated store email address.

## Store Email Addresses

Each store has a dedicated email address:

- **Tech Store Downtown**: `techstore@inventory.yourdomain.com`
- **City Pharmacy**: `citypharmacy@inventory.yourdomain.com`
- **HealthPlus Pharmacy**: `healthplus@inventory.yourdomain.com`

## Email Format

### Subject Line (Required)

The email subject must contain one of these keywords:
- `INVENTORY UPDATE`
- `CATALOG UPDATE`
- `STOCK UPDATE`
- `PRODUCT UPDATE`

Example: `INVENTORY UPDATE - Weekly Stock Refresh`

### Attachments (Required)

Attach one or more files:
- **CSV files** (.csv) - Preferred format
- **PDF files** (.pdf) - Structured format

## CSV Format

### General Products

```csv
name,price,description,stock,category,image
Laptop,999.99,High-performance laptop,10,general,https://placehold.co/300x300/3498db/ffffff?text=Laptop
Mouse,29.99,Wireless mouse,50,general,https://placehold.co/300x300/2ecc71/ffffff?text=Mouse
```

### Pharmacy Products

```csv
name,price,description,stock,category,drugName,brandName,genericEquivalent,prescriptionRequired,dosageForm,dosesPerPack,strength,activeIngredients,warnings,image
Aspirin,8.99,Pain reliever,200,pharmacy,Aspirin,Bayer,Aspirin,false,Tablet,100,325mg,Aspirin 325mg,Do not exceed dose,https://placehold.co/300x300/e74c3c/ffffff?text=Aspirin
```

### Required Fields

- `name` - Product name (string)
- `price` - Price in dollars (number, max 999999)
- `stock` - Available quantity (integer, max 999999)

### Optional Fields

- `description` - Product description
- `category` - 'general' or 'pharmacy' (default: general)
- `image` - Product image URL
- `drugName` - Drug name (pharmacy only)
- `brandName` - Brand name (pharmacy only)
- `genericEquivalent` - Generic equivalent (pharmacy only)
- `prescriptionRequired` - true/false (pharmacy only)
- `dosageForm` - Tablet, Capsule, Syrup, etc.
- `dosesPerPack` - Number of doses
- `strength` - Dosage strength (e.g., 200mg)
- `activeIngredients` - Active ingredients
- `warnings` - Safety warnings

## PDF Format

Structure your PDF with clear labels:

```
Product Name: Laptop
Price: $999.99
Stock: 10
Description: High-performance laptop

Product Name: Mouse
Price: $29.99
Stock: 50
Description: Wireless mouse
```

## Behavior

### Update Existing Products
If a product with the same name already exists in your store, it will be **updated** with the new information.

### Add New Products
If a product doesn't exist, it will be **added** to your catalog.

### Validation & Security

All data is:
- **Sanitized** to prevent XSS attacks
- **Validated** for correct data types
- **Range-checked** for reasonable values
- **Logged** for audit trail

Invalid records are skipped and logged.

## Environment Configuration

### Required Environment Variables

```bash
# Enable email monitoring
ENABLE_EMAIL_MONITORING=true

# IMAP server (e.g., Gmail, Outlook)
IMAP_HOST=imap.gmail.com

# Store 1 credentials
STORE1_EMAIL=techstore@inventory.yourdomain.com
STORE1_PASSWORD=your-app-password

# Store 2 credentials
STORE2_EMAIL=citypharmacy@inventory.yourdomain.com
STORE2_PASSWORD=your-app-password

# Store 3 credentials
STORE3_EMAIL=healthplus@inventory.yourdomain.com
STORE3_PASSWORD=your-app-password
```

### Gmail Setup

1. **Enable IMAP** in Gmail settings
2. **Create App Password**:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
   - Use this password in environment variables

### Outlook/Office 365 Setup

```bash
IMAP_HOST=outlook.office365.com
```

Use your account password or app-specific password.

## Testing

### Send Test Email

1. Send email to your store's address
2. Subject: `INVENTORY UPDATE - Test`
3. Attach: `test-inventory.csv`
4. Check logs: `logs/email-monitor.log`

### Monitor Logs

```bash
# Watch email monitoring logs
tail -f logs/email-monitor.log

# Check for errors
grep ERROR logs/email-monitor.log
```

## Confirmation Emails

After processing, the system logs the update. Future enhancement can send confirmation emails back to the sender with:
- Number of items updated
- Number of items added
- Any errors encountered

## Security Considerations

1. **Email Authentication**: Only emails to the configured addresses are processed
2. **Subject Validation**: Must match approved keywords
3. **File Type Validation**: Only CSV and PDF accepted
4. **Data Sanitization**: All input is escaped and validated
5. **Size Limits**: Reasonable limits on price and stock values
6. **Audit Trail**: All updates are logged with timestamps

## Troubleshooting

### Emails Not Being Processed

1. Check environment variables are set
2. Verify IMAP credentials
3. Check email subject line format
4. Ensure attachments are CSV or PDF
5. Review logs: `logs/email-monitor.log`

### Invalid Data

- Check CSV column headers match exactly
- Ensure numeric fields contain valid numbers
- Verify boolean fields use 'true'/'false' or '1'/'0'
- Check for special characters in text fields

### Connection Issues

- Verify IMAP host and port
- Check firewall settings
- Ensure app passwords are used (not account passwords)
- Test IMAP connection separately

## Example Workflow

1. Store owner exports inventory from their POS system as CSV
2. Reviews and edits the CSV file
3. Composes email with subject "INVENTORY UPDATE - Daily Sync"
4. Attaches the CSV file
5. Sends to their store's email address
6. System processes email within minutes
7. Inventory is updated automatically
8. Changes are immediately visible on the website

## Limitations

- Email processing may take 1-5 minutes
- Large attachments (>10MB) may be rejected by email server
- PDF parsing is basic - structured CSV is recommended
- Concurrent updates from multiple emails are queued

## Future Enhancements

- Email confirmation with update summary
- Support for Excel files (.xlsx)
- Image attachments for product photos
- Scheduled batch processing
- Web dashboard for email monitoring status
