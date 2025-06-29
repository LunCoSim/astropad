import express from 'express';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getAvailableFees } from '@lib/fees';

const app = express();
const port = 3001;

app.get('/api/check-fees', async (req, res) => {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

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
  } catch (error) {
    console.error('Error checking fees:', error);
    res.status(500).json({ error: 'Error checking fees' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});