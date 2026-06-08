# 🛡️ Pharos Guardian Suite

> **4 Composable AI Agent Skills for the Pharos Blockchain**
> Built for the [Pharos Agent Carnival](https://www.pharos.xyz/agent-carnival) — Skill-to-Agent Dual Cascade Hackathon

## 🏗️ Architecture

```
Pharos Guardian Suite
├── Skill 1: Contract Auditor    ──→ Analyze smart contract security
├── Skill 2: Portfolio Analytics ──→ Track DeFi positions & yields
├── Skill 3: x402 Paywall       ──→ Monetize data/APIs via micro-payments
└── Skill 4: Security Alerts    ──→ Real-time on-chain threat monitoring
        │
        ▼
┌─────────────────────────────────────┐
│   🤖 Guardian Agent (Phase 2)       │
│   Composes all 4 Skills into a      │
│   24/7 on-chain security assistant  │
└─────────────────────────────────────┘
```

## 🎯 Skills Overview

### Skill 1: Contract Auditor
- Analyzes Solidity source code for common vulnerabilities
- Reentrancy, overflow, access control, oracle manipulation
- Returns structured security report with severity scores
- MCP-compatible tool interface

### Skill 2: Portfolio Analytics
- Tracks wallet holdings across Pharos DeFi protocols
- Calculates APY, IL (impermanent loss), risk scores
- Aggregates yield farming positions
- Real-time price feeds via on-chain oracles

### Skill 3: x402 Paywall
- Wraps any Skill/API endpoint with Pharos x402 payment protocol
- Enables pay-per-use monetization for skill providers
- Supports USDC micro-payments on Pharos (chain 688689)
- HTTP 402 flow: request → pay → access

### Skill 4: Security Alerts
- Monitors wallet/contract activity in real-time
- Detects suspicious patterns (large transfers, approvals, etc.)
- Configurable alert thresholds
- Webhook/notification delivery

## 🔧 Tech Stack

- **Runtime:** Node.js + TypeScript
- **Blockchain:** Pharos Atlantic Testnet (chain ID: 688689)
- **RPC:** `https://atlantic.dplabs-internal.com`
- **Explorer:** `https://atlantic.pharosscan.xyz/`
- **Payment:** x402 Protocol (HTTP 402 micro-payments)
- **Agent Protocol:** MCP (Model Context Protocol)
- **Smart Contracts:** Solidity ^0.8.20 + Hardhat
- **SDK:** viem (EVM interactions)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your private key

# Compile contracts
npx hardhat compile

# Run tests
npm test

# Start MCP server (all skills)
npm run start:mcp

# Deploy to Pharos testnet
npm run deploy:pharos
```

## 📦 Project Structure

```
pharos-guardian-suite/
├── packages/
│   ├── contract-auditor/      # Skill 1
│   │   ├── src/
│   │   │   ├── analyzers/     # Vulnerability analyzers
│   │   │   ├── patterns/      # Pattern matching rules
│   │   │   └── index.ts       # MCP tool entry
│   │   └── package.json
│   ├── portfolio-analytics/   # Skill 2
│   │   ├── src/
│   │   │   ├── trackers/      # Position trackers
│   │   │   ├── calculators/   # APY/IL calculators
│   │   │   └── index.ts
│   │   └── package.json
│   ├── x402-paywall/          # Skill 3
│   │   ├── src/
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── settlement/    # On-chain settlement
│   │   │   └── index.ts
│   │   └── package.json
│   └── security-alerts/       # Skill 4
│       ├── src/
│       │   ├── monitors/      # Chain monitors
│       │   ├── detectors/     # Threat detectors
│       │   └── index.ts
│       └── package.json
├── contracts/                 # Solidity contracts
│   ├── PaywallRegistry.sol
│   └── AlertRegistry.sol
├── mcp-server/               # Unified MCP server
│   └── index.ts
├── hardhat.config.ts
├── package.json
└── README.md
```

## 🏆 Hackathon Alignment

| Criteria | How We Deliver |
|----------|---------------|
| **Originality** | First composable DeFi security suite on Pharos |
| **Technical Quality** | TypeScript + Solidity, full test coverage |
| **Practical Use Case** | Real DeFi security needs — audit, monitor, monetize |
| **Reusability** | Each skill is independent + MCP-compatible |
| **Composability** | Skills call each other (auditor → alerts, paywall → any skill) |
| **Pharos Integration** | x402 protocol, on-chain deployment, Pharos RPC |
| **Documentation** | Full docs, API reference, demo video |

## 📄 License

MIT

## 👤 Author

**Carlys17** — [GitHub](https://github.com/Carlys17)
