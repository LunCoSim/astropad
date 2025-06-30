import express from 'express';
import { type Request, type Response } from 'express';
import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { getAvailableFees } from '../lib/fees.js';


const app = express();
const PORT = process.env.PORT || 3001;

// Import the indexed tokens handler
import indexedTokensHandler from './indexed-tokens.js';

app.get('/api/indexed-tokens', indexedTokensHandler);

app.get('/api/check-fees', async (req: any, res: any) => {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;

  const { feeOwnerAddress, clankerTokenAddress } = req.query;

  if (!feeOwnerAddress || !clankerTokenAddress) {
    return res.status(400).json({ error: 'feeOwnerAddress and clankerTokenAddress are required' });
  }

  try {
    const fees = await getAvailableFees(
      publicClient,
      feeOwnerAddress as `0x${string}`,
      clankerTokenAddress as `0x${string}`,
    );
    res.status(200).json(fees);
  } catch (error: any) {
    console.error('Error checking fees:', error);
    res.status(500).json({ error: error.message || 'Error checking fees' });
  }
});

// Alchemy tokens endpoint
app.get('/api/alchemy-tokens', async (req: any, res: any) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter is required' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // For now, return an empty array since we'll implement this via frontend API call
    // The frontend will call Alchemy directly with environment variables
    res.status(200).json({
      success: true,
      tokens: [],
      count: 0,
      wallet,
      message: 'Using frontend Alchemy integration'
    });

  } catch (error: any) {
    console.error('Error in alchemy-tokens API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});