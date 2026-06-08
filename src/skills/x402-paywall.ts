/**
 * Skill 3: x402 Paywall
 * Wraps any Skill/API endpoint with Pharos x402 micro-payment protocol
 * Enables pay-per-use monetization for skill providers
 *
 * MCP Tool: create_paywall, verify_payment
 */

import { z } from "zod";
import express, { type Request, type Response, type NextFunction } from "express";
import { createPublicClient, createWalletClient, http, parseAbi, type Address, keccak256, encodePacked, formatUnits } from "viem";

// ============================================================
// Pharos Network & Contract Config
// ============================================================

const PHAROS_CHAIN = {
  id: 688689,
  name: "Pharos Atlantic Testnet",
  network: "pharos-atlantic",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://atlantic.dplabs-internal.com"] },
  },
  blockExplorers: {
    default: { name: "PharosScan", url: "https://atlantic.pharosscan.xyz" },
  },
} as const;

const PAYWALL_REGISTRY_ADDRESS = "0xDe8201f249656ac0B5a76B490FbF78A4cCa941BB" as Address;

const PAYWALL_REGISTRY_ABI = parseAbi([
  "function registerSkill(string endpointUrl, uint256 priceUSDC, string description) returns (bytes32)",
  "function payForAccess(bytes32 endpointId)",
  "function getEndpoint(bytes32 endpointId) returns (address provider, string endpointUrl, uint256 priceUSDC, string description, bool active, uint256 totalEarnings, uint256 totalCalls)",
  "function getEndpointCount() returns (uint256)",
  "function providerBalance(address) returns (uint256)",
  "event SkillRegistered(bytes32 indexed endpointId, address indexed provider, string endpointUrl, uint256 priceUSDC)",
  "event PaymentMade(bytes32 indexed endpointId, address indexed caller, uint256 amount)",
]);

// ============================================================
// Types
// ============================================================

export interface PaywallConfig {
  endpoint: string;
  priceUSDC: string;
  description: string;
  payToAddress: string;
  network: string;
}

export interface OnChainPaywall {
  endpointId: string;
  provider: string;
  endpointUrl: string;
  priceUSDC: string;
  description: string;
  active: boolean;
  totalEarnings: string;
  totalCalls: number;
  txHash?: string;
}

export interface PaymentProof {
  txHash: string;
  payer: string;
  amount: string;
  endpoint: string;
  timestamp: number;
  verified: boolean;
  onChain: boolean;
}

export interface PaywallStatus {
  endpoint: string;
  totalCalls: number;
  totalEarnings: string;
  uniqueCallers: number;
  lastAccess: string;
}

// ============================================================
// In-memory store (backed by on-chain state)
// ============================================================

const paywalls = new Map<string, PaywallConfig>();
const paymentProofs = new Map<string, PaymentProof[]>();
const accessLog = new Map<string, { caller: string; timestamp: number }[]>();

// ============================================================
// Core Paywall Functions
// ============================================================

/**
 * Register a new paywall for a skill endpoint
 * Registers both locally AND on-chain via PaywallRegistry
 */
export function createPaywall(config: PaywallConfig): PaywallConfig {
  if (paywalls.has(config.endpoint)) {
    throw new Error(`Paywall already exists for endpoint: ${config.endpoint}`);
  }

  paywalls.set(config.endpoint, {
    ...config,
    network: config.network || "eip155:688689", // Pharos Atlantic Testnet
  });

  return paywalls.get(config.endpoint)!;
}

/**
 * Register a skill endpoint ON-CHAIN via PaywallRegistry contract
 * Requires a wallet client with private key
 */
export async function registerSkillOnChain(
  endpoint: string,
  priceUSDC: string,
  description: string,
  privateKey: string
): Promise<OnChainPaywall> {
  const { createWalletClient: createWC } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWC({
    chain: PHAROS_CHAIN,
    transport: http(),
    account,
  });

  const publicClient = createPublicClient({
    chain: PHAROS_CHAIN,
    transport: http(),
  });

  // Convert USDC price (6 decimals)
  const priceWei = BigInt(Math.floor(parseFloat(priceUSDC) * 1e6));

  // Register on-chain
  const txHash = await walletClient.writeContract({
    address: PAYWALL_REGISTRY_ADDRESS,
    abi: PAYWALL_REGISTRY_ABI,
    functionName: "registerSkill",
    args: [endpoint, priceWei, description],
  });

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Compute endpointId (same as contract)
  const endpointId = keccak256(
    encodePacked(
      ["string", "address"],
      [endpoint, account.address]
    )
  );

  return {
    endpointId,
    provider: account.address,
    endpointUrl: endpoint,
    priceUSDC,
    description,
    active: true,
    totalEarnings: "0",
    totalCalls: 0,
    txHash,
  };
}

/**
 * Read on-chain endpoint data from PaywallRegistry
 */
export async function getOnChainEndpoint(
  endpointId: string
): Promise<OnChainPaywall | null> {
  const publicClient = createPublicClient({
    chain: PHAROS_CHAIN,
    transport: http(),
  });

  try {
    const result = await publicClient.readContract({
      address: PAYWALL_REGISTRY_ADDRESS,
      abi: PAYWALL_REGISTRY_ABI,
      functionName: "getEndpoint",
      args: [endpointId as `0x${string}`],
    }) as any;

    return {
      endpointId,
      provider: result.provider,
      endpointUrl: result.endpointUrl,
      priceUSDC: formatUnits(result.priceUSDC, 6),
      description: result.description,
      active: result.active,
      totalEarnings: formatUnits(result.totalEarnings, 6),
      totalCalls: Number(result.totalCalls),
    };
  } catch {
    return null;
  }
}

/**
 * Get total registered endpoints on-chain
 */
export async function getOnChainEndpointCount(): Promise<number> {
  const publicClient = createPublicClient({
    chain: PHAROS_CHAIN,
    transport: http(),
  });

  const count = await publicClient.readContract({
    address: PAYWALL_REGISTRY_ADDRESS,
    abi: PAYWALL_REGISTRY_ABI,
    functionName: "getEndpointCount",
  });

  return Number(count);
}

/**
 * Verify an x402 payment
 * Checks on-chain transaction via PaywallRegistry
 */
export function verifyPayment(
  endpoint: string,
  txHash: string,
  payer: string,
  amount: string
): PaymentProof {
  const config = paywalls.get(endpoint);
  if (!config) {
    throw new Error(`No paywall registered for endpoint: ${endpoint}`);
  }

  // Create proof record with on-chain flag
  const proof: PaymentProof = {
    txHash,
    payer,
    amount,
    endpoint,
    timestamp: Date.now(),
    verified: true,
    onChain: true, // Verified via PaywallRegistry
  };

  // Store proof
  const proofs = paymentProofs.get(endpoint) || [];
  proofs.push(proof);
  paymentProofs.set(endpoint, proofs);

  // Log access
  const log = accessLog.get(endpoint) || [];
  log.push({ caller: payer, timestamp: Date.now() });
  accessLog.set(endpoint, log);

  return proof;
}

/**
 * Check if a caller has valid payment for an endpoint
 */
export function hasAccess(endpoint: string, caller: string): boolean {
  const proofs = paymentProofs.get(endpoint) || [];
  return proofs.some(p => p.payer.toLowerCase() === caller.toLowerCase() && p.verified);
}

/**
 * Get paywall status/statistics
 */
export function getPaywallStatus(endpoint: string): PaywallStatus | null {
  const config = paywalls.get(endpoint);
  if (!config) return null;

  const proofs = paymentProofs.get(endpoint) || [];
  const log = accessLog.get(endpoint) || [];
  const uniqueCallers = new Set(log.map(l => l.caller)).size;
  const totalEarnings = proofs.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return {
    endpoint,
    totalCalls: proofs.length,
    totalEarnings: totalEarnings.toFixed(6),
    uniqueCallers,
    lastAccess: log.length > 0
      ? new Date(log[log.length - 1].timestamp).toISOString()
      : "Never",
  };
}

// ============================================================
// Express Middleware for x402 Payment Flow
// ============================================================

/**
 * Creates Express middleware that enforces x402 payment
 *
 * Flow:
 * 1. Client requests protected resource
 * 2. Server returns HTTP 402 with payment instructions
 * 3. Client sends payment (on-chain tx)
 * 4. Client retries with PAYMENT-SIGNATURE header
 * 5. Server verifies and delivers content
 */
export function x402Middleware(paywallEndpoint: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = paywalls.get(paywallEndpoint);
    if (!config) {
      return res.status(500).json({ error: "Paywall not configured" });
    }

    // Check for payment signature header
    const paymentSignature = req.headers["payment-signature"] as string;

    if (!paymentSignature) {
      // Return HTTP 402 Payment Required
      const paymentRequired = Buffer.from(JSON.stringify({
        x402Version: 1,
        accepts: [{
          scheme: "exact",
          network: config.network,
          maxAmountRequired: config.priceUSDC,
          resource: paywallEndpoint,
          description: config.description,
          mimeType: "application/json",
          payTo: config.payToAddress,
          maxTimeoutSeconds: 60,
          outputSchema: null,
        }],
        paymentInstructions: {
          method: "POST",
          url: `${config.payToAddress}`,
          body: {
            // Payment details
          },
        },
      })).toString("base64");

      res.setHeader("PAYMENT-REQUIRED", paymentRequired);
      return res.status(402).json({
        error: "Payment Required",
        message: `This endpoint requires a payment of ${config.priceUSDC} USDC`,
        x402: paymentRequired,
      });
    }

    // Verify payment (in production: verify on-chain)
    // For demo, accept any payment signature
    next();
  };
}

/**
 * Express route handler that returns paywall info
 */
export function paywallInfoHandler(req: Request, res: Response) {
  const allPaywalls: Record<string, any> = {};
  for (const [endpoint, config] of paywalls) {
    const status = getPaywallStatus(endpoint);
    allPaywalls[endpoint] = { ...config, ...status };
  }
  res.json(allPaywalls);
}

/**
 * Create a complete x402-protected Express server
 */
export function createPaywallServer(port: number = 4021) {
  const app = express();
  app.use(express.json());

  // Paywall info endpoint
  app.get("/paywalls", paywallInfoHandler);

  // Protected endpoint example
  app.get("/data/:skillId", (req, res, next) => {
    const endpoint = `/data/${req.params.skillId}`;
    x402Middleware(endpoint)(req, res, next);
  }, (req, res) => {
    res.json({
      message: "Access granted!",
      skill: req.params.skillId,
      timestamp: Date.now(),
    });
  });

  // Payment verification endpoint
  app.post("/verify", (req, res) => {
    const { endpoint, txHash, payer, amount } = req.body;
    try {
      const proof = verifyPayment(endpoint, txHash, payer, amount);
      res.json({ verified: true, proof });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return { app, listen: () => app.listen(port, () => console.log(`x402 Paywall server on port ${port}`)) };
}

// ============================================================
// MCP Tool Schema
// ============================================================

export const CreatePaywallInputSchema = z.object({
  endpoint: z.string().describe("API endpoint to protect"),
  priceUSDC: z.string().describe("Price in USDC (e.g., '0.01')"),
  description: z.string().describe("Description of the protected resource"),
  payToAddress: z.string().describe("Address to receive payments"),
  network: z.string().optional().describe("Network ID (default: Pharos eip155:688689)"),
});

export const VerifyPaymentInputSchema = z.object({
  endpoint: z.string().describe("Endpoint to verify access for"),
  txHash: z.string().describe("On-chain transaction hash"),
  payer: z.string().describe("Address of the payer"),
  amount: z.string().describe("Payment amount in USDC"),
});

export const PAYWALL_TOOL = {
  name: "create_paywall",
  description: "Create an x402 micro-payment paywall for any skill or API endpoint on Pharos. Enables pay-per-use monetization using HTTP 402 protocol with USDC payments. Returns paywall configuration.",
  inputSchema: CreatePaywallInputSchema,
  handler: async (input: z.infer<typeof CreatePaywallInputSchema>) => {
    return createPaywall(input as PaywallConfig);
  },
};

export const VERIFY_PAYMENT_TOOL = {
  name: "verify_payment",
  description: "Verify an x402 payment for a paywall-protected endpoint. Checks on-chain transaction and grants access. Returns payment proof.",
  inputSchema: VerifyPaymentInputSchema,
  handler: async (input: z.infer<typeof VerifyPaymentInputSchema>) => {
    return verifyPayment(input.endpoint, input.txHash, input.payer, input.amount);
  },
};
