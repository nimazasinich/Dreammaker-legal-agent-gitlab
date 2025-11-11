#!/bin/bash
# Clean and reinstall node_modules for WSL/Linux
# This script removes node_modules and package-lock.json, then reinstalls everything

echo ""
echo "=========================================="
echo "  Cleaning and Reinstalling Dependencies"
echo "=========================================="
echo ""

echo "[1/4] Removing node_modules..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "[OK] node_modules removed"
else
    echo "[INFO] node_modules not found"
fi

echo ""
echo "[2/4] Removing package-lock.json..."
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo "[OK] package-lock.json removed"
else
    echo "[INFO] package-lock.json not found"
fi

echo ""
echo "[3/4] Clearing npm cache..."
npm cache clean --force
echo "[OK] npm cache cleared"

echo ""
echo "[4/4] Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  Installation Complete!"
    echo "=========================================="
    echo ""
    echo "You can now run: npm run dev"
else
    echo ""
    echo "=========================================="
    echo "  Installation Failed!"
    echo "=========================================="
    echo ""
    echo "Please check the error messages above."
fi
