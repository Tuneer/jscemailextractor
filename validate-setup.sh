#!/bin/bash

# Email Extractor - Setup Validation Script
# This script checks if everything is configured correctly

echo "=============================================="
echo "  EMAIL EXTRACTOR - SETUP VALIDATOR"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to print status
print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ ERROR: $1"
    ((ERRORS++))
}

print_warning() {
    echo "⚠️  WARNING: $1"
    ((WARNINGS++))
}

print_info() {
    echo "ℹ️  $1"
}

echo "🔍 Checking Backend Configuration..."
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
else
    print_success "Backend directory found"
fi

# Check backend files
if [ -f "backend/server.js" ]; then
    print_success "Backend server.js exists"
else
    print_error "Backend server.js not found!"
fi

if [ -f "backend/.env" ]; then
    print_success "Backend .env file exists"
    
    # Check if .env has required variables
    if grep -q "SMTP_USER=" "backend/.env"; then
        print_success "SMTP_USER configured"
    else
        print_error "SMTP_USER not found in .env"
    fi
    
    if grep -q "GMAIL_USER=" "backend/.env"; then
        print_success "GMAIL_USER configured"
    else
        print_error "GMAIL_USER not found in .env"
    fi
    
    if grep -q "JWT_SECRET=" "backend/.env"; then
        print_success "JWT_SECRET configured"
    else
        print_error "JWT_SECRET not found in .env"
    fi
else
    print_error "Backend .env file not found! Copy from .env.example"
fi

if [ -f "backend/package.json" ]; then
    print_success "Backend package.json exists"
else
    print_error "Backend package.json not found!"
fi

if [ -d "backend/node_modules" ]; then
    print_success "Backend dependencies installed"
else
    print_warning "Backend node_modules not found. Run: cd backend && npm install"
fi

echo ""
echo "🔍 Checking Frontend Configuration..."
echo ""

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found!"
else
    print_success "Frontend directory found"
fi

# Check frontend files
if [ -f "frontend/package.json" ]; then
    print_success "Frontend package.json exists"
else
    print_error "Frontend package.json not found!"
fi

if [ -f "frontend/src/main.ts" ]; then
    print_success "Frontend main.ts exists"
else
    print_error "Frontend main.ts not found!"
fi

if [ -f "frontend/angular.json" ]; then
    print_success "Angular configuration exists"
else
    print_error "Angular configuration not found!"
fi

if [ -d "frontend/node_modules" ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend node_modules not found. Run: cd frontend && npm install"
fi

# Check components
if [ -d "frontend/src/app/components/login" ]; then
    print_success "Login component exists"
else
    print_error "Login component not found!"
fi

if [ -d "frontend/src/app/components/home" ]; then
    print_success "Home component exists"
else
    print_error "Home component not found!"
fi

if [ -d "frontend/src/app/components/email-reader" ]; then
    print_success "Email Reader component exists"
else
    print_error "Email Reader component not found!"
fi

if [ -d "frontend/src/app/components/email-results" ]; then
    print_success "Email Results component exists"
else
    print_error "Email Results component not found!"
fi

echo ""
echo "🔍 Checking Node.js and npm..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not installed! Download from https://nodejs.org/"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not installed!"
fi

# Check Angular CLI
if command -v ng &> /dev/null; then
    NG_VERSION=$(ng version 2>&1 | head -n 1 || echo "installed")
    print_success "Angular CLI installed"
else
    print_warning "Angular CLI not installed globally. Install with: npm install -g @angular/cli"
fi

echo ""
echo "=============================================="
echo "  VALIDATION SUMMARY"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 Perfect! Everything is configured correctly!"
    echo ""
    echo "You can now start the application:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd backend"
    echo "  npm start"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd frontend"
    echo "  ng serve"
    echo ""
    echo "Then open: http://localhost:4200"
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Configuration looks good!"
    echo "⚠️  You have $WARNINGS warning(s) that should be addressed."
    echo ""
    echo "Review the warnings above and fix them if needed."
elif [ $WARNINGS -eq 0 ]; then
    echo "❌ Found $ERRORS error(s)!"
    echo ""
    echo "Please fix the errors above before running the application."
else
    echo "❌ Found $ERRORS error(s) and $WARNINGS warning(s)!"
    echo ""
    echo "Please fix the errors above before running the application."
fi

echo ""
echo "=============================================="
echo ""

exit $ERRORS
