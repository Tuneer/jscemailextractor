# 🛡️ Security Policy

## 📋 Table of Contents
1. [Supported Versions](#supported-versions)
2. [Reporting a Vulnerability](#reporting-a-vulnerability)
3. [Security Measures](#security-measures)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Protection](#data-protection)
6. [Infrastructure Security](#infrastructure-security)
7. [Incident Response](#incident-response)

---

## ✅ Supported Versions

We actively support security updates for the following versions:

| Version | Supported          | Notes                        |
| ------- | ------------------ | ---------------------------- |
| 1.x.x   | ✅ Yes             | Current stable release       |
| < 1.0   | ❌ No              | Legacy versions unsupported  |

---

## 🚨 Reporting a Vulnerability

### How to Report
If you discover a security vulnerability, please report it responsibly:

1. **Do not open a public issue** for security vulnerabilities
2. **Email directly** to: mahatpuretuneer@gmail.com
3. **Provide detailed information** about the vulnerability
4. **Include reproduction steps** if possible
5. **Suggest potential fixes** if known

### What to Include in Your Report
- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Location** where the vulnerability exists
- **Steps to reproduce** the vulnerability
- **Potential impact** of the vulnerability
- **Possible mitigations** you've identified
- **Your contact information** for follow-up

### Expected Response Time
- **Acknowledgment**: Within 48 hours
- **Status update**: Within 1 week
- **Resolution timeline**: Within 30 days (complex issues may take longer)

### Responsible Disclosure
We follow responsible disclosure practices:
- We will investigate and confirm the vulnerability
- We will develop and test a fix
- We will coordinate with you on the disclosure timing
- We will credit you in our security advisory (if desired)

---

## 🔐 Security Measures

### Authentication Security
- **Passwordless Authentication**: Uses email OTP instead of passwords
- **JWT Tokens**: Stateful authentication with 24-hour expiration
- **OTP Expiration**: OTPs expire after 10 minutes
- **Rate Limiting**: Prevents brute force attacks on OTP verification

### Input Validation
- **Email Validation**: All email addresses are validated using regex
- **Query Sanitization**: Gmail IMAP queries are sanitized to prevent injection
- **File Type Validation**: Only Excel/CSV files are processed
- **Size Limits**: File size limits prevent denial of service attacks

### API Security
- **Authentication Middleware**: All protected routes require JWT tokens
- **CORS Configuration**: Properly configured to prevent cross-site attacks
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Input Sanitization**: All user inputs are sanitized before processing

---

## 🔐 Authentication & Authorization

### JWT Implementation
- **Token Expiration**: 24-hour expiration time
- **Secret Rotation**: JWT secrets should be rotated regularly
- **Token Storage**: Stored in localStorage (consider HttpOnly cookies in production)
- **Token Refresh**: Not currently implemented (consider for future releases)

### OTP Security
- **Generation**: Cryptographically secure random OTP generation
- **Storage**: OTPs stored in memory with expiration timestamps
- **Validation**: Constant-time comparison to prevent timing attacks
- **Cleanup**: Automatic cleanup of expired OTPs every 5 minutes

### Session Management
- **LocalStorage**: JWT tokens stored in browser localStorage
- **Automatic Logout**: Session expires with JWT token
- **Concurrent Sessions**: Multiple sessions allowed per user
- **Session Termination**: Manual logout clears tokens

---

## 📊 Data Protection

### Email Data Handling
- **Read-Only Access**: Gmail IMAP connection uses read-only access
- **No Data Storage**: Email content is not permanently stored on servers
- **Temporary Files**: Attachments are temporarily stored and cleaned up
- **Encryption in Transit**: All communications use HTTPS/TLS

### File Processing Security
- **File Type Restrictions**: Only Excel (.xlsx, .xls) and CSV files processed
- **Size Limits**: 10MB maximum file size to prevent resource exhaustion
- **Virus Scanning**: Not implemented (consider for production use)
- **Path Traversal**: File paths are sanitized to prevent directory traversal

### Data Privacy
- **Minimal Data Collection**: Only email addresses and OTPs are collected
- **No Personal Data Storage**: No personal information is permanently stored
- **GDPR Compliance**: Designed to comply with GDPR regulations
- **Data Retention**: Temporary data is automatically cleaned up

---

## 🏗️ Infrastructure Security

### Environment Configuration
- **Environment Variables**: Sensitive data stored in environment variables
- **.gitignore**: Environment files excluded from version control
- **Secret Management**: Use of dotenv for configuration management
- **Access Controls**: Production environment access restricted

### Server Security
- **CORS Policy**: Properly configured to allow only trusted origins
- **HTTP Headers**: Security headers implemented where possible
- **Error Handling**: Production errors don't expose sensitive information
- **Logging**: Security-relevant events are logged appropriately

### Third-Party Integrations
- **Gmail API**: Uses app-specific passwords instead of account passwords
- **Nodemailer**: Configured with secure SMTP settings
- **Dependencies**: Regular security audits of npm packages
- **Updates**: Keep dependencies up to date with security patches

---

## 🚀 Production Security Recommendations

### Additional Security Measures (for Production)
- **HTTPS Enforcement**: Force HTTPS in production
- **CSP Headers**: Implement Content Security Policy headers
- **HSTS**: Enable HTTP Strict Transport Security
- **Subresource Integrity**: Implement SRI for external resources
- **Rate Limiting**: Implement server-level rate limiting
- **WAF**: Consider Web Application Firewall
- **Monitoring**: Implement security monitoring and alerting
- **Backup**: Regular encrypted backups of critical data

### Authentication Enhancements (for Production)
- **HttpOnly Cookies**: Store JWT tokens in HttpOnly cookies
- **CSRF Protection**: Implement CSRF tokens
- **Two-Factor Authentication**: Add optional 2FA
- **Session Management**: Implement server-side session storage
- **Audit Logs**: Log authentication events

### Data Protection Enhancements (for Production)
- **Encryption at Rest**: Encrypt sensitive data in databases
- **File Scanning**: Implement antivirus scanning for attachments
- **Access Logging**: Log all data access for audit purposes
- **Data Masking**: Mask sensitive data in logs
- **Retention Policies**: Implement data retention and deletion policies

---

## 📞 Security Contacts

### Primary Contact
- **Name**: Tuneer Mahatpure
- **Email**: mahatpuretuneer@gmail.com
- **Role**: Lead Developer & Security Maintainer

### Emergency Response
For urgent security issues:
- Email: mahatpuretuneer@gmail.com
- Include "[URGENT SECURITY]" in subject line
- Response within 24 hours guaranteed

---

## 📈 Security Updates

### Patch Release Process
1. **Vulnerability Confirmed**: Security team confirms the issue
2. **Patch Development**: Fix is developed in private branch
3. **Testing**: Fix is thoroughly tested
4. **Release**: Patch is released as security update
5. **Advisory**: Security advisory is published
6. **Credit**: Reporter is credited (if desired)

### Versioning
- Security patches are released as patch versions (1.x.Y)
- Breaking security changes may warrant minor version updates (1.Y.0)
- Major security architecture changes may warrant major version updates (Y.0.0)

---

## 📚 Security Resources

### Developer Guidelines
- Follow the security practices outlined in [Coding Standards](CODING_STANDARDS.md)
- Review OWASP Top 10 security risks
- Stay updated on Node.js and Angular security best practices
- Regular security training for development team

### Tools and Libraries
- **npm audit**: Regular dependency vulnerability scanning
- **eslint-plugin-security**: Static code analysis for security issues
- **Retire.js**: Check for vulnerable JavaScript libraries
- **Snyk**: Continuous security monitoring

---

## 📊 Security Metrics

### Current Security Posture
- **Authentication Method**: Passwordless OTP (secure)
- **Session Management**: JWT-based (needs enhancement)
- **Input Validation**: Implemented (needs regular review)
- **Error Handling**: Secure in production mode
- **Dependency Updates**: Regular updates encouraged

### Security Testing
- **Static Analysis**: ESLint with security plugins
- **Dependency Scanning**: npm audit integration
- **Penetration Testing**: Periodic manual testing
- **Automated Scanning**: CI/CD security checks (to be implemented)

---

## 🔄 Incident Response Process

### Discovery Phase
1. **Detection**: Vulnerability is detected internally or reported externally
2. **Assessment**: Severity and impact are assessed
3. **Containment**: Immediate steps to prevent exploitation
4. **Notification**: Relevant parties are notified

### Response Phase
1. **Analysis**: Thorough investigation of the vulnerability
2. **Remediation**: Develop and test the fix
3. **Implementation**: Deploy the fix to affected systems
4. **Verification**: Confirm the vulnerability is resolved

### Recovery Phase
1. **Monitoring**: Monitor systems for signs of exploitation
2. **Communication**: Inform stakeholders about the incident
3. **Documentation**: Document the incident and response
4. **Improvement**: Update processes to prevent similar incidents

---

## 📅 Security Reviews

### Regular Security Assessments
- **Quarterly**: Code review for security vulnerabilities
- **Bi-annually**: Infrastructure security assessment
- **Annually**: Penetration testing by third party
- **Post-release**: Security review of new features

### Security Checklist
- [ ] Authentication mechanisms reviewed
- [ ] Authorization controls verified
- [ ] Input validation tested
- [ ] Error handling secure
- [ ] Dependencies audited
- [ ] Environment configuration verified
- [ ] Network security assessed
- [ ] Data protection measures confirmed

---

This security policy is effective as of December 2025 and will be reviewed annually or as needed based on changes to the application or threat landscape.