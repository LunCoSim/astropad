# AstroPad - Clanker Token Deployment Platform

A modern, user-friendly frontend for deploying and managing Clanker v4 tokens on Base blockchain with automatic token discovery and fee management.

## Features

- **Token Deployment Wizard**: Step-by-step token creation with advanced configuration
- **Automatic Token Discovery**: Uses Alchemy API for fast and reliable token detection
- **Fee Management**: Automatic admin detection, fee checking, and claiming functionality
- **Manual Token Management**: Add tokens not automatically detected
- **Cross-device Compatibility**: Tokens synced across devices using blockchain data
- **Modern UI**: Clean, responsive interface with smooth animations

## Environment Setup

### Alchemy API Configuration

This application uses Alchemy API for efficient token discovery. You'll need to get an API key from [Alchemy](https://dashboard.alchemy.com/).

#### Local Development

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your Alchemy API key to `.env`:
```env
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

#### Netlify Deployment

1. In your Netlify dashboard, go to Site Settings → Environment Variables
2. Add a new environment variable:
   - **Key**: `ALCHEMY_API_KEY`
   - **Value**: Your Alchemy API key

#### Getting an Alchemy API Key

1. Visit [dashboard.alchemy.com](https://dashboard.alchemy.com/)
2. Sign up for a free account
3. Create a new app:
   - **Chain**: Base
   - **Network**: Base Mainnet
4. Copy the API key from your app dashboard

**Free Tier**: Alchemy provides 300M compute units per month on their free tier, which is sufficient for most use cases.

### Web3.Storage API Configuration

This application supports image uploads to IPFS via Web3.Storage for token logos.

#### Local Development

Add your Web3.Storage API key to `.env`:
```env
WEB3_STORAGE=your_web3_storage_api_key_here
```

#### Netlify Deployment

1. In your Netlify dashboard, go to Site Settings → Environment Variables
2. Add a new environment variable:
   - **Key**: `WEB3_STORAGE`
   - **Value**: Your Web3.Storage API key

#### Getting a Web3.Storage API Key

1. Visit [web3.storage](https://web3.storage/)
2. Sign up for a free account
3. Go to your account settings
4. Create a new API token
5. Copy the API key

**Free Tier**: Web3.Storage provides 5GB of free storage, which is more than sufficient for token images.

**Image Requirements**:
- Format: JPG or PNG
- Aspect ratio: Square (1:1)
- File size: Maximum 1MB
- Automatically uploaded to IPFS

## Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Build & Deploy

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Blockchain**: Base network with Wagmi/Viem
- **Token Discovery**: Alchemy API with blockchain fallback
- **Styling**: Custom CSS with design system
- **State Management**: React hooks with localStorage persistence

## API Endpoints

- `/api/alchemy-tokens?wallet=<address>` - Get deployed tokens for a wallet
- `/api/check-fees?feeOwnerAddress=<address>&clankerTokenAddress=<address>` - Check available fees

## License

MIT
