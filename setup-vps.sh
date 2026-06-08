#!/bin/bash
# ============================================================
# Pharos Guardian Suite — VPS One-Click Setup
# Tested on Ubuntu 22.04/24.04
# ============================================================

set -e

echo "🛡️  Pharos Guardian Suite — VPS Setup"
echo "======================================"

# 1. Install Node.js 20
echo ""
echo "📦 Step 1: Installing Node.js 20..."
if command -v node &>/dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 18 ]; then
        echo "   ✅ Node.js $(node -v) already installed"
    else
        echo "   ⬆️  Upgrading Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "   Node: $(node -v)"
echo "   npm:  $(npm -v)"

# 2. Clone repo
echo ""
echo "📥 Step 2: Cloning repository..."
if [ -d "pharos-guardian-suite" ]; then
    echo "   ✅ Directory exists, pulling latest..."
    cd pharos-guardian-suite
    git pull origin master
else
    git clone https://github.com/Carlys17/pharos-guardian-suite.git
    cd pharos-guardian-suite
fi

# 3. Install dependencies
echo ""
echo "📦 Step 3: Installing dependencies..."
npm install --no-fund --no-audit 2>&1 | tail -5

# 4. Run tests
echo ""
echo "🧪 Step 4: Running tests..."
echo "──────────────────────────────"
npm test

# 5. Run demo
echo ""
echo "🔍 Step 5: Running Contract Audit Demo..."
echo "─────────────────────────────────────────"
npm run audit:demo 2>&1 | head -50

# 6. Summary
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  🎉 Setup Complete!                      ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  Run tests:      npm test                ║"
echo "║  Run demo:       npm run audit:demo      ║"
echo "║  Start MCP:      npm run start:mcp       ║"
echo "║  Deploy:         npm run deploy:pharos   ║"
echo "║                                          ║"
echo "║  Chain: Pharos Atlantic Testnet (688689) ║"
echo "║  RPC:   atlantic.dplabs-internal.com     ║"
echo "║                                          ║"
echo "║  Submit: dorahacks.io/hackathon/         ║"
echo "║          pharos-phase1/                  ║"
echo "║                                          ║"
echo "║  Deadline: 15 Juni 2026, 23:59           ║"
echo "╚══════════════════════════════════════════╝"
