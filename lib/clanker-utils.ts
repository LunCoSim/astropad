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

// Supported token pairs for v4 pools
export type TokenPair = 'WETH' | 'DEGEN' | 'NATIVE' | 'CLANKER' | 'ANON' | 'HIGHER' | 'BTC' | 'A0x';

/**
 * Get token pair type by address
 * Simplified version for UI display purposes only
 */
export function getTokenPairDisplayName(address: string): TokenPair {
  if (!address) return 'WETH';
  const addr = address.toLowerCase();
  
  if (addr === WETH_ADDRESS.toLowerCase()) return 'WETH';
  if (addr === DEGEN_ADDRESS.toLowerCase()) return 'DEGEN';
  if (addr === NATIVE_ADDRESS.toLowerCase()) return 'NATIVE';
  if (addr === CLANKER_ADDRESS.toLowerCase()) return 'CLANKER';
  if (addr === ANON_ADDRESS.toLowerCase()) return 'ANON';
  if (addr === HIGHER_ADDRESS.toLowerCase()) return 'HIGHER';
  if (addr === CB_BTC_ADDRESS.toLowerCase()) return 'BTC';
  if (addr === A0X_ADDRESS.toLowerCase()) return 'A0x';
  
  return 'WETH'; // Default fallback
} 