import { formatUnits, type PublicClient, type WalletClient } from "viem";
import { Clanker, WETH_ADDRESS } from "clanker-sdk";
import { getTokenDecimals, getTokenSymbol } from "./token-validation.js";

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