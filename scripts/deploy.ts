/**
 * Deploy script for Pharos Guardian Suite contracts
 * Deploys PaywallRegistry and AlertRegistry to Pharos testnet
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Pharos Guardian Suite contracts...");
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy PaywallRegistry
  console.log("\n📦 Deploying PaywallRegistry...");
  const PaywallRegistry = await ethers.getContractFactory("PaywallRegistry");
  const paywall = await PaywallRegistry.deploy();
  await paywall.waitForDeployment();
  const paywallAddr = await paywall.getAddress();
  console.log("   ✅ PaywallRegistry deployed to:", paywallAddr);

  // Deploy AlertRegistry
  console.log("\n🔔 Deploying AlertRegistry...");
  const AlertRegistry = await ethers.getContractFactory("AlertRegistry");
  const alerts = await AlertRegistry.deploy();
  await alerts.waitForDeployment();
  const alertsAddr = await alerts.getAddress();
  console.log("   ✅ AlertRegistry deployed to:", alertsAddr);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(50));
  console.log("   PaywallRegistry:", paywallAddr);
  console.log("   AlertRegistry:  ", alertsAddr);
  console.log("   Network:        Pharos Atlantic Testnet (688689)");
  console.log("   Explorer:       https://atlantic.pharosscan.xyz");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
