import { formatUnits, type PublicClient } from "viem";
import { Clanker } from "clanker-sdk/v4";
import { WETH_ADDRESS } from 'clanker-sdk';
import type { RewardRecipient } from './types';
import { validateFeeBps, getTokenDecimals, getTokenSymbol } from './validation';

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
 * @throws Error if invalid inputs
 */
export function calculateFeeDistribution(
  userAddress: string,
  userFeeBps: number
): RewardRecipient[] {
  if (!userAddress || !userAddress.startsWith('0x')) {
    throw new Error('Invalid user address');
  }
  if (userFeeBps < 0 || userFeeBps > 10000) {
    throw new Error('Invalid fee basis points (must be 0-10000)');
  }
  
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
      isDefault: true,
      token: ''
    },
    {
      recipient: ASTROPAD_FEE_ADDRESS,
      admin: ASTROPAD_FEE_ADDRESS,
      bps: astropadBps,
      label: 'Platform',
      isDefault: true,
      token: ''
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
  validateFeeBps(_userFeeBps);

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
  const clankerFee = (userFeeBps * 0.2) / 100;
  
  // Remaining 80% goes to LP
  const lpFee = (userFeeBps * 0.8) / 100;
  
  // LP fee distribution (based on 80/20 split: 80% to user, 20% to Astropad)
  const userReceives = (lpFee * 0.8);
  const astroPadReceives = (lpFee * 0.2);
  
  // Combined protocol fee (Clanker + Astropad)
  const combinedProtocol = clankerFee + astroPadReceives;
  
  return {
    totalFee: `${totalFee.toFixed(2)}%`,
    combinedProtocol: `${combinedProtocol.toFixed(2)}% (Clanker: ${clankerFee.toFixed(2)}%, Astropad: ${astroPadReceives.toFixed(2)}%)`,
    userReceives: `${userReceives.toFixed(2)}%`,
    // Basis points for contract usage
    clankerBps: Math.floor(userFeeBps * 0.2),
    userBps: 8000, // 80% of LP fees
    astroPadBps: 2000 // 20% of LP fees
  };
}