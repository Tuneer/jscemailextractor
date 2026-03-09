const dbService = require('../services/db-service');
const { ImapSimple, connect } = require('imap-simple');
const { simpleParser } = require('mailparser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class EmailAutomationService {
  constructor() {
    this.imapConfig = {
      imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 993,
        tls: true,
        authTimeout: 3000
      }
    };
    
    // Create folders for attachments and scraped data
    this.attachmentsFolder = path.join(__dirname, '../../attachments');
    this.scrapedDataFolder = path.join(__dirname, '../../scraped_data');
    
    // Ensure folders exist
    if (!fs.existsSync(this.attachmentsFolder)) {
      fs.mkdirSync(this.attachmentsFolder, { recursive: true });
    }
    if (!fs.existsSync(this.scrapedDataFolder)) {
      fs.mkdirSync(this.scrapedDataFolder, { recursive: true });
    }
  }

  // Step 1: Connect to IMAP server
  async connectToEmail() {
    try {
      const connection = await connect(this.imapConfig);
      return connection;
    } catch (error) {
      console.error('Error connecting to email:', error);
      throw error;
    }
  }

  // Step 1: Fetch unread emails automatically
  async fetchUnreadEmails(connection) {
    try {
      await connection.openBox('INBOX');
      
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: true,
        struct: true
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      return messages;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  // Step 2.1: Extract email content
  async parseEmail(message) {
    try {
      const all = message.parts.filter(part => part.which === 'TEXT');
      const header = message.parts.find(part => part.which === 'HEADER');
      
      let bodyText = '';
      let bodyHtml = '';
      
      if (all.length > 0) {
        bodyText = all[0].body.toString('utf-8');
        bodyHtml = bodyText;
      }

      const subject = header.body.subject ? header.body.subject[0] : '';
      const from = header.body.from ? header.body.from[0] : '';
      const to = header.body.to ? header.body.to[0] : '';
      const date = header.body.date ? new Date(header.body.date[0]) : new Date();

      // Generate unique UID
      const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        uid,
        subject,
        from,
        to,
        date,
        bodyText,
        bodyHtml
      };
    } catch (error) {
      console.error('Error parsing email:', error);
      throw error;
    }
  }

  // Step 2.2: Extract attachments and save to folder
  async extractAndSaveAttachments(connection, message, emailId) {
    try {
      const attachments = [];
      const attachmentParts = message.parts.filter(part => 
        part.body && part.body.DISPOSITION && 
        part.body.DISPOSITION[0] && 
        part.body.DISPOSITION[0].toUpperCase() === 'ATTACHMENT'
      );

      // Create email-specific folder
      const emailFolder = path.join(this.attachmentsFolder, `email_${emailId}`);
      if (!fs.existsSync(emailFolder)) {
        fs.mkdirSync(emailFolder, { recursive: true });
      }

      for (const part of attachmentParts) {
        const filename = part.body.PARAMS ? part.body.PARAMS.NAME : `attachment_${Date.now()}`;
        const contentType = part.body.TYPE + '/' + part.body.SUBTYPE;
        const size = part.body.SIZE;

        // Download attachment data
        const msgData = await connection.getPartData(message, part);

        // Save attachment to folder
        const filePath = path.join(emailFolder, filename);
        fs.writeFileSync(filePath, msgData);

        console.log(`Saved attachment to: ${filePath}`);

        attachments.push({
          filename,
          contentType,
          size,
          filePath,
          data: msgData
        });
      }

      return attachments;
    } catch (error) {
      console.error('Error extracting attachments:', error);
      throw error;
    }
  }

  // Step 2.2: Process Excel attachment and save to database
  async processExcelAndSaveToDatabase(attachment, emailId) {
    try {
      const filePath = attachment.filePath;
      
      // Read Excel file from saved location
      const workbook = XLSX.readFile(filePath);
      const extractedData = {};

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        extractedData[sheetName] = jsonData;
      }

      // Save to database
      const db = await dbService.getConnection();
      
      const [result] = await db.query(
        `INSERT INTO email_attachments 
         (email_id, filename, content_type, size, file_path, excel_data, is_coupon_file) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [emailId, attachment.filename, attachment.contentType, attachment.size, filePath, JSON.stringify(extractedData), true]
      );

      console.log(`Excel data saved to database, attachment ID: ${result.insertId}`);

      return {
        attachmentId: result.insertId,
        extractedData
      };
    } catch (error) {
      console.error('Error processing Excel:', error);
      throw error;
    }
  }

  // Step 3: Identify coupon items from Excel data
  async identifyCouponItems(excelData, attachmentId) {
    try {
      const db = await dbService.getConnection();
      const items = [];

      // Process each sheet in the Excel file
      for (const [sheetName, rows] of Object.entries(excelData)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // Create a family for this sheet
        const [familyResult] = await db.query(
          `INSERT INTO coupon_families 
           (attachment_id, family_name, additional_info) 
           VALUES (?, ?, ?)`,
          [attachmentId, sheetName, JSON.stringify({ sheet_name: sheetName })]
        );

        const familyId = familyResult.insertId;

        // Insert each row as a coupon item
        for (const rowData of rows) {
          // Extract item details from row
          const itemName = rowData['Item Name'] || rowData['item_name'] || rowData['Product'] || rowData['product'] || rowData['Name'] || rowData['name'] || 'Unknown Item';
          const itemCode = rowData['Item Code'] || rowData['item_code'] || rowData['SKU'] || rowData['sku'] || rowData['Code'] || null;
          const price = parseFloat(rowData['Price'] || rowData['price'] || rowData['MRP'] || rowData['mrp'] || 0);
          const quantity = parseFloat(rowData['Qty'] || rowData['qty'] || rowData['Quantity'] || rowData['quantity'] || 1);
          
          const [itemResult] = await db.query(
            `INSERT INTO coupon_items 
             (family_id, item_name, item_code, price, quantity, description) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [familyId, itemName, itemCode, price, quantity, JSON.stringify(rowData)]
          );

          items.push({
            itemId: itemResult.insertId,
            itemName,
            itemCode,
            price,
            quantity,
            rowData
          });
        }
      }

      console.log(`Identified ${items.length} coupon items`);
      return items;
    } catch (error) {
      console.error('Error identifying coupon items:', error);
      throw error;
    }
  }

  // Save email content to database
  async saveEmailToDatabase(emailData, userId, merchantId) {
    try {
      const db = await dbService.getConnection();

      const [emailResult] = await db.query(
        `INSERT INTO email_automation 
         (email_uid, subject, from_address, to_address, date_received, body_text, body_html, user_id, merchant_id, is_processed) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [emailData.uid, emailData.subject, emailData.from, emailData.to, emailData.date, emailData.bodyText, emailData.bodyHtml, userId, merchantId]
      );

      return emailResult.insertId;
    } catch (error) {
      console.error('Error saving email to database:', error);
      throw error;
    }
  }

  // Mark email as processed
  async markEmailProcessed(emailId) {
    try {
      const db = await dbService.getConnection();
      await db.query(
        `UPDATE email_automation SET is_processed = TRUE WHERE id = ?`,
        [emailId]
      );
    } catch (error) {
      console.error('Error marking email as processed:', error);
    }
  }

  // Main automation function - Step by Step
  async automateEmailProcessing(userId, merchantId) {
    try {
      console.log('=== STEP 1: Reading incoming emails automatically ===');
      
      const connection = await this.connectToEmail();
      console.log('Connected to email server');

      const messages = await this.fetchUnreadEmails(connection);
      console.log(`Found ${messages.length} unread emails`);

      const processedEmails = [];

      for (const message of messages) {
        try {
          // Step 2.1: Extract email content
          console.log('\n=== STEP 2.1: Extracting email content ===');
          const emailData = await this.parseEmail(message);
          console.log(`Subject: ${emailData.subject}`);

          // Save email to database first to get ID
          const emailId = await this.saveEmailToDatabase(emailData, userId, merchantId);
          console.log(`Email saved with ID: ${emailId}`);

          // Step 2.2: Extract attachments and save to folder
          console.log('\n=== STEP 2.2: Extracting attachments and saving to folder ===');
          const attachments = await this.extractAndSaveAttachments(connection, message, emailId);
          console.log(`Found ${attachments.length} attachments`);

          // Process each attachment
          for (const attachment of attachments) {
            // Only process Excel files
            if (attachment.filename.endsWith('.xlsx') || attachment.filename.endsWith('.xls')) {
              console.log(`\n=== Processing Excel: ${attachment.filename} ===`);
              
              // Save Excel data to database
              const { attachmentId, extractedData } = await this.processExcelAndSaveToDatabase(attachment, emailId);
              
              // Step 3: Identify coupon items and save to database
              console.log('\n=== STEP 3: Converting Excel items to database table ===');
              const items = await this.identifyCouponItems(extractedData, attachmentId);
              
              processedEmails.push({
                emailId,
                subject: emailData.subject,
                attachmentId,
                itemCount: items.length
              });
            }
          }

          // Mark email as processed
          await this.markEmailProcessed(emailId);

        } catch (error) {
          console.error('Error processing individual email:', error);
          continue;
        }
      }

      await connection.end();
      console.log('\n=== Email automation completed ===');

      return processedEmails;
    } catch (error) {
      console.error('Email automation failed:', error);
      throw error;
    }
  }
}

module.exports = new EmailAutomationService();
