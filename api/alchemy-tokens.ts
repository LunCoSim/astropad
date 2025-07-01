import type { DeployedToken } from '../lib/deployed-tokens';

interface AlchemyAssetTransfer {
  from: string;
  to: string | null;
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

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

// Clanker v4.0 contract addresses on Base (from official repo)
const CLANKER_CONTRACT_ADDRESS = '0xE85A59c628F7d27878ACeB4bf3b35733630083a9';
const CLANKER_FEE_LOCKER_ADDRESS = '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68';

/**
 * Fetch deployed tokens using Alchemy API
 * Finds tokens owned by the wallet that were created by Clanker contracts
 */
export async function fetchDeployedTokensViaAlchemy(walletAddress: string): Promise<DeployedToken[]> {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY;
  
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not configured. Returning empty results.');
    return [];
  }

  try {
    console.log('Fetching tokens owned by wallet that were created by Clanker...');
    
    // Alchemy API endpoint for Base network
    const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    
    // APPROACH 1: Get all tokens owned by the wallet
    const ownedTokens = await getOwnedTokens(alchemyUrl, walletAddress);
    console.log(`Found ${ownedTokens.length} tokens owned by wallet`);
    
    // APPROACH 2: Filter to only tokens created by Clanker (with timeout)
    const clankerTokens = await filterClankerTokensWithTimeout(alchemyUrl, ownedTokens, walletAddress);

    console.log(`Found ${clankerTokens.length} Clanker tokens owned by wallet`);
    return clankerTokens;

  } catch (error: any) {
    console.error('Error fetching tokens via Alchemy:', error);
    return [];
  }
}

/**
 * Get all tokens owned by the wallet address
 */
async function getOwnedTokens(alchemyUrl: string, walletAddress: string): Promise<AlchemyTokenBalance[]> {
  console.log('Getting all tokens owned by wallet...');
  
  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [walletAddress],
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if ((data as any).error) {
      throw new Error(`Alchemy API error: ${(data as any).error.message}`);
    }

    const result = (data as any).result;
    const tokenBalances = result?.tokenBalances || [];
    
    // Filter out tokens with zero balance or errors
    const validTokens = tokenBalances.filter((token: AlchemyTokenBalance) => 
      !token.error && 
      token.tokenBalance !== '0x0' && 
      token.tokenBalance !== '0'
    );

    console.log(`Found ${validTokens.length} tokens with non-zero balance`);
    return validTokens;

  } catch (error) {
    console.error('Error getting owned tokens:', error);
    return [];
  }
}

/**
 * Filter tokens to only include those created by Clanker (with timeout protection)
 */
async function filterClankerTokensWithTimeout(
  alchemyUrl: string, 
  tokens: AlchemyTokenBalance[], 
  walletAddress: string
): Promise<DeployedToken[]> {
  console.log(`Checking ${tokens.length} tokens to see which were created by Clanker...`);
  
  const clankerTokens: DeployedToken[] = [];
  const maxTimePerToken = 10000; // 10 seconds max per token
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    try {
      console.log(`Checking token ${i + 1}/${tokens.length}: ${token.contractAddress}`);
      
      // Check if this token was created by Clanker with timeout
      const clankerToken = await Promise.race([
        checkIfClankerTokenFast(alchemyUrl, token.contractAddress, walletAddress),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), maxTimePerToken)
        )
      ]);
      
      if (clankerToken) {
        clankerTokens.push(clankerToken);
        console.log(`✅ Found Clanker token: ${clankerToken.name} (${clankerToken.symbol}) at ${clankerToken.address}`);
      } else {
        console.log(`❌ Not a Clanker token: ${token.contractAddress}`);
      }
      
    } catch (error: any) {
      if (error.message === 'Timeout') {
        console.log(`⏰ Timeout checking token ${token.contractAddress} - skipping`);
      } else {
        console.error(`Error checking token ${token.contractAddress}:`, error.message);
      }
    }
  }

  return clankerTokens;
}

/**
 * Fast check if a token was created by Clanker (limited search scope)
 */
async function checkIfClankerTokenFast(
  alchemyUrl: string, 
  tokenAddress: string, 
  walletAddress: string
): Promise<DeployedToken | null> {
  try {
    // First get token metadata
    const metadata = await getTokenMetadata(alchemyUrl, tokenAddress);
    if (!metadata.name || !metadata.symbol) {
      return null;
    }

    // Search for TokenCreated events with limited scope (recent blocks only)
    const foundEvent = await findTokenCreatedEventFast(alchemyUrl, tokenAddress);
    
    if (!foundEvent) {
      return null; // Not a Clanker token
    }

    // Get the deployment transaction details
    const deploymentTx = await getTransactionDetails(alchemyUrl, foundEvent.transactionHash);
    
    return {
      address: tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      deployerAddress: walletAddress, // The wallet that owns the token
      deploymentTxHash: foundEvent.transactionHash,
      deploymentBlockNumber: parseInt(foundEvent.blockNumber, 16),
      deploymentTimestamp: deploymentTx?.timestamp || 0,
      isVerified: true,
      source: 'blockchain' as const,
    };

  } catch (error) {
    return null;
  }
}

/**
 * Fast search for TokenCreated event (limited to recent blocks)
 */
async function findTokenCreatedEventFast(alchemyUrl: string, tokenAddress: string): Promise<any | null> {
  try {
    // Get current block
    const currentBlock = await getCurrentBlockNumber(alchemyUrl);
    
    // Only search recent blocks (last ~2 months = ~500k blocks)
    const searchBlocks = 500000;
    const startBlock = Math.max(0x1e84800, currentBlock - searchBlocks);
    const chunkSize = 2000; // Larger chunks for efficiency
    
    console.log(`Searching blocks ${startBlock} to ${currentBlock} for token ${tokenAddress}`);
    
    // Search in chunks from newest to oldest
    for (let fromBlock = currentBlock; fromBlock > startBlock; fromBlock -= chunkSize) {
      const toBlock = fromBlock;
      const searchFromBlock = Math.max(startBlock, fromBlock - chunkSize + 1);
      
      try {
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
              fromBlock: '0x' + searchFromBlock.toString(16),
              toBlock: '0x' + toBlock.toString(16),
              address: CLANKER_CONTRACT_ADDRESS,
              topics: [
                '0x9299d1d1a88d8e1abdc591ae7a167a6bc63a8f17d695804e9091ee33aa89fb67', // TokenCreated event
                '0x' + tokenAddress.slice(2).padStart(64, '0').toLowerCase() // Token address as indexed parameter
              ]
            }],
          }),
        });

        if (!response.ok) {
          console.log(`API error for blocks ${searchFromBlock}-${toBlock}, continuing...`);
          continue;
        }

        const data = await response.json();
        
        if ((data as any).error) {
          // If we hit limits, try smaller chunks or continue
          console.log(`API limit for blocks ${searchFromBlock}-${toBlock}: ${(data as any).error.message}`);
          continue;
        }

        const logs = (data as any).result || [];
        
        if (logs.length > 0) {
          console.log(`Found TokenCreated event in block ${logs[0].blockNumber}`);
          return logs[0]; // Found it!
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.log(`Error searching blocks ${searchFromBlock}-${toBlock}, continuing...`);
        continue;
      }
    }
    
    console.log(`No TokenCreated event found for ${tokenAddress} in recent blocks`);
    return null;
    
  } catch (error) {
    console.error(`Error in fast search for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Get current block number
 */
async function getCurrentBlockNumber(alchemyUrl: string): Promise<number> {
  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
      }),
    });

    if (!response.ok) {
      return 0x1e84800 + 100000; // Fallback to a reasonable recent block
    }

    const data = await response.json();
    const blockNumber = (data as any).result;
    
    return parseInt(blockNumber, 16);

  } catch (error) {
    return 0x1e84800 + 100000; // Fallback to a reasonable recent block
  }
}

/**
 * Get transaction details including timestamp
 */
async function getTransactionDetails(alchemyUrl: string, txHash: string): Promise<{ timestamp: number } | null> {
  try {
    // Get transaction receipt for block number
    const receiptResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    if (!receiptResponse.ok) {
      return null;
    }

    const receiptData = await receiptResponse.json();
    const receipt = (receiptData as any).result;

    if (!receipt) {
      return null;
    }

    // Get block details for timestamp
    const blockResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [receipt.blockNumber, false],
      }),
    });

    if (!blockResponse.ok) {
      return null;
    }

    const blockData = await blockResponse.json();
    const block = (blockData as any).result;

    if (!block) {
      return null;
    }

    return {
      timestamp: parseInt(block.timestamp, 16) * 1000, // Convert to milliseconds
    };

  } catch (error) {
    return null;
  }
}

/**
 * Get token name and symbol using Alchemy API
 */
async function getTokenMetadata(alchemyUrl: string, tokenAddress: string): Promise<AlchemyTokenMetadata> {
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
      name: metadata?.name || '',
      symbol: metadata?.symbol || '',
      decimals: metadata?.decimals || 18,
      logo: metadata?.logo,
    };

  } catch (error) {
    console.error(`Error getting token metadata for ${tokenAddress}:`, error);
    return {
      name: '',
      symbol: '',
      decimals: 18,
    };
  }
} 