import { formatUnits, type PublicClient, type WalletClient } from "viem";
import { Clanker, WETH_ADDRESS } from "clanker-sdk";
import { getTokenDecimals, getTokenSymbol } from "./token-validation.js";
import type { RewardRecipient } from './types';

export async function getAvailableFees(
  publicClient: PublicClient,
  feeOwnerAddress: `0x${string}`,
  clankerTokenAddress: `0x${string}`,
) {
  const clanker = new Clanker({ publicClient });
  const wethTokenAddress = WETH_ADDRESS;

  // Get fees for Clanker Token
  const clankerRawFees = await clanker.availableRewards(
    feeOwnerAddress,
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
    feeOwnerAddress,
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

export async function claimFees(
  publicClient: PublicClient,
  walletClient: WalletClient | null,
  feeOwnerAddress: `0x${string}`,
  clankerTokenAddress: `0x${string}`,
): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet client is required for fee claiming');
  }

  try {
    // Use the Clanker SDK with wallet client for transactions
    const clanker = new Clanker({ publicClient, wallet: walletClient });
    
    // According to Clanker documentation, fees are claimed through the Clanker contract
    // The exact method name may vary, but typically it's something like distributeFees or claimFees
    
    // For now, we'll check if the Clanker SDK has a distributeFees method
    // If not available in the current SDK version, we'll provide helpful error with manual claim option
    
    if (typeof (clanker as any).distributeFees === 'function') {
      // Call the distribute fees function if available
      const txHash = await (clanker as any).distributeFees(clankerTokenAddress);
      return txHash;
    } else {
      // If the SDK doesn't have the method yet, provide helpful error message
      throw new Error(
        `Automatic fee claiming is not yet available in this version of the Clanker SDK.\n\n` +
        `Please visit the Clanker admin page to claim fees manually:\n` +
        `https://www.clanker.world/clanker/${clankerTokenAddress}/admin\n\n` +
        `This page allows you to claim available fees by connecting your wallet and clicking "Claim Rewards".`
      );
    }
    
  } catch (error: any) {
    console.error('Error claiming fees:', error);
    
    // If it's our custom error about SDK not having the method, re-throw it
    if (error.message.includes('not yet available in this version')) {
      throw error;
    }
    
    // For other errors, provide a helpful message
    throw new Error(
      `Failed to claim fees: ${error.message}\n\n` +
      `You can try claiming manually at:\n` +
      `https://www.clanker.world/clanker/${clankerTokenAddress}/admin`
    );
  }
}

/**
 * Fee distribution utilities for Clanker v4 token deployment
 * Implements automatic fee splitting: 60% user, 20% clanker, 20% astropad
 */

// Our fee collection address
export const ASTROPAD_FEE_ADDRESS = '0x2eC50faa88b1CEeeB77bb36e7e31eb7C1FAeB348';

// Clanker's official fee address 
export const CLANKER_FEE_ADDRESS = '0x1eaf444ebDf6495C57aD52A04C61521bBf564ace'; // From SDK constants

/**
 * Calculate fee distribution for reward recipients
 * @param userAddress - The user's address (gets 60% of fees)
 * @param userFeeBps - The fee percentage the user wants to collect (in basis points)
 * @returns Array of reward recipients with proper distribution
 */
export function calculateFeeDistribution(
  userAddress: string,
  userFeeBps: number
): RewardRecipient[] {
  // Calculate the distribution:
  // User gets 60% of what they set
  // Clanker gets 20% of what they set  
  // We get 20% of what they set
  
  const userBps = Math.floor(userFeeBps * 0.6); // 60%
  const clankerBps = Math.floor(userFeeBps * 0.2); // 20%
  const astropadBps = userFeeBps - userBps - clankerBps; // Remaining (handles rounding)
  
  return [
    {
      recipient: userAddress,
      admin: userAddress,
      bps: userBps
    },
    {
      recipient: CLANKER_FEE_ADDRESS,
      admin: CLANKER_FEE_ADDRESS,
      bps: clankerBps
    },
    {
      recipient: ASTROPAD_FEE_ADDRESS,
      admin: ASTROPAD_FEE_ADDRESS,
      bps: astropadBps
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
  userFeeBps: number,
  feeType: 'static' | 'dynamic'
) {
  if (feeType === 'static') {
    return {
      clankerFeeBps: userFeeBps,
      pairedFeeBps: userFeeBps
    };
  } else {
    // For dynamic fees, we use the userFeeBps as the base fee
    return {
      baseFee: Math.max(25, userFeeBps), // Minimum 25 bps
      maxFee: Math.min(3000, userFeeBps * 3), // Max 3x the base fee or 30%
    };
  }
}

/**
 * Get user-friendly fee display information
 * @param userFeeBps - The fee percentage the user set
 * @returns Object with display information
 */
export function getFeeDisplayInfo(userFeeBps: number) {
  const userReceives = (userFeeBps * 0.6) / 100; // Convert to percentage
  const clankerReceives = (userFeeBps * 0.2) / 100;
  const astropadReceives = (userFeeBps * 0.2) / 100;
  const totalFee = userFeeBps / 100;
  
  return {
    totalFee: `${totalFee}%`,
    userReceives: `${userReceives.toFixed(2)}%`,
    clankerReceives: `${clankerReceives.toFixed(2)}%`,
    astropadReceives: `${astropadReceives.toFixed(2)}%`,
    userBps: Math.floor(userFeeBps * 0.6),
    clankerBps: Math.floor(userFeeBps * 0.2),
    astropadBps: userFeeBps - Math.floor(userFeeBps * 0.6) - Math.floor(userFeeBps * 0.2)
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