import { createWeb3Modal } from '@web3modal/wagmi/react';
import { createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { http } from 'viem';

export const projectId = '03cafb3be79ba7760436a3741199a564';

const metadata = {
  name: 'Clanker Token Tools',
  description: 'Deploy tokens and check fees',
  url: 'https://clanker.xyz',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const chains = [base] as const;
export const config = createConfig({
  chains,
  transports: {
    [base.id]: http(),
  },
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  metadata,
});