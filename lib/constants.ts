/**
 * Constants and configuration data for the token deployment wizard
 */

import type { WizardStep } from './types.js';

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basics',
    title: 'Token Details',
    description: 'Name, symbol, and branding',
    icon: '🪙',
    required: true
  },
  {
    id: 'liquidity',
    title: 'Pool Setup',
    description: 'Liquidity pool configuration',
    icon: '💧',
    required: true
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Vault, airdrops, and dev buy',
    icon: '⚡',
    required: false
  },
  {
    id: 'advanced',
    title: 'Advanced Config',
    description: 'MEV protection, fees, and pool settings',
    icon: '⚙️',
    required: false
  },
  {
    id: 'deploy',
    title: 'Deploy',
    description: 'Review and launch your token',
    icon: '🚀',
    required: true
  }
];

// Clanker v4 Contract Addresses (Base Mainnet)
export const CLANKER_V4_ADDRESSES = {
  FACTORY: '0x...', // TODO: Add actual Clanker v4 factory address
  LOCKER: '0x...', // TODO: Add actual locker address
  VAULT: '0x...', // TODO: Add actual vault extension address
  AIRDROP: '0x...', // TODO: Add actual airdrop extension address
  DEVBUY: '0x...', // TODO: Add actual devbuy extension address
  MEV_MODULE: '0x...', // TODO: Add actual MEV module address
  HOOK_STATIC: '0x...', // TODO: Add actual static fee hook address
  HOOK_DYNAMIC: '0x...', // TODO: Add actual dynamic fee hook address
};

// Base Network Constants
export const BASE_NETWORK = {
  CHAIN_ID: 8453,
  WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
  NATIVE_SYMBOL: 'ETH'
};

// Default Pool Positions for Clanker v4
export const POOL_POSITIONS = {
  Standard: [
    { tickLower: -230400, tickUpper: -230200, positionBps: 10000 } // Tight range around starting tick
  ],
  Project: [
    { tickLower: -230600, tickUpper: -230000, positionBps: 6000 }, // 60% in wider range
    { tickLower: -230400, tickUpper: -230200, positionBps: 4000 }  // 40% in tight range
  ],
  Custom: [] // User-defined positions
};

export const DEFAULT_TOKEN_SUPPLY = 100_000_000_000; // 100 billion tokens

// Updated for v4 fee structure
export const DEFAULT_FEE_CONFIG = {
  userFeeBps: 100, // 1% total (will be split 60/20/20)
  static: {
    clankerFeeBps: 100, // 1%
    pairedFeeBps: 100   // 1%
  },
  dynamic: {
    baseFee: 100,      // 1% minimum
    maxFee: 300,       // 3% maximum
    referenceTickFilterPeriod: 3600,  // 1 hour
    resetPeriod: 86400, // 24 hours
    resetTickFilter: 500,
    feeControlNumerator: 100,
    decayFilterBps: 9500 // 95% decay rate
  }
};

export const DEFAULT_VAULT_CONFIG = {
  enabled: false,
  percentage: 5,     // 5% of total supply
  lockupDuration: 7 * 24 * 60 * 60,     // 7 days minimum
  vestingDuration: 0    // No vesting by default
};

export const DEFAULT_AIRDROP_CONFIG = {
  enabled: false,
  merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  amount: 1000, // 1000 tokens
  entries: [{ address: '', amount: 1 }],
  lockupDuration: 24 * 60 * 60,         // 1 day minimum
  vestingDuration: 0    // No vesting by default
};

export const DEFAULT_DEV_BUY_CONFIG = {
  enabled: false,
  ethAmount: 0.1,    // 0.1 ETH
  amountOutMin: 0    // No slippage protection by default
};

export const DEFAULT_VANITY_CONFIG = {
  enabled: false,
  suffix: '0x4b07'   // Default vanity suffix
};

export const DEFAULT_CUSTOM_POSITION = {
  tickLower: -230400,
  tickUpper: -230200,
  positionBps: 10000
};

// Validation constants
export const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 50,
  SYMBOL_MAX_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 300,
  MAX_VAULT_PERCENTAGE: 90,      // 90% max for v4
  MAX_AIRDROP_TOKENS: 90_000_000_000, // 90% of total supply in tokens
  MIN_AIRDROP_TOKENS: 25_000_000,     // 0.25% of total supply minimum
  MAX_FEE_BPS: 2000,            // 20% max fee
  MIN_FEE_BPS: 25,              // 0.25% min fee (if enabled)
  TOTAL_BPS: 10000 // 100%
};

// Time constants (in seconds)
export const TIME_CONSTANTS = {
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
  MIN_VAULT_LOCKUP: 7 * 24 * 60 * 60,    // 7 days minimum for vault
  MIN_AIRDROP_LOCKUP: 24 * 60 * 60       // 1 day minimum for airdrop
}; 