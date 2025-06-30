import { formatUnits, type PublicClient } from "viem";
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