import type { PublicClient } from 'viem';
import { ERC20_ABI } from './abis.js';
import type { DeployedToken } from './types.js';

const STORAGE_KEY = 'astropad_deployed_tokens';

// Local definition for TokenMetadata
interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

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
        abi: ERC20_ABI,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
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
 * Simplified token sync - only returns manually tracked tokens
 */
export async function syncTokensWithBlockchain(
  publicClient: PublicClient,
  walletAddress: string,
  useAlchemyApi: boolean = false // Disabled automatic detection
): Promise<DeployedToken[]> {
  try {
    console.log(`Loading manually tracked tokens for wallet: ${walletAddress}`);
    
    // Only get manually tracked tokens from storage
    const storedTokens = getStoredTokens(walletAddress);
    const manualTokens = storedTokens.filter(token => token.source === 'manual');

    // Sort by deployment timestamp (newest first)
    const sortedTokens = manualTokens.sort((a, b) => b.deploymentTimestamp - a.deploymentTimestamp);
    
    return sortedTokens;
  } catch (error) {
    console.error('Error loading tokens:', error);
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
      deploymentTxHash: deploymentTxHash || '',
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





 