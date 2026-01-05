#!/bin/bash

# Email Extractor - Production Build Script
# This script builds the frontend and prepares for deployment

echo "=============================================="
echo "  EMAIL EXTRACTOR - PRODUCTION BUILD"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ ERROR: Must run from project root directory"
    exit 1
fi

echo "📦 Step 1: Installing/Updating Frontend Dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend dependency installation failed!"
    exit 1
fi
echo "✅ Frontend dependencies ready"
echo ""

echo "🏗️  Step 2: Building Angular Application for Production..."
npm run build --configuration production
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend build complete"
echo ""

echo "📦 Step 3: Installing/Updating Backend Dependencies..."
cd ../backend
npm install --production
if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed!"
    exit 1
fi
echo "✅ Backend dependencies ready"
echo ""

echo "🎉 Production Build Complete!"
echo ""
echo "=============================================="
echo "  DEPLOYMENT READY"
echo "=============================================="
echo ""
echo "Your application is now ready for VPS deployment!"
echo ""
echo "Files to upload to VPS:"
echo "  📁 backend/              (entire folder)"
echo "  📁 frontend/dist/        (built files)"
echo "  📄 package.json files"
echo "  📄 .env (create from .env.example)"
echo ""
echo "On VPS, run:"
echo "  cd backend"
echo "  npm start"
echo ""
echo "Access on: http://your-domain.com:3000"
echo "(Configure nginx reverse proxy for port 80/443)"
echo ""
echo "=============================================="
