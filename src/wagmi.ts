import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { base } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';

export const projectId = '03cafb3be79ba7760436a3741199a564';

const metadata = {
  name: 'Astropad - UI for Clanker v4 coin minting',
  description: 'Send your coin to the Moon',
  url: 'https://astropad.lunco.space',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const networks = [base];

// Create the Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  networks,
  projectId,
  metadata
});

// Create AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'github', 'discord', 'x', 'apple'],
    onramp: true,
    swaps: true
  },
  themeMode: 'light'
});

export const config = wagmiAdapter.wagmiConfig;