const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const dbService = require('./db-service');

class GmailIMAPService {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: process.env.GMAIL_USER,
        password: process.env.GMAIL_APP_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      this.imap.once('ready', () => {
        console.log('Gmail IMAP connection established');
        this.isConnected = true;
        this.connectionPromise = null;
        resolve();
      });

      this.imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        this.isConnected = false;
        this.connectionPromise = null;
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('IMAP connection ended');
        this.isConnected = false;
        this.connectionPromise = null;
      });

      this.imap.connect();
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }

  buildSearchCriteria(options = {}) {
    const criteria = [];
    
    if (options.senderEmail) {
      criteria.push(['FROM', options.senderEmail]);
    }
    
    criteria.push(['X-GM-RAW', 'has:attachment']);

    if (options.query) {
      criteria.push(['X-GM-RAW', options.query]);
    }

    return criteria.length > 0 ? criteria : ['ALL'];
  }

  async searchEmails(options = {}) {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        this.imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          const criteria = this.buildSearchCriteria(options);
          console.log('Search criteria:', JSON.stringify(criteria));

          this.imap.search(criteria, (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              resolve([]);
              return;
            }

            const maxResults = options.maxResults || 50;
            const limitedResults = results.slice(0, maxResults);

            const fetch = this.imap.fetch(limitedResults, {
              bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
              struct: true
            });

            const emails = [];

            fetch.on('message', (msg, seqno) => {
              let emailData = { id: seqno, uid: null, hasAttachments: false, attachmentCount: 0 };

              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                stream.once('end', () => {
                  const parsed = Imap.parseHeader(buffer);
                  emailData.subject = parsed.subject ? parsed.subject[0] : 'No Subject';
                  emailData.from = parsed.from ? parsed.from[0] : 'Unknown';
                  emailData.date = parsed.date ? new Date(parsed.date[0]).toISOString() : new Date().toISOString();
                });
              });

              msg.once('attributes', (attrs) => {
                emailData.uid = attrs.uid;
                if (attrs.struct) {
                  emailData.attachmentCount = this.countAttachments(attrs.struct);
                  emailData.hasAttachments = emailData.attachmentCount > 0;
                }
              });

              msg.once('end', () => {
                emails.push(emailData);
              });
            });

            fetch.once('error', reject);
            fetch.once('end', () => {
              resolve(emails);
            });
          });
        });
      });
    } catch (error) {
      console.error('Error searching emails:', error);
      throw error;
    }
  }

  countAttachments(struct) {
    let count = 0;
    
    const traverse = (part) => {
      if (Array.isArray(part)) {
        part.forEach(traverse);
      } else {
        if (part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT') {
          count++;
        }
        if (part.subtype && part.subtype.toUpperCase() === 'MIXED' && Array.isArray(part)) {
          part.forEach(traverse);
        }
      }
    };

    traverse(struct);
    return count;
  }

  async getFullEmail(uid) {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const fetch = this.imap.fetch([uid], { bodies: '', markSeen: false });
        let emailBuffer = '';

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              emailBuffer += chunk.toString('utf8');
            });
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(emailBuffer);
              resolve(parsed);
            } catch (error) {
              reject(error);
            }
          });
        });

        fetch.once('error', reject);
        fetch.once('end', () => {
          if (!emailBuffer) {
            reject(new Error('No email data received'));
          }
        });
      });
    });
  }

  async processEmails(emailIds, options = {}) {
    try {
      await this.connect();

      const downloadDir = process.env.DOWNLOAD_DIRECTORY || './temp/attachments';
      await fs.mkdir(downloadDir, { recursive: true });

      const processedEmails = [];
      let failed = 0;

      for (const uid of emailIds) {
        try {
          const email = await this.getFullEmail(uid);
          
          let emailDbId = null;
          try {
            // Save email metadata to database
            emailDbId = await dbService.saveEmailMetadata({
              uid: uid,
              subject: email.subject || 'No Subject',
              from: email.from ? email.from.text : 'Unknown',
              date: email.date ? email.date.toISOString() : new Date().toISOString()
            });
          } catch (dbError) {
            console.warn('Warning: Could not save email metadata to database:', dbError.message);
            // Continue processing even if database save fails
          }

          const emailData = {
            id: uid,
            uid: uid,
            subject: email.subject || 'No Subject',
            from: email.from ? email.from.text : 'Unknown',
            date: email.date ? email.date.toISOString() : new Date().toISOString(),
            attachments: []
          };

          if (email.attachments && email.attachments.length > 0) {
            for (const attachment of email.attachments) {
              const filename = attachment.filename || `attachment_${Date.now()}`;
              const filePath = path.join(downloadDir, filename);
              
              await fs.writeFile(filePath, attachment.content);

              let attachmentData = {
                filename: filename,
                contentType: attachment.contentType,
                size: attachment.size,
                data: [],
                headers: [],
                columnCount: 0,
                rowCount: 0
              };

              // Parse Excel/CSV files
              if (this.isExcelFile(filename) || this.isCsvFile(filename)) {
                const parsedData = await this.parseExcelFile(filePath);
                attachmentData.data = parsedData.data;
                attachmentData.headers = parsedData.headers;
                attachmentData.columnCount = parsedData.columnCount;
                attachmentData.rowCount = parsedData.rowCount;

                if (emailDbId) { // Only save to database if email was successfully saved to database
                  try {
                    // Save attachment to database
                    const attachmentDbId = await dbService.saveAttachment({
                      filename: filename,
                      contentType: attachment.contentType,
                      size: attachment.size
                    }, emailDbId);

                    // Save Excel data to database
                    await dbService.saveExcelData(parsedData, attachmentDbId);
                  } catch (dbError) {
                    console.warn('Warning: Could not save attachment data to database:', dbError.message);
                    // Continue processing even if database save fails
                  }
                }
              }

              emailData.attachments.push(attachmentData);
            }
          }

          processedEmails.push(emailData);
        } catch (error) {
          console.error(`Error processing email ${uid}:`, error);
          failed++;
        }
      }

      return {
        success: true,
        processed: processedEmails,
        count: processedEmails.length,
        total: emailIds.length,
        failed: failed
      };
    } catch (error) {
      console.error('Error processing emails:', error);
      throw error;
    }
  }

  isExcelFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.xlsx', '.xls', '.xlsm', '.xlsb'].includes(ext);
  }

  isCsvFile(filename) {
    return path.extname(filename).toLowerCase() === '.csv';
  }

  async parseExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: ''
      });

      if (jsonData.length === 0) {
        return {
          data: [],
          headers: [],
          columnCount: 0,
          rowCount: 0
        };
      }

      // Extract all unique headers
      const headersSet = new Set();
      jsonData.forEach(row => {
        Object.keys(row).forEach(key => headersSet.add(key));
      });
      const headers = Array.from(headersSet);

      return {
        data: jsonData,
        headers: headers,
        columnCount: headers.length,
        rowCount: jsonData.length
      };
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return {
        data: [],
        headers: [],
        columnCount: 0,
        rowCount: 0
      };
    }
  }
}

module.exports = new GmailIMAPService();
