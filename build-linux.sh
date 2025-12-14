#!/bin/bash
# Build script for Linux distributions (RHEL 9, Rocky Linux 10, etc.)

echo "Building Grok Desktop for Linux..."
echo "Target: RPM (RHEL 9, Rocky Linux 10)"
echo ""

# Clean previous builds
if [ -d "build" ]; then
    echo "Cleaning previous builds..."
    rm -rf build
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build for Linux (RPM and AppImage)
echo ""
echo "Building Linux packages..."
npm run build-linux

echo ""
echo "Build complete! Check the build/ directory for output files:"
echo "  - RPM package for RHEL 9 / Rocky Linux 10"

