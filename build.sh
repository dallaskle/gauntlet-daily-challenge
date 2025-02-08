#!/bin/bash
set -e

echo "Starting build process..."

# Check Python version and environment
echo "Python environment:"
python3 --version
which python3

# Install Python dependencies
echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Build Next.js project
echo "Building Next.js project..."
npm run build

echo "Build completed successfully!"
