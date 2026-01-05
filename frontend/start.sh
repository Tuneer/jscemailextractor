#!/bin/bash

# Email Extractor - Frontend Startup Script
# This script starts the frontend development server

echo "================================================"
echo "   EMAIL EXTRACTOR - FRONTEND SERVER"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting frontend development server..."
echo ""
echo "Application will be available at: http://localhost:4200"
echo "Press Ctrl+C to stop"
echo ""
echo "================================================"
echo ""

# Start the server
ng serve --open
