# Quick Setup Guide - Email Extractor

## 🚀 Fast Track Installation (5 Minutes)

### Step 1: Install Dependencies

```bash
# Backend
cd /Users/gdknmac/Documents/GitHub/jscemailextractor/backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Gmail

#### Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. If you don't see "App passwords", enable 2-Step Verification first
4. Select app: **Mail**
5. Select device: **Other (Custom name)**
6. Enter: "Email Extractor"
7. Click **Generate**
8. **Copy the 16-character password** (you'll need it twice)

### Step 3: Create Backend Configuration

```bash
cd /Users/gdknmac/Documents/GitHub/jscemailextractor/backend
cp .env.example .env
```

Edit `.env` file and update these lines:

```env
JWT_SECRET=your_random_secret_key_here_12345

# Use YOUR Gmail address and app password
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_char_app_password

GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

**Important**: Use the SAME Gmail account for both SMTP and IMAP!

### Step 4: Start Backend Server

```bash
cd /Users/gdknmac/Documents/GitHub/jscemailextractor/backend
npm start
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║          EMAIL EXTRACTOR API SERVER                        ║
║  Server running on: http://localhost:3000                  ║
╚════════════════════════════════════════════════════════════╝
```

### Step 5: Start Frontend (New Terminal)

```bash
cd /Users/gdknmac/Documents/GitHub/jscemailextractor/frontend
ng serve
```

Or if you don't have Angular CLI installed globally:

```bash
npm start
```

**Expected Output:**
```
✔ Browser application bundle generation complete.
Initial Chunk Files | Names |  Raw Size
** Angular Live Development Server is listening on localhost:4200 **
```

### Step 6: Open Application

Open your browser and go to: **http://localhost:4200**

## ✅ First Time Testing

### Test the Login Flow

1. **Enter your email** (any valid email address)
2. **Click "Send OTP"**
3. **Check your email inbox** for the OTP code
4. **Enter the 6-digit OTP**
5. **Click "Verify & Login"**

### Test Email Reader

1. Click **"Email Reader"**
2. **Sender Email**: Enter a Gmail address you want to search
3. **Search Query**: Leave as "has:attachment"
4. **Max Results**: 10 (for testing)
5. Click **"Search Emails"**
6. Select one or more emails
7. Click **"Process Selected"**

### View Results

- You'll be redirected to the **Email Results** page
- View attachment information
- Click **"View Data"** to see Excel/CSV contents
- Click **"Export CSV"** to download

## 🔧 Common Setup Issues

### Issue: "npm install" fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Issue: "IMAP connection error"

**Checklist:**
- ✅ Is 2-Step Verification enabled in Google?
- ✅ Did you generate an App Password (not your regular password)?
- ✅ Did you copy the App Password correctly (no spaces)?
- ✅ Is IMAP enabled in Gmail settings?

**Enable IMAP:**
1. Go to Gmail
2. Click Settings (gear icon) → See all settings
3. Click "Forwarding and POP/IMAP"
4. Select "Enable IMAP"
5. Click "Save Changes"

### Issue: "OTP email not received"

**Checklist:**
- ✅ Check your spam/junk folder
- ✅ Verify SMTP credentials in `.env`
- ✅ Ensure "Less secure app access" is NOT needed (App Password is secure)
- ✅ Wait 2-3 minutes (email delivery can be delayed)

### Issue: Angular CLI not found

**Solution:**
```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Or use npx
cd frontend
npx ng serve
```

## 📝 Configuration Template

Here's a complete `.env` template with examples:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT (generate a random string)
JWT_SECRET=mySecretKey123!@#RandomStringHere

# SMTP for sending OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tuneer.test@gmail.com
SMTP_PASS=abcd efgh ijkl mnop

# Gmail IMAP for reading emails
GMAIL_USER=tuneer.test@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# OTP settings
OTP_EXPIRY_MINUTES=10

# Optional: Restrict email domains
ALLOWED_DOMAINS=

# File settings
MAX_FILE_SIZE=10485760
DOWNLOAD_DIRECTORY=./temp/attachments
```

## 🎯 Testing Checklist

After setup, verify these features work:

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

## 💡 Pro Tips

1. **Use a test Gmail account** for initial testing
2. **Keep both terminals open** (backend + frontend)
3. **Check browser console** for frontend errors (F12)
4. **Check backend terminal** for server errors
5. **Clear browser cache** if UI doesn't update

## 📞 Need Help?

If you encounter issues not covered here:

1. Check the full README.md for detailed troubleshooting
2. Verify all prerequisites are installed
3. Ensure Gmail App Password is correctly configured
4. Contact: mahatpuretuneer@gmail.com

---

**Setup should take 5-10 minutes. Happy coding! 🚀**
