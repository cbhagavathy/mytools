#!/bin/bash

# MyTools Quick Start Script

echo "🛠️  Starting MyTools Web Application..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the application
echo ""
echo "🚀 Starting Flask application..."
echo "📍 Access the application at: http://localhost:4000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

python app.py

