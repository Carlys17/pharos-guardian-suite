/**
 * Skill 1: Contract Auditor
 * Analyzes smart contract source code for common vulnerability patterns
 * Returns structured security report with severity scores
 *
 * MCP Tool: audit_contract
 */

import { z } from "zod";

// ============================================================
// Vulnerability Pattern Definitions
// ============================================================

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  line?: number;
  recommendation: string;
  cweId?: string;
}

export interface AuditReport {
  contractName: string;
  timestamp: string;
  chain: string;
  findings: Finding[];
  score: number;         // 0-100 (100 = no issues)
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  gasOptimizations: string[];
}

// ============================================================
// Vulnerability Analyzers
// ============================================================

interface VulnerabilityRule {
  id: string;
  name: string;
  severity: Severity;
  pattern: RegExp;
  description: string;
  recommendation: string;
  cweId?: string;
}

const VULNERABILITY_RULES: VulnerabilityRule[] = [
  // Critical
  {
    id: "REENTRANCY",
    name: "Reentrancy Vulnerability",
    severity: "critical",
    pattern: /\.call\{value:.*\}.*\n.*(?:balance|transfer|send)/gm,
    description: "External call before state update — classic reentrancy vector",
    recommendation: "Use ReentrancyGuard from OpenZeppelin or follow checks-effects-interactions pattern",
    cweId: "CWE-841",
  },
  {
    id: "DELEGATECALL",
    name: "Unprotected Delegatecall",
    severity: "critical",
    pattern: /\.delegatecall\(/g,
    description: "delegatecall can be exploited to execute attacker code in contract context",
    recommendation: "Restrict delegatecall to trusted addresses only, validate target",
    cweId: "CWE-829",
  },
  // High
  {
    id: "TX_ORIGIN",
    name: "tx.origin Authentication",
    severity: "high",
    pattern: /tx\.origin/g,
    description: "Using tx.origin for authentication is vulnerable to phishing attacks",
    recommendation: "Use msg.sender instead of tx.origin for authentication",
    cweId: "CWE-477",
  },
  {
    id: "SELFDESTRUCT",
    name: "Unprotected Selfdestruct",
    severity: "high",
    pattern: /selfdestruct\(/g,
    description: "selfdestruct can destroy the contract and send funds to arbitrary address",
    recommendation: "Add access control to selfdestruct, consider removing it entirely",
    cweId: "CWE-284",
  },
  {
    id: "UNPROTECTED_ETHER_WITHDRAW",
    name: "Unprotected Ether Withdrawal",
    severity: "high",
    pattern: /\.transfer\(|\.send\(|\.call\{value/g,
    description: "Ether transfer without proper access control",
    recommendation: "Ensure only authorized addresses can trigger withdrawals",
    cweId: "CWE-284",
  },
  // Medium
  {
    id: "INTEGER_OVERFLOW",
    name: "Potential Integer Overflow",
    severity: "medium",
    pattern: /unchecked\s*\{[^}]*[\+\-\*][^}]*\}/g,
    description: "Arithmetic in unchecked block — overflow/underflow possible",
    recommendation: "Use SafeMath or Solidity 0.8+ built-in overflow checks",
    cweId: "CWE-190",
  },
  {
    id: "TIMESTAMP_DEPENDENCY",
    name: "Block Timestamp Dependency",
    severity: "medium",
    pattern: /block\.timestamp/g,
    description: "Reliance on block.timestamp — miners can manipulate within ~15 seconds",
    recommendation: "Avoid using block.timestamp for critical logic or randomness",
    cweId: "CWE-829",
  },
  {
    id: "ORACLE_MANIPULATION",
    name: "Oracle Price Manipulation Risk",
    severity: "medium",
    pattern: /\.latestRoundData\(\)|getReserves\(\)|slot0\(\)/g,
    description: "Single oracle source vulnerable to flash loan manipulation",
    recommendation: "Use TWAP, Chainlink, or multiple oracle sources",
    cweId: "CWE-829",
  },
  {
    id: "APPROVAL_RACE",
    name: "ERC20 Approval Race Condition",
    severity: "medium",
    pattern: /\.approve\(/g,
    description: "Standard approve() is vulnerable to front-running race condition",
    recommendation: "Use increaseAllowance/decreaseAllowance or permit (EIP-2612)",
    cweId: "CWE-362",
  },
  // Low
  {
    id: "FLOATING_PRAGMA",
    name: "Floating Pragma",
    severity: "low",
    pattern: /pragma solidity\s*\^/g,
    description: "Floating pragma may compile with unintended compiler version",
    recommendation: "Lock pragma to specific version (e.g., pragma solidity 0.8.28)",
    cweId: "CWE-682",
  },
  {
    id: "MISSING_EVENT",
    name: "State Change Without Event",
    severity: "low",
    pattern: /function\s+\w+[^{]*\{[^}]*=\s*(?!.*emit)/g,
    description: "State variable modified without emitting an event",
    recommendation: "Emit events for all state changes for off-chain tracking",
    cweId: "CWE-778",
  },
  {
    id: "ZERO_ADDRESS",
    name: "Missing Zero Address Validation",
    severity: "low",
    pattern: /constructor\([^)]*address\s+\w+[^)]*\)(?!.*require.*address\(0\))/g,
    description: "Constructor parameter not validated against zero address",
    recommendation: "Add require(param != address(0)) check",
    cweId: "CWE-20",
  },
];

const GAS_OPTIMIZATION_PATTERNS = [
  { pattern: /uint256/g, tip: "Consider using smaller uint types (uint128, uint64) for storage variables to pack slots" },
  { pattern: /string\s+(?:public|private|internal)/g, tip: "Use bytes32 instead of string for short strings to save gas" },
  { pattern: /\bfor\s*\(/g, tip: "Cache array length outside loop: uint len = arr.length" },
  { pattern: /storage\s+\w+/g, tip: "Use memory instead of storage for temporary variables" },
  { pattern: /require\([^,]+\)/g, tip: "Add error messages to require() for better debugging (but costs more gas)" },
];

// ============================================================
// Core Auditor
// ============================================================

export function auditContract(
  sourceCode: string,
  contractName: string = "Unknown"
): AuditReport {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  // Run vulnerability checks
  for (const rule of VULNERABILITY_RULES) {
    const matches = sourceCode.matchAll(rule.pattern);
    for (const match of matches) {
      const key = `${rule.id}-${match.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Estimate line number
        const line = sourceCode.substring(0, match.index).split("\n").length;
        findings.push({
          id: rule.id,
          name: rule.name,
          severity: rule.severity,
          description: rule.description,
          line,
          recommendation: rule.recommendation,
          cweId: rule.cweId,
        });
      }
    }
  }

  // Check access control
  if (sourceCode.includes("onlyOwner") && !sourceCode.includes("import.*Ownable")) {
    findings.push({
      id: "MISSING_OWNABLE",
      name: "Missing Ownable Import",
      severity: "high",
      description: "onlyOwner modifier used but Ownable not imported",
      recommendation: "Import @openzeppelin/contracts/access/Ownable.sol",
    });
  }

  // Gas optimizations
  const gasOpts: string[] = [];
  for (const g of GAS_OPTIMIZATION_PATTERNS) {
    if (g.pattern.test(sourceCode)) {
      gasOpts.push(g.tip);
    }
  }

  // Calculate score
  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
  };

  const score = Math.max(0, 100 - (
    summary.critical * 25 +
    summary.high * 15 +
    summary.medium * 8 +
    summary.low * 3 +
    summary.info * 1
  ));

  return {
    contractName,
    timestamp: new Date().toISOString(),
    chain: "Pharos (688689)",
    findings,
    score,
    summary,
    gasOptimizations: gasOpts,
  };
}

// ============================================================
// MCP Tool Schema
// ============================================================

export const AuditInputSchema = z.object({
  sourceCode: z.string().describe("Solidity source code to audit"),
  contractName: z.string().optional().describe("Name of the contract"),
});

export const AuditOutputSchema = z.object({
  contractName: z.string(),
  timestamp: z.string(),
  chain: z.string(),
  findings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
    description: z.string(),
    line: z.number().optional(),
    recommendation: z.string(),
    cweId: z.string().optional(),
  })),
  score: z.number(),
  summary: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    info: z.number(),
  }),
  gasOptimizations: z.array(z.string()),
});

// ============================================================
// MCP Tool Definition
// ============================================================

export const CONTRACT_AUDITOR_TOOL = {
  name: "audit_contract",
  description: "Analyze Solidity smart contract source code for security vulnerabilities. Returns structured audit report with severity scores, findings, and gas optimization suggestions. Supports reentrancy, overflow, access control, oracle manipulation, and 12+ vulnerability patterns.",
  inputSchema: AuditInputSchema,
  outputSchema: AuditOutputSchema,
  handler: async (input: z.infer<typeof AuditInputSchema>) => {
    const report = auditContract(input.sourceCode, input.contractName);
    return report;
  },
};

// ============================================================
// CLI Entry
// ============================================================

if (require.main === module) {
  const sampleContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 balance = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success);
        balances[msg.sender] = 0;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`;

  const report = auditContract(sampleContract, "VulnerableBank");
  console.log(JSON.stringify(report, null, 2));
}
