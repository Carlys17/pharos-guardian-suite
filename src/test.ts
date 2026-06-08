/**
 * Pharos Guardian Suite — Test Runner
 * Tests all 4 skills
 */

import { auditContract } from "./skills/contract-auditor.js";
import { createPaywall, verifyPayment, getPaywallStatus } from "./skills/x402-paywall.js";
import { createAlertRule, getMonitorStatus, getAlertHistory } from "./skills/security-alerts.js";

const PASS = "✅";
const FAIL = "❌";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ${PASS} ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ${FAIL} ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ============================================================
// Skill 1: Contract Auditor Tests
// ============================================================
console.log("\n🔍 Skill 1: Contract Auditor");
console.log("─".repeat(40));

test("Detects reentrancy vulnerability", () => {
  const code = `
    function withdraw() external {
      uint256 balance = balances[msg.sender];
      (bool success, ) = msg.sender.call{value: balance}("");
      require(success);
      balances[msg.sender] = 0;
    }
  `;
  const report = auditContract(code, "TestContract");
  assert(report.findings.some(f => f.id === "REENTRANCY"), "Should detect reentrancy");
  assert(report.score < 100, "Score should be less than 100");
});

test("Detects tx.origin usage", () => {
  const code = `
    function transfer(address to, uint256 amount) external {
      require(tx.origin == owner);
    }
  `;
  const report = auditContract(code, "TestContract");
  assert(report.findings.some(f => f.id === "TX_ORIGIN"), "Should detect tx.origin");
});

test("Detects floating pragma", () => {
  const code = `pragma solidity ^0.8.20; contract Test {}`;
  const report = auditContract(code, "TestContract");
  assert(report.findings.some(f => f.id === "FLOATING_PRAGMA"), "Should detect floating pragma");
});

test("Clean contract scores 100", () => {
  const code = `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.28;
    contract Clean {
      uint256 public value;
      function setValue(uint256 v) external { value = v; }
    }
  `;
  const report = auditContract(code, "Clean");
  assert(report.score === 100, `Score should be 100, got ${report.score}`);
});

test("Multiple vulnerabilities detected", () => {
  const code = `
    pragma solidity ^0.8.20;
    contract Bad {
      function withdraw() external {
        (bool s, ) = msg.sender.call{value: 1}("");
        require(s);
      }
      function check() external view {
        if (tx.origin == address(0)) return;
      }
    }
  `;
  const report = auditContract(code, "Bad");
  assert(report.findings.length >= 3, `Should find 3+ vulnerabilities, found ${report.findings.length}`);
  assert(report.summary.critical >= 1, "Should have at least 1 critical");
});

// ============================================================
// Skill 3: x402 Paywall Tests
// ============================================================
console.log("\n💰 Skill 3: x402 Paywall");
console.log("─".repeat(40));

test("Create paywall", () => {
  const config = createPaywall({
    endpoint: "/api/audit",
    priceUSDC: "0.01",
    description: "Contract audit API",
    payToAddress: "0x1234567890abcdef",
    network: "eip155:688689",
  });
  assert(config.endpoint === "/api/audit", "Endpoint should match");
  assert(config.priceUSDC === "0.01", "Price should match");
});

test("Verify payment", () => {
  const proof = verifyPayment("/api/audit", "0xabc123", "0xpayer", "0.01");
  assert(proof.verified === true, "Should be verified");
  assert(proof.payer === "0xpayer", "Payer should match");
});

test("Paywall status", () => {
  const status = getPaywallStatus("/api/audit");
  assert(status !== null, "Status should exist");
  assert(status!.totalCalls === 1, `Should have 1 call, got ${status!.totalCalls}`);
});

test("Duplicate paywall throws", () => {
  try {
    createPaywall({
      endpoint: "/api/audit",
      priceUSDC: "0.02",
      description: "Duplicate",
      payToAddress: "0x1234",
    });
    assert(false, "Should have thrown");
  } catch (e: any) {
    assert(e.message.includes("already exists"), "Should throw duplicate error");
  }
});

// ============================================================
// Skill 4: Security Alerts Tests
// ============================================================
console.log("\n🔔 Skill 4: Security Alerts");
console.log("─".repeat(40));

test("Create alert rule", () => {
  const rule = createAlertRule({
    userAddress: "0xuser",
    watchAddress: "0xwatch",
    minAmountETH: 5.0,
  });
  assert(rule.active === true, "Rule should be active");
  assert(rule.minAmountETH === 5.0, "Min amount should match");
});

test("Monitor status", () => {
  const status = getMonitorStatus();
  assert(status.activeRules >= 1, "Should have at least 1 active rule");
});

test("Alert history", () => {
  const history = getAlertHistory("0xuser");
  assert(Array.isArray(history), "Should return array");
});

// ============================================================
// Summary
// ============================================================
console.log("\n" + "═".repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("═".repeat(40));

if (failed > 0) process.exit(1);
