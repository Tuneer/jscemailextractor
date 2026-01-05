#!/bin/bash

# Email Extractor - Backend Startup Script
# This script starts the backend server

echo "================================================"
echo "   EMAIL EXTRACTOR - BACKEND SERVER"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo ""
    echo "Please create .env file from .env.example:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then configure your Gmail credentials in .env"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting backend server..."
echo ""
echo "Server will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
echo "================================================"
echo ""

# Start the server
npm start
