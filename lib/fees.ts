import { createPublicClient, http, formatUnits, PublicClient } from "viem";
import { base } from "viem/chains";
import { availableFees, WETH_ADDRESS } from "clanker-sdk";

// Generic ERC20 ABI for fetching decimals
const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function getTokenDecimals(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<number> {
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    });
    return decimals;
  } catch (error) {
    console.warn(
      `Could not fetch decimals for ${tokenAddress}, assuming 18. Error:`,
      error,
    );
    return 18; // Default to 18 if decimals cannot be fetched
  }
}

async function getTokenSymbol(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
): Promise<string> {
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    });
    return symbol;
  } catch (error) {
    console.warn(
      `Could not fetch symbol for ${tokenAddress}, assuming 'UNKNOWN'. Error:`,
      error,
    );
    return "UNKNOWN";
  }
}

export async function getAvailableFees(
  publicClient: PublicClient,
  feeOwnerAddress: `0x${string}`,
  clankerTokenAddress: `0x${string}`,
) {
  const wethTokenAddress = WETH_ADDRESS;

  // Get fees for Clanker Token
  const clankerRawFees = await availableFees(
    publicClient,
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
  const wethRawFees = await availableFees(
    publicClient,
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
