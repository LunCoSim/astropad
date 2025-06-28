import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { config } from './wagmi.ts';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <App />
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>
);