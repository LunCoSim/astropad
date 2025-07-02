import { createPublicClient, http, parseEther, type Account } from "viem";
import fs from "fs";
import path from "path";
import { base } from "viem/chains";
import {
  WETH_ADDRESS,
  POOL_POSITIONS,
} from "clanker-sdk";
import { Clanker } from "clanker-sdk/v4";

// Your Gnosis Safe Multisig address
const SAFE_MULTISIG_ADDRESS =
  "0xCd2a99C6d6b27976537fC3737b0ef243E7C49946" as `0x${string}`;

async function generateClankerTokenDeploymentTransaction() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // 1. Define your token configuration using the TokenConfigV4Builder
  const builder = new TokenConfigV4Builder()
    .withName("My Project Coin")
    .withSymbol("MPC")
    .withChainId(base.id)
    .withTokenAdmin(SAFE_MULTISIG_ADDRESS)
    .withStaticFeeConfig({
      clankerFeeBps: 100, // 1% fee for Clanker token (100 basis points)
      pairedFeeBps: 100, // 1% fee for paired token (100 basis points)
    })
    .withPoolConfig({
      pairedToken: WETH_ADDRESS,
      positions: POOL_POSITIONS.Standard,
    })
    .withDevBuy({
      ethAmount: 0.0001, // Initial buy with 0.0001 ETH
    })
    .withRewardsRecipients({
      // Direct all rewards to the Safe Multisig (no developer allocation)
      recipients: [
        {
          admin: SAFE_MULTISIG_ADDRESS,
          recipient: SAFE_MULTISIG_ADDRESS,
          bps: 10000, // 100% of rewards go to the Safe
        },
      ],
    });

  // 2. Build the token configuration
  const tokenConfig = builder.build();

  // 3. Simulate the deployment to get the transaction data
  try {
    // For simulation, you need an 'account' but it doesn't have to be the Safe's account.
    // Any valid address will do as we are not sending the transaction here.
    const dummyAccount: Account = {
      address: "0x0000000000000000000000000000000000000001" as `0x${string}`,
      type: "json-rpc",
      signMessage: async () => "0x",
      signTransaction: async () => "0x",
      signTypedData: async () => "0x",
    }; // Example dummy address

    const clanker = new Clanker({ publicClient });

    const simulationResult = await clanker.simulateDeployToken(
      tokenConfig,
      dummyAccount,
    );

    if ("error" in simulationResult) {
      console.error("Simulation failed:", simulationResult.error);
      return null;
    }

    const { transaction, simulatedAddress } = simulationResult;

    console.log(
      "\n--- Clanker Token Deployment Transaction Data for Gnosis Safe ---",
    );
    console.log("To Address (Clanker Deployer):", transaction.to);
    console.log(
      "Value (in wei, for initial buy):",
      transaction.value.toString(),
    );
    console.log("Data (hex, for contract interaction):", transaction.data);
    console.log(
      "Simulated Token Address (where your token will be deployed):",
      simulatedAddress,
    );
    console.log(
      "\nCopy these values and use them in your Gnosis Safe web interface.",
    );

    const gnosisSafeTx = {
      version: "1.0",
      chainId: base.id.toString(),
      createdAt: Date.now(),
      meta: {
        name: "Clanker Token Deployment",
        description: `Deployment of ${tokenConfig.name} (${tokenConfig.symbol})`,
        txBuilderVersion: "1.0.0",
      },
      transactions: [
        {
          to: transaction.to,
          value: transaction.value.toString(),
          data: transaction.data,
        },
      ],
    };

    const outputFileName = `gnosis_safe_tx_${tokenConfig.symbol}.json`;
    const outputPath = path.join(__dirname, outputFileName);

    fs.writeFileSync(outputPath, JSON.stringify(gnosisSafeTx, null, 2));
    console.log(`Gnosis Safe transaction JSON saved to: ${outputPath}`);

    return transaction;
  } catch (error) {
    console.error("Error during Clanker simulation:", error);
    return null;
  }
}

// Call the function to generate the transaction data
generateClankerTokenDeploymentTransaction();
