# Pharos Guardian Suite — Hackathon Submission

## Project Name
**Pharos Guardian Suite** — 4 Composable AI Agent Skills for On-Chain Security

## Track
Phase 1: Skill Hackathon

## Summary
Pharos Guardian Suite is a set of 4 reusable, composable AI agent skills built for the Pharos blockchain ecosystem. Each skill is an independent MCP (Model Context Protocol) tool that any AI agent can call to perform DeFi security tasks — from smart contract auditing to real-time threat monitoring, with built-in monetization via the x402 payment protocol.

## Problem
DeFi users and AI agents on Pharos need:
- Automated smart contract security analysis before interacting with protocols
- Real-time monitoring for suspicious on-chain activity
- Portfolio tracking across DeFi positions
- A way to monetize data/API services with micro-payments

No composable security toolkit exists for the Pharos AI Agent ecosystem today.

## Solution: 4 Skills

### Skill 1: Contract Auditor
- Analyzes Solidity source code for 8 vulnerability classes: reentrancy, overflow, access control, oracle manipulation, flash loan attacks, unchecked external calls, integer underflow, and tx.origin misuse
- Returns structured security report with severity scores (Critical/High/Medium/Low/Info)
- MCP-compatible tool interface for agent integration

### Skill 2: Portfolio Analytics
- Tracks wallet holdings across Pharos DeFi protocols
- Calculates APY, impermanent loss, and risk scores
- Aggregates yield farming positions
- Real-time price feeds via on-chain oracles

### Skill 3: x402 Paywall
- Wraps any Skill/API endpoint with Pharos x402 payment protocol
- Enables pay-per-use monetization for skill providers
- Supports USDC micro-payments on Pharos (chain 688689)
- HTTP 402 flow: request → pay → access
- On-chain payment settlement via PaywallRegistry smart contract

### Skill 4: Security Alerts
- Monitors wallet/contract activity in real-time
- Detects suspicious patterns: large transfers, unusual approvals, contract interactions
- Configurable alert thresholds
- Webhook/notification delivery
- On-chain alert registration via AlertRegistry smart contract

## Smart Contracts (Deployed on Pharos Atlantic Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| PaywallRegistry | `0xDe8201f249656ac0B5a76B490FbF78A4cCa941BB` | On-chain payment settlement for x402 paywall |
| AlertRegistry | `0x19813D6B80d45772cd6f72f5562d19CA72F38d95` | On-chain alert storage and event emission |

- **Network:** Pharos Atlantic Testnet (Chain ID: 688689)
- **RPC:** `https://atlantic.dplabs-internal.com`
- **Explorer:** https://atlantic.pharosscan.xyz

## Tech Stack
- **Runtime:** Node.js + TypeScript
- **Smart Contracts:** Solidity ^0.8.20 + Hardhat
- **Blockchain:** Pharos Atlantic Testnet (688689)
- **Agent Protocol:** MCP (Model Context Protocol)
- **Payment:** x402 Protocol (HTTP 402 micro-payments)
- **EVM SDK:** viem + ethers.js v6

## Composability
The 4 skills are designed to work independently AND together:
- **Contract Auditor → Security Alerts:** Audit results trigger alert rules
- **Any Skill → x402 Paywall:** Monetize any data/API via micro-payments
- **Portfolio Analytics → Security Alerts:** Monitor positions for risk changes
- **Full Agent (Phase 2):** All 4 skills compose into a 24/7 on-chain Guardian Agent

## How It Aligns with Pharos Vision
- **On-chain payments:** x402 micro-payment settlement on Pharos
- **AI Agent economy:** MCP-compatible skills any agent can call
- **Composable infrastructure:** Skills as building blocks for the Pharos agent ecosystem
- **Anvita Flow ready:** Skills designed for Phase 2 composition via Anvita Flow agent framework
- **Real utility:** Actual DeFi security needs, not just demos

## Phase 2 Roadmap
- **Anvita Flow Integration:** Compose all 4 skills into a full Guardian Agent via Anvita Flow
- **On-chain Verification:** Full x402 payment verification via PaywallRegistry contract
- **Real-time Indexing:** WebSocket subscriptions for instant alert detection
- **DEX Integration:** Live yield position tracking from Pharos DEXs
- **Agent Autonomy:** Self-executing security responses (freeze, alert, migrate)

## Links
- **GitHub:** https://github.com/Carlys17/pharos-guardian-suite
- **Deployed Contracts:** https://atlantic.pharosscan.xyz

## Author
Carlys17
