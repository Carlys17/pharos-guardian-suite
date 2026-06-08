# 🖥️ Pharos Guardian Suite — VPS Setup Guide

## Quick Start (Copy-paste semua)

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 2. Clone repo
git clone https://github.com/Carlys17/pharos-guardian-suite.git
cd pharos-guardian-suite

# 3. Install dependencies
npm install

# 4. Run tests
npm test

# 5. Run demo
npm run audit:demo

# 6. Start MCP server
npm run start:mcp
```

---

## Detail Setup

### Prerequisites
- Ubuntu/Debian VPS (minimal 1GB RAM)
- Node.js 18+ (recommended 20)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/Carlys17/pharos-guardian-suite.git
cd pharos-guardian-suite
npm install
```

### 2. Run Tests (12 tests)

```bash
npm test
```

Expected:
```
🔍 Skill 1: Contract Auditor
  ✅ Detects reentrancy vulnerability
  ✅ Detects tx.origin usage
  ✅ Detects floating pragma
  ✅ Clean contract scores 100
  ✅ Multiple vulnerabilities detected

💰 Skill 3: x402 Paywall
  ✅ Create paywall
  ✅ Verify payment
  ✅ Paywall status
  ✅ Duplicate paywall throws

🔔 Skill 4: Security Alerts
  ✅ Create alert rule
  ✅ Monitor status
  ✅ Alert history

Results: 12 passed, 0 failed
```

### 3. Run Contract Audit Demo

```bash
npm run audit:demo
```

Output: JSON audit report dari sample VulnerableBank contract.

### 4. Start MCP Server

```bash
npm run start:mcp
```

Expose 6 MCP tools:
- `audit_contract` — Smart contract security auditor
- `analyze_portfolio` — DeFi portfolio analytics
- `create_paywall` — x402 micro-payment paywall
- `verify_payment` — x402 payment verification
- `create_alert_rule` — Security alert monitoring
- `check_alerts` — Trigger alert check

### 5. Deploy Contracts ke Pharos Testnet

```bash
# Set private key (wallet testnet kamu)
npx hardhat vars set PRIVATE_KEY

# Deploy
npm run deploy:pharos
```

Output:
```
🚀 Deploying Pharos Guardian Suite contracts...
   ✅ PaywallRegistry deployed to: 0x...
   ✅ AlertRegistry deployed to: 0x...
   Network: Pharos Atlantic Testnet (688689)
   Explorer: https://atlantic.pharosscan.xyz
```

### 6. Record Demo Video

```bash
# Option A: asciinema (terminal recording)
sudo apt install -y asciinema
asciinema rec demo.cast
npm test
npm run audit:demo
# Ctrl+D to stop

# Option B: Convert cast to MP4
# Install agg: https://github.com/asciinema/agg
agg demo.cast demo.mp4
```

---

## Environment Variables (Optional)

Edit `.env` kalau mau pakai fitur on-chain:

```bash
cp .env.example .env
nano .env
```

```
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
PHAROS_CHAIN_ID=688689
PRIVATE_KEY=your_testnet_private_key
PAY_TO_ADDRESS=0x...
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Project Structure

```
pharos-guardian-suite/
├── src/
│   ├── skills/
│   │   ├── contract-auditor.ts      # Skill 1: 12+ vulnerability patterns
│   │   ├── portfolio-analytics.ts   # Skill 2: APY, IL, risk scores
│   │   ├── x402-paywall.ts         # Skill 3: HTTP 402 micro-payments
│   │   └── security-alerts.ts      # Skill 4: On-chain monitoring
│   ├── mcp-server.ts               # Unified MCP server (6 tools)
│   └── test.ts                     # Test suite (12 tests)
├── contracts/
│   ├── PaywallRegistry.sol         # On-chain paywall registry
│   └── AlertRegistry.sol           # On-chain alert registry
├── scripts/
│   └── deploy.ts                   # Hardhat deploy script
├── hardhat.config.ts               # Pharos testnet config
├── package.json
└── README.md
```

---

## Submit ke DoraHacks

1. Buka https://dorahacks.io/hackathon/pharos-phase1/
2. Login / Register
3. Click "Submit BUIDL"
4. Isi:
   - **Name:** Pharos Guardian Suite
   - **Description:** 4 Composable AI Agent Skills for Pharos Blockchain
   - **GitHub:** https://github.com/Carlys17/pharos-guardian-suite
   - **Demo Video:** upload recording atau link YouTube
   - **Tags:** Blockchain, AI, Web3, Agent, MCP, Onchain

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `npm install` gagal | Pastikan Node.js 18+: `node -v` |
| `npm test` error | Pastikan semua dependencies terinstall: `npm install` |
| Deploy gagal | Pastikan PRIVATE_KEY punya testnet ETH |
| MCP server error | Pastikan port tidak diblokir firewall |

---

## Pharos Network Info

| Item | Value |
|------|-------|
| Chain ID | 688689 |
| RPC URL | https://atlantic.dplabs-internal.com |
| Explorer | https://atlantic.pharosscan.xyz |
| Token | ETH (testnet) |
| Docs | https://docs.pharosnetwork.xyz/ |
