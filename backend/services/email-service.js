const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class EmailService {
  constructor() {
    // Initialize transporter based on environment settings
    this.setupTransporter();

    // In-memory OTP storage (use Redis in production)
    this.otpStore = new Map();
  }

  setupTransporter() {
    // Check if SMTP credentials are provided
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use SMTP transport
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Use sendmail transport (works with server's mail configuration)
      this.transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
      });
    }
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(email) {
    // Fixed OTP for developer testing
    const isDeveloper = email === 'mahatpuretuneer@gmail.com';
    const otp = isDeveloper ? '123456' : this.generateOTP();
    const expiryTime = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 * 1000);

    // Store OTP with expiry
    this.otpStore.set(email, { otp, expiryTime });

    // Skip email sending for developer - OTP is fixed to 123456
    if (isDeveloper) {
      console.log(`Developer login: OTP is 123456 (fixed for testing)`);
      return { success: true, message: 'OTP sent successfully' };
    }

    const mailOptions = {
      from: `"Email Extractor" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Login OTP - Email Extractor',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Login Verification</h1>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>You requested to log in to Email Extractor. Use the OTP code below to complete your login:</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>⏱️ This code will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.</strong></p>
              
              <p>If you didn't request this code, please ignore this email.</p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>Contact: mahatpuretuneer@gmail.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP sent to ${email}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  verifyOTP(email, otp) {
    const stored = this.otpStore.get(email);

    if (!stored) {
      return { success: false, message: 'OTP not found or expired' };
    }

    if (Date.now() > stored.expiryTime) {
      this.otpStore.delete(email);
      return { success: false, message: 'OTP has expired' };
    }

    if (stored.otp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    // OTP is valid, remove it
    this.otpStore.delete(email);
    return { success: true, message: 'OTP verified successfully' };
  }

  // Cleanup expired OTPs periodically
  startCleanupTask() {
    setInterval(() => {
      const now = Date.now();
      for (const [email, data] of this.otpStore.entries()) {
        if (now > data.expiryTime) {
          this.otpStore.delete(email);
          console.log(`Cleaned up expired OTP for ${email}`);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
}

module.exports = new EmailService();
