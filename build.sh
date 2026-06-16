#!/bin/bash
set -e

# SRT Subtitle Translator - Production Build Script
echo "=========================================================="
echo "  SRT Subtitle Translator Desktop App - Build & Package"
echo "=========================================================="
echo ""

# Detect Operating System
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    OS_ID=$ID
else
    OS=$(uname -s)
    OS_ID=""
fi

echo "Detected OS: $OS"

# Check system prerequisites for Tauri on Fedora / Linux
if [ "$OS_ID" = "fedora" ]; then
    echo "Checking compiler prerequisites for Fedora..."
    MISSING_LIBS=()
    
    if ! pkg-config --exists libsoup-3.0; then
        MISSING_LIBS+=("libsoup3-devel")
    fi
    
    if ! pkg-config --exists javascriptcoregtk-4.1; then
        MISSING_LIBS+=("javascriptcoregtk4.1-devel")
    fi
    
    if ! pkg-config --exists webkit2gtk-4.1; then
        MISSING_LIBS+=("webkit2gtk4.1-devel")
    fi
    
    if [ ${#MISSING_LIBS[@]} -gt 0 ]; then
        echo "WARNING: Missing system libraries required for compiling Tauri: ${MISSING_LIBS[*]}"
        echo "Please run: sudo dnf install -y webkit2gtk4.1-devel libsoup3-devel javascriptcoregtk4.1-devel"
        echo "Press ENTER to continue anyway, or Ctrl+C to abort and install them first."
        read -r
    else
        echo "✓ All system compiler libraries are present."
    fi
fi

# 1. Clean previous build artifacts
echo "Step 1: Cleaning previous builds..."
rm -rf dist src-tauri/target

# 2. Install NPM dependencies
echo "Step 2: Installing frontend dependencies..."
npm install

# 3. Run unit tests
echo "Step 3: Running test suite with Vitest..."
npm run test

# 4. Compile frontend and build Tauri Desktop App
echo "Step 4: Compiling application and packaging Tauri app..."
npm run tauri build

echo ""
echo "=========================================================="
echo "✓ Production Build Completed Successfully!"
echo "Find your packaged binaries in: src-tauri/target/release/bundle/"
echo "=========================================================="
