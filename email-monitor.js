import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { parse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse';
import validator from 'validator';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

// Email configuration per store
const storeEmailConfig = {
  1: { // Tech Store Downtown
    email: 'techstore@inventory.yourdomain.com',
    imap: {
      user: process.env.STORE1_EMAIL || 'techstore@inventory.yourdomain.com',
      password: process.env.STORE1_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  },
  2: { // City Pharmacy
    email: 'citypharmacy@inventory.yourdomain.com',
    imap: {
      user: process.env.STORE2_EMAIL || 'citypharmacy@inventory.yourdomain.com',
      password: process.env.STORE2_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  },
  3: { // HealthPlus Pharmacy
    email: 'healthplus@inventory.yourdomain.com',
    imap: {
      user: process.env.STORE3_EMAIL || 'healthplus@inventory.yourdomain.com',
      password: process.env.STORE3_PASSWORD || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  }
};

// Valid subject line formats
const VALID_SUBJECTS = [
  'INVENTORY UPDATE',
  'CATALOG UPDATE',
  'STOCK UPDATE',
  'PRODUCT UPDATE'
];

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/email-monitor.log' })
  ]
});

class EmailInventoryMonitor {
  constructor(storeId, config, catalogRef, nextIdRef) {
    this.storeId = storeId;
    this.config = config;
    this.catalog = catalogRef;
    this.nextId = nextIdRef;
    this.imap = null;
    this.isMonitoring = false;
  }

  start() {
    if (!this.config.imap.password) {
      logger.warn(`No password configured for store ${this.storeId}, skipping email monitoring`);
      return;
    }

    this.imap = new Imap(this.config.imap);

    this.imap.once('ready', () => {
      logger.info(`Email monitoring started for store ${this.storeId}`);
      this.isMonitoring = true;
      this.openInbox();
    });

    this.imap.once('error', (err) => {
      logger.error(`IMAP error for store ${this.storeId}:`, err);
    });

    this.imap.once('end', () => {
      logger.info(`Email monitoring ended for store ${this.storeId}`);
      this.isMonitoring = false;
    });

    this.imap.connect();
  }

  stop() {
    if (this.imap) {
      this.imap.end();
    }
  }

  openInbox() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        logger.error(`Failed to open inbox for store ${this.storeId}:`, err);
        return;
      }

      // Listen for new emails
      this.imap.on('mail', () => {
        this.checkNewEmails();
      });

      // Check existing unread emails
      this.checkNewEmails();
    });
  }

  checkNewEmails() {
    this.imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        logger.error(`Email search error for store ${this.storeId}:`, err);
        return;
      }

      if (!results || results.length === 0) {
        return;
      }

      logger.info(`Found ${results.length} unread emails for store ${this.storeId}`);

      const fetch = this.imap.fetch(results, { bodies: '' });

      fetch.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              logger.error(`Email parsing error:`, err);
              return;
            }

            await this.processEmail(parsed, seqno);
          });
        });
      });

      fetch.once('error', (err) => {
        logger.error(`Fetch error:`, err);
      });
    });
  }

  async processEmail(email, seqno) {
    try {
      logger.info(`Processing email for store ${this.storeId}`, {
        from: email.from?.text,
        subject: email.subject,
        date: email.date
      });

      // Validate subject line
      const subject = email.subject?.toUpperCase().trim();
      if (!VALID_SUBJECTS.some(valid => subject?.includes(valid))) {
        logger.warn(`Invalid subject line: ${email.subject}`);
        this.markAsRead(seqno);
        return;
      }

      // Process attachments
      if (!email.attachments || email.attachments.length === 0) {
        logger.warn(`No attachments found in email`);
        this.markAsRead(seqno);
        return;
      }

      let updatedCount = 0;

      for (const attachment of email.attachments) {
        const filename = attachment.filename.toLowerCase();
        
        if (filename.endsWith('.csv')) {
          const count = await this.processCSVAttachment(attachment);
          updatedCount += count;
        } else if (filename.endsWith('.pdf')) {
          const count = await this.processPDFAttachment(attachment);
          updatedCount += count;
        } else {
          logger.warn(`Unsupported file type: ${attachment.filename}`);
        }
      }

      logger.info(`Successfully processed email for store ${this.storeId}, updated ${updatedCount} items`);
      this.markAsRead(seqno);

      // Send confirmation email (optional)
      await this.sendConfirmationEmail(email.from?.text, updatedCount);

    } catch (error) {
      logger.error(`Error processing email for store ${this.storeId}:`, error);
      this.markAsRead(seqno);
    }
  }

  async processCSVAttachment(attachment) {
    try {
      const csvContent = attachment.content.toString('utf-8');
      const records = parse(csvContent, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true
      });

      let updatedCount = 0;

      for (const record of records) {
        // Sanitize and validate data
        const sanitizedRecord = this.sanitizeRecord(record);
        
        if (!this.validateRecord(sanitizedRecord)) {
          logger.warn(`Invalid record skipped:`, record);
          continue;
        }

        // Check if product exists (by name and storeId)
        const existingIndex = this.catalog.findIndex(
          item => item.name === sanitizedRecord.name && item.storeId === this.storeId
        );

        if (existingIndex !== -1) {
          // Update existing product
          this.catalog[existingIndex] = {
            ...this.catalog[existingIndex],
            ...sanitizedRecord,
            id: this.catalog[existingIndex].id,
            storeId: this.storeId
          };
          logger.info(`Updated product: ${sanitizedRecord.name}`);
        } else {
          // Add new product
          const newProduct = {
            id: this.nextId.value++,
            ...sanitizedRecord,
            storeId: this.storeId,
            deliveryOptions: sanitizedRecord.deliveryOptions || ['pickup', 'delivery']
          };
          this.catalog.push(newProduct);
          logger.info(`Added new product: ${sanitizedRecord.name}`);
        }

        updatedCount++;
      }

      return updatedCount;
    } catch (error) {
      logger.error(`CSV processing error:`, error);
      return 0;
    }
  }

  async processPDFAttachment(attachment) {
    try {
      const pdfData = await pdfParse(attachment.content);
      const text = pdfData.text;

      // Extract structured data from PDF text
      // This is a simple implementation - can be enhanced based on PDF format
      const lines = text.split('\n').filter(line => line.trim());
      
      let updatedCount = 0;
      let currentProduct = {};

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Simple pattern matching for product data
        if (trimmed.match(/^Product Name:/i)) {
          if (currentProduct.name) {
            // Save previous product
            if (this.validateRecord(currentProduct)) {
              await this.updateOrAddProduct(currentProduct);
              updatedCount++;
            }
          }
          currentProduct = { name: trimmed.split(':')[1]?.trim() };
        } else if (trimmed.match(/^Price:/i)) {
          currentProduct.price = parseFloat(trimmed.split(':')[1]?.replace(/[^0-9.]/g, ''));
        } else if (trimmed.match(/^Stock:/i)) {
          currentProduct.stock = parseInt(trimmed.split(':')[1]?.replace(/[^0-9]/g, ''));
        } else if (trimmed.match(/^Description:/i)) {
          currentProduct.description = trimmed.split(':')[1]?.trim();
        }
      }

      // Save last product
      if (currentProduct.name && this.validateRecord(currentProduct)) {
        await this.updateOrAddProduct(currentProduct);
        updatedCount++;
      }

      return updatedCount;
    } catch (error) {
      logger.error(`PDF processing error:`, error);
      return 0;
    }
  }

  sanitizeRecord(record) {
    const sanitized = {};

    // Sanitize strings
    if (record.name) sanitized.name = validator.escape(record.name.trim());
    if (record.description) sanitized.description = validator.escape(record.description.trim());
    if (record.drugName) sanitized.drugName = validator.escape(record.drugName.trim());
    if (record.brandName) sanitized.brandName = validator.escape(record.brandName.trim());
    if (record.genericEquivalent) sanitized.genericEquivalent = validator.escape(record.genericEquivalent.trim());
    if (record.dosageForm) sanitized.dosageForm = validator.escape(record.dosageForm.trim());
    if (record.strength) sanitized.strength = validator.escape(record.strength.trim());
    if (record.activeIngredients) sanitized.activeIngredients = validator.escape(record.activeIngredients.trim());
    if (record.warnings) sanitized.warnings = validator.escape(record.warnings.trim());

    // Sanitize numbers
    if (record.price) sanitized.price = parseFloat(record.price);
    if (record.stock) sanitized.stock = parseInt(record.stock);
    if (record.dosesPerPack) sanitized.dosesPerPack = parseInt(record.dosesPerPack);

    // Sanitize booleans
    if (record.prescriptionRequired !== undefined) {
      sanitized.prescriptionRequired = record.prescriptionRequired === 'true' || record.prescriptionRequired === '1' || record.prescriptionRequired === true;
    }

    // Sanitize URL
    if (record.image && validator.isURL(record.image)) {
      sanitized.image = record.image;
    }

    // Category
    if (record.category) {
      sanitized.category = ['general', 'pharmacy'].includes(record.category) ? record.category : 'general';
    }

    return sanitized;
  }

  validateRecord(record) {
    // Required fields
    if (!record.name || record.name.length === 0) return false;
    if (!record.price || isNaN(record.price) || record.price < 0) return false;
    if (!record.stock || isNaN(record.stock) || record.stock < 0) return false;

    // Validate price range
    if (record.price > 999999) return false;

    // Validate stock range
    if (record.stock > 999999) return false;

    return true;
  }

  async updateOrAddProduct(product) {
    const sanitized = this.sanitizeRecord(product);
    
    if (!this.validateRecord(sanitized)) {
      return;
    }

    const existingIndex = this.catalog.findIndex(
      item => item.name === sanitized.name && item.storeId === this.storeId
    );

    if (existingIndex !== -1) {
      this.catalog[existingIndex] = {
        ...this.catalog[existingIndex],
        ...sanitized,
        id: this.catalog[existingIndex].id,
        storeId: this.storeId
      };
    } else {
      this.catalog.push({
        id: this.nextId.value++,
        ...sanitized,
        storeId: this.storeId,
        deliveryOptions: ['pickup', 'delivery']
      });
    }
  }

  markAsRead(seqno) {
    this.imap.addFlags(seqno, ['\\Seen'], (err) => {
      if (err) {
        logger.error(`Failed to mark email as read:`, err);
      }
    });
  }

  async sendConfirmationEmail(to, count) {
    // This would use nodemailer to send confirmation
    // Implementation depends on your email service
    logger.info(`Would send confirmation to ${to}: ${count} items updated`);
  }
}

export { EmailInventoryMonitor, storeEmailConfig };
