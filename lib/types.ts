/**
 * Centralized type definitions for the Astropad application
 * This file contains all shared interfaces to prevent duplication
 */

import type { PublicClient } from 'viem';

// ===== CORE TOKEN CONFIGURATION =====

export interface TokenConfig {
  // Core Coin Settings
  name: string;
  symbol: string;
  admin: string;
  image: string;
  description: string;
  socialUrls: string[];
  auditUrls: string[];
  
  // Social Context
  interfaceName: string;
  platform: string;
  messageId: string;
  socialId: string;
  
  // Liquidity Setup
  pairTokenType: 'WETH' | 'custom';
  customPairTokenAddress: string;
  startingMarketCap: number | '';
  poolPositionType: 'Standard' | 'Project' | 'Custom';
  customPositions: Array<{
    tickLower: number;
    tickUpper: number;
    positionBps: number;
  }>;
  
  // Extensions
  vault: {
    enabled: boolean;
    percentage: number;
    lockupDuration: number;
    vestingDuration: number;
  };
  airdrop: {
    enabled: boolean;
    percentage: number;
    entries: Array<{address: string, amount: number}>;
    lockupDuration: number;
    vestingDuration: number;
  };
  devBuy: {
    enabled: boolean;
    ethAmount: number;
    recipient: string;
    amountOutMin: number;
  };
  
  // Advanced Configuration
  fees: {
    type: 'static' | 'dynamic';
    static: {
      clankerFeeBps: number;
      pairedFeeBps: number;
    };
    dynamic: {
      baseFee: number;
      maxLpFee: number;
      referenceTickFilterPeriod: number;
      resetPeriod: number;
      resetTickFilter: number;
      feeControlNumerator: number;
      decayFilterBps: number;
    };
  };
  rewardRecipients: Array<{
    recipient: string;
    admin: string;
    bps: number;
  }>;
  
  // Vanity
  vanity: {
    enabled: boolean;
    prefix: string;
    suffix: string;
  };
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