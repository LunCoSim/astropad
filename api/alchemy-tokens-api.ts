import { fetchDeployedTokensViaAlchemy } from './alchemy-tokens.js';

// Netlify Function handler
export const handler = async (event: any) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { wallet } = event.queryStringParameters || {};

    if (!wallet) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'wallet parameter is required' }),
      };
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid wallet address format' }),
      };
    }

    console.log(`Fetching tokens for wallet: ${wallet}`);
    
    const tokens = await fetchDeployedTokensViaAlchemy(wallet);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tokens,
        count: tokens.length,
        wallet,
      }),
    };

  } catch (error: any) {
    console.error('Error in alchemy-tokens API:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
    };
  }
};

// For local development (Express.js)
export default async function(req: any, res: any) {
  // Handle CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter is required' });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log(`Fetching tokens for wallet: ${wallet}`);
    
    const tokens = await fetchDeployedTokensViaAlchemy(wallet);

    res.status(200).json({
      success: true,
      tokens,
      count: tokens.length,
      wallet,
    });

  } catch (error: any) {
    console.error('Error in alchemy-tokens API:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
} 