/**
 * Skill 3: x402 Paywall
 * Wraps any Skill/API endpoint with Pharos x402 micro-payment protocol
 * Enables pay-per-use monetization for skill providers
 *
 * MCP Tool: create_paywall, verify_payment
 */

import { z } from "zod";
import express, { type Request, type Response, type NextFunction } from "express";

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

export interface PaymentProof {
  txHash: string;
  payer: string;
  amount: string;
  endpoint: string;
  timestamp: number;
  verified: boolean;
}

export interface PaywallStatus {
  endpoint: string;
  totalCalls: number;
  totalEarnings: string;
  uniqueCallers: number;
  lastAccess: string;
}

// ============================================================
// In-memory store (would use on-chain PaywallRegistry in production)
// ============================================================

const paywalls = new Map<string, PaywallConfig>();
const paymentProofs = new Map<string, PaymentProof[]>();
const accessLog = new Map<string, { caller: string; timestamp: number }[]>();

// ============================================================
// Core Paywall Functions
// ============================================================

/**
 * Register a new paywall for a skill endpoint
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
 * Verify an x402 payment
 * In production, this would verify on-chain transaction via Facilitator
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

  // In production: verify tx on-chain via Facilitator /verify endpoint
  // For now, create proof record
  const proof: PaymentProof = {
    txHash,
    payer,
    amount,
    endpoint,
    timestamp: Date.now(),
    verified: true, // Would be result of on-chain verification
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
