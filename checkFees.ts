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

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // Replace with the actual fee owner address (e.g., your Gnosis Safe address)
  const feeOwnerAddress =
    "0xCd2a99C6d6b27976537fC3737b0ef243E7C49946" as `0x${string}`;

  // Replace with the actual deployed token address
  const clankerTokenAddress =
    "0x699E27a42095D3cb9A6a23097E5C201E33E314B4" as `0x${string}`;
  const wethTokenAddress = WETH_ADDRESS;

  console.log("Starting main function...");

  try {
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

    console.log(
      `Available fees for ${clankerSymbol} (${clankerTokenAddress}): ${clankerFormattedFees}`,
    );

    // Get fees for WETH
    const wethRawFees = await availableFees(
      publicClient,
      feeOwnerAddress,
      wethTokenAddress,
    );
    const wethDecimals = await getTokenDecimals(publicClient, wethTokenAddress);
    const wethSymbol = await getTokenSymbol(publicClient, wethTokenAddress);
    const wethFormattedFees = formatUnits(wethRawFees, wethDecimals);

    console.log(
      `Available fees for ${wethSymbol} (${wethTokenAddress}): ${wethFormattedFees}`,
    );
  } catch (error) {
    console.error("Error checking fees:", error);
  }
}

main();
