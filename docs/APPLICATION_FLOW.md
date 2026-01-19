# 📱 Application Flow & Screenshots Description

## 🔐 Login Flow

### Step 1: Login Page
- **URL:** http://localhost:4200/login
- **Design:** 
  - Purple gradient background
  - White card with rounded corners
  - Email icon logo at top
  - Title: "Email Extractor"
  - Subtitle: "Secure Login with OTP"

**User Actions:**
1. Enter email address
2. Click "Send OTP" button (purple gradient)
3. System sends 6-digit OTP to email

### Step 2: OTP Verification
- **Same page, different view**
- Shows: "OTP sent to your-email@example.com"
- **Input:** 6-digit OTP code (large, centered)
- **Buttons:**
  - "Verify & Login" (primary)
  - "Resend OTP" (secondary)
  - "Change email" (link)

**User Actions:**
1. Check email inbox for OTP
2. Enter 6-digit code
3. Click "Verify & Login"
4. Redirects to Home page

---

## 🏠 Home Dashboard

### Layout
- **Top Navigation Bar:**
  - Logo + "Email Extractor" (left)
  - User email display (right)
  - "Logout" button (right)

- **Hero Section:**
  - Large heading: "Welcome to Email Extractor"
  - Subtitle: "Extract and analyze email attachments with powerful tools"

- **Feature Cards (2 columns):**

#### Card 1: Email Reader
- Icon: Envelope with attachment indicator
- Title: "Email Reader"
- Description: Connect to Gmail, search emails...
- Badges: "Gmail IMAP", "Advanced Search", "Attachment Detection"
- Button: "Open Email Reader" →

#### Card 2: Email Results
- Icon: Document with lines
- Title: "Email Results"
- Description: View extracted data...
- Badges: "Excel Parser", "Data Tables", "CSV Export"
- Button: "View Results" →

- **Info Section (3 cards):**
  - Production-Grade Email Pipeline
  - Smart Attachment Processing
  - Modern Angular Architecture

- **Footer:**
  - Developer: Tuneer Mahatpure
  - Contact: mahatpuretuneer@gmail.com

---

## 📧 Email Reader Page

### Layout

**Header:**
- "← Back to Home" button
- Title: "Email Reader"
- Subtitle: "Search and select emails with attachments"

**Search Panel (White Card):**

1. **Form Row 1:**
   - Sender Email (text input) - optional
   - Max Results (number input, 1-100)

2. **Form Row 2:**
   - Search Query (text input)
   - Quick filter buttons below:
     - "All with attachments"
     - "Last 7 days"
     - "Last 30 days"
     - "Excel files"
     - "CSV files"

3. **Action:**
   - "Search Emails" button (large, purple gradient)

**Results Table (When emails found):**

- Header:
  - "Email Results (X)"
  - "Clear Selection" button
  - "Process Selected (X)" button (purple)

- Table:
  - Checkbox column (select all header)
  - Subject
  - From
  - Date
  - Attachments (count badge)

- Rows:
  - Checkbox for each email
  - Clickable rows
  - Highlight on hover
  - Purple background when selected

**User Actions:**
1. Enter search criteria
2. Click "Search Emails"
3. Select emails using checkboxes
4. Click "Process Selected (X)"
5. System processes emails
6. Redirects to Email Results

---

## 📊 Email Results Page

### Layout

**Header:**
- "← Back to Email Reader" button
- Title: "Email Attachment Data"
- Subtitle: "Extracted data from X email(s) - Y total records"
- "Export All Data" button (purple)

**Email Cards (One per processed email):**

**Email Header:**
- Subject (bold, large)
- From: sender@email.com
- Date: formatted timestamp
- Attachments: X

**Attachment Grid (Cards in responsive grid):**

Each attachment card shows:
- File icon (📊 Excel, 📄 CSV, 📕 PDF)
- Filename (bold)
- Badges:
  - File size (e.g., "125 KB")
  - Row count (e.g., "50 rows")
  - Column count (e.g., "8 cols")
- Action Buttons:
  - "View Data" (purple)
  - "Export CSV" (white with purple border)

**User Actions:**
1. View all processed emails and attachments
2. Click "View Data" to open modal
3. Click "Export CSV" to download single file
4. Click "Export All Data" to download all files

---

## 📋 Data View Modal

### When "View Data" is clicked:

**Modal Overlay (Dark background):**

**Modal Card (Large, centered):**

**Header:**
- Filename (title)
- File details: "125 KB | 50 rows × 8 columns"
- "Export CSV" button (white)
- "✕" Close button

**Body (Scrollable):**
- **Data Table:**
  - Sticky header row
  - Row number column (#)
  - All data columns from Excel/CSV
  - Alternating row colors
  - Hover effects

- **If no data:**
  - "No data available for this attachment"

**User Actions:**
1. Scroll to view all data
2. Click "Export CSV" to download
3. Click "✕" or outside modal to close

---

## 🎨 Color Scheme

### Primary Colors
- **Purple Gradient:** #667eea → #764ba2
- **Background:** #f8f9fa
- **White Cards:** #ffffff
- **Text Primary:** #333333
- **Text Secondary:** #666666
- **Borders:** #e0e0e0

### Status Colors
- **Success:** Green (#d4edda text, #155724 border)
- **Error:** Red (#f8d7da text, #721c24 border)
- **Info:** Blue (#d1ecf1 text, #0c5460 border)

### Interactive Elements
- **Hover:** Slight lift effect (transform: translateY(-2px))
- **Shadows:** Soft box-shadows on cards
- **Selected:** Light purple background (#e8eeff)

---

## 📱 Responsive Behavior

### Mobile View (< 768px)
- Navigation stacks vertically
- Feature cards stack in 1 column
- Tables become horizontally scrollable
- Buttons become full-width
- Reduced padding and font sizes

### Tablet View (768px - 1024px)
- 2-column grid for feature cards
- Tables fit comfortably
- Optimized spacing

### Desktop View (> 1024px)
- Full multi-column layouts
- Maximum width: 1200-1400px
- Centered content
- Optimal reading width

---

## ⚡ Loading States

### During Email Search
- Button shows spinning circle
- Text changes to "Searching..."
- All inputs disabled
- Purple spinner animation

### During Email Processing
- "Processing Selected" button shows spinner
- Table rows disabled
- Status message at top

### During Data Loading
- Smooth fade-in animations
- Skeleton screens (optional enhancement)

---

## 💬 Message Types

### Success Messages (Green)
- "✓ OTP sent to your email"
- "✓ Login successful! Redirecting..."
- "✓ Found 25 email(s) with attachments"
- "✓ Processing complete! 5 email(s) processed"

### Error Messages (Red)
- "✗ Please enter a valid email address"
- "✗ Invalid OTP. Please try again"
- "✗ Failed to search emails"
- "✗ Processing failed"

### Info Messages (Blue)
- "ℹ No emails found. Try adjusting your search criteria"
- "ℹ Please select at least one email"

---

## 🎯 User Journey Example

1. **Start:** Open http://localhost:4200
2. **Login:** Enter email → Get OTP → Verify
3. **Home:** See two features
4. **Click:** "Open Email Reader"
5. **Search:** Enter sender, select "Last 7 days", click search
6. **Results:** See 10 emails with attachments
7. **Select:** Check 3 emails
8. **Process:** Click "Process Selected (3)"
9. **View Results:** See 3 email cards with 5 total attachments
10. **Explore:** Click "View Data" on Excel file
11. **Modal:** See 50 rows × 8 columns of data
12. **Export:** Click "Export CSV"
13. **Download:** File downloads as "filename_data.csv"
14. **Bulk Export:** Click "Export All Data" → Downloads 5 CSV files
15. **Navigate:** "← Back to Email Reader" to search more
16. **Logout:** Click logout button in nav bar

---

## 🔄 Data Flow

```
User → Frontend (Angular)
  ↓ HTTP Request (with JWT token)
Backend API (Express)
  ↓ Authentication Check
Gmail IMAP Service
  ↓ Search/Fetch Emails
Attachment Parser (XLSX)
  ↓ Parse Excel/CSV
Backend Response (JSON)
  ↓ HTTP Response
Frontend (Angular)
  ↓ Display in UI
User sees results
  ↓ Click Export
CSV Download
```

---

## 📊 API Request/Response Examples

### Login Request
```json
POST /api/auth/request-otp
{
  "email": "user@example.com"
}
```

### Search Emails Request
```json
POST /api/gmail/emails
Authorization: Bearer <jwt_token>
{
  "query": "has:attachment newer_than:7d",
  "senderEmail": "sender@example.com",
  "maxResults": 50
}
```

### Process Emails Request
```json
POST /api/gmail/process
Authorization: Bearer <jwt_token>
{
  "emailIds": [123, 456, 789],
  "senderEmail": "sender@example.com"
}
```

### Email Results Response
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

This completes the visual and functional description of the Email Extractor application!
