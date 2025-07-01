/**
 * Constants and configuration data for the token deployment wizard
 */

import type { WizardStep } from './types.js';

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basics',
    title: 'Coin Details',
    description: 'Name, symbol, and branding',
    icon: '🪙',
    required: true
  },
  {
    id: 'liquidity',
    title: 'Liquidity Setup',
    description: 'Market cap and trading pair',
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
    description: 'Fees, rewards, and custom settings',
    icon: '⚙️',
    required: false
  },
  {
    id: 'deploy',
    title: 'Deploy',
    description: 'Review and launch your coin',
    icon: '🚀',
    required: true
  }
];

export const DEFAULT_TOKEN_SUPPLY = 100_000_000_000; // 100 billion tokens

export const DEFAULT_FEE_CONFIG = {
  static: {
    clankerFeeBps: 100, // 1%
    pairedFeeBps: 100   // 1%
  },
  dynamic: {
    baseFee: 5000,
    maxLpFee: 50000,
    referenceTickFilterPeriod: 30,
    resetPeriod: 120,
    resetTickFilter: 200,
    feeControlNumerator: 500000000,
    decayFilterBps: 7500
  }
};

export const DEFAULT_VAULT_CONFIG = {
  enabled: false,
  percentage: 10,
  lockupDuration: 7 * 24 * 60 * 60,     // 7 days in seconds
  vestingDuration: 30 * 24 * 60 * 60    // 30 days in seconds
};

export const DEFAULT_AIRDROP_CONFIG = {
  enabled: false,
  percentage: 5,
  entries: [{ address: '', amount: 1 }],
  lockupDuration: 24 * 60 * 60,         // 1 day in seconds
  vestingDuration: 30 * 24 * 60 * 60    // 30 days in seconds
};

export const DEFAULT_DEV_BUY_CONFIG = {
  enabled: true,
  ethAmount: 0.0001,
  recipient: '',
  amountOutMin: 0
};

export const DEFAULT_VANITY_CONFIG = {
  enabled: false,
  prefix: '',
  suffix: ''
};

export const DEFAULT_CUSTOM_POSITION = {
  tickLower: -230400,
  tickUpper: -120000,
  positionBps: 10000
};

// Validation constants
export const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 50,
  SYMBOL_MAX_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 300,
  MAX_VAULT_PERCENTAGE: 50,
  MAX_AIRDROP_PERCENTAGE: 25,
  MAX_FEE_BPS: 10000,
  TOTAL_BPS: 10000 // 100%
};

// Time constants (in seconds)
export const TIME_CONSTANTS = {
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60
}; 