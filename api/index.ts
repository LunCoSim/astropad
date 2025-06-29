import express from 'express';
import { type Request, type Response } from 'express';
import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { getAvailableFees } from '../lib/fees.js';

const app = express();
const port = 3001;

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});