import type { DeployedToken } from '../lib/deployed-tokens';

interface AlchemyAssetTransfer {
  from: string;
  to: string;
  value: string;
  hash: string;
  blockNum: string;
  asset: string;
  category: string;
  metadata: {
    blockTimestamp: string;
  };
}

interface AlchemyResponse {
  transfers: AlchemyAssetTransfer[];
  pageKey?: string;
}

// Clanker contract address on Base (v4.0.0 - current)
const CLANKER_CONTRACT_ADDRESS = '0xE85A59c628F7d27878ACeB4bf3b35733630083a9';

/**
 * Fetch deployed tokens using Alchemy API
 * Centralized implementation for both API and Netlify Functions
 */
export async function fetchDeployedTokensViaAlchemy(walletAddress: string): Promise<DeployedToken[]> {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY;
  
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not configured. Returning empty results.');
    return [];
  }

  try {
    console.log('Fetching token deployments via Alchemy API...');
    
    // Alchemy API endpoint for Base network
    const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    
    // Get asset transfers where the wallet interacted with the current Clanker contract (v4)
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0', // Start from genesis to catch all transactions
            toBlock: 'latest',
            fromAddress: walletAddress,
            toAddress: CLANKER_CONTRACT_ADDRESS,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: '0x3e8', // 1000 transactions max
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if ((data as any).error) {
      throw new Error(`Alchemy API error: ${(data as any).error.message}`);
    }

    const transfers = (data as any).result?.transfers || [];
    console.log(`Found ${transfers.length} transactions to Clanker contract (v4)`);

    // For each transaction, we need to get the token that was created
    // We'll fetch transaction receipts to find TokenCreated events
    const deployedTokens: DeployedToken[] = [];
    
    // Process transactions in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < transfers.length; i += BATCH_SIZE) {
      const batch = transfers.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (transfer: AlchemyAssetTransfer) => {
        try {
          return await getTokenFromTransaction(alchemyUrl, transfer, walletAddress);
        } catch (error) {
          console.error(`Error processing transaction ${transfer.hash}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validTokens = batchResults.filter((token: DeployedToken | null): token is DeployedToken => token !== null);
      deployedTokens.push(...validTokens);
      
      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < transfers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully processed ${deployedTokens.length} deployed tokens`);
    return deployedTokens;

  } catch (error: any) {
    console.error('Error fetching tokens via Alchemy:', error);
    // Return empty array instead of throwing to allow graceful fallbacks
    return [];
  }
}

/**
 * Get token information from a transaction that deployed it
 */
async function getTokenFromTransaction(
  alchemyUrl: string, 
  transfer: AlchemyAssetTransfer, 
  walletAddress: string
): Promise<DeployedToken | null> {
  try {
    // Get transaction receipt to find TokenCreated event
    const receiptResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transfer.hash],
      }),
    });

    if (!receiptResponse.ok) {
      throw new Error(`Failed to get transaction receipt: ${receiptResponse.status}`);
    }

    const receiptData = await receiptResponse.json();
    const receipt = (receiptData as any).result;

    if (!receipt || !receipt.logs) {
      return null;
    }

    // Find logs that match TokenCreated event from Clanker contract (v4)
    // We look for logs from the Clanker contract with multiple topics (indicating indexed parameters)
    const tokenCreatedLogs = receipt.logs.filter((log: any) => 
      log.address.toLowerCase() === CLANKER_CONTRACT_ADDRESS.toLowerCase() &&
      log.topics.length >= 3 // TokenCreated has indexed parameters
    );

    if (tokenCreatedLogs.length === 0) {
      return null;
    }

    // Take the first TokenCreated event (there should only be one per transaction)
    const tokenLog = tokenCreatedLogs[0];
    
    // Extract token address from the first topic (after event signature)
    const tokenAddress = '0x' + tokenLog.topics[1].slice(26); // Remove padding

    // Get token metadata
    const tokenMetadata = await getTokenMetadata(alchemyUrl, tokenAddress);

    return {
      address: tokenAddress,
      name: tokenMetadata.name || 'Unknown Token',
      symbol: tokenMetadata.symbol || 'UNK',
      deployerAddress: walletAddress,
      deploymentTxHash: transfer.hash,
      deploymentBlockNumber: parseInt(transfer.blockNum, 16),
      deploymentTimestamp: new Date(transfer.metadata.blockTimestamp).getTime(),
      isVerified: true,
      source: 'blockchain' as const,
    };

  } catch (error) {
    console.error(`Error processing transaction ${transfer.hash}:`, error);
    return null;
  }
}

/**
 * Get token name and symbol using Alchemy API
 */
async function getTokenMetadata(alchemyUrl: string, tokenAddress: string): Promise<{ name: string; symbol: string }> {
  try {
    // Get token metadata using Alchemy
    const metadataResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [tokenAddress],
      }),
    });

    if (!metadataResponse.ok) {
      throw new Error(`Failed to get token metadata: ${metadataResponse.status}`);
    }

    const metadataData = await metadataResponse.json();
    const metadata = (metadataData as any).result;

    return {
      name: metadata?.name || 'Unknown Token',
      symbol: metadata?.symbol || 'UNK',
    };

  } catch (error) {
    console.error(`Error getting token metadata for ${tokenAddress}:`, error);
    return {
      name: 'Unknown Token',
      symbol: 'UNK',
    };
  }
} 