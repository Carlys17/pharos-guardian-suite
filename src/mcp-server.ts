/**
 * Pharos Guardian Suite — Unified MCP Server
 *
 * Exposes all 4 skills as MCP-compatible tools:
 *   1. audit_contract       — Smart contract security auditor
 *   2. analyze_portfolio    — DeFi portfolio analytics
 *   3. create_paywall       — x402 micro-payment paywall
 *   4. verify_payment       — x402 payment verification
 *   5. create_alert_rule    — Security alert monitoring
 *   6. check_alerts         — Trigger alert check
 *
 * Compatible with any MCP host (Claude, GPT, Hermes, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import skills
import {
  CONTRACT_AUDITOR_TOOL,
  AuditInputSchema,
} from "./skills/contract-auditor.js";

import {
  PORTFOLIO_ANALYTICS_TOOL,
  PortfolioInputSchema,
} from "./skills/portfolio-analytics.js";

import {
  PAYWALL_TOOL,
  VERIFY_PAYMENT_TOOL,
  CreatePaywallInputSchema,
  VerifyPaymentInputSchema,
} from "./skills/x402-paywall.js";

import {
  CREATE_ALERT_RULE_TOOL,
  CHECK_ALERTS_TOOL,
  CreateAlertRuleInputSchema,
  CheckAlertsInputSchema,
} from "./skills/security-alerts.js";

// ============================================================
// MCP Server Setup
// ============================================================

const server = new McpServer({
  name: "pharos-guardian-suite",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// ============================================================
// Register Skills as MCP Tools
// ============================================================

// Skill 1: Contract Auditor
server.tool(
  CONTRACT_AUDITOR_TOOL.name,
  CONTRACT_AUDITOR_TOOL.description,
  {
    sourceCode: AuditInputSchema.shape.sourceCode,
    contractName: AuditInputSchema.shape.contractName,
  },
  async (params) => {
    const result = await CONTRACT_AUDITOR_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// Skill 2: Portfolio Analytics
server.tool(
  PORTFOLIO_ANALYTICS_TOOL.name,
  PORTFOLIO_ANALYTICS_TOOL.description,
  {
    address: PortfolioInputSchema.shape.address,
    rpcUrl: PortfolioInputSchema.shape.rpcUrl,
  },
  async (params) => {
    const result = await PORTFOLIO_ANALYTICS_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// Skill 3a: Create Paywall
server.tool(
  PAYWALL_TOOL.name,
  PAYWALL_TOOL.description,
  {
    endpoint: CreatePaywallInputSchema.shape.endpoint,
    priceUSDC: CreatePaywallInputSchema.shape.priceUSDC,
    description: CreatePaywallInputSchema.shape.description,
    payToAddress: CreatePaywallInputSchema.shape.payToAddress,
    network: CreatePaywallInputSchema.shape.network,
  },
  async (params) => {
    const result = await PAYWALL_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// Skill 3b: Verify Payment
server.tool(
  VERIFY_PAYMENT_TOOL.name,
  VERIFY_PAYMENT_TOOL.description,
  {
    endpoint: VerifyPaymentInputSchema.shape.endpoint,
    txHash: VerifyPaymentInputSchema.shape.txHash,
    payer: VerifyPaymentInputSchema.shape.payer,
    amount: VerifyPaymentInputSchema.shape.amount,
  },
  async (params) => {
    const result = await VERIFY_PAYMENT_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// Skill 4a: Create Alert Rule
server.tool(
  CREATE_ALERT_RULE_TOOL.name,
  CREATE_ALERT_RULE_TOOL.description,
  {
    userAddress: CreateAlertRuleInputSchema.shape.userAddress,
    watchAddress: CreateAlertRuleInputSchema.shape.watchAddress,
    alertTypes: CreateAlertRuleInputSchema.shape.alertTypes,
    minAmountETH: CreateAlertRuleInputSchema.shape.minAmountETH,
    maxApprovalETH: CreateAlertRuleInputSchema.shape.maxApprovalETH,
    webhookUrl: CreateAlertRuleInputSchema.shape.webhookUrl,
  },
  async (params) => {
    const result = await CREATE_ALERT_RULE_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// Skill 4b: Check Alerts
server.tool(
  CHECK_ALERTS_TOOL.name,
  CHECK_ALERTS_TOOL.description,
  {
    rpcUrl: CheckAlertsInputSchema.shape.rpcUrl,
  },
  async (params) => {
    const result = await CHECK_ALERTS_TOOL.handler(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// ============================================================
// Start Server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🛡️ Pharos Guardian Suite MCP Server running");
  console.error("   Skills registered:");
  console.error("   1. audit_contract — Smart contract security auditor");
  console.error("   2. analyze_portfolio — DeFi portfolio analytics");
  console.error("   3. create_paywall — x402 micro-payment paywall");
  console.error("   4. verify_payment — x402 payment verification");
  console.error("   5. create_alert_rule — Security alert monitoring");
  console.error("   6. check_alerts — Trigger alert check");
  console.error("   Chain: Pharos Atlantic Testnet (688689)");
  console.error("   Ready for MCP connections! 🚀");
}

main().catch(console.error);
