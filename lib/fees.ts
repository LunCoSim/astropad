import { formatUnits, type PublicClient } from "viem";
import { Clanker } from "clanker-sdk/v4";
import { getTokenDecimals, getTokenSymbol } from "./token-validation.js";
import { WETH_ADDRESS } from "./clanker-utils.js";
import type { RewardRecipient } from './types';

export async function getAvailableFees(
  publicClient: PublicClient,
  _feeOwnerAddress: `0x${string}`,
  clankerTokenAddress: `0x${string}`,
) {
  const clanker = new Clanker({ publicClient });
  const wethTokenAddress = WETH_ADDRESS;

  // Get fees for Clanker Token
  const clankerRawFees = await clanker.availableRewards(
    _feeOwnerAddress,
    clankerTokenAddress,
  );
  const clankerDecimals = await getTokenDecimals(
    publicClient,
    clankerTokenAddress,
  );
  const clankerSymbol = await getTokenSymbol(
    publicClient,
    clankerTokenAddress,
  );
  const clankerFormattedFees = formatUnits(clankerRawFees, clankerDecimals);

  // Get fees for WETH
  const wethRawFees = await clanker.availableRewards(
    _feeOwnerAddress,
    wethTokenAddress,
  );
  const wethDecimals = await getTokenDecimals(publicClient, wethTokenAddress);
  const wethSymbol = await getTokenSymbol(publicClient, wethTokenAddress);
  const wethFormattedFees = formatUnits(wethRawFees, wethDecimals);

  return {
    [clankerSymbol]: clankerFormattedFees,
    [wethSymbol]: wethFormattedFees,
  };
}

/**
 * Fee distribution utilities for Clanker v4 token deployment
 * 
 * IMPORTANT: Clanker v4 has a two-layer fee system:
 * 1. Protocol Fee: 20% is automatically deducted by the hook during swaps (goes to Clanker)
 * 2. LP Fee Distribution: The remaining 80% goes to LP, and recipients array controls how LP fees are distributed
 * 
 * The recipients array must sum to 100% (10,000 bps) as it represents distribution of LP fees only.
 * 
 * Example: If user sets 1% total fee:
 * - 0.2% automatically goes to Clanker (protocol fee, handled at hook level)
 * - 0.8% goes to LP (distributed according to recipients array)
 */

// Our fee collection address
export const ASTROPAD_FEE_ADDRESS = '0x2eC50faa88b1CEeeB77bb36e7e31eb7C1FAeB348';

// Clanker's official fee address 
export const CLANKER_FEE_ADDRESS = '0x1eaf444ebDf6495C57aD52A04C61521bBf564ace'; // From SDK constants

// Protocol constants from the contracts
export const PROTOCOL_FEE_PERCENTAGE = 0.2; // 20% automatic protocol fee
export const LP_FEE_PERCENTAGE = 0.8; // 80% goes to LP

/**
 * Calculate fee distribution for reward recipients
 * This reflects the actual Clanker v4 fee structure where:
 * - 20% is automatically taken by protocol at hook level (not in recipients array)
 * - Recipients array controls distribution of LP fees and must sum to 100%
 * 
 * @param userAddress - The user's address
 * @param userFeeBps - The total fee percentage the user wants to set (in basis points)
 * @returns Array of reward recipients with proper distribution (sums to 10,000 bps)
 */
export function calculateFeeDistribution(
  userAddress: string,
  _userFeeBps: number
): RewardRecipient[] {
  // Recipients array represents distribution of LP fees only
  // Default split: 75% to user, 25% to platform (of LP fees)
  const userBps = 7500; // 75% of LP fees
  const astropadBps = 2500; // 25% of LP fees
  
  return [
    {
      recipient: userAddress,
      admin: userAddress,
      bps: userBps,
      label: 'You',
      isDefault: true
    },
    {
      recipient: ASTROPAD_FEE_ADDRESS,
      admin: ASTROPAD_FEE_ADDRESS,
      bps: astropadBps,
      label: 'Platform',
      isDefault: true
    }
  ].filter(recipient => recipient.bps > 0); // Only include recipients with non-zero fees
}

/**
 * Calculate the actual clanker and paired token fees from user input
 * @param userFeeBps - The fee percentage the user wants to collect
 * @param feeType - Whether using static or dynamic fees
 * @returns Object with calculated fee values
 */
export function calculateTokenFees(
  _userFeeBps: number,
  feeType: 'static' | 'dynamic'
) {
  if (feeType === 'static') {
    return {
      clankerFeeBps: _userFeeBps,
      pairedFeeBps: _userFeeBps
    };
  } else {
    // For dynamic fees, we use the userFeeBps as the base fee
    return {
      baseFee: Math.max(25, _userFeeBps), // Minimum 25 bps
      maxFee: Math.min(3000, _userFeeBps * 3), // Max 3x the base fee or 30%
    };
  }
}

/**
 * Get user-friendly fee display information showing the actual fee structure
 * @param userFeeBps - The fee percentage the user set
 * @returns Object with display information
 */
export function getFeeDisplayInfo(userFeeBps: number) {
  const totalFee = userFeeBps / 100;
  
  // Protocol automatically takes 20%
  const protocolFee = (userFeeBps * PROTOCOL_FEE_PERCENTAGE) / 100;
  
  // Remaining 80% goes to LP
  const lpFee = (userFeeBps * LP_FEE_PERCENTAGE) / 100;
  
  // LP fee distribution (based on default 75/25 split)
  const userReceives = (lpFee * 0.75); // 75% of LP fees
  const astropadReceives = (lpFee * 0.25); // 25% of LP fees
  
  return {
    totalFee: `${totalFee.toFixed(2)}%`,
    protocolFee: `${protocolFee.toFixed(2)}%`,
    lpDistributable: `${lpFee.toFixed(2)}%`,
    userReceives: `${userReceives.toFixed(2)}%`,
    astropadReceives: `${astropadReceives.toFixed(2)}%`,
    // Basis points for contract usage
    protocolBps: Math.floor(userFeeBps * PROTOCOL_FEE_PERCENTAGE),
    userBps: 7500, // 75% of LP fees
    astropadBps: 2500 // 25% of LP fees
  };
}

/**
 * Validate fee percentage is within acceptable bounds
 * @param feeBps - Fee in basis points
 * @returns Validation result
 */
export function validateFeeBps(feeBps: number): { isValid: boolean; error?: string } {
  if (feeBps < 0) {
    return { isValid: false, error: 'Fee cannot be negative' };
  }
  
  if (feeBps > 2000) { // 20% max
    return { isValid: false, error: 'Fee cannot exceed 20%' };
  }
  
  if (feeBps > 0 && feeBps < 25) {
    return { isValid: false, error: 'Minimum fee is 0.25% (25 basis points)' };
  }
  
  return { isValid: true };
}