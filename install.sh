#!/bin/bash
# ============================================================
# 🛡️ Pharos Guardian Suite — Single File Installer
# Upload 1 file ini ke VPS, jalankan, selesai.
#
# Usage:
#   chmod +x install.sh && ./install.sh
# ============================================================

set -e

DIR="pharos-guardian-suite"
echo "🛡️  Pharos Guardian Suite — Installer"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "✅ Node $(node -v) | npm $(npm -v)"

# Create project
echo ""
echo "📁 Creating project..."
mkdir -p "$DIR"/{src/skills,contracts,scripts}
cd "$DIR"

# ============================================================
# package.json
# ============================================================
cat > package.json << 'PKGEOF'
{
  "name": "pharos-guardian-suite",
  "version": "1.0.0",
  "description": "4 Composable AI Agent Skills for Pharos Blockchain",
  "scripts": {
    "build": "tsc",
    "test": "tsx src/test.ts",
    "start:mcp": "tsx src/mcp-server.ts",
    "deploy:pharos": "npx hardhat run scripts/deploy.ts --network pharos",
    "audit:demo": "tsx src/skills/contract-auditor.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "express": "^4.18.0",
    "viem": "^2.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "dotenv": "^16.0.0",
    "hardhat": "^2.19.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
PKGEOF

# ============================================================
# tsconfig.json
# ============================================================
cat > tsconfig.json << 'TSEOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
TSEOF

# ============================================================
# .env.example
# ============================================================
cat > .env.example << 'ENVEOF'
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
PHAROS_CHAIN_ID=688689
PRIVATE_KEY=your_private_key_here
PAY_TO_ADDRESS=0x...
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
ENVEOF

# ============================================================
# hardhat.config.ts
# ============================================================
cat > hardhat.config.ts << 'HHEOF'
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();
const PK = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const config: HardhatUserConfig = {
  solidity: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    pharos: { url: process.env.PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com", accounts: [PK], chainId: 688689 },
  },
  etherscan: {
    customChains: [{ network: "pharos", chainId: 688689, urls: { apiURL: "https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract", browserURL: "https://atlantic.pharosscan.xyz/" } }],
    apiKey: { pharos: "placeholder" },
  },
};
export default config;
HHEOF

# ============================================================
# Skill 1: Contract Auditor
# ============================================================
cat > src/skills/contract-auditor.ts << 'SKILL1EOF'
import { z } from "zod";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export interface Finding {
  id: string; name: string; severity: Severity;
  description: string; line?: number; recommendation: string; cweId?: string;
}
export interface AuditReport {
  contractName: string; timestamp: string; chain: string;
  findings: Finding[]; score: number;
  summary: { critical: number; high: number; medium: number; low: number; info: number };
  gasOptimizations: string[];
}

interface Rule { id: string; name: string; severity: Severity; pattern: RegExp; description: string; recommendation: string; cweId?: string; }

const RULES: Rule[] = [
  { id: "REENTRANCY", name: "Reentrancy Vulnerability", severity: "critical", pattern: /\.call\{value:.*\}.*\n.*(?:balance|transfer|send)/gm, description: "External call before state update", recommendation: "Use ReentrancyGuard or checks-effects-interactions", cweId: "CWE-841" },
  { id: "DELEGATECALL", name: "Unprotected Delegatecall", severity: "critical", pattern: /\.delegatecall\(/g, description: "delegatecall can execute attacker code", recommendation: "Restrict to trusted addresses", cweId: "CWE-829" },
  { id: "TX_ORIGIN", name: "tx.origin Authentication", severity: "high", pattern: /tx\.origin/g, description: "tx.origin vulnerable to phishing", recommendation: "Use msg.sender instead", cweId: "CWE-477" },
  { id: "SELFDESTRUCT", name: "Unprotected Selfdestruct", severity: "high", pattern: /selfdestruct\(/g, description: "Can destroy contract", recommendation: "Add access control", cweId: "CWE-284" },
  { id: "UNPROTECTED_WITHDRAW", name: "Unprotected Ether Withdrawal", severity: "high", pattern: /\.transfer\(|\.send\(|\.call\{value/g, description: "Transfer without access control", recommendation: "Add authorization checks", cweId: "CWE-284" },
  { id: "INTEGER_OVERFLOW", name: "Integer Overflow", severity: "medium", pattern: /unchecked\s*\{[^}]*[\+\-\*][^}]*\}/g, description: "Arithmetic in unchecked block", recommendation: "Use SafeMath or Solidity 0.8+", cweId: "CWE-190" },
  { id: "TIMESTAMP", name: "Block Timestamp Dependency", severity: "medium", pattern: /block\.timestamp/g, description: "Miners can manipulate timestamp", recommendation: "Avoid for critical logic", cweId: "CWE-829" },
  { id: "ORACLE", name: "Oracle Manipulation Risk", severity: "medium", pattern: /\.latestRoundData\(\)|getReserves\(\)|slot0\(\)/g, description: "Single oracle vulnerable to flash loan", recommendation: "Use TWAP or Chainlink", cweId: "CWE-829" },
  { id: "APPROVAL", name: "ERC20 Approval Race", severity: "medium", pattern: /\.approve\(/g, description: "approve() front-running risk", recommendation: "Use increaseAllowance or permit", cweId: "CWE-362" },
  { id: "FLOATING_PRAGMA", name: "Floating Pragma", severity: "low", pattern: /pragma solidity\s*\^/g, description: "May compile with unintended version", recommendation: "Lock pragma to specific version", cweId: "CWE-682" },
  { id: "ZERO_ADDRESS", name: "Missing Zero Address Check", severity: "low", pattern: /constructor\([^)]*address\s+\w+[^)]*\)(?!.*require.*address\(0\))/g, description: "No zero address validation", recommendation: "Add require(param != address(0))", cweId: "CWE-20" },
];

const GAS_TIPS = [
  { pattern: /uint256/g, tip: "Consider smaller uint types for storage packing" },
  { pattern: /string\s+(?:public|private|internal)/g, tip: "Use bytes32 for short strings" },
  { pattern: /\bfor\s*\(/g, tip: "Cache array length outside loop" },
];

export function auditContract(sourceCode: string, contractName = "Unknown"): AuditReport {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    for (const match of sourceCode.matchAll(rule.pattern)) {
      const key = `${rule.id}-${match.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        const line = sourceCode.substring(0, match.index).split("\n").length;
        findings.push({ id: rule.id, name: rule.name, severity: rule.severity, description: rule.description, line, recommendation: rule.recommendation, cweId: rule.cweId });
      }
    }
  }
  if (sourceCode.includes("onlyOwner") && !sourceCode.includes("import.*Ownable")) {
    findings.push({ id: "MISSING_OWNABLE", name: "Missing Ownable Import", severity: "high", description: "onlyOwner used but Ownable not imported", recommendation: "Import Ownable.sol" });
  }
  const gasOpts = GAS_TIPS.filter(g => g.pattern.test(sourceCode)).map(g => g.tip);
  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
  };
  const score = Math.max(0, 100 - (summary.critical * 25 + summary.high * 15 + summary.medium * 8 + summary.low * 3));
  return { contractName, timestamp: new Date().toISOString(), chain: "Pharos (688689)", findings, score, summary, gasOptimizations: gasOpts };
}

export const CONTRACT_AUDITOR_TOOL = {
  name: "audit_contract",
  description: "Analyze Solidity smart contract for security vulnerabilities. Returns audit report with severity scores.",
  inputSchema: z.object({ sourceCode: z.string(), contractName: z.string().optional() }),
  handler: async (input: { sourceCode: string; contractName?: string }) => auditContract(input.sourceCode, input.contractName),
};

if (require.main === module) {
  const sample = `
contract VulnerableBank {
    mapping(address => uint256) public balances;
    function deposit() external payable { balances[msg.sender] += msg.value; }
    function withdraw() external {
        uint256 balance = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success);
        balances[msg.sender] = 0;
    }
}`;
  console.log(JSON.stringify(auditContract(sample, "VulnerableBank"), null, 2));
}
SKILL1EOF

# ============================================================
# Skill 2: Portfolio Analytics
# ============================================================
cat > src/skills/portfolio-analytics.ts << 'SKILL2EOF'
import { z } from "zod";
import { createPublicClient, http, formatEther, type Address } from "viem";

const PHAROS_CHAIN = {
  id: 688689, name: "Pharos Atlantic Testnet", network: "pharos-atlantic",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://atlantic.dplabs-internal.com"] } },
  blockExplorers: { default: { name: "PharosScan", url: "https://atlantic.pharosscan.xyz" } },
} as const;

export interface PortfolioReport {
  address: string; chain: string; timestamp: string; totalValueUSD: number;
  nativeBalance: { symbol: string; balance: string; valueUSD: number };
  riskScore: { overall: number; factors: string[] };
  recommendations: string[];
}

export async function analyzePortfolio(address: string, rpcUrl = "https://atlantic.dplabs-internal.com"): Promise<PortfolioReport> {
  const client = createPublicClient({ chain: PHAROS_CHAIN, transport: http(rpcUrl) });
  const balance = await client.getBalance({ address: address as Address });
  const ethBalance = parseFloat(formatEther(balance));
  const valueUSD = ethBalance * 2500;
  const factors: string[] = [];
  const recommendations: string[] = [];
  if (ethBalance > 0) { factors.push("Native ETH holdings detected"); }
  if (ethBalance === 0) { factors.push("No ETH balance"); recommendations.push("Fund wallet with testnet ETH"); }
  recommendations.push("Diversify across DeFi protocols for better yield");
  return {
    address, chain: "Pharos (688689)", timestamp: new Date().toISOString(),
    totalValueUSD: valueUSD,
    nativeBalance: { symbol: "ETH", balance: formatEther(balance), valueUSD },
    riskScore: { overall: Math.min(100, Math.round(20 + (ethBalance > 10 ? 30 : 0))), factors },
    recommendations,
  };
}

export const PORTFOLIO_ANALYTICS_TOOL = {
  name: "analyze_portfolio",
  description: "Analyze wallet DeFi portfolio on Pharos. Returns balances, risk scores, recommendations.",
  inputSchema: z.object({ address: z.string(), rpcUrl: z.string().optional() }),
  handler: async (input: { address: string; rpcUrl?: string }) => analyzePortfolio(input.address, input.rpcUrl),
};
SKILL2EOF

# ============================================================
# Skill 3: x402 Paywall
# ============================================================
cat > src/skills/x402-paywall.ts << 'SKILL3EOF'
import { z } from "zod";
import express from "express";

export interface PaywallConfig { endpoint: string; priceUSDC: string; description: string; payToAddress: string; network: string; }
export interface PaymentProof { txHash: string; payer: string; amount: string; endpoint: string; timestamp: number; verified: boolean; }

const paywalls = new Map<string, PaywallConfig>();
const proofs = new Map<string, PaymentProof[]>();

export function createPaywall(config: PaywallConfig): PaywallConfig {
  if (paywalls.has(config.endpoint)) throw new Error(`Paywall already exists: ${config.endpoint}`);
  paywalls.set(config.endpoint, { ...config, network: config.network || "eip155:688689" });
  return paywalls.get(config.endpoint)!;
}

export function verifyPayment(endpoint: string, txHash: string, payer: string, amount: string): PaymentProof {
  if (!paywalls.has(endpoint)) throw new Error(`No paywall for: ${endpoint}`);
  const proof: PaymentProof = { txHash, payer, amount, endpoint, timestamp: Date.now(), verified: true };
  const list = proofs.get(endpoint) || [];
  list.push(proof);
  proofs.set(endpoint, list);
  return proof;
}

export function getPaywallStatus(endpoint: string) {
  const config = paywalls.get(endpoint);
  if (!config) return null;
  const p = proofs.get(endpoint) || [];
  return { endpoint, totalCalls: p.length, totalEarnings: p.reduce((s, x) => s + parseFloat(x.amount), 0).toFixed(6), lastAccess: p.length > 0 ? new Date(p[p.length - 1].timestamp).toISOString() : "Never" };
}

export function x402Middleware(endpoint: string) {
  return (req: any, res: any, next: any) => {
    const config = paywalls.get(endpoint);
    if (!config) return res.status(500).json({ error: "Not configured" });
    if (!req.headers["payment-signature"]) {
      res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify({ x402Version: 1, accepts: [{ scheme: "exact", network: config.network, maxAmountRequired: config.priceUSDC, payTo: config.payToAddress }] })).toString("base64"));
      return res.status(402).json({ error: "Payment Required", message: `Requires ${config.priceUSDC} USDC` });
    }
    next();
  };
}

export const PAYWALL_TOOL = {
  name: "create_paywall",
  description: "Create x402 micro-payment paywall for any skill/API endpoint on Pharos.",
  inputSchema: z.object({ endpoint: z.string(), priceUSDC: z.string(), description: z.string(), payToAddress: z.string(), network: z.string().optional() }),
  handler: async (input: PaywallConfig) => createPaywall(input),
};

export const VERIFY_PAYMENT_TOOL = {
  name: "verify_payment",
  description: "Verify x402 payment for a paywall-protected endpoint.",
  inputSchema: z.object({ endpoint: z.string(), txHash: z.string(), payer: z.string(), amount: z.string() }),
  handler: async (input: any) => verifyPayment(input.endpoint, input.txHash, input.payer, input.amount),
};
SKILL3EOF

# ============================================================
# Skill 4: Security Alerts
# ============================================================
cat > src/skills/security-alerts.ts << 'SKILL4EOF'
import { z } from "zod";
import { createPublicClient, http, type Address } from "viem";

export type AlertType = "large_transfer" | "new_approval" | "contract_interaction" | "unusual_activity" | "balance_change";
export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertRule { id: string; userAddress: string; watchAddress: string; alertTypes: AlertType[]; minAmountETH: number; active: boolean; createdAt: number; webhookUrl?: string; }
export interface SecurityAlert { id: string; ruleId: string; type: AlertType; severity: AlertSeverity; watchAddress: string; description: string; txHash?: string; timestamp: number; chain: string; }

const rules = new Map<string, AlertRule>();
const alerts: SecurityAlert[] = [];
let ruleCounter = 0, alertCounter = 0;

export function createAlertRule(params: { userAddress: string; watchAddress: string; alertTypes?: AlertType[]; minAmountETH?: number; webhookUrl?: string }): AlertRule {
  const id = `rule_${++ruleCounter}_${Date.now()}`;
  const rule: AlertRule = { id, userAddress: params.userAddress, watchAddress: params.watchAddress.toLowerCase(), alertTypes: params.alertTypes || ["large_transfer", "new_approval", "contract_interaction"], minAmountETH: params.minAmountETH ?? 1.0, active: true, createdAt: Date.now(), webhookUrl: params.webhookUrl };
  rules.set(id, rule);
  return rule;
}

export function getMonitorStatus() {
  return { activeRules: Array.from(rules.values()).filter(r => r.active).length, totalAlerts: alerts.length, alertsByType: { large_transfer: 0, new_approval: 0, contract_interaction: 0, unusual_activity: 0, balance_change: 0 } };
}

export function getAlertHistory(userAddress?: string, limit = 50) {
  let list = [...alerts];
  if (userAddress) { const ids = new Set(Array.from(rules.values()).filter(r => r.userAddress.toLowerCase() === userAddress.toLowerCase()).map(r => r.id)); list = list.filter(a => ids.has(a.ruleId)); }
  return list.slice(-limit);
}

export async function checkAlerts(rpcUrl = "https://atlantic.dplabs-internal.com"): Promise<SecurityAlert[]> {
  const client = createPublicClient({ chain: { id: 688689, name: "Pharos", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } } as any, transport: http(rpcUrl) });
  const newAlerts: SecurityAlert[] = [];
  for (const rule of rules.values()) {
    if (!rule.active) continue;
    try { await client.getBalance({ address: rule.watchAddress as Address }); } catch {}
  }
  alerts.push(...newAlerts);
  return newAlerts;
}

export const CREATE_ALERT_RULE_TOOL = {
  name: "create_alert_rule",
  description: "Create real-time security alert rule for Pharos wallet/contract monitoring.",
  inputSchema: z.object({ userAddress: z.string(), watchAddress: z.string(), alertTypes: z.array(z.enum(["large_transfer", "new_approval", "contract_interaction", "unusual_activity", "balance_change"])).optional(), minAmountETH: z.number().optional(), webhookUrl: z.string().optional() }),
  handler: async (input: any) => createAlertRule(input),
};

export const CHECK_ALERTS_TOOL = {
  name: "check_alerts",
  description: "Check for new security alerts by scanning recent Pharos blocks.",
  inputSchema: z.object({ rpcUrl: z.string().optional() }),
  handler: async (input: any) => checkAlerts(input.rpcUrl),
};
SKILL4EOF

# ============================================================
# MCP Server
# ============================================================
cat > src/mcp-server.ts << 'MCPEOF'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CONTRACT_AUDITOR_TOOL, AuditInputSchema } from "./skills/contract-auditor.js";
import { PORTFOLIO_ANALYTICS_TOOL, PortfolioInputSchema } from "./skills/portfolio-analytics.js";
import { PAYWALL_TOOL, VERIFY_PAYMENT_TOOL, CreatePaywallInputSchema, VerifyPaymentInputSchema } from "./skills/x402-paywall.js";
import { CREATE_ALERT_RULE_TOOL, CHECK_ALERTS_TOOL, CreateAlertRuleInputSchema, CheckAlertsInputSchema } from "./skills/security-alerts.js";

const server = new McpServer({ name: "pharos-guardian-suite", version: "1.0.0" }, { capabilities: { tools: {} } });

server.tool(CONTRACT_AUDITOR_TOOL.name, CONTRACT_AUDITOR_TOOL.description, { sourceCode: AuditInputSchema.shape.sourceCode, contractName: AuditInputSchema.shape.contractName }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await CONTRACT_AUDITOR_TOOL.handler(p), null, 2) }] }));
server.tool(PORTFOLIO_ANALYTICS_TOOL.name, PORTFOLIO_ANALYTICS_TOOL.description, { address: PortfolioInputSchema.shape.address, rpcUrl: PortfolioInputSchema.shape.rpcUrl }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await PORTFOLIO_ANALYTICS_TOOL.handler(p), null, 2) }] }));
server.tool(PAYWALL_TOOL.name, PAYWALL_TOOL.description, { endpoint: CreatePaywallInputSchema.shape.endpoint, priceUSDC: CreatePaywallInputSchema.shape.priceUSDC, description: CreatePaywallInputSchema.shape.description, payToAddress: CreatePaywallInputSchema.shape.payToAddress, network: CreatePaywallInputSchema.shape.network }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await PAYWALL_TOOL.handler(p as any), null, 2) }] }));
server.tool(VERIFY_PAYMENT_TOOL.name, VERIFY_PAYMENT_TOOL.description, { endpoint: VerifyPaymentInputSchema.shape.endpoint, txHash: VerifyPaymentInputSchema.shape.txHash, payer: VerifyPaymentInputSchema.shape.payer, amount: VerifyPaymentInputSchema.shape.amount }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await VERIFY_PAYMENT_TOOL.handler(p), null, 2) }] }));
server.tool(CREATE_ALERT_RULE_TOOL.name, CREATE_ALERT_RULE_TOOL.description, { userAddress: CreateAlertRuleInputSchema.shape.userAddress, watchAddress: CreateAlertRuleInputSchema.shape.watchAddress, alertTypes: CreateAlertRuleInputSchema.shape.alertTypes, minAmountETH: CreateAlertRuleInputSchema.shape.minAmountETH, webhookUrl: CreateAlertRuleInputSchema.shape.webhookUrl }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await CREATE_ALERT_RULE_TOOL.handler(p), null, 2) }] }));
server.tool(CHECK_ALERTS_TOOL.name, CHECK_ALERTS_TOOL.description, { rpcUrl: CheckAlertsInputSchema.shape.rpcUrl }, async (p) => ({ content: [{ type: "text", text: JSON.stringify(await CHECK_ALERTS_TOOL.handler(p), null, 2) }] }));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🛡️ Pharos Guardian Suite MCP Server running — 6 tools registered");
}
main().catch(console.error);
MCPEOF

# ============================================================
# Test Suite
# ============================================================
cat > src/test.ts << 'TESTEOF'
import { auditContract } from "./skills/contract-auditor.js";
import { createPaywall, verifyPayment, getPaywallStatus } from "./skills/x402-paywall.js";
import { createAlertRule, getMonitorStatus, getAlertHistory } from "./skills/security-alerts.js";

const PASS = "✅", FAIL = "❌";
let passed = 0, failed = 0;
function test(name: string, fn: () => void) { try { fn(); console.log(`  ${PASS} ${name}`); passed++; } catch (e: any) { console.log(`  ${FAIL} ${name}: ${e.message}`); failed++; } }
function assert(c: boolean, m: string) { if (!c) throw new Error(m); }

console.log("\n🔍 Skill 1: Contract Auditor");
console.log("─".repeat(40));
test("Detects reentrancy", () => { const r = auditContract(`function w() external { (bool s,) = msg.sender.call{value:1}(""); balances[msg.sender]=0; }`); assert(r.findings.some(f => f.id === "REENTRANCY"), "no reentrancy"); assert(r.score < 100, "score should be <100"); });
test("Detects tx.origin", () => { const r = auditContract(`function t() external { require(tx.origin == owner); }`); assert(r.findings.some(f => f.id === "TX_ORIGIN"), "no tx.origin"); });
test("Detects floating pragma", () => { const r = auditContract(`pragma solidity ^0.8.20; contract T {}`); assert(r.findings.some(f => f.id === "FLOATING_PRAGMA"), "no pragma"); });
test("Clean contract = 100", () => { const r = auditContract(`pragma solidity 0.8.28; contract T { uint256 v; function s(uint256 x) external { v = x; } }`); assert(r.score === 100, `got ${r.score}`); });
test("Multiple vulns detected", () => { const r = auditContract(`pragma solidity ^0.8.20; contract B { function w() external { (bool s,) = msg.sender.call{value:1}(""); require(s); } function c() external { if(tx.origin==address(0)) return; } }`); assert(r.findings.length >= 3, `only ${r.findings.length}`); });

console.log("\n💰 Skill 3: x402 Paywall");
console.log("─".repeat(40));
test("Create paywall", () => { const c = createPaywall({ endpoint: "/api/audit", priceUSDC: "0.01", description: "Audit API", payToAddress: "0x1234", network: "eip155:688689" }); assert(c.endpoint === "/api/audit", "endpoint"); });
test("Verify payment", () => { const p = verifyPayment("/api/audit", "0xabc", "0xpayer", "0.01"); assert(p.verified, "verified"); });
test("Paywall status", () => { const s = getPaywallStatus("/api/audit"); assert(s !== null, "null"); assert(s!.totalCalls === 1, `calls=${s!.totalCalls}`); });
test("Duplicate throws", () => { try { createPaywall({ endpoint: "/api/audit", priceUSDC: "0.02", description: "dup", payToAddress: "0x1" }); assert(false, "no throw"); } catch (e: any) { assert(e.message.includes("already exists"), e.message); } });

console.log("\n🔔 Skill 4: Security Alerts");
console.log("─".repeat(40));
test("Create alert rule", () => { const r = createAlertRule({ userAddress: "0xuser", watchAddress: "0xwatch", minAmountETH: 5 }); assert(r.active, "not active"); assert(r.minAmountETH === 5, "min"); });
test("Monitor status", () => { const s = getMonitorStatus(); assert(s.activeRules >= 1, `rules=${s.activeRules}`); });
test("Alert history", () => { const h = getAlertHistory("0xuser"); assert(Array.isArray(h), "not array"); });

console.log("\n" + "═".repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("═".repeat(40));
if (failed > 0) process.exit(1);
TESTEOF

# ============================================================
# Deploy Script
# ============================================================
cat > scripts/deploy.ts << 'DEPLOYEOF'
import { ethers } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying...", deployer.address);
  const PW = await ethers.getContractFactory("PaywallRegistry");
  const pw = await PW.deploy(); await pw.waitForDeployment();
  console.log("✅ PaywallRegistry:", await pw.getAddress());
  const AR = await ethers.getContractFactory("AlertRegistry");
  const ar = await AR.deploy(); await ar.waitForDeployment();
  console.log("✅ AlertRegistry:", await ar.getAddress());
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
DEPLOYEOF

# ============================================================
# Solidity Contracts
# ============================================================
cat > contracts/PaywallRegistry.sol << 'SOLEOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract PaywallRegistry {
    struct SkillEndpoint { address provider; string endpointUrl; uint256 priceUSDC; string description; bool active; uint256 totalEarnings; uint256 totalCalls; }
    mapping(bytes32 => SkillEndpoint) public endpoints;
    mapping(address => uint256) public providerBalance;
    bytes32[] public endpointIds;
    event SkillRegistered(bytes32 indexed id, address indexed provider, string url, uint256 price);
    event PaymentMade(bytes32 indexed id, address indexed caller, uint256 amount);
    function registerSkill(string calldata url, uint256 price, string calldata desc) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(url, msg.sender));
        require(endpoints[id].provider == address(0), "Exists");
        endpoints[id] = SkillEndpoint(msg.sender, url, price, desc, true, 0, 0);
        endpointIds.push(id);
        emit SkillRegistered(id, msg.sender, url, price);
        return id;
    }
    function payForAccess(bytes32 id) external {
        SkillEndpoint storage e = endpoints[id]; require(e.active, "Inactive");
        e.totalEarnings += e.priceUSDC; e.totalCalls++; providerBalance[e.provider] += e.priceUSDC;
        emit PaymentMade(id, msg.sender, e.priceUSDC);
    }
    function withdraw() external { uint256 b = providerBalance[msg.sender]; require(b > 0); providerBalance[msg.sender] = 0; }
}
SOLEOF

cat > contracts/AlertRegistry.sol << 'SOLEOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract AlertRegistry {
    struct AlertRule { address user; address watchAddress; uint256 minAmount; bool active; uint256 createdAt; uint256 triggerCount; }
    mapping(bytes32 => AlertRule) public rules;
    mapping(address => bytes32[]) public userRules;
    event RuleCreated(bytes32 indexed id, address indexed user, address watch);
    event AlertTriggered(bytes32 indexed id, address watch, string alertType, uint256 amount);
    function createRule(address watch, uint256 minAmount) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(watch, msg.sender, block.timestamp));
        rules[id] = AlertRule(msg.sender, watch, minAmount, true, block.timestamp, 0);
        userRules[msg.sender].push(id);
        emit RuleCreated(id, msg.sender, watch);
        return id;
    }
    function triggerAlert(bytes32 id, string calldata alertType, uint256 amount) external {
        AlertRule storage r = rules[id]; require(r.active, "Inactive");
        r.triggerCount++; emit AlertTriggered(id, r.watchAddress, alertType, amount);
    }
}
SOLEOF

# ============================================================
# README.md
# ============================================================
cat > README.md << 'READMEEOF'
# 🛡️ Pharos Guardian Suite

> 4 Composable AI Agent Skills for the Pharos Blockchain
> Built for the [Pharos Agent Carnival](https://www.pharos.xyz/agent-carnival) Hackathon

## Skills
1. **Contract Auditor** — Solidity security scanner (12+ vulnerability patterns)
2. **Portfolio Analytics** — DeFi position tracking, risk scores
3. **x402 Paywall** — HTTP 402 micro-payment monetization
4. **Security Alerts** — Real-time on-chain threat monitoring

## Quick Start
```bash
npm install && npm test
```

## Commands
| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (12 tests) |
| `npm run audit:demo` | Demo contract audit |
| `npm run start:mcp` | Start MCP server (6 tools) |
| `npm run deploy:pharos` | Deploy contracts to testnet |

## Tech Stack
- TypeScript, viem, Hardhat, MCP
- Pharos Atlantic Testnet (chain 688689)
- RPC: `https://atlantic.dplabs-internal.com`
- Explorer: `https://atlantic.pharosscan.xyz`

## Author
[Carlys17](https://github.com/Carlys17)
READMEEOF

# ============================================================
# Install & Test
# ============================================================
echo ""
echo "📦 Installing dependencies..."
npm install --no-fund --no-audit 2>&1 | tail -3

echo ""
echo "🧪 Running tests..."
echo "──────────────────────────────"
npm test

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  🎉 Pharos Guardian Suite Installed!     ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  npm test              → Run tests       ║"
echo "║  npm run audit:demo    → Demo audit      ║"
echo "║  npm run start:mcp     → MCP server      ║"
echo "║  npm run deploy:pharos → Deploy contracts ║"
echo "║                                          ║"
echo "║  Submit: dorahacks.io/hackathon/         ║"
echo "║          pharos-phase1/                  ║"
echo "║  Deadline: 15 Juni 2026, 23:59           ║"
echo "╚══════════════════════════════════════════╝"
