/**
 * Clanker v4 utilities - simplified to use SDK directly
 * This file only contains utilities that are specific to the Astropad interface
 */

// Import and re-export commonly used constants from SDK
import { 
  WETH_ADDRESS, 
  DEGEN_ADDRESS, 
  NATIVE_ADDRESS, 
  CLANKER_ADDRESS, 
  ANON_ADDRESS,
  HIGHER_ADDRESS,
  CB_BTC_ADDRESS,
  A0X_ADDRESS
} from 'clanker-sdk';

import type { AirdropEntry, RewardRecipient, PoolPosition as CustomPosition } from './types.js';

// Supported token pairs for v4 pools
export type TokenPair = 'WETH' | 'DEGEN' | 'NATIVE' | 'CLANKER' | 'ANON' | 'HIGHER' | 'BTC' | 'A0x' | 'WMON' | null;

/**
 * Get token pair type by address with error handling
 * @param address - Token address to lookup
 * @returns TokenPair or null if not found
 * @throws Error if address is invalid
 */
export function getTokenPairByAddress(address: `0x${string}` | string): TokenPair {
  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    throw new Error('Invalid token address provided');
  }
  
  const addr = address.toLowerCase();
  
  if (addr === WETH_ADDRESS.toLowerCase()) return 'WETH';
  if (addr === DEGEN_ADDRESS.toLowerCase()) return 'DEGEN';
  if (addr === NATIVE_ADDRESS.toLowerCase()) return 'NATIVE';
  if (addr === CLANKER_ADDRESS.toLowerCase()) return 'CLANKER';
  if (addr === ANON_ADDRESS.toLowerCase()) return 'ANON';
  if (addr === HIGHER_ADDRESS.toLowerCase()) return 'HIGHER';
  if (addr === CB_BTC_ADDRESS.toLowerCase()) return 'BTC';
  if (addr === A0X_ADDRESS.toLowerCase()) return 'A0x';
  if (addr === '0x760afe86e5de5fa0ee542fc7b7b713e1c5425701') return 'WMON';
  
  return null; // Return null instead of default to allow caller handling
}

/**
 * Calculate desired price and pair address for market cap
 * @param pair - Token pair type
 * @param marketCap - Desired market cap in USD
 * @returns Object with desiredPrice and pairAddress
 * @throws Error if invalid pair or marketCap
 */
export function getDesiredPriceAndPairAddress(pair: TokenPair, marketCap: number = 10) {
  if (!pair) throw new Error('Invalid token pair');
  if (marketCap <= 0) throw new Error('Market cap must be positive');
  
  let desiredPrice = 0.0000000001;
  let pairAddress = WETH_ADDRESS;
  const totalSupplyDesired = 100_000_000_000;

  switch (pair) {
    case 'WETH':
      desiredPrice = marketCap * 0.00000000001;
      pairAddress = WETH_ADDRESS;
      break;
    case 'DEGEN':
      desiredPrice = 0.00000666666667;
      pairAddress = DEGEN_ADDRESS;
      break;
    case 'CLANKER': {
      const clankerPrice = 20;
      const howManyClanker = marketCap / clankerPrice;
      desiredPrice = howManyClanker / totalSupplyDesired;
      pairAddress = CLANKER_ADDRESS;
      break;
    }
    case 'ANON': {
      const anonPrice = 0.001;
      const howManyAnon = marketCap / anonPrice;
      desiredPrice = howManyAnon / totalSupplyDesired;
      pairAddress = ANON_ADDRESS;
      break;
    }
    case 'HIGHER': {
      const higherPrice = 0.008;
      const howManyHigher = marketCap / higherPrice;
      desiredPrice = howManyHigher / totalSupplyDesired;
      pairAddress = HIGHER_ADDRESS;
      break;
    }
    case 'BTC': {
      const cbBtcPrice = 105000;
      const howManyCBBTC = marketCap / cbBtcPrice;
      desiredPrice = howManyCBBTC / totalSupplyDesired / 10 ** 10;
      pairAddress = CB_BTC_ADDRESS;
      break;
    }
    case 'NATIVE': {
      const nativePrice = 0.00004;
      const howManyNative = marketCap / nativePrice;
      desiredPrice = howManyNative / totalSupplyDesired;
      pairAddress = NATIVE_ADDRESS;
      break;
    }
    case 'A0x': {
      const a0xPrice = 0.00000073;
      const howManyA0x = marketCap / a0xPrice;
      desiredPrice = howManyA0x / totalSupplyDesired;
      pairAddress = A0X_ADDRESS;
      break;
    }
    case 'WMON':
      desiredPrice = marketCap * 0.00000000001;
      pairAddress = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701';
      break;
    default:
      throw new Error(`Unsupported token pair: ${pair}`);
  }

  return { desiredPrice, pairAddress };
}

// Merged from array-utils.ts: Generic array utilities

/**
 * Generic function to add an item to an array
 */
export function addArrayItem<T>(array: T[], newItem: T): T[] {
  return [...array, newItem];
}

/**
 * Generic function to remove an item from an array by index
 */
export function removeArrayItem<T>(array: T[], index: number, minLength: number = 1): T[] {
  if (array.length <= minLength) {
    return array;
  }
  return array.filter((_, i) => i !== index);
}

/**
 * Generic function to update an item in an array by index
 */
export function updateArrayItem<T>(array: T[], index: number, updates: Partial<T>): T[] {
  const newArray = [...array];
  newArray[index] = { ...newArray[index], ...updates };
  return newArray;
}

// Specific utilities for common types (merged)

export function addSocialUrl(socialUrls: string[]): string[] {
  return addArrayItem(socialUrls, '');
}

export function removeSocialUrl(socialUrls: string[], index: number): string[] {
  return removeArrayItem(socialUrls, index, 1);
}

export function updateSocialUrl(socialUrls: string[], index: number, value: string): string[] {
  const newUrls = [...socialUrls];
  newUrls[index] = value;
  return newUrls;
}

// Similar for auditUrls, airdrop entries, custom positions, reward recipients... (add all from array-utils.ts)

// Audit URL utilities (similar to social URLs)
export function addAuditUrl(auditUrls: string[] = []): string[] {
  return [...auditUrls, ''];
}

export function removeAuditUrl(auditUrls: string[], index: number): string[] {
  if (auditUrls.length <= 1) return auditUrls;
  return auditUrls.filter((_, i) => i !== index);
}

export function updateAuditUrl(auditUrls: string[], index: number, value: string): string[] {
  const newUrls = [...auditUrls];
  newUrls[index] = value;
  return newUrls;
}

// Airdrop entry utilities
export function addAirdropEntry(entries: AirdropEntry[] = []): AirdropEntry[] {
  return [...entries, { address: '', amount: 0 }];
}

export function removeAirdropEntry(entries: AirdropEntry[], index: number): AirdropEntry[] {
  return entries.filter((_, i) => i !== index);
}

export function updateAirdropEntry(entries: AirdropEntry[], index: number, field: 'address' | 'amount', value: string | number): AirdropEntry[] {
  const newEntries = [...entries];
  if (field === 'address') {
    newEntries[index].address = value as string;
  } else {
    newEntries[index].amount = value as number;
  }
  return newEntries;
}

// Custom position utilities
export function addCustomPosition(positions: CustomPosition[] = []): CustomPosition[] {
  return [...positions, { tickLower: 0, tickUpper: 0, positionBps: 0 }];
}

export function removeCustomPosition(positions: CustomPosition[], index: number): CustomPosition[] {
  return positions.filter((_, i) => i !== index);
}

export function updateCustomPosition(positions: CustomPosition[], index: number, field: 'tickLower' | 'tickUpper' | 'positionBps', value: number): CustomPosition[] {
  const newPositions = [...positions];
  newPositions[index][field] = value;
  return newPositions;
}

// Reward recipient utilities
export function addRewardRecipient(recipients: RewardRecipient[] = []): RewardRecipient[] {
  return [...recipients, { recipient: '', admin: '', bps: 0, token: 'Both', label: '' }];
}

export function removeRewardRecipient(recipient: RewardRecipient[], index: number): RewardRecipient[] {
  return recipient.filter((_, i) => i !== index);
}

export function updateRewardRecipient(recipients: RewardRecipient[], index: number, updates: Partial<RewardRecipient>): RewardRecipient[] {
  const newRecipients = [...recipients];
  newRecipients[index] = { ...newRecipients[index], ...updates };
  return newRecipients;
}

// Merged v4 constants from constants.ts
export const WIZARD_STEPS = [
  { id: 'basics', title: 'Token Basics' },
  { id: 'liquidity', title: 'Liquidity Setup' },
  { id: 'extensions', title: 'Extensions' },
  { id: 'advanced', title: 'Advanced Config' },
  { id: 'deployment', title: 'Deploy' }
];

// Base network constants
export const BASE_NETWORK = {
  id: 8453,
  name: 'Base',
  WETH_ADDRESS,
  // Add other paired addresses from imports
};

// Default custom position
export const DEFAULT_CUSTOM_POSITION = { /* default object structure, e.g. */ min: 0, max: 100, amount: 0 };

// Expand CLANKER_V4_ADDRESSES with actual values, including LOCKER
export const CLANKER_V4_ADDRESSES = {
  FACTORY: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
  LOCKER: '0x...',
  // Add more from clanker-sdk or known values
};

// Add other relevant constants like DEFAULT_TOKEN_SUPPLY, etc.

// Validation limits for fees and other parameters
export const VALIDATION_LIMITS = {
  MIN_FEE_BPS: 100,  // 1%
  MAX_FEE_BPS: 10000, // 100%
};

export function getTokenPairDisplayName(address: `0x${string}` | string): string {
  const pair = getTokenPairByAddress(address);
  return pair || 'Custom';
}
