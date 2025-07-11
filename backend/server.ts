// This file was moved to backend/server.ts to avoid Netlify serverless function conflicts.
import 'dotenv/config';
import express from 'express';
import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { getAvailableFees } from '../lib/fees';
import { fetchDeployedTokensViaAlchemy } from '../api/alchemy-tokens';
import formidable from 'formidable';
import fs from 'fs';
import { uploadToPinata } from '../lib/pinata-upload';

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fee checking endpoint
app.get('/api/check-fees', async (req, res) => {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;

  const { feeOwnerAddress, clankerTokenAddress } = req.query;

  if (!feeOwnerAddress || !clankerTokenAddress || !isValidAddress(feeOwnerAddress as string) || !isValidAddress(clankerTokenAddress as string)) {
    console.log('Missing parameters');
    return res.status(400).json({ error: 'Invalid or missing address' });
  }

  console.log(`[${req.method}] /api/check-fees from ${req.ip}`);

  try {
    const fees = await getAvailableFees(
      publicClient,
      feeOwnerAddress as `0x${string}`,
      clankerTokenAddress as `0x${string}`,
    );
    res.status(200).json(fees);
  } catch (error: Error) {
    console.error(`Error in /api/check-fees:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Alchemy tokens endpoint
app.get('/api/alchemy-tokens', async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter is required' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet as string)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log(`[${req.method}] /api/alchemy-tokens from ${req.ip}`);
    console.log(`Fetching tokens for wallet: ${wallet}`);
    
    const tokens = await fetchDeployedTokensViaAlchemy(wallet as string);

    res.status(200).json({
      success: true,
      tokens,
      count: tokens.length,
      wallet,
      source: 'alchemy',
      query_time: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(`Error in /api/alchemy-tokens:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Image upload endpoint (Pinata backend upload)
app.post('/api/upload-image', async (req, res) => {
  console.log(`[${req.method}] ${req.path} from ${req.ip}`);
  const form = formidable({ maxFileSize: 1024 * 1024, maxFiles: 1, allowEmptyFiles: false });
  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: 'Error parsing upload' });
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!imageFile) return res.status(400).json({ error: 'No image file provided' });
    try {
      const buffer = fs.readFileSync(imageFile.filepath);
      const originalFilename = imageFile.originalFilename || 'image.png';
      const mimeType = imageFile.mimetype || 'application/octet-stream';
      const result = await uploadToPinata(buffer, originalFilename, mimeType);
      if (result.success) {
        return res.status(200).json({ success: true, ipfsUrl: result.ipfsUrl });
      } else {
        return res.status(500).json({ error: result.error });
      }
    } catch (error: Error) {
      console.error(`Error in ${req.path}:`, error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
