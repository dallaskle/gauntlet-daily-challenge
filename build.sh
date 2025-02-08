#!/bin/bash
set -e

# Debug: Print Python version and its path
python3 --version
echo "Python3 found at: $(which python3)"

# Install Python dependencies into the 'python_packages' directory
python3 -m pip install -r requirements.txt --target python_packages

# Build Next.js project
next build
