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

      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255),
          password_hash VARCHAR(255), -- For future password-based auth
          application_type ENUM('tuneer', 'gajendra', 'madhu') NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create otp_codes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          application_type ENUM('tuneer', 'gajendra', 'madhu') NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
      `);

      // Create login_history table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS login_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          email VARCHAR(255) NOT NULL,
          application_type ENUM('tuneer', 'gajendra', 'madhu') NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          login_status ENUM('success', 'failed') NOT NULL,
          login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          logout_time TIMESTAMP NULL,
          session_token VARCHAR(255),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Create indexes for better performance
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_users_app_type ON users(application_type)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_login_history_app_type ON login_history(application_type)`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time)`);

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

  // New methods for multi-application user management
  async createUser(email, username, passwordHash) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO users (email, username, password_hash) 
        VALUES (?, ?, ?)
      `, [email, username, passwordHash]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUserByEmail(email) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM users WHERE email = ? AND is_active = TRUE
      `, [email]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createOTP(email, otpCode) {
    const connection = await this.pool.getConnection();
    
    try {
      // Delete existing unused OTPs for this email
      await connection.query(`
        DELETE FROM otp_codes WHERE email = ? AND used = FALSE
      `, [email]);
      
      // Insert new OTP (valid for 10 minutes)
      const [result] = await connection.query(`
        INSERT INTO otp_codes (email, otp_code, expires_at) 
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `, [email, otpCode]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating OTP:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async verifyOTP(email, otpCode) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM otp_codes 
        WHERE email = ? AND otp_code = ? AND used = FALSE AND expires_at > NOW()
      `, [email, otpCode]);
      
      if (rows.length > 0) {
        // Mark OTP as used
        await connection.query(`
          UPDATE otp_codes SET used = TRUE WHERE id = ?
        `, [rows[0].id]);
        
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async saveLoginHistory(email, ipAddress = null, userAgent = null, loginStatus = 'success') {
    const connection = await this.pool.getConnection();
    
    try {
      // Get user ID
      const user = await this.getUserByEmail(email);
      const userId = user ? user.id : null;
      
      const [result] = await connection.query(`
        INSERT INTO login_history (user_id, email, ip_address, user_agent, login_status) 
        VALUES (?, ?, ?, ?, ?)
      `, [userId, email, ipAddress, userAgent, loginStatus]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving login history:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getLoginHistory(email, limit = 10) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM login_history 
        WHERE email = ?
        ORDER BY login_time DESC LIMIT ?
      `, [email, limit]);
      
      return rows;
    } catch (error) {
      console.error('Error getting login history:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Admin methods for business verticals
  async getAllBusinessVerticals() {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM business_verticals 
        ORDER BY name ASC
      `);
      
      return rows;
    } catch (error) {
      console.error('Error getting business verticals:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createBusinessVertical(name, description) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO business_verticals (name, description) 
        VALUES (?, ?)
      `, [name, description]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating business vertical:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateBusinessVertical(id, name, description, isActive) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        UPDATE business_verticals 
        SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, description, isActive, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating business vertical:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteBusinessVertical(id) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        DELETE FROM business_verticals WHERE id = ?
      `, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting business vertical:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Admin methods for merchants
  async getAllMerchants(limit = 100, offset = 0) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT m.*, bv.name as business_vertical_name 
        FROM merchants m
        LEFT JOIN business_verticals bv ON m.business_vertical_id = bv.id
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return rows;
    } catch (error) {
      console.error('Error getting merchants:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createMerchant(merchantData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO merchants (
          business_name, business_vertical_id, contact_person, email, phone,
          address, city, state, country, postal_code, website, business_type,
          annual_revenue, employee_count, established_year, tax_id, additional_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        merchantData.business_name,
        merchantData.business_vertical_id,
        merchantData.contact_person,
        merchantData.email,
        merchantData.phone,
        merchantData.address,
        merchantData.city,
        merchantData.state,
        merchantData.country,
        merchantData.postal_code,
        merchantData.website,
        merchantData.business_type,
        merchantData.annual_revenue,
        merchantData.employee_count,
        merchantData.established_year,
        merchantData.tax_id,
        merchantData.additional_data || null
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating merchant:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async bulkCreateMerchants(merchants) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const merchant of merchants) {
        const [result] = await connection.query(`
          INSERT INTO merchants (
            business_name, business_vertical_id, contact_person, email, phone,
            address, city, state, country, postal_code, website, business_type,
            annual_revenue, employee_count, established_year, tax_id, additional_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          merchant.business_name,
          merchant.business_vertical_id,
          merchant.contact_person,
          merchant.email,
          merchant.phone,
          merchant.address,
          merchant.city,
          merchant.state,
          merchant.country,
          merchant.postal_code,
          merchant.website,
          merchant.business_type,
          merchant.annual_revenue,
          merchant.employee_count,
          merchant.established_year,
          merchant.tax_id,
          merchant.additional_data || null
        ]);
        
        results.push(result.insertId);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      console.error('Error in bulk merchant creation:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateMerchant(id, merchantData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        UPDATE merchants 
        SET business_name = ?, business_vertical_id = ?, contact_person = ?, 
            email = ?, phone = ?, address = ?, city = ?, state = ?, 
            country = ?, postal_code = ?, website = ?, business_type = ?,
            annual_revenue = ?, employee_count = ?, established_year = ?,
            tax_id = ?, additional_data = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        merchantData.business_name,
        merchantData.business_vertical_id,
        merchantData.contact_person,
        merchantData.email,
        merchantData.phone,
        merchantData.address,
        merchantData.city,
        merchantData.state,
        merchantData.country,
        merchantData.postal_code,
        merchantData.website,
        merchantData.business_type,
        merchantData.annual_revenue,
        merchantData.employee_count,
        merchantData.established_year,
        merchantData.tax_id,
        merchantData.additional_data || null,
        id
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating merchant:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteMerchant(id) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        DELETE FROM merchants WHERE id = ?
      `, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting merchant:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Merchant applications methods
  async getMerchantApplications(merchantId) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM merchant_applications 
        WHERE merchant_id = ? AND is_active = TRUE
        ORDER BY application_name ASC
      `, [merchantId]);
      
      return rows;
    } catch (error) {
      console.error('Error getting merchant applications:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createMerchantApplication(applicationData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO merchant_applications (
          merchant_id, application_name, application_description, 
          application_url, application_type
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        applicationData.merchant_id,
        applicationData.application_name,
        applicationData.application_description,
        applicationData.application_url,
        applicationData.application_type
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating merchant application:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateMerchantApplication(id, applicationData) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        UPDATE merchant_applications 
        SET application_name = ?, application_description = ?, 
            application_url = ?, application_type = ?, is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        applicationData.application_name,
        applicationData.application_description,
        applicationData.application_url,
        applicationData.application_type,
        applicationData.is_active,
        id
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating merchant application:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteMerchantApplication(id) {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        DELETE FROM merchant_applications WHERE id = ?
      `, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting merchant application:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get merchants by business vertical
  async getMerchantsByVertical(verticalId, limit = 100, offset = 0) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT m.*, bv.name as business_vertical_name 
        FROM merchants m
        LEFT JOIN business_verticals bv ON m.business_vertical_id = bv.id
        WHERE m.business_vertical_id = ? AND m.is_active = TRUE
        ORDER BY m.business_name ASC
        LIMIT ? OFFSET ?
      `, [verticalId, limit, offset]);
      
      return rows;
    } catch (error) {
      console.error('Error getting merchants by vertical:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Admin authentication methods
  async getAdminUserByUsername(username) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE
      `, [username]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting admin user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAdminUserByEmail(email) {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT * FROM admin_users WHERE email = ? AND is_active = TRUE
      `, [email]);
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting admin user by email:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateAdminLastLogin(userId) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.query(`
        UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `, [userId]);
    } catch (error) {
      console.error('Error updating admin last login:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async createAdminUser(username, email, passwordHash, fullName, role = 'admin') {
    const connection = await this.pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        INSERT INTO admin_users (username, email, password_hash, full_name, role) 
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, passwordHash, fullName, role]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

}

module.exports = new DatabaseService();