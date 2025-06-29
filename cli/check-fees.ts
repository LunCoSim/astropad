import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { getAvailableFees } from "../lib/fees.js";

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

  console.log("Checking fees...");

  try {
    const fees = await getAvailableFees(
      publicClient,
      feeOwnerAddress,
      clankerTokenAddress,
    );

    for (const [symbol, amount] of Object.entries(fees)) {
      console.log(`Available fees for ${symbol}: ${amount}`);
    }
  } catch (error) {
    console.error("Error checking fees:", error);
  }
}

main();