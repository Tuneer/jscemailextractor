# 🧑‍💻 Developer Guide - Email Extractor

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Getting Started](#getting-started)
5. [File Structure](#file-structure)
6. [API Documentation](#api-documentation)
7. [Environment Variables](#environment-variables)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## 📖 Project Overview

**Email Extractor** is a full-stack web application that enables users to authenticate via OTP, connect to Gmail accounts, search and read emails with attachments, and extract data from Excel/CSV files attached to emails.

### Key Capabilities
- Passwordless authentication using email OTP
- Gmail IMAP integration for reading emails
- Excel/CSV attachment parsing and data extraction
- Real-time data preview and CSV export
- Responsive UI with centralized theme management
- Production-ready deployment architecture

---

## 🏗️ Architecture

### High-Level Architecture
```
Client Request
    ↓
Express Middleware (CORS, Body Parser)
    ↓
Authentication Middleware (JWT verification)
    ↓
Route Handlers
    ↓
Service Layer (Business Logic)
    ↓
External Services (Gmail IMAP, SMTP)
    ↓
Response to Client
```

### Backend Architecture
- **Server**: Node.js with Express.js
- **Authentication**: JWT tokens with 24-hour expiration
- **Email Services**: Nodemailer for SMTP, node-imap for Gmail IMAP
- **Data Processing**: XLSX for Excel parsing, mailparser for email content
- **Security**: Environment variables, authentication middleware, CORS

### Frontend Architecture
- **Framework**: Angular 21 with standalone components
- **State Management**: Service-based with RxJS observables
- **Routing**: Angular Router with authentication guards
- **Styling**: CSS variables for theming
- **API Communication**: HttpClient with JWT headers

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js v25.2.1 (development) / Node.js LTS recommended for production
- **Framework**: Express.js v4.x
- **Authentication**: JSON Web Tokens (JWT)
- **Email**: 
  - Nodemailer (SMTP for OTP delivery)
  - node-imap (Gmail IMAP for reading emails)
- **File Processing**: 
  - xlsx (Excel parsing)
  - csv-parser (CSV parsing)
- **Environment**: dotenv for configuration
- **Process Manager**: PM2 (production)

### Frontend
- **Framework**: Angular 21 (standalone components)
- **Language**: TypeScript 5.x
- **Build Tool**: Vite (via Angular CLI)
- **Styling**: Custom CSS with CSS Variables
- **HTTP Client**: Angular HttpClient
- **Routing**: Angular Router with guards
- **State Management**: Service-based (RxJS)

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (LTS recommended)
- npm v8+
- Git
- Gmail account with app password enabled

### Initial Setup

#### 1. Clone Repository
```bash
git clone https://github.com/your-repo/jscemailextractor.git
cd jscemailextractor
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# Required: JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD
nano .env
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### Running Locally

#### Terminal 1 - Backend
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

#### Terminal 2 - Frontend
```bash
cd ../frontend
ng serve
# App runs on http://localhost:4200
```

### Access Application
1. Open browser: `http://localhost:4200`
2. Login with developer email: `mahatpuretuneer@gmail.com`
3. Use OTP: `123456` (fixed for developer)

---

## 📁 File Structure

```
jscemailextractor/
│
├── backend/                          # Node.js Express Backend
│   ├── middleware/
│   │   └── auth-middleware.js        # JWT verification middleware
│   ├── routes/
│   │   ├── auth-routes.js            # OTP & login endpoints
│   │   └── gmail-routes.js           # Email search & attachment endpoints
│   ├── services/
│   │   ├── auth-service.js           # JWT token management
│   │   ├── email-service.js          # OTP generation & delivery
│   │   └── gmail-imap.js             # Gmail IMAP client & parsing
│   ├── .env                          # Environment variables (NOT in git)
│   ├── .env.example                  # Environment template
│   ├── ecosystem.config.js           # PM2 configuration
│   ├── package.json                  # Backend dependencies
│   └── server.js                     # Express app entry point
│
├── frontend/                         # Angular 21 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── login/            # OTP login flow
│   │   │   │   ├── home/             # Dashboard with feature cards
│   │   │   │   ├── email-reader/     # Email search & selection
│   │   │   │   ├── email-results/    # Attachment data display
│   │   │   │   └── developer-contact/ # Contact page
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts     # Route protection
│   │   │   ├── models/
│   │   │   │   └── email.models.ts   # TypeScript interfaces
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts   # Authentication logic
│   │   │   │   └── email.service.ts  # Email API calls
│   │   │   ├── app.routes.ts         # Application routing
│   │   │   └── app.ts                # Root component
│   │   ├── main.ts                   # Angular bootstrap (zone.js imported)
│   │   └── styles.css                # Global styles & theme variables
│   ├── angular.json                  # Angular configuration
│   ├── package.json                  # Frontend dependencies
│   └── tsconfig.json                 # TypeScript configuration
│
├── .gitignore                        # Git ignore rules
├── DEVELOPER_GUIDE.md                # This file
├── PROJECT_OVERVIEW.md               # Complete project documentation
├── README.md                         # Quick start guide
├── SETUP_GUIDE.md                    # Detailed setup instructions
├── APPLICATION_FLOW.md               # UI flow and screenshots
├── THEME_CHANGE_GUIDE.txt            # Theme customization guide
├── VPS_DEPLOYMENT.txt                # Linux deployment guide
├── WINDOWS_VPS_DEPLOYMENT.txt        # Windows deployment guide
├── DEPLOYMENT_CHECKLIST.txt          # Production deployment checklist
├── QUICK_DEPLOY.txt                  # Quick deployment script
└── build-production.sh               # Production build script
```

---

## 🌐 API Documentation

### Authentication Endpoints

#### POST /api/auth/request-otp
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please check your inbox."
}
```

#### POST /api/auth/verify-otp
**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com"
  }
}
```

#### GET /api/auth/validate
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "email": "user@example.com"
  }
}
```

### Email Endpoints

#### POST /api/gmail/emails
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "query": "has:attachment",
  "senderEmail": "sender@example.com",
  "maxResults": 50
}
```

**Response:**
```json
{
  "success": true,
  "emails": [
    {
      "id": 123,
      "uid": 123,
      "subject": "Email Subject",
      "from": "sender@example.com",
      "date": "2025-12-22T10:30:00Z",
      "hasAttachments": true,
      "attachmentCount": 1
    }
  ],
  "count": 1
}
```

#### POST /api/gmail/process
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "emailIds": [123, 456],
  "senderEmail": "sender@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "processed": [
    {
      "id": 123,
      "subject": "Weekly Report",
      "from": "sender@example.com",
      "date": "2025-12-21T10:30:00.000Z",
      "attachments": [
        {
          "filename": "report.xlsx",
          "contentType": "application/vnd.openxmlformats",
          "size": 125840,
          "data": [{...}, {...}],
          "headers": ["Date", "Product", "Sales", "Region"],
          "columnCount": 4,
          "rowCount": 50
        }
      ]
    }
  ],
  "count": 1,
  "total": 1,
  "failed": 0
}
```

---

## ⚙️ Environment Variables

### Backend Environment Variables
**File:** `backend/.env`

```bash
# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SMTP (OTP Delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Gmail IMAP (Email Reading)
GMAIL_USER=cp.jscglobalsolutions@gmail.com
GMAIL_APP_PASSWORD=wtka zbsk hpii azeo

# OTP
OTP_EXPIRY_MINUTES=10

# Security
ALLOWED_DOMAINS=                    # Empty = allow all domains
MAX_FILE_SIZE=10485760              # 10MB
DOWNLOAD_DIRECTORY=./temp/attachments
```

---

## 🔄 Development Workflow

### Component Development
1. Create new components in `frontend/src/app/components/`
2. Add to `app.routes.ts` if it's a new route
3. Import in parent component or module
4. Follow Angular best practices for component structure

### Service Development
1. Create new services in `frontend/src/app/services/` or `backend/services/`
2. Use dependency injection in Angular
3. Follow singleton pattern for shared services
4. Handle errors appropriately

### API Endpoint Development
1. Create new routes in `backend/routes/`
2. Add business logic in `backend/services/`
3. Apply authentication middleware where needed
4. Update API documentation

### Testing Checklist
- [ ] Backend server starts without errors
- [ ] Frontend loads at http://localhost:4200
- [ ] Login page displays correctly
- [ ] OTP email is received
- [ ] OTP verification works
- [ ] Home page displays two features
- [ ] Email Reader can search Gmail
- [ ] Email list displays properly
- [ ] Process Selected navigates to results
- [ ] Email Results shows data tables
- [ ] CSV export downloads files

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Backend Won't Start - EADDRINUSE
**Problem:** Port 3000 already in use

**Solution:**
```bash
# Kill existing node processes
pkill -f "node server.js"
# or
lsof -ti:3000 | xargs kill -9

# Restart
npm start
```

#### 2. Frontend Error - NG0908 Zone.js Required
**Problem:** Zone.js not imported

**Solution:**
Verify `frontend/src/main.ts` has:
```typescript
import 'zone.js';  // MUST be first line
import { bootstrapApplication } from '@angular/platform-browser';
```

#### 3. OTP Email Not Sending
**Problem:** SMTP configuration incorrect

**Solution:**
- Check Gmail app password (not account password)
- Enable "Less secure app access" or use app-specific password
- Verify SMTP_HOST, SMTP_PORT in .env
- For developer testing, use fixed OTP instead

#### 4. JWT Token Error - secretOrPrivateKey Required
**Problem:** JWT_SECRET not set in .env

**Solution:**
```bash
# Add to backend/.env
JWT_SECRET=your-secret-key-here

# Restart backend
npm start
```

#### 5. IMAP Connection Failed
**Problem:** Gmail IMAP not enabled or wrong credentials

**Solution:**
- Enable IMAP in Gmail settings
- Use app-specific password (not account password)
- Check GMAIL_USER and GMAIL_APP_PASSWORD in .env
- Verify no extra spaces in .env values

#### 6. Angular Build Failed
**Problem:** Dependencies or TypeScript errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build:prod
```

#### 7. CORS Error in Browser
**Problem:** Frontend can't access backend API

**Solution:**
Backend already has CORS enabled. If issue persists:
```javascript
// backend/server.js
app.use(cors({
  origin: 'http://localhost:4200',  // or your production domain
  credentials: true
}));
```

#### 8. CSV Export Not Working
**Problem:** Browser blocking download

**Solution:**
Check popup blocker settings. Ensure CSV generation logic:
```typescript
// frontend/src/app/services/email.service.ts
// CSV export functionality is already implemented
```

---

## 🚢 Deployment

### Build Process

#### 1. Frontend Build
```bash
cd frontend
npm run build:prod
# Output: frontend/dist/frontend/browser/
```

#### 2. Backend Configuration
The backend already serves the built frontend:
```javascript
// backend/server.js
const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});
```

### Deployment Options

#### Option 1: VPS (Linux)
See `VPS_DEPLOYMENT.txt` for complete guide.

**Quick Steps:**
```bash
# Install Node.js, PM2, Nginx
# Upload project files
cd backend
npm install --production
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx reverse proxy
# Port 80/443 → localhost:3000
```

#### Option 2: Windows VPS
See `WINDOWS_VPS_DEPLOYMENT.txt` for complete guide.

**Quick Steps:**
```bash
# Install Node.js, PM2
cd backend
npm install --production
pm2 start ecosystem.config.js
pm2-installer install

# Configure IIS reverse proxy
# Port 80/443 → localhost:3000
```

#### Option 3: Cloud Platforms
- **AWS:** EC2 + Elastic Beanstalk
- **Azure:** App Service
- **Google Cloud:** Compute Engine + App Engine
- **Heroku:** Buildpacks for Node.js
- **DigitalOcean:** Droplet + App Platform

### Environment Variables (Production)
```bash
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
GMAIL_USER=<your-production-gmail>
GMAIL_APP_PASSWORD=<app-specific-password>
SMTP_USER=<smtp-email>
SMTP_PASS=<smtp-password>
```

### Post-Deployment Checklist
- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables configured
- [ ] CORS configured for production domain
- [ ] PM2 process manager running
- [ ] Nginx/IIS reverse proxy configured
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring/logging enabled
- [ ] DNS records configured

---

## 👥 Team Communication

### Developer Contact
- **Developer:** Tuneer Mahatpure
- **Company:** JSC Global Solutions PVT. LTD.
- **Email:** mahatpuretuneer@gmail.com

### Code Standards
- Follow Angular style guide for frontend
- Use consistent naming conventions
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation when adding features

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Individual feature branches
- `hotfix/*` - Urgent fixes for production

---

## 📚 Additional Resources

### Documentation Files
- `PROJECT_OVERVIEW.md` - Complete project documentation (31KB)
- `SETUP_GUIDE.md` - Quick setup instructions (6KB)
- `APPLICATION_FLOW.md` - UI flow and screenshots (9KB)
- `THEME_CHANGE_GUIDE.txt` - Theme customization guide (8KB)
- `VPS_DEPLOYMENT.txt` - Linux deployment guide (9KB)
- `WINDOWS_VPS_DEPLOYMENT.txt` - Windows deployment guide (21KB)
- `DEPLOYMENT_CHECKLIST.txt` - Production deployment checklist (7KB)

### Scripts
- `build-production.sh` - Production build automation
- `validate-setup.sh` - Setup validation script

---

## 🎯 Key Features for Review

### Backend Features
- ✅ Gmail IMAP integration with advanced search
- ✅ OTP-based authentication system
- ✅ Excel/CSV attachment parsing
- ✅ JWT token management
- ✅ Error handling and logging
- ✅ Security middleware

### Frontend Features
- ✅ Angular 21 standalone components
- ✅ Responsive design
- ✅ Authentication guards
- ✅ Real-time data processing
- ✅ CSV export functionality
- ✅ Modern UI with theming

### Security Features
- ✅ JWT authentication
- ✅ OTP verification
- ✅ Input validation
- ✅ Secure credential handling
- ✅ CORS configuration

---

This guide provides a comprehensive overview for developers joining the project. For detailed implementation information, refer to the specific documentation files mentioned above.