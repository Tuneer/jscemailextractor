const mysql = require('mysql2/promise');

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection and create tables if they don't exist
    await this.createTables();
  }

  async createTables() {
    const connection = await this.pool.getConnection();

    try {
      // Create email_metadata table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_metadata (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email_uid VARCHAR(255) UNIQUE,
          subject VARCHAR(500),
          from_address VARCHAR(255),
          date_received DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create attachments table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS attachments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email_id INT,
          filename VARCHAR(255),
          content_type VARCHAR(255),
          size INT,
          FOREIGN KEY (email_id) REFERENCES email_metadata(id) ON DELETE CASCADE
        )
      `);

      // Create excel_data table to store the actual Excel/CSV data
      await connection.query(`
        CREATE TABLE IF NOT EXISTS excel_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          attachment_id INT,
          row_index INT,
          data JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
        )
      `);

      // Create merchant_templates table for formatted Excel templates
      await connection.query(`
        CREATE TABLE IF NOT EXISTS merchant_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          merchant_name VARCHAR(255),
          template_name VARCHAR(255),
          header_rows JSON, -- Stores the first 5 rows of template data
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user_login_history table to track user logins
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_login_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255),
          login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveEmailMetadata(emailData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO email_metadata (email_uid, subject, from_address, date_received) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        subject = VALUES(subject), 
        from_address = VALUES(from_address), 
        date_received = VALUES(date_received)
      `, [
        emailData.uid,
        emailData.subject,
        emailData.from,
        emailData.date
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving email metadata:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveAttachment(attachmentData, emailId) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO attachments (email_id, filename, content_type, size) 
        VALUES (?, ?, ?, ?)
      `, [
        emailId,
        attachmentData.filename,
        attachmentData.contentType,
        attachmentData.size
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving attachment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveExcelData(excelData, attachmentId) {
    const connection = await this.pool.getConnection();
    
    try {
      const insertPromises = excelData.data.map(async (row, index) => {
        await connection.query(`
          INSERT INTO excel_data (attachment_id, row_index, data) 
          VALUES (?, ?, ?)
        `, [
          attachmentId,
          index,
          JSON.stringify(row)
        ]);
      });
      
      await Promise.all(insertPromises);
    } catch (error) {
      console.error('Error saving excel data:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getEmailsWithAttachments() {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT em.id, em.email_uid, em.subject, em.from_address, em.date_received, 
               a.id as attachment_id, a.filename, a.content_type, a.size
        FROM email_metadata em
        LEFT JOIN attachments a ON em.id = a.email_id
        ORDER BY em.date_received DESC
      `);
      
      return rows;
    } catch (error) {
      console.error('Error getting emails with attachments:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getExcelDataByAttachmentId(attachmentId) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT row_index, data
        FROM excel_data
        WHERE attachment_id = ?
        ORDER BY row_index ASC
      `, [attachmentId]);
      
      return rows.map(row => JSON.parse(row.data));
    } catch (error) {
      console.error('Error getting excel data:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveTemplate(templateData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO merchant_templates (merchant_name, template_name, header_rows) 
        VALUES (?, ?, ?)
      `, [
        templateData.merchantName,
        templateData.templateName,
        JSON.stringify(templateData.headerRows)
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getTemplate(templateId) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT *
        FROM merchant_templates
        WHERE id = ?
      `, [templateId]);
      
      if (rows.length > 0) {
        rows[0].header_rows = JSON.parse(rows[0].header_rows);
        return rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveLoginHistory(email, ipAddress = null, userAgent = null) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO user_login_history (email, ip_address, user_agent) 
        VALUES (?, ?, ?)
      `, [
        email,
        ipAddress || null,
        userAgent || null
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving login history:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAllTemplates() {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT *
        FROM merchant_templates
        ORDER BY created_at DESC
      `);
      
      return rows.map(row => {
        row.header_rows = JSON.parse(row.header_rows);
        return row;
      });
    } catch (error) {
      console.error('Error getting all templates:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new DatabaseService();