# 📧 Email Extractor

A full-stack web application that enables users to authenticate via OTP, connect to Gmail accounts, search and read emails with attachments, and extract data from Excel/CSV files attached to emails.

## 🚀 Features

- **Passwordless Authentication**: Email-based OTP login system
- **Gmail IMAP Integration**: Advanced email search with attachment detection
- **Excel/CSV Processing**: Automatic parsing and data extraction
- **Real-time Data Preview**: Interactive data tables with export capabilities
- **Responsive UI**: Modern Angular interface with theming support
- **Production Ready**: Complete deployment guides and security features

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT with OTP
- **Email**: Nodemailer + node-imap
- **Data Processing**: xlsx, mailparser

### Frontend
- **Framework**: Angular 21
- **Language**: TypeScript
- **Styling**: CSS Variables
- **Architecture**: Standalone components

## 📋 Prerequisites

- Node.js v18+
- npm v8+
- Gmail account with app password enabled

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/jscemailextractor.git
cd jscemailextractor
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Gmail credentials
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Start Servers

Terminal 1 - Backend:
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

Terminal 2 - Frontend:
```bash
cd frontend
ng serve
# App runs on http://localhost:4200
```

### 5. Access Application

1. Open browser: `http://localhost:4200`
2. Login with developer email: `mahatpuretuneer@gmail.com`
3. Use OTP: `123456` (fixed for developer)

## 📁 Project Structure

```
jscemailextractor/
├── backend/                    # Node.js API server
│   ├── middleware/             # Authentication middleware
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── .env.example            # Environment template
│   └── server.js               # Entry point
├── frontend/                   # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # UI components
│   │   │   ├── services/       # App services
│   │   │   ├── models/         # TypeScript models
│   │   │   └── guards/         # Route guards
│   ├── package.json
│   └── angular.json
├── docs/                    # Comprehensive guides
│   ├── DEVELOPER_GUIDE.md     # Complete developer guide
│   ├── CODING_STANDARDS.md    # Code standards
│   ├── CONTRIBUTING.md        # Contribution guide
│   ├── SECURITY.md           # Security policy
│   ├── MAINTAINERS.md        # Project maintainers
│   └── CHANGES_LOG.md        # Change history
└── README.md                 # This file
```

## 📚 Documentation

This project includes comprehensive documentation:

- **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**: Complete guide for developers joining the project
- **[docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)**: Coding standards and best practices
- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)**: Guidelines for contributing to the project
- **[docs/SECURITY.md](docs/SECURITY.md)**: Security policy and vulnerability reporting
- **[docs/MAINTAINERS.md](docs/MAINTAINERS.md)**: Project maintainers and responsibilities
- **[docs/CHANGES_LOG.md](docs/CHANGES_LOG.md)**: Detailed change history
- **[docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)**: Complete project overview (3000+ lines)
- **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**: Quick setup instructions
- **[docs/APPLICATION_FLOW.md](docs/APPLICATION_FLOW.md)**: UI flow and screenshots
- **[docs/THEME_CHANGE_GUIDE.txt](docs/THEME_CHANGE_GUIDE.txt)**: Theme customization guide
- **[docs/VPS_DEPLOYMENT.txt](docs/VPS_DEPLOYMENT.txt)**: Linux deployment guide
- **[docs/WINDOWS_VPS_DEPLOYMENT.txt](docs/WINDOWS_VPS_DEPLOYMENT.txt)**: Windows deployment guide
- **[docs/email extract feature.txt](docs/email%20extract%20feature.txt)**: Original requirements document


## 🔐 Security Features

- JWT authentication with 24-hour tokens
- OTP-based login (no passwords stored)
- Input validation and sanitization
- Secure credential handling
- CORS configuration

## 📊 API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP for login
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/validate` - Validate current token

### Gmail
- `POST /api/gmail/emails` - Search emails
- `POST /api/gmail/process` - Process selected emails
- `GET /api/gmail/test-connection` - Test IMAP connection

## 🚢 Deployment

The application is production-ready with deployment guides for:
- Linux VPS with PM2 and Nginx
- Windows VPS with PM2 and IIS
- Cloud platforms (AWS, Azure, Heroku, etc.)

See [docs/VPS_DEPLOYMENT.txt](docs/VPS_DEPLOYMENT.txt) and [docs/WINDOWS_VPS_DEPLOYMENT.txt](docs/WINDOWS_VPS_DEPLOYMENT.txt) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on how to contribute to this project.

## 🛡️ Security

Please read [docs/SECURITY.md](docs/SECURITY.md) for information on how to report security vulnerabilities.

## ©️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Maintainers

See [docs/MAINTAINERS.md](docs/MAINTAINERS.md) for the list of maintainers and their responsibilities.

## 📞 Support

- **Developer**: Tuneer Mahatpure
- **Company**: JSC Global Solutions PVT. LTD.
- **Email**: mahatpuretuneer@gmail.com

---

Made with ❤️ by JSC Global Solutions PVT. LTD.
