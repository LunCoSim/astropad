import type { PublicClient } from 'viem';

export interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  deployerAddress: string;
  deploymentTxHash?: string;
  deploymentBlockNumber?: number;
  deploymentTimestamp: number;
  adminAddress?: string;
  isVerified?: boolean;
  source: 'manual' | 'blockchain'; // Track how token was discovered
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

const STORAGE_KEY = 'astropad_deployed_tokens';

// Clanker contract address on Base
const CLANKER_CONTRACT_ADDRESS = '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E' as const;

// ERC20 ABI for token metadata
const ERC20_METADATA_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const;

// TokenCreated event ABI for Clanker contract
const TOKEN_CREATED_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: true, name: 'deployer', type: 'address' },
      { indexed: false, name: 'totalSupply', type: 'uint256' },
      { indexed: false, name: 'fid', type: 'uint256' },
      { indexed: false, name: 'positionId', type: 'uint256' },
    ],
    name: 'TokenCreated',
    type: 'event',
  },
] as const;

/**
 * Get all stored deployed tokens for the connected wallet
 */
export function getStoredTokens(walletAddress: string): DeployedToken[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const allTokens: DeployedToken[] = JSON.parse(stored);
    return allTokens.filter(token => 
      token.deployerAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  } catch (error) {
    console.error('Error reading stored tokens:', error);
    return [];
  }
}

/**
 * Store a newly deployed token
 */
export function storeDeployedToken(token: DeployedToken): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allTokens: DeployedToken[] = stored ? JSON.parse(stored) : [];
    
    // Check if token already exists (by address)
    const existingIndex = allTokens.findIndex(t => 
      t.address.toLowerCase() === token.address.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing token
      allTokens[existingIndex] = { ...allTokens[existingIndex], ...token };
    } else {
      // Add new token
      allTokens.push(token);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTokens));
  } catch (error) {
    console.error('Error storing token:', error);
  }
}

/**
 * Remove a token from storage
 */
export function removeStoredToken(tokenAddress: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allTokens: DeployedToken[] = JSON.parse(stored);
    const filtered = allTokens.filter(token => 
      token.address.toLowerCase() !== tokenAddress.toLowerCase()
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

/**
 * Fetch token metadata from blockchain
 */
export async function fetchTokenMetadata(
  publicClient: PublicClient, 
  tokenAddress: string
): Promise<TokenMetadata | null> {
  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_METADATA_ABI,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_METADATA_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_METADATA_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_METADATA_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      decimals: decimals as number,
      totalSupply: (totalSupply as bigint).toString(),
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

/**
 * Fetch deployed tokens from blockchain using Clanker contract events (ALL TIME)
 */
export async function fetchDeployedTokensFromBlockchain(
  publicClient: PublicClient,
  walletAddress: string,
  fromBlock?: bigint
): Promise<DeployedToken[]> {
  try {
    // Use earliest possible block for all-time discovery
    // Clanker contract was deployed around block 18,000,000 on Base
    const CLANKER_DEPLOYMENT_BLOCK = BigInt(18_000_000);
    const startBlock = fromBlock || CLANKER_DEPLOYMENT_BLOCK;

    console.log(`Fetching ALL token deployments from block ${startBlock} (all-time search)`);

    // Get TokenCreated events from Clanker contract for this deployer
    const logs = await publicClient.getLogs({
      address: CLANKER_CONTRACT_ADDRESS,
      event: TOKEN_CREATED_EVENT_ABI[0],
      args: {
        deployer: walletAddress as `0x${string}`,
      },
      fromBlock: startBlock,
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} token deployments (all-time)`);

    const deployedTokens: DeployedToken[] = [];

    // Process logs in batches to avoid overwhelming the RPC
    const BATCH_SIZE = 10;
    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
      const batch = logs.slice(i, i + BATCH_SIZE);
      
      // Get block timestamps in parallel for this batch
      const blockPromises = batch.map(log => 
        publicClient.getBlock({ blockNumber: log.blockNumber })
          .catch(error => {
            console.warn(`Failed to get block ${log.blockNumber}:`, error);
            return null;
          })
      );
      
      const blocks = await Promise.all(blockPromises);
      
      // Process each log in the batch
      batch.forEach((log, index) => {
        try {
          const block = blocks[index];
          const { token, name, symbol, deployer } = log.args;
          
          if (token && name && symbol && deployer) {
            const deployedToken: DeployedToken = {
              address: token,
              name: name,
              symbol: symbol,
              deployerAddress: deployer,
              deploymentTxHash: log.transactionHash,
              deploymentBlockNumber: Number(log.blockNumber),
              deploymentTimestamp: block ? Number(block.timestamp) * 1000 : Date.now(),
              isVerified: true,
              source: 'blockchain',
            };

            deployedTokens.push(deployedToken);
          }
        } catch (error) {
          console.error('Error processing token deployment log:', error);
        }
      });
    }

    // Sort by deployment timestamp (newest first)
    return deployedTokens.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
  } catch (error) {
    console.error('Error fetching deployed tokens from blockchain:', error);
    return [];
  }
}

/**
 * Alternative approach: Find tokens via wallet transactions to Clanker contract
 * This is more efficient as it only queries transactions from the specific wallet
 */
export async function fetchTokensViaWalletTransactions(
  publicClient: PublicClient,
  walletAddress: string,
  maxBlocks?: number
): Promise<DeployedToken[]> {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const startBlock = maxBlocks ? currentBlock - BigInt(maxBlocks) : BigInt(18_000_000);
    
    console.log(`Fetching wallet transactions to Clanker contract from block ${startBlock}`);

    // Get all transactions from this wallet to the Clanker contract
    const logs = await publicClient.getLogs({
      address: CLANKER_CONTRACT_ADDRESS,
      fromBlock: startBlock,
      toBlock: 'latest',
    });

    // Filter for transactions from our wallet and TokenCreated events
    const relevantLogs = logs.filter(log => {
      // Check if this is a TokenCreated event with our wallet as deployer
      if (log.topics[0] === '0x...' && log.topics[2]) { // TokenCreated event signature
        try {
          const deployerFromLog = '0x' + log.topics[2].slice(26); // Extract address from indexed parameter
          return deployerFromLog.toLowerCase() === walletAddress.toLowerCase();
        } catch {
          return false;
        }
      }
      return false;
    });

    console.log(`Found ${relevantLogs.length} relevant transactions`);

    // Process the relevant logs
    const deployedTokens: DeployedToken[] = [];
    
    for (const log of relevantLogs) {
      try {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        
        // Decode the event data (simplified - in production you'd use proper ABI decoding)
        const { token, name, symbol, deployer } = (log as any).args;
        
        if (token && name && symbol && deployer) {
          deployedTokens.push({
            address: token,
            name: name,
            symbol: symbol,
            deployerAddress: deployer,
            deploymentTxHash: log.transactionHash,
            deploymentBlockNumber: Number(log.blockNumber),
            deploymentTimestamp: Number(block.timestamp) * 1000,
            isVerified: true,
            source: 'blockchain',
          });
        }
      } catch (error) {
        console.error('Error processing transaction log:', error);
      }
    }

    return deployedTokens.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
  } catch (error) {
    console.error('Error fetching tokens via wallet transactions:', error);
    return [];
  }
}

/**
 * Ultra-efficient approach: Use external indexing services (like Moralis, Alchemy, or Bitquery)
 * This offloads all computation to pre-indexed services
 */
export async function fetchTokensViaIndexedAPI(
  walletAddress: string
): Promise<DeployedToken[]> {
  try {
    // Example using a public Base blockchain API (you'd replace with actual service)
    // This could be Moralis, Alchemy, Bitquery, or a custom indexer
    
    // For now, this is a placeholder - in production you'd use:
    // - Moralis Web3 API
    // - Alchemy Enhanced APIs  
    // - Bitquery GraphQL API
    // - Custom indexer service
    
    console.log('Fetching tokens via indexed API service...');
    
    // Placeholder for API call
    const response = await fetch(`/api/indexed-tokens?wallet=${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`API response: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to our format
    return data.tokens?.map((token: any) => ({
      address: token.contract_address,
      name: token.name,
      symbol: token.symbol,
      deployerAddress: walletAddress,
      deploymentTxHash: token.transaction_hash,
      deploymentBlockNumber: token.block_number,
      deploymentTimestamp: token.timestamp * 1000,
      isVerified: true,
      source: 'blockchain' as const,
    })) || [];
    
  } catch (error) {
    console.error('Error fetching tokens via indexed API:', error);
    return [];
  }
}

/**
 * Hybrid approach: Try multiple methods with fallbacks
 */
export async function fetchTokensWithFallbacks(
  publicClient: PublicClient,
  walletAddress: string
): Promise<DeployedToken[]> {
  console.log('Starting hybrid token discovery...');
  
  // Method 1: Try indexed API first (fastest, least computation)
  try {
    console.log('Trying indexed API...');
    const indexedTokens = await fetchTokensViaIndexedAPI(walletAddress);
    if (indexedTokens.length > 0) {
      console.log(`Found ${indexedTokens.length} tokens via indexed API`);
      return indexedTokens;
    }
  } catch (error) {
    console.warn('Indexed API failed, trying direct blockchain query...', error);
  }
  
  // Method 2: Direct blockchain query with efficient filtering
  try {
    console.log('Trying direct blockchain query...');
    const blockchainTokens = await fetchDeployedTokensFromBlockchain(publicClient, walletAddress);
    if (blockchainTokens.length > 0) {
      console.log(`Found ${blockchainTokens.length} tokens via blockchain query`);
      return blockchainTokens;
    }
  } catch (error) {
    console.warn('Direct blockchain query failed', error);
  }
  
  // Method 3: Transaction-based discovery (fallback)
  try {
    console.log('Trying transaction-based discovery...');
    return await fetchTokensViaWalletTransactions(publicClient, walletAddress, 1_000_000); // Last ~23 days
  } catch (error) {
    console.error('All token discovery methods failed:', error);
    return [];
  }
}

/**
 * Sync blockchain tokens with local storage
 */
export async function syncTokensWithBlockchain(
  publicClient: PublicClient,
  walletAddress: string,
  useHybridApproach: boolean = true
): Promise<DeployedToken[]> {
  try {
    // Get existing stored tokens
    const storedTokens = getStoredTokens(walletAddress);
    
    // Fetch tokens from blockchain using hybrid approach (more efficient)
    const blockchainTokens = useHybridApproach 
      ? await fetchTokensWithFallbacks(publicClient, walletAddress)
      : await fetchDeployedTokensFromBlockchain(publicClient, walletAddress);
    
    // Create a map of existing tokens by address for quick lookup
    const existingTokensMap = new Map(
      storedTokens.map(token => [token.address.toLowerCase(), token])
    );
    
    // Merge blockchain tokens with stored tokens
    const mergedTokens: DeployedToken[] = [];
    
    for (const blockchainToken of blockchainTokens) {
      const existing = existingTokensMap.get(blockchainToken.address.toLowerCase());
      
      if (existing) {
        // Update existing token with blockchain data
        mergedTokens.push({
          ...existing,
          ...blockchainToken,
          // Preserve manually added data
          source: existing.source === 'manual' ? 'manual' : 'blockchain',
        });
      } else {
        // Add new blockchain token
        mergedTokens.push(blockchainToken);
      }
      
      // Remove from existing map to track what's left
      existingTokensMap.delete(blockchainToken.address.toLowerCase());
    }
    
    // Add remaining stored tokens that weren't found on blockchain (manual additions)
    for (const [, remainingToken] of existingTokensMap) {
      mergedTokens.push(remainingToken);
    }
    
    // Sort by deployment timestamp (newest first)
    const sortedTokens = mergedTokens.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
    
    // Store the merged list
    const allExistingTokens = localStorage.getItem(STORAGE_KEY);
    const allTokens: DeployedToken[] = allExistingTokens ? JSON.parse(allExistingTokens) : [];
    
    // Remove old tokens for this wallet and add updated ones
    const otherWalletTokens = allTokens.filter(token => 
      token.deployerAddress.toLowerCase() !== walletAddress.toLowerCase()
    );
    
    const updatedAllTokens = [...otherWalletTokens, ...sortedTokens];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAllTokens));
    
    return sortedTokens;
  } catch (error) {
    console.error('Error syncing tokens with blockchain:', error);
    return getStoredTokens(walletAddress); // Fall back to stored tokens
  }
}

/**
 * Update stored token with fresh metadata from blockchain
 */
export async function refreshTokenMetadata(
  publicClient: PublicClient,
  tokenAddress: string,
  walletAddress: string
): Promise<DeployedToken | null> {
  try {
    const metadata = await fetchTokenMetadata(publicClient, tokenAddress);
    if (!metadata) return null;

    const storedTokens = getStoredTokens(walletAddress);
    const existingToken = storedTokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (existingToken) {
      const updatedToken: DeployedToken = {
        ...existingToken,
        name: metadata.name,
        symbol: metadata.symbol,
      };
      
      storeDeployedToken(updatedToken);
      return updatedToken;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token metadata:', error);
    return null;
  }
}

/**
 * Manually add a token by address (for tokens deployed outside the app)
 */
export async function addTokenByAddress(
  publicClient: PublicClient,
  tokenAddress: string,
  walletAddress: string,
  deploymentTxHash?: string
): Promise<DeployedToken | null> {
  try {
    const metadata = await fetchTokenMetadata(publicClient, tokenAddress);
    if (!metadata) {
      throw new Error('Could not fetch token metadata. Make sure the address is a valid ERC20 token.');
    }

    const newToken: DeployedToken = {
      address: tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      deployerAddress: walletAddress,
      deploymentTxHash,
      deploymentTimestamp: Date.now(),
      isVerified: false, // Manually added tokens are not auto-verified
      source: 'manual',
    };

    storeDeployedToken(newToken);
    return newToken;
  } catch (error) {
    console.error('Error adding token by address:', error);
    throw error;
  }
}

/**
 * Clear all stored tokens (for debugging or user preference)
 */
export function clearAllStoredTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing stored tokens:', error);
  }
} 