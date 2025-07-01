/**
 * AMM and DeFi calculation utilities for token deployment
 */

import type { DevBuyResult, TokenDistribution, TokenConfig } from './types.js';

/**
 * AMM calculation function using constant product formula (x * y = k)
 * Calculates tokens received, price impact, and effective price for a dev buy
 */
export function calculateDevBuyTokens(
  devBuyEthAmount: number,
  marketCapEth: number,
  totalTokenSupply: number = 100_000_000_000 // 100 billion default supply
): DevBuyResult {
  if (devBuyEthAmount <= 0 || marketCapEth <= 0) {
    return { tokensReceived: 0, priceImpact: 0, newPrice: 0, effectivePrice: 0 };
  }

  // In Clanker v4, the dev buy is a normal swap that happens AFTER liquidity is created
  // Initial liquidity pool setup (assuming no vault/airdrop extensions for simplicity)
  // Market cap = pool_eth_reserve * total_token_supply / pool_token_reserve
  // For simplicity, assume the full token supply goes to the pool initially
  const initialTokenReserve = totalTokenSupply;
  const initialEthReserve = marketCapEth;
  
  // Constant product: k = x * y
  const k = initialEthReserve * initialTokenReserve;
  
  // Dev buy swaps ETH for tokens: (eth_reserve + eth_in) * (token_reserve - token_out) = k
  // Solving for token_out: token_out = token_reserve - k / (eth_reserve + eth_in)
  const newEthReserve = initialEthReserve + devBuyEthAmount;
  const newTokenReserve = k / newEthReserve;
  const tokensReceived = initialTokenReserve - newTokenReserve;
  
  // Calculate prices and impact
  const initialPrice = initialEthReserve / initialTokenReserve; // ETH per token
  const newPrice = newEthReserve / newTokenReserve; // ETH per token after swap
  const priceImpact = ((newPrice - initialPrice) / initialPrice) * 100;
  
  // Effective price paid by dev buyer
  const effectivePrice = devBuyEthAmount / tokensReceived; // ETH per token
  
  return {
    tokensReceived,
    priceImpact,
    newPrice,
    effectivePrice
  };
}

/**
 * Calculate estimated token amounts for dev buy (simplified version)
 */
export function calculateDevBuyEstimate(
  ethAmount: number,
  marketCapEth: number,
  totalSupply: number = 100_000_000_000
): { tokensReceived: number; priceImpact: number } | null {
  if (!marketCapEth || !ethAmount) return null;
  
  // Simple estimation assuming tokens = (devBuyEth / marketCapEth) * totalSupply
  const estimatedTokens = (ethAmount / marketCapEth) * totalSupply;
  const priceImpact = (ethAmount / marketCapEth) * 100;
  
  return {
    tokensReceived: estimatedTokens,
    priceImpact
  };
}

/**
 * Calculate token distribution across vault, airdrop, and liquidity pool
 */
export function calculateTokenDistribution(config: {
  vault: { enabled: boolean; percentage: number };
  airdrop: { enabled: boolean; percentage: number };
}, totalSupply: number = 100_000_000_000): TokenDistribution[] {
  let remaining = totalSupply;
  const distributions: TokenDistribution[] = [];
  
  if (config.vault.enabled) {
    const vaultTokens = (totalSupply * config.vault.percentage) / 100;
    distributions.push({ name: 'Vault', amount: vaultTokens, percentage: config.vault.percentage });
    remaining -= vaultTokens;
  }
  
  if (config.airdrop.enabled) {
    const airdropTokens = (totalSupply * config.airdrop.percentage) / 100;
    distributions.push({ name: 'Airdrop', amount: airdropTokens, percentage: config.airdrop.percentage });
    remaining -= airdropTokens;
  }
  
  const liquidityPercentage = (remaining / totalSupply) * 100;
  distributions.push({ name: 'Liquidity Pool', amount: remaining, percentage: liquidityPercentage });
  
  return distributions;
} 