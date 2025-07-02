/**
 * Centralized type definitions for the Astropad application
 * This file contains all shared interfaces to prevent duplication
 */

import type { PublicClient } from 'viem';

// ===== CORE TOKEN CONFIGURATION =====

export interface TokenConfig {
  // Core Token Settings
  name: string;
  symbol: string;
  image: string;
  tokenAdmin: string; // Admin for the token (can change metadata, etc.)
  
  // Metadata
  description: string;
  socialUrls: string[];
  auditUrls: string[];
  
  // Social Context (enhanced for v4)
  interfaceName: string;
  platform: string;
  messageId: string;
  socialId: string;
  originatingChainId: number; // NEW: Chain ID for cross-chain tokens
  
  // Pool Configuration (enhanced for v4)
  pool: {
    pairedToken: string; // Token to pair with (defaults to WETH)
    tickIfToken0IsClanker: number; // Starting tick of the pool
    tickSpacing: number; // Tick spacing (10, 60, 200, etc.)
    positions: CustomPosition[]; // Initial liquidity positions
    poolData?: string; // Custom pool data for hooks
  };
  
  // MEV Protection Configuration (NEW)
  mev: {
    enabled: boolean;
    moduleType: 'block-delay' | 'custom'; // Type of MEV protection
    blockDelay?: number; // Number of blocks to delay (for block-delay type)
    customModule?: string; // Custom MEV module address
    customData?: string; // Custom MEV module data
  };
  
  // Token Locker (enhanced)
  locker: {
    locker: string; // Locker extension address
    lockerData: string; // Hex encoded locker data
    customRewardDistribution: boolean; // Whether to use custom reward distribution
  };
  
  // Extensions (enhanced with more options)
  vault?: {
    enabled: boolean;
    percentage: number; // 0-90% of total supply
    lockupDuration: number; // Minimum 7 days in seconds
    vestingDuration: number; // Linear vesting duration in seconds
    msgValue?: number; // Custom message value for vault extension
  };
  
  airdrop?: {
    enabled: boolean;
    merkleRoot: string; // Root of merkle tree
    amount: number; // Tokens to airdrop (whole tokens)
    lockupDuration: number; // Minimum 1 day in seconds
    vestingDuration: number; // Linear vesting duration in seconds
    entries: AirdropEntry[]; // UI helper for generating merkle tree
    msgValue?: number; // Custom message value for airdrop extension
  };
  
  devBuy?: {
    enabled: boolean;
    ethAmount: number; // ETH amount to spend on initial buy
    poolKey?: {
      currency0: string;
      currency1: string;
      fee: number;
      tickSpacing: number;
      hooks: string;
    };
    amountOutMin: number; // Min amount for ETH->PAIR swap if not WETH paired
    recipient?: string; // Who receives the dev buy tokens (defaults to tokenAdmin)
  };
  
  // Fee Configuration (enhanced for v4)
  fees: {
    type: 'static' | 'dynamic';
    // User-facing fee percentage (we'll calculate the actual distribution)
    userFeeBps: number; // What user sets (will be split: 60% user, 20% clanker, 20% us)
    static?: {
      clankerFeeBps: number; // Fee on clanker token
      pairedFeeBps: number; // Fee on paired token
      customDistribution: boolean; // Whether to use custom fee distribution
    };
    dynamic?: {
      baseFee: number; // Minimum fee in bps
      maxFee: number; // Maximum fee in bps
      referenceTickFilterPeriod: number; // Seconds
      resetPeriod: number; // Seconds
      resetTickFilter: number; // Basis points
      feeControlNumerator: number; // Volatility response control
      decayFilterBps: number; // Decay rate (e.g., 9500 = 95%)
    };
  };
  
  // Reward Recipients (enhanced)
  rewards: {
    recipients: RewardRecipient[]; // Will include user, clanker, and our addresses
    customDistribution: boolean; // Whether user has customized the distribution
  };
  
  // Vanity Address (enhanced)
  vanity: {
    enabled: boolean;
    suffix?: string; // e.g., "0x4b07" for vanity ending
    customSalt?: string; // Custom salt for address generation
  };
  
  // Advanced Configuration (NEW)
  advanced: {
    customHookData: boolean; // Whether to use custom hook data
    hookData?: string; // Custom hook data
    customExtensions: CustomExtension[]; // Custom extensions beyond vault/airdrop/devbuy
    gasOptimization: boolean; // Whether to optimize for gas
  };
  
  // Legacy fields for backwards compatibility
  admin: string; // Alias for tokenAdmin
  pairTokenType: 'WETH' | 'custom';
  customPairTokenAddress: string;
  startingMarketCap: number | '';
  poolPositionType: 'Standard' | 'Project' | 'Custom';
  customPositions: CustomPosition[];
  rewardRecipients: RewardRecipient[];
}

// ===== ARRAY UTILITY INTERFACES =====

export interface AirdropEntry {
  address: string;
  amount: number;
}

export interface CustomPosition {
  tickLower: number;
  tickUpper: number;
  positionBps: number;
}

export interface RewardRecipient {
  recipient: string;
  admin: string;
  bps: number;
}

// NEW: Custom Extension Interface
export interface CustomExtension {
  extension: string; // Extension contract address
  msgValue: number; // ETH value to send
  extensionBps: number; // Percentage of token supply
  extensionData: string; // ABI-encoded extension data
  name: string; // Human-readable name
  description: string; // Description of what this extension does
}

// ===== TOKEN METADATA =====

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  deployerAddress: string;
  deploymentTxHash?: string;
  deploymentBlockNumber?: number;
  deploymentTimestamp: number;
  adminAddress?: string;
  isVerified?: boolean;
  source: 'manual' | 'blockchain'; // Track how token was discovered
}

// ===== CALCULATION INTERFACES =====

export interface DevBuyResult {
  tokensReceived: number;
  priceImpact: number;
  newPrice: number;
  effectivePrice: number;
}

export interface TokenDistribution {
  name: string;
  amount: number;
  percentage: number;
}

// ===== WIZARD INTERFACES =====

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
}

// ===== VALIDATION RETURN TYPES =====

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ===== FEE DATA =====

export interface FeeData {
  [symbol: string]: string;
}