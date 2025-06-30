import type { PublicClient } from "viem";

/**
 * Token validation utilities for ERC20 contracts
 */

// Generic ERC20 ABI for fetching decimals and symbol
export const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

/**
 * Fetch token decimals from an ERC20 contract
 */
export async function getTokenDecimals(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<number> {
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    });
    return decimals;
  } catch (error) {
    console.warn(
      `Could not fetch decimals for ${tokenAddress}, assuming 18. Error:`,
      error,
    );
    return 18; // Default to 18 if decimals cannot be fetched
  }
}

/**
 * Fetch token symbol from an ERC20 contract
 */
export async function getTokenSymbol(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<string> {
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    });
    return symbol;
  } catch (error: any) {
    console.error(`Error fetching symbol for ${tokenAddress}:`, error);
    return 'UNKNOWN';
  }
}

/**
 * Validate a pair token by fetching its decimals and symbol
 * Returns token info if valid, null if invalid
 */
export async function validatePairToken(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`
): Promise<TokenInfo | null> {
  try {
    const [decimals, symbol] = await Promise.all([
      getTokenDecimals(publicClient, tokenAddress),
      getTokenSymbol(publicClient, tokenAddress)
    ]);

    return { symbol, decimals };
  } catch (error) {
    console.error(`Error validating token ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Check if an address is a valid Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate multiple token addresses
 */
export async function validateMultipleTokens(
  publicClient: PublicClient,
  tokenAddresses: `0x${string}`[]
): Promise<(TokenInfo | null)[]> {
  return Promise.all(
    tokenAddresses.map(address => validatePairToken(publicClient, address))
  );
} 