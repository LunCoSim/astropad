/**
 * Centralized type definitions for the Astropad application
 * This file contains all shared interfaces for Clanker v4 deployment
 */

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
  
  // Social Context (v4)
  interfaceName: string;
  platform: string;
  messageId: string;
  socialId: string;
  originatingChainId: number; // Chain ID for cross-chain tokens
  
  // Liquidity Setup
  startingMarketCap?: number;

  // Pool Configuration (v4)
  pool: {
    pairedToken: string; // Address of the token to pair with (usually WETH)
    tickIfToken0IsClanker: number; // Starting tick position
    tickSpacing: number; // Tick spacing for the pool (10, 60, 200, 2000)
    positions: PoolPosition[]; // Array of liquidity positions
  };
  
  // Token Locker (required for v4)
  locker: {
    locker: string; // Address of the locker contract
    lockerData: string; // Encoded locker data
  };
  
  // MEV Protection (v4)
  mev: {
    enabled: boolean;
    blockDelay: number;
  };
  
  // Vault Extension
  vault?: {
    enabled: boolean;
    percentage: number; // Percentage of tokens to vault (1-30%)
    lockupDuration: number; // Minimum 7 days in seconds
    vestingDuration: number; // Linear vesting duration in seconds
    msgValue?: number; // Custom message value for vault extension
  };
  
  // Airdrop Extension
  airdrop?: {
    enabled: boolean;
    merkleRoot: string; // Root of merkle tree
    amount: number; // Tokens to airdrop (whole tokens)
    lockupDuration: number; // Minimum 1 day in seconds
    vestingDuration: number; // Linear vesting duration in seconds
    entries: AirdropEntry[]; // UI helper for generating merkle tree
    msgValue?: number; // Custom message value for airdrop extension
  };
  
  // DevBuy Extension
  devBuy?: {
    enabled: boolean;
    amount: number; // Amount of paired token to spend on initial buy (ETH for WETH, or custom token)
    poolKey?: {
      currency0?: string;
      currency1?: string;
      fee?: number;
      tickSpacing?: number;
      hooks?: string;
    };
    amountOutMin: number; // Min amount for ETH->PAIR swap if not WETH paired
    recipient?: string; // Who receives the dev buy tokens (defaults to tokenAdmin)
    estimatedTokens?: number;
  };
  
  // Fee Configuration (v4 with multiple collectors)
  fees: {
    type: 'static' | 'dynamic';
    userFeeBps: number; // Total fee percentage in basis points
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
  
  // Reward Recipients (up to 7 collectors)
  rewards: {
    recipients: RewardRecipient[]; // Up to 7 fee collectors
    customDistribution: boolean; // Whether user has customized the distribution
    useSimpleDistribution: boolean; // Whether to use the 60/20/20 split vs custom
  };
  
  // Vanity Address
  vanity: {
    enabled: boolean;
    suffix: string; // Desired vanity suffix (e.g., '0x4b07')
    type: 'suffix' | 'prefix';
    customSalt?: string; // Custom salt for vanity generation
  };
  
  // Advanced Configuration
  advanced: {
  };
  
  // Presale Extension (v4)
  presale?: {
    enabled: boolean; // Whether presale is enabled
    minEthGoal: number; // Minimum ETH goal for presale success
    maxEthGoal: number; // Maximum ETH cap for presale
    presaleDuration: number; // Duration in seconds
    recipient: string; // ETH recipient if presale succeeds
    lockupDuration: number; // Lockup period for presale tokens (seconds)
    vestingDuration: number; // Vesting period after lockup (seconds)
    msgValue?: number; // Custom msg.value for presale extension (if needed)
    // UI helpers
    status?: 'not_started' | 'active' | 'successful_minimum' | 'successful_maximum' | 'failed' | 'claimable';
    ethRaised?: number; // ETH raised so far
    userContribution?: number; // ETH contributed by current user
    claimableTokens?: number; // Tokens user can claim
    presaleId?: number; // Presale ID (if tracked)
  };

  // UI-specific fields for pair selection
  pairTokenType?: 'WETH' | 'custom';
  customPairTokenAddress?: string;

  // Custom positions for UI (separate from pool.positions)
  customPositions?: PoolPosition[];

  // NOTE: Legacy fields removed - now v4-only
}

// ===== SUPPORTING TYPES =====

export interface PoolPosition {
  tickLower: number;
  tickUpper: number;
  positionBps: number; // Basis points of total liquidity
}

export interface AirdropEntry {
  address: string;
  amount: number; // Tokens to airdrop to this address
}

export interface RewardRecipient {
  recipient: string; // Address that receives the fees
  admin: string; // Address that can modify this recipient
  bps: number; // Basis points (out of 10000) this recipient gets
  token: string; // 'Both', 'Paired', or 'Clanker'
  label?: string; // Optional label for UI display (e.g., "Team", "Marketing")
  isDefault?: boolean; // Whether this is a default recipient (user, clanker, astropad)
  isFixed?: boolean;
}

// ===== FEE COLLECTOR MANAGEMENT =====

export interface FeeCollectorTemplate {
  id: string;
  name: string;
  description: string;
  recipients: Omit<RewardRecipient, 'recipient' | 'admin'>[]; // Template without addresses
}

export interface CustomFeeCollector {
  address: string;
  adminAddress: string;
  percentage: number; // Percentage of total fees (0-100)
  label: string;
  description?: string;
}

// ===== VALIDATION =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FeeDistributionValidation extends ValidationResult {
  totalBps: number;
  maxCollectors: number;
  remainingBps: number;
}

// ===== DEPLOYED TOKEN TRACKING =====

export interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  deployerAddress: string;
  deploymentTxHash: string;
  deploymentTimestamp: number;
  isVerified: boolean;
  source: 'automatic' | 'manual';
}

export interface FeeData {
  [symbol: string]: string;
}

// ===== CALCULATION TYPES =====
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

// ===== TOKEN INFO (for validation) =====
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  [key: string]: any;
}