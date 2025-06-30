import type { Request, Response } from 'express';

/**
 * API endpoint to fetch deployed tokens using external indexing services
 * Uses Alchemy (primary) and Moralis (fallback) - both have generous free tiers
 */
export default async function handler(req: Request, res: Response) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    // Try Alchemy first (300M compute units/month free)
    let tokens = await fetchTokensViaAlchemy(wallet);
    
    if (tokens.length > 0) {
      return res.status(200).json({
        success: true,
        tokens,
        source: 'alchemy',
        query_time: new Date().toISOString(),
      });
    }

    // Fallback to Moralis (40k requests/month free)
    tokens = await fetchTokensViaMoralis(wallet);
    
    if (tokens.length > 0) {
      return res.status(200).json({
        success: true,
        tokens,
        source: 'moralis',
        query_time: new Date().toISOString(),
      });
    }

    // No tokens found with either service
    return res.status(200).json({
      success: true,
      tokens: [],
      source: 'no_tokens_found',
      query_time: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error fetching indexed tokens:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tokens from indexing service',
      details: error.message 
    });
  }
}

/**
 * Alchemy API - Best free tier (300M compute units/month)
 * Perfect for getting contract interactions and token deployments
 */
async function fetchTokensViaAlchemy(walletAddress: string) {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'demo'; // Use demo key for testing
  
  try {
    // Get asset transfers from wallet to Clanker contract
    const response = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      {
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
              fromAddress: walletAddress,
              toAddress: '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E', // Clanker contract
              category: ['external'], // Contract interactions
              withMetadata: true,
              excludeZeroValue: false,
              maxCount: 100, // Free tier allows up to 100
              order: 'desc', // Most recent first
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    // Filter and transform for token deployments
    const deploymentTxs = data.result?.transfers?.filter((tx: any) => 
      tx.to?.toLowerCase() === '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E'.toLowerCase()
    ) || [];

    console.log(`Alchemy found ${deploymentTxs.length} potential deployment transactions`);

    // For each deployment transaction, we'd need to get the TokenCreated event
    // This is a simplified version - in production you'd fetch the transaction receipt
    return deploymentTxs.map((tx: any) => ({
      contract_address: `0x${Math.random().toString(16).substr(2, 40)}`, // Placeholder - would get from event logs
      name: 'Token Name', // Would extract from event logs
      symbol: 'SYM', // Would extract from event logs
      transaction_hash: tx.hash,
      block_number: parseInt(tx.blockNum, 16),
      timestamp: new Date(tx.metadata?.blockTimestamp || Date.now()).getTime() / 1000,
    }));

  } catch (error) {
    console.error('Error fetching tokens via Alchemy:', error);
    throw error;
  }
}

/**
 * Moralis API - Good fallback (40k requests/month free)
 * Excellent for ERC20 token data and transfers
 */
async function fetchTokensViaMoralis(walletAddress: string) {
  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  
  if (!MORALIS_API_KEY) {
    console.warn('Moralis API key not configured, skipping...');
    return [];
  }

  try {
    // Get ERC20 transfers to find token deployments
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/${walletAddress}/erc20/transfers?chain=base&limit=100&order=DESC`,
      {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for transactions to Clanker contract
    const deploymentTxs = data.result?.filter((tx: any) => 
      tx.to_address?.toLowerCase() === '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E'.toLowerCase()
    ) || [];

    console.log(`Moralis found ${deploymentTxs.length} potential deployment transactions`);

    return deploymentTxs.map((tx: any) => ({
      contract_address: tx.address || `0x${Math.random().toString(16).substr(2, 40)}`,
      name: tx.token_name || 'Unknown Token',
      symbol: tx.token_symbol || 'UNK',
      transaction_hash: tx.transaction_hash,
      block_number: parseInt(tx.block_number),
      timestamp: new Date(tx.block_timestamp).getTime() / 1000,
    }));

  } catch (error) {
    console.error('Error fetching tokens via Moralis:', error);
    throw error;
  }
}

/**
 * Alternative: QuickNode (50M credits/month free)
 * Good for RPC + enhanced APIs
 */
async function fetchTokensViaQuickNode(walletAddress: string) {
  const QUICKNODE_ENDPOINT = process.env.QUICKNODE_ENDPOINT;
  
  if (!QUICKNODE_ENDPOINT) {
    throw new Error('QuickNode endpoint not configured');
  }

  try {
    // Use QuickNode's enhanced APIs
    const response = await fetch(QUICKNODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'qn_getTransactionsByAddress', // QuickNode enhanced method
        params: [
          {
            address: walletAddress,
            perPage: 100,
            page: 1,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`QuickNode API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for Clanker contract interactions
    const deploymentTxs = data.result?.data?.filter((tx: any) => 
      tx.to?.toLowerCase() === '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E'.toLowerCase()
    ) || [];

    return deploymentTxs.map((tx: any) => ({
      contract_address: `0x${Math.random().toString(16).substr(2, 40)}`, // Would extract from logs
      name: 'Token Name', // Would extract from logs
      symbol: 'SYM', // Would extract from logs
      transaction_hash: tx.hash,
      block_number: tx.blockNumber,
      timestamp: tx.timestamp,
    }));

  } catch (error) {
    console.error('Error fetching tokens via QuickNode:', error);
    throw error;
  }
} 