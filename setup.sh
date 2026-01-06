#!/bin/bash
# NetherRipper v2.1 - Quick Setup Script

set -e

echo "🔥 NetherRipper v2.1 - Setup"
echo "=============================="
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ Error: This tool only works on Linux"
    exit 1
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "   Install from: https://bun.sh"
    exit 1
fi

echo "✓ Bun found: $(bun --version)"

# Check system dependencies
echo ""
echo "Checking system dependencies..."

MISSING=()

if ! command -v ip &> /dev/null; then
    MISSING+=("iproute2")
fi

if ! command -v tc &> /dev/null; then
    MISSING+=("iproute2")
fi

if ! command -v iptables &> /dev/null; then
    MISSING+=("iptables")
fi

if ! command -v arp &> /dev/null; then
    MISSING+=("net-tools")
fi

if ! command -v arping &> /dev/null; then
    MISSING+=("iputils-arping")
fi

if [ ${#MISSING[@]} -ne 0 ]; then
    echo "❌ Missing dependencies: ${MISSING[*]}"
    echo ""
    echo "Install with:"
    echo "  sudo apt install iproute2 iptables net-tools iputils-arping"
    exit 1
fi

echo "✓ All required dependencies installed"

# Check optional tools
OPTIONAL=()

if ! command -v arp-scan &> /dev/null; then
    OPTIONAL+=("arp-scan")
fi

if ! command -v nmap &> /dev/null; then
    OPTIONAL+=("nmap")
fi

if [ ${#OPTIONAL[@]} -ne 0 ]; then
    echo "⚠️  Optional tools missing: ${OPTIONAL[*]}"
    echo "   Install for better performance:"
    echo "   sudo apt install arp-scan nmap"
fi

# Install dependencies
echo ""
echo "Installing Node dependencies..."
bun install

# Build executable
echo ""
echo "Building executable..."
bun run build:exe

# Check if build successful
if [ ! -f "./nr" ]; then
    echo "❌ Build failed"
    exit 1
fi

# Make executable
chmod +x ./nr

echo ""
echo "✓ Build successful!"
echo ""
echo "=============================="
echo "🎉 Setup complete!"
echo "=============================="
echo ""
echo "⚠️  IMPORTANT v2.1 UPDATE:"
echo "   This version includes ARP SPOOFING!"
echo "   Tool will now ACTUALLY WORK and KILL targets"
echo ""
echo "Usage:"
echo "  1. Set consent: export NETHER_CONSENT=yes"
echo "  2. Scan network: sudo -E ./nr scan"
echo "  3. Kill target:  sudo -E ./nr kill <IP>"
echo "  4. Stop attack:  sudo -E ./nr stop"
echo ""
echo "Optional: Install globally"
echo "  sudo cp ./nr /usr/local/bin/"
echo ""
echo "⚠️  WARNING: Use responsibly and legally!"
echo "⚠️  ARP spoofing is now active - targets WILL be disconnected!"
echo ""