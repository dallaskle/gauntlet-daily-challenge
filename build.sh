#!/bin/bash

# Install Python dependencies
pip install -r requirements.txt --target python_packages

# Build Next.js
next build 